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
