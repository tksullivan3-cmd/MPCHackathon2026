"""Export enriched dataset and ranked suspicious transactions."""

from __future__ import annotations

from pathlib import Path

import pandas as pd


def enrich_dataframe(
    df: pd.DataFrame,
    fraud_scores: list[float],
    is_flagged: list[bool],
    reasons_lists: list[list[str]],
    risk_levels: list[str],
) -> pd.DataFrame:
    """Attach scoring columns to the original transaction frame."""
    out = df.copy()
    out["fraud_score"] = fraud_scores
    out["is_flagged"] = is_flagged
    out["risk_level"] = risk_levels
    out["flag_reasons"] = [
        "; ".join(reasons) if reasons else "" for reasons in reasons_lists
    ]
    return out


def write_enriched_csv(df: pd.DataFrame, output_path: str | Path) -> Path:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return path


def ranked_suspicious(df: pd.DataFrame, limit: int | None = None) -> pd.DataFrame:
    """Return transactions sorted by fraud_score descending."""
    ranked = df.sort_values("fraud_score", ascending=False)
    if limit is not None:
        return ranked.head(limit)
    return ranked


def flagged_only(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["is_flagged"] == True].copy()
