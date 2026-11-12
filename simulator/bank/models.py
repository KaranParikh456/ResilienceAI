from decimal import Decimal, InvalidOperation
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class TransactionRequest(BaseModel):
    transaction_id: str = Field(min_length=1, max_length=64)
    amount: str
    currency: str = Field(min_length=3, max_length=3)

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive_decimal(cls, v: str) -> str:
        try:
            d = Decimal(v)
        except InvalidOperation:
            raise ValueError("amount must be a decimal string like '1000.00'")
        if not d.is_finite() or d <= 0:
            raise ValueError("amount must be greater than 0")
        return v

    @field_validator("currency")
    @classmethod
    def currency_must_be_letters(cls, v: str) -> str:
        if not v.isalpha():
            raise ValueError("currency must be a 3-letter code like 'INR'")
        return v.upper()

    def fingerprint(self) -> tuple:
        """Used to compare payloads for idempotency (1000 == 1000.00)."""
        return (Decimal(self.amount), self.currency)


class ErrorInfo(BaseModel):
    code: str
    message: str


class TransactionResponse(BaseModel):
    bank_id: str
    transaction_id: str
    status: Literal["success", "failed"]
    amount: str
    currency: str
    processing_time_ms: int
    error: Optional[ErrorInfo] = None


class FailureConfig(BaseModel):
    mode: Literal["none", "latency", "error", "down"] = "none"
    latency_ms: int = Field(default=0, ge=0, le=60000)
    error_rate: float = Field(default=0.0, ge=0.0, le=1.0)
