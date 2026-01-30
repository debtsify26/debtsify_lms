from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from supabase import Client
from database import get_supabase
from schemas import TransactionCreate, TransactionResponse, FinancialSummary
from auth import get_current_user_id

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction: TransactionCreate,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase)
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
    limit: int = 100,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase)
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
    db: Client = Depends(get_supabase)
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
    db: Client = Depends(get_supabase)
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
    db: Client = Depends(get_supabase)
):
    """Get financial summary for dashboard"""
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
        active_loans = len([l for l in loans if l["status"] == "ACTIVE"])
        total_disbursed = sum(float(l["principal_amount"]) for l in loans)
        
        # Market amount calculation
        market_amount = 0.0
        for inst in installments:
            if inst["status"] != "PAID":
                market_amount += float(inst["expected_amount"]) - float(inst["paid_amount"])
        
        # Add principal for daily rate loans
        for loan in loans:
            if loan["type"] == "DAILY_RATE" and loan["status"] == "ACTIVE":
                market_amount += float(loan["principal_amount"])
        
        # Cash in hand from transactions
        cash_in_hand = 0.0
        for txn in transactions:
            if txn["type"] == "CREDIT":
                cash_in_hand += float(txn["amount"])
            else:
                cash_in_hand -= float(txn["amount"])
        
        # Total collected (sum of paid installments)
        total_collected = sum(float(inst["paid_amount"]) for inst in installments)
        
        # Overdue metrics
        overdue_installments = [inst for inst in installments if inst["status"] == "OVERDUE"]
        overdue_count = len(overdue_installments)
        overdue_amount = sum(
            float(inst["expected_amount"]) - float(inst["paid_amount"])
            for inst in overdue_installments
        )
        
        return FinancialSummary(
            total_loans=total_loans,
            active_loans=active_loans,
            total_disbursed=total_disbursed,
            market_amount=market_amount,
            cash_in_hand=cash_in_hand,
            total_collected=total_collected,
            overdue_count=overdue_count,
            overdue_amount=overdue_amount
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate financial summary: {str(e)}"
        )
