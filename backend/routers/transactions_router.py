from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from supabase import Client
from database import get_supabase_admin
from schemas import TransactionCreate, TransactionResponse, FinancialSummary
from auth import get_current_user_id

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("/bulk", response_model=List[TransactionResponse], status_code=status.HTTP_201_CREATED)
async def create_bulk_transactions(
    transactions: List[TransactionCreate],
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Create multiple transactions at once"""
    try:
        from datetime import datetime
        
        if not transactions:
            return []
            
        transactions_data = []
        utc_now = datetime.utcnow().isoformat()
        
        for txn in transactions:
            txn_dict = txn.model_dump()
            txn_dict["user_id"] = user_id
            if not txn_dict.get("date"):
                txn_dict["date"] = utc_now
            transactions_data.append(txn_dict)
        
        response = db.table("transactions").insert(transactions_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to bulk create transactions"
            )
        
        return [TransactionResponse(**txn) for txn in response.data]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk create transactions: {str(e)}"
        )


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction: TransactionCreate,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Create a new transaction"""
    try:
        from datetime import datetime
        
        transaction_data = transaction.model_dump()
        transaction_data["user_id"] = user_id
        
        # Handle date - use provided date or default to now
        if not transaction_data.get("date"):
            transaction_data["date"] = datetime.utcnow().isoformat()
        
        response = db.table("transactions").insert(transaction_data).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create transaction"
            )
        
        return TransactionResponse(**response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create transaction: {str(e)}"
        )


@router.get("", response_model=List[TransactionResponse])
async def get_transactions(
    type_filter: str | None = None,
    limit: int = 5000,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Get all transactions for the current user"""
    try:
        query = db.table("transactions").select("*").eq("user_id", user_id)
        
        if type_filter:
            query = query.eq("type", type_filter)
        
        response = query.order("date", desc=True).limit(limit).execute()
        
        return [TransactionResponse(**txn) for txn in response.data]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transactions: {str(e)}"
        )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Get a specific transaction by ID"""
    try:
        response = db.table("transactions").select("*").eq("id", transaction_id).eq("user_id", user_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        return TransactionResponse(**response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transaction: {str(e)}"
        )


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Delete a transaction"""
    try:
        check_response = db.table("transactions").select("id").eq("id", transaction_id).eq("user_id", user_id).execute()
        
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        db.table("transactions").delete().eq("id", transaction_id).execute()
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete transaction: {str(e)}"
        )


@router.get("/summary/financial", response_model=FinancialSummary)
async def get_financial_summary(
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Get financial summary for dashboard
    
    Money In Hand = sum(CREDITs) - sum(DEBITs) from transactions table
      - This naturally handles the reinvestment cycle
      - Disbursements are DEBIT, repayments are CREDIT
    """
    try:
        # Get all loans
        loans_response = db.table("loans").select("*").eq("user_id", user_id).execute()
        loans = loans_response.data
        
        # Get all installments
        installments_response = db.table("installments").select("*").eq("user_id", user_id).execute()
        installments = installments_response.data
        
        # Get all transactions
        transactions_response = db.table("transactions").select("*").eq("user_id", user_id).execute()
        transactions = transactions_response.data
        
        # Calculate metrics
        total_loans = len(loans)
        active_loans = len([l for l in loans if l.get("status") == "ACTIVE"])
        total_disbursed = sum(float(l.get("principal_amount", 0)) for l in loans)
        
        # Market amount calculation (original logic — based on unpaid installments)
        market_amount = 0.0
        market_principal = 0.0
        market_interest = 0.0
        total_interest_expected = 0.0
        
        for loan in loans:
            l_principal = float(loan.get("principal_amount", 0))
            loan_type = loan.get("type", "")
            loan_status = loan.get("status", "ACTIVE")
            
            if loan_type == "TOTAL_RATE":
                multiplier = float(loan.get("total_rate_multiplier", 1.2))
                total_repay = l_principal * multiplier
                l_interest = total_repay - l_principal
                total_interest_expected += l_interest
                
                if loan_status != "COMPLETED":
                    # Get installments for this loan
                    loan_insts = [i for i in installments if i.get("loan_id") == loan.get("id")]
                    for inst in loan_insts:
                        if inst.get("status") != "PAID":
                            # Amortized Principal vs Interest
                            remaining = float(inst.get("expected_amount", 0)) - float(inst.get("paid_amount", 0))
                            market_amount += remaining
                            market_principal += remaining * (l_principal / total_repay)
                            market_interest += remaining * (l_interest / total_repay)
            else:
                # DAILY_RATE
                loan_insts = [i for i in installments if i.get("loan_id") == loan.get("id")]
                total_interest_expected += sum(float(i.get("expected_amount", 0)) for i in loan_insts if i.get("type") == "INTEREST_ONLY")
                
                if loan_status == "ACTIVE":
                    market_amount += l_principal
                    market_principal += l_principal
                
                for inst in loan_insts:
                    if inst.get("status") != "PAID":
                        remaining = float(inst.get("expected_amount", 0)) - float(inst.get("paid_amount", 0))
                        market_amount += remaining
                        market_interest += remaining

        # ─── Money In Hand (Reinvestment Cycle) ───────────────────
        # Pure transaction-based: CREDITs - DEBITs
        # Loan disbursements are already recorded as DEBIT transactions
        # Repayments are already recorded as CREDIT transactions
        # This naturally handles the reinvestment cycle
        total_txn_credit = sum(
            float(txn.get("amount", 0)) 
            for txn in transactions 
            if txn.get("type") == "CREDIT"
        )
        total_txn_debit = sum(
            float(txn.get("amount", 0)) 
            for txn in transactions 
            if txn.get("type") == "DEBIT"
        )
        
        total_inflow = total_txn_credit
        total_outflow = total_txn_debit
        cash_in_hand = max(0, total_inflow - total_outflow)
        
        # Total collected from installments (for reference)
        total_collected = sum(
            float(inst.get("paid_amount", 0)) for inst in installments
        )
        
        # Overdue metrics — date-based detection
        from datetime import date
        today_str = date.today().isoformat()
        
        overdue_installments = [
            inst for inst in installments 
            if inst.get("status") != "PAID" and (inst.get("due_date", "") < today_str)
        ]
        overdue_count = len(overdue_installments)
        overdue_amount = sum(
            float(inst.get("expected_amount", 0)) - float(inst.get("paid_amount", 0))
            for inst in overdue_installments
        )
        
        return FinancialSummary(
            total_loans=total_loans,
            active_loans=active_loans,
            total_disbursed=total_disbursed,
            market_amount=market_amount,
            market_principal=market_principal,
            market_interest=market_interest,
            total_interest_expected=total_interest_expected,
            cash_in_hand=cash_in_hand,
            total_collected=total_collected,
            total_inflow=total_inflow,
            total_outflow=total_outflow,
            overdue_count=overdue_count,
            overdue_amount=overdue_amount
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate financial summary: {str(e)}"
        )
