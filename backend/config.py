from pathlib import Path
from urllib.parse import urlparse

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    database_path: str = 'resilience.db'
    # JSON mapping of distinct bearer credentials to stable user identifiers.
    api_tokens: dict[str, str] = {}
    cors_origins: list[str] = ['http://localhost:5173']
    scanner_module: str = ''
    simulator_module: str = ''
    repository_root: Path = Path('repositories')
    failure_enabled: bool = False
    allow_fixtures: bool = False
    simulator_targets: list[str] = []
    paypal_client_id: str = ''
    paypal_client_secret: str = ''
    paypal_webhook_id: str = ''
    payment_amount: str = '5.00'
    ai_url: str = ''
    ai_key: str = ''
    ai_model: str = ''

    @model_validator(mode='after')
    def validate_config(self):
        from decimal import Decimal, InvalidOperation
        for origin in self.cors_origins:
            parsed = urlparse(origin)
            if parsed.scheme not in ('http', 'https') or not parsed.netloc or parsed.path or parsed.query or parsed.fragment:
                raise ValueError('CORS origins must be explicit HTTP origins without paths')
        if any(len(k) < 32 or not v for k, v in self.api_tokens.items()):
            raise ValueError('API tokens require at least 32 characters and nonempty owners')
        if bool(self.paypal_client_id) != bool(self.paypal_client_secret):
            raise ValueError('PayPal client ID and secret must be configured together')
        if self.failure_enabled and not self.simulator_targets:
            raise ValueError('Failure injection requires allowlisted simulator targets')
        if self.ai_url and (not self.ai_url.startswith('https://') or not self.ai_model):
            raise ValueError('AI requires an HTTPS endpoint and model')
        try:
            amount = Decimal(self.payment_amount)
            if not amount.is_finite() or amount <= 0 or amount.as_tuple().exponent < -2:
                raise ValueError('Payment amount must be positive with at most two decimal places')
        except InvalidOperation as exc:
            raise ValueError('Invalid payment amount') from exc
        return self
