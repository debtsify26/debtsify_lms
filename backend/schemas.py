from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


# Enums matching frontend
class LoanType(str, Enum):
    TOTAL_RATE = "TOTAL_RATE"
    DAILY_RATE = "DAILY_RATE"


# Frequency is now flexible (1-30 days)
class Frequency(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    BIWEEKLY = "BIWEEKLY"  # 15 days
    MONTHLY = "MONTHLY"
    # Added flexibility for arbitrary days
    CUSTOM = "CUSTOM"


class LoanStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CLOSED = "CLOSED"
    BAD_DEBT = "BAD_DEBT"


class InstallmentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    OVERDUE = "OVERDUE"


class TransactionType(str, Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"


# User Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    new_password: str = Field(..., min_length=6)
    access_token: str
    refresh_token: str


# Loan Schemas
class LoanBase(BaseModel):
    client_name: str
    type: LoanType
    principal_amount: float = Field(..., gt=0)
    start_date: str  # ISO Date string
    frequency: str
    disbursement_date: str
    total_rate_multiplier: Optional[float] = None
    tenure: Optional[int] = None
    daily_rate_per_lakh: Optional[float] = None
    process_rate: Optional[float] = 0
    payout_rate: Optional[float] = 0
    status: LoanStatus = LoanStatus.ACTIVE


class LoanCreate(LoanBase):
    pass


class LoanUpdate(BaseModel):
    status: Optional[LoanStatus] = None
    last_interest_generation_date: Optional[str] = None


class LoanResponse(LoanBase):
    id: str
    user_id: str
    created_at: datetime
    last_interest_generation_date: Optional[str] = None

    class Config:
        from_attributes = True


# Installment Schemas
class InstallmentBase(BaseModel):
    loan_id: str
    client_name: str
    due_date: str
    expected_amount: float = Field(..., gt=0)
    paid_amount: float = Field(default=0, ge=0)
    penalty: float = Field(default=0, ge=0)
    type: Literal["REGULAR", "INTEREST_ONLY", "PRINCIPAL_SETTLEMENT"]
    status: InstallmentStatus = InstallmentStatus.PENDING


class InstallmentCreate(InstallmentBase):
    pass


class InstallmentUpdate(BaseModel):
    paid_amount: Optional[float] = None
    penalty: Optional[float] = None
    status: Optional[InstallmentStatus] = None
    paid_date: Optional[str] = None


class InstallmentResponse(InstallmentBase):
    id: str
    user_id: str
    paid_date: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Transaction Schemas
class TransactionBase(BaseModel):
    amount: float = Field(..., gt=0)
    type: TransactionType
    category: str
    description: str
    date: Optional[str] = None  # ISO Date string, optional - defaults to now
    related_entity_id: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionResponse(TransactionBase):
    id: str
    user_id: str
    date: datetime

    class Config:
        from_attributes = True


# Dashboard/Analytics Schemas
class FinancialSummary(BaseModel):
    total_loans: int
    active_loans: int
    total_disbursed: float
    market_amount: float
    market_principal: float
    market_interest: float
    total_interest_expected: float
    cash_in_hand: float
    total_collected: float
    total_inflow: float
    total_outflow: float
    overdue_count: int
    overdue_amount: float
