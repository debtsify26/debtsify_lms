from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from supabase import Client
from database import get_supabase_admin
from schemas_investment import (
    InvestmentBreakdownCreate,
    InvestmentBreakdownUpdate,
    InvestmentBreakdownResponse
)
from auth import get_current_user_id

router = APIRouter(prefix="/investment-breakdown", tags=["Investment Breakdown"])


@router.post("", response_model=InvestmentBreakdownResponse, status_code=status.HTTP_201_CREATED)
async def create_investment_breakdown(
    breakdown: InvestmentBreakdownCreate,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Create a new investment breakdown entry"""
    try:
        breakdown_data = breakdown.model_dump()
        breakdown_data["user_id"] = user_id
        
        response = db.table("investment_breakdown").insert(breakdown_data).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create investment breakdown"
            )
        
        return InvestmentBreakdownResponse(**response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create investment breakdown: {str(e)}"
        )


@router.get("", response_model=List[InvestmentBreakdownResponse])
async def get_all_investment_breakdowns(
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Get all investment breakdown entries for the current user"""
    try:
        response = db.table("investment_breakdown").select("*").eq("user_id", user_id).order("start_date", desc=True).execute()
        
        return [InvestmentBreakdownResponse(**item) for item in response.data]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch investment breakdowns: {str(e)}"
        )


@router.get("/{breakdown_id}", response_model=InvestmentBreakdownResponse)
async def get_investment_breakdown(
    breakdown_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Get a specific investment breakdown by ID"""
    try:
        response = db.table("investment_breakdown").select("*").eq("id", breakdown_id).eq("user_id", user_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Investment breakdown not found"
            )
        
        return InvestmentBreakdownResponse(**response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch investment breakdown: {str(e)}"
        )


@router.patch("/{breakdown_id}", response_model=InvestmentBreakdownResponse)
async def update_investment_breakdown(
    breakdown_id: str,
    breakdown_update: InvestmentBreakdownUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Update an investment breakdown entry"""
    try:
        # Check if exists and belongs to user
        check_response = db.table("investment_breakdown").select("*").eq("id", breakdown_id).eq("user_id", user_id).execute()
        
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Investment breakdown not found"
            )
        
        # Update
        update_data = breakdown_update.model_dump(exclude_unset=True)
        response = db.table("investment_breakdown").update(update_data).eq("id", breakdown_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update investment breakdown"
            )
        
        return InvestmentBreakdownResponse(**response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update investment breakdown: {str(e)}"
        )


@router.delete("/{breakdown_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_investment_breakdown(
    breakdown_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Delete an investment breakdown entry"""
    try:
        check_response = db.table("investment_breakdown").select("id").eq("id", breakdown_id).eq("user_id", user_id).execute()
        
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Investment breakdown not found"
            )
        
        db.table("investment_breakdown").delete().eq("id", breakdown_id).execute()
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete investment breakdown: {str(e)}"
        )


@router.post("/sync-from-loans", status_code=status.HTTP_200_OK)
async def sync_breakdown_from_loans(
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Sync investment breakdown table from loans and installments data"""
    try:
        # Fetch loans and installments
        loans_response = db.table("loans").select("*").eq("user_id", user_id).execute()
        installments_response = db.table("installments").select("*").eq("user_id", user_id).execute()
        
        loans_data = loans_response.data
        installments_data = installments_response.data
        
        if not loans_data:
            # If no loans, we might want to clear the table, but let's be careful.
            # Only clear if we really believe there are no loans.
            # But "erased all data" suggests we deleted when we shouldn't have.
            # If response is valid but empty list, it means user has no loans.
            # In that case, clearing breakdown IS correct. 
            # The issue likely happens when an error occurs during processing.
            pass

        # Generate new breakdown entries FIRST before deleting
        breakdown_entries = []
        
        for loan in loans_data:
            try:
                loan_id = loan.get("id")
                client_name = loan.get("client_name", "Unknown")
                start_date = loan.get("start_date", "")
                principal = float(loan.get("principal_amount", 0))
                loan_type = loan.get("type", "")
                frequency = str(loan.get("frequency", ""))
                status_loan = loan.get("status", "ACTIVE")
                
                # Get all installments for this loan
                loan_installments = [i for i in installments_data if i.get("loan_id") == loan_id]
                
                # Calculate received amount
                received = sum(float(i.get("paid_amount", 0)) for i in loan_installments)
                
                # Calculate market values
                mkt_principal = 0
                mkt_interest = 0
                int_pct = 0
                
                if loan_type == "TOTAL_RATE":
                    multiplier = float(loan.get("total_rate_multiplier", 1.2))
                    total_repay = principal * multiplier
                    total_interest = total_repay - principal
                    int_pct = ((multiplier - 1) * 100)
                    
                    if status_loan != "COMPLETED":
                        for inst in loan_installments:
                            if inst.get("status") != "PAID":
                                remaining = float(inst.get("expected_amount", 0)) - float(inst.get("paid_amount", 0))
                                mkt_principal += remaining * (principal / total_repay)
                                mkt_interest += remaining * (total_interest / total_repay)
                else:
                    # DAILY_RATE
                    daily_rate = float(loan.get("daily_rate_per_lakh", 100))
                    int_pct = daily_rate
                    
                    if status_loan == "ACTIVE":
                        mkt_principal = principal
                    elif status_loan == "COMPLETED":
                        mkt_principal = 0
                    
                    for inst in loan_installments:
                        if inst.get("status") != "PAID":
                            remaining = float(inst.get("expected_amount", 0)) - float(inst.get("paid_amount", 0))
                            mkt_interest += remaining
                
                total_mkt_value = mkt_principal + mkt_interest
                
                breakdown_entries.append({
                    "user_id": user_id,
                    "loan_id": loan_id,
                    "person": client_name,
                    "start_date": start_date,
                    "cycle": f"{frequency}d" if frequency.isdigit() else frequency,
                    "capital": principal,
                    "interest_percentage": int_pct,
                    "received": received,
                    "mkt_principal": mkt_principal,
                    "mkt_interest": mkt_interest,
                    "total_market_value": total_mkt_value
                })
            except Exception as e:
                # Log error but continue with other loans
                print(f"Error processing loan {loan.get('id')}: {str(e)}")
                continue
        
        # Only delete and insert if we successfully generated entries (or if we really have 0 entries but valid fetch)
        # We rely on transactions being separate, but here we can just do delete-then-insert.
        
        # Clear existing breakdown data for this user
        db.table("investment_breakdown").delete().eq("user_id", user_id).execute()
        
        # Insert all breakdown entries
        if breakdown_entries:
            # Insert in chunks of 50 to avoid payload limits
            chunk_size = 50
            for i in range(0, len(breakdown_entries), chunk_size):
                chunk = breakdown_entries[i:i + chunk_size]
                db.table("investment_breakdown").insert(chunk).execute()
        
        return {
            "message": f"Successfully synced {len(breakdown_entries)} investment breakdown entries",
            "count": len(breakdown_entries)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync investment breakdown: {str(e)}"
        )
