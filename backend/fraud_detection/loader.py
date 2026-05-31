"""CSV ingestion and validation."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

REQUIRED_COLUMNS: frozenset[str] = frozenset(
    {
        "transaction_id",
        "timestamp",
        "card_id",
        "amount",
        "merchant_name",
        "merchant_category",
        "channel",
        "cardholder_country",
        "merchant_country",
        "device_id",
        "ip_address",
    }
)


def load_transactions(csv_path: str | Path) -> pd.DataFrame:
    """Load, validate, and normalize the transactions dataset."""
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV not found: {path}")

    df = pd.read_csv(path)
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    if df["timestamp"].isna().any():
        raise ValueError("Invalid timestamp values in CSV")

    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    if df["amount"].isna().any():
        raise ValueError("Invalid amount values in CSV")

    df = df.sort_values("timestamp").reset_index(drop=True)
    return df
