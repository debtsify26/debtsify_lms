from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
from decimal import Decimal

# Investment Breakdown Schemas
class InvestmentBreakdownBase(BaseModel):
    loan_id: str
    person: str
    start_date: date
    cycle: str
    capital: Decimal = Field(gt=0)
    interest_percentage: Decimal
    received: Decimal = Field(default=0, ge=0)
    mkt_principal: Decimal = Field(default=0, ge=0)
    mkt_interest: Decimal = Field(default=0, ge=0)
    total_market_value: Decimal = Field(default=0, ge=0)

class InvestmentBreakdownCreate(InvestmentBreakdownBase):
    pass

class InvestmentBreakdownUpdate(BaseModel):
    person: Optional[str] = None
    start_date: Optional[date] = None
    cycle: Optional[str] = None
    capital: Optional[Decimal] = None
    interest_percentage: Optional[Decimal] = None
    received: Optional[Decimal] = None
    mkt_principal: Optional[Decimal] = None
    mkt_interest: Optional[Decimal] = None
    total_market_value: Optional[Decimal] = None

class InvestmentBreakdownResponse(InvestmentBreakdownBase):
    id: str
    user_id: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
