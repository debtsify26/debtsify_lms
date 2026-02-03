from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from supabase import Client
from database import get_supabase_admin
from schemas import InstallmentCreate, InstallmentUpdate, InstallmentResponse
from auth import get_current_user_id

router = APIRouter(prefix="/installments", tags=["Installments"])


@router.post("", response_model=InstallmentResponse, status_code=status.HTTP_201_CREATED)
async def create_installment(
    installment: InstallmentCreate,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Create a new installment"""
    try:
        installment_data = installment.model_dump()
        installment_data["user_id"] = user_id
        
        response = db.table("installments").insert(installment_data).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create installment"
            )
        
        return InstallmentResponse(**response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create installment: {str(e)}"
        )


@router.post("/bulk", response_model=List[InstallmentResponse], status_code=status.HTTP_201_CREATED)
async def create_installments_bulk(
    installments: List[InstallmentCreate],
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Create multiple installments at once"""
    try:
        installments_data = [
            {**installment.model_dump(), "user_id": user_id}
            for installment in installments
        ]
        
        response = db.table("installments").insert(installments_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create installments"
            )
        
        return [InstallmentResponse(**inst) for inst in response.data]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create installments: {str(e)}"
        )


@router.get("", response_model=List[InstallmentResponse])
async def get_installments(
    loan_id: str | None = None,
    status_filter: str | None = None,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Get all installments for the current user"""
    try:
        query = db.table("installments").select("*").eq("user_id", user_id)
        
        if loan_id:
            query = query.eq("loan_id", loan_id)
        
        if status_filter:
            query = query.eq("status", status_filter)
        
        response = query.order("due_date", desc=False).execute()
        
        return [InstallmentResponse(**inst) for inst in response.data]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch installments: {str(e)}"
        )


@router.get("/{installment_id}", response_model=InstallmentResponse)
async def get_installment(
    installment_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Get a specific installment by ID"""
    try:
        response = db.table("installments").select("*").eq("id", installment_id).eq("user_id", user_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Installment not found"
            )
        
        return InstallmentResponse(**response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch installment: {str(e)}"
        )


@router.patch("/{installment_id}", response_model=InstallmentResponse)
async def update_installment(
    installment_id: str,
    installment_update: InstallmentUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Update an installment (record payment, etc.)"""
    try:
        import logging
        logging.info(f"Updating installment {installment_id} for user {user_id}")
        logging.info(f"Update data: {installment_update.model_dump(exclude_unset=True)}")
        
        # Check if installment exists and belongs to user
        check_response = db.table("installments").select("*").eq("id", installment_id).eq("user_id", user_id).execute()
        
        if not check_response.data or len(check_response.data) == 0:
            # Check if installment exists at all
            exists_check = db.table("installments").select("id, user_id").eq("id", installment_id).execute()
            if exists_check.data and len(exists_check.data) > 0:
                logging.warning(f"Installment {installment_id} exists but belongs to user {exists_check.data[0].get('user_id')}, not {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to update this installment"
                )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Installment not found"
            )
        
        # Update installment
        update_data = installment_update.model_dump(exclude_unset=True)
        
        # Ensure we can clear paid_date when reverting a payment
        # Supabase can handle null values directly
            
        response = db.table("installments").update(update_data).eq("id", installment_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update installment - database returned empty response"
            )
        
        logging.info(f"Successfully updated installment {installment_id}")
        
        # Check if all installments for this loan are now paid
        updated_installment = response.data[0]
        loan_id = updated_installment.get("loan_id")
        
        if loan_id:
            # Get all installments for this loan
            all_installments = db.table("installments").select("*").eq("loan_id", loan_id).execute()
            
            if all_installments.data:
                # Check if all are paid
                all_paid = all(inst.get("status") == "PAID" for inst in all_installments.data)
                
                if all_paid:
                    # Update loan status to COMPLETED
                    db.table("loans").update({"status": "COMPLETED"}).eq("id", loan_id).execute()
                    logging.info(f"Loan {loan_id} marked as COMPLETED - all installments paid")
                else:
                    # Ensure loan is ACTIVE if not all paid (in case it was completed before)
                    db.table("loans").update({"status": "ACTIVE"}).eq("id", loan_id).execute()
        
        return InstallmentResponse(**response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"Error updating installment {installment_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update installment: {str(e)}"
        )


@router.delete("/{installment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_installment(
    installment_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Delete an installment"""
    try:
        check_response = db.table("installments").select("id").eq("id", installment_id).eq("user_id", user_id).execute()
        
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Installment not found"
            )
        
        db.table("installments").delete().eq("id", installment_id).execute()
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete installment: {str(e)}"
        )


@router.post("/sync-loan-statuses", status_code=status.HTTP_200_OK)
async def sync_all_loan_statuses(
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_supabase_admin)
):
    """Check all loans and update their status based on installment completion"""
    try:
        import logging
        
        # Get all loans for this user
        loans_response = db.table("loans").select("*").eq("user_id", user_id).execute()
        
        updated_count = 0
        
        for loan in loans_response.data:
            loan_id = loan.get("id")
            current_status = loan.get("status")
            
            # Get all installments for this loan
            installments = db.table("installments").select("*").eq("loan_id", loan_id).execute()
            
            if installments.data:
                # Check if all are paid
                all_paid = all(inst.get("status") == "PAID" for inst in installments.data)
                
                if all_paid and current_status != "COMPLETED":
                    # Update to COMPLETED
                    db.table("loans").update({"status": "COMPLETED"}).eq("id", loan_id).execute()
                    logging.info(f"Loan {loan_id} updated to COMPLETED")
                    updated_count += 1
                elif not all_paid and current_status == "COMPLETED":
                    # Revert to ACTIVE
                    db.table("loans").update({"status": "ACTIVE"}).eq("id", loan_id).execute()
                    logging.info(f"Loan {loan_id} reverted to ACTIVE")
                    updated_count += 1
        
        return {
            "message": f"Successfully synced {updated_count} loan statuses",
            "updated_count": updated_count
        }
    
    except Exception as e:
        import logging
        logging.error(f"Error syncing loan statuses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync loan statuses: {str(e)}"
        )
