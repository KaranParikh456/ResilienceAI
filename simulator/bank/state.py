import asyncio
from dataclasses import dataclass

from models import FailureConfig, TransactionRequest


@dataclass
class StoredTransaction:
    fingerprint: tuple
    response: dict


class BankState:
    """In-memory state for one bank. Resets when the container restarts."""

    def __init__(self) -> None:
        self.failure = FailureConfig()
        self._transactions: dict[str, StoredTransaction] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    def lock_for(self, transaction_id: str) -> asyncio.Lock:
        # No await here, so this is atomic inside the asyncio event loop.
        lock = self._locks.get(transaction_id)
        if lock is None:
            lock = self._locks[transaction_id] = asyncio.Lock()
        return lock

    def get(self, transaction_id: str) -> StoredTransaction | None:
        return self._transactions.get(transaction_id)

    def save(self, req: TransactionRequest, response: dict) -> None:
        self._transactions[req.transaction_id] = StoredTransaction(
            fingerprint=req.fingerprint(), response=response
        )

    def reset(self) -> None:
        self.failure = FailureConfig()
        self._transactions.clear()
        self._locks.clear()

    @property
    def transaction_count(self) -> int:
        return len(self._transactions)
