from fastapi import APIRouter, HTTPException, status, Depends
from datetime import timedelta
from supabase import Client
from database import get_supabase, get_supabase_admin
from schemas import UserCreate, UserLogin, Token, UserResponse, ForgotPasswordRequest, ResetPassword
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user_id
)
from config import settings

router = APIRouter(tags=["Authentication"])


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(
    user_data: UserCreate,
    db: Client = Depends(get_supabase)
):
    """Register a new user"""
    try:
        # Create user in Supabase Auth
        auth_response = db.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": auth_response.user.id},
            expires_delta=access_token_expires
        )
        
        return Token(access_token=access_token)
    
    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg.lower() or "already exists" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {error_msg}"
        )


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: Client = Depends(get_supabase)
):
    """Login with email and password"""
    try:
        # Authenticate with Supabase
        auth_response = db.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": auth_response.user.id},
            expires_delta=access_token_expires
        )
        
        return Token(access_token=access_token)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db_admin: Client = Depends(get_supabase_admin)
):
    """Get current authenticated user details"""
    try:
        # Use admin client to bypass RLS since we've already validated the JWT token
        # The regular client would be blocked by RLS policies that check auth.uid()
        response = db_admin.table("users").select("*").eq("id", user_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found. Please contact support."
            )
        
        return UserResponse(**response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user: {str(e)}"
        )


@router.post("/logout")
async def logout(
    db: Client = Depends(get_supabase),
    user_id: str = Depends(get_current_user_id)
):
    """Logout current user"""
    try:
        db.auth.sign_out()
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )
@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: Client = Depends(get_supabase)
):
    """Send a password reset email"""
    try:
        # Supabase sends the email automatically
        db.auth.reset_password_email(request.email)
        return {"message": "Password reset email sent. Please check your inbox."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send reset email: {str(e)}"
        )
@router.post("/reset-password")
async def reset_password(
    request: ResetPassword,
    db: Client = Depends(get_supabase)
):
    """Update user password using the link from email"""
    try:
        # We need to set the session using the access token first
        # Supabase Python client's auth.update_user handles the update 
        # but we need to verify the token is valid for the current session.
        # However, FastAPI is stateless. We'll use the supabase admin client 
        # if we need to bypass or the regular client if the token is passed.
        
        # Validating/Setting session with provided token
        db.auth.set_session(request.access_token, "") 
        
        auth_response = db.auth.update_user({
            "password": request.new_password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to reset password. Link might be expired."
            )
            
        return {"message": "Password updated successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password reset failed: {str(e)}"
        )
