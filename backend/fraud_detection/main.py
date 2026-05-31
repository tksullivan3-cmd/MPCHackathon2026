"""Fraud detection pipeline entry point."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import pandas as pd

from .config import SensitivityMode, build_config
from .explain import explain_transaction
from .export import enrich_dataframe, flagged_only, ranked_suspicious, write_enriched_csv
from .features import build_features
from .loader import load_transactions
from .rules import apply_rules
from .scorer import assign_risk_level, score_transaction

logger = logging.getLogger(__name__)


def apply_flagging(df: pd.DataFrame, flag_rate: float) -> pd.DataFrame:
    """
    Flag the top N% of transactions by fraud_score (minimum 1 row).

    Rank-based flagging keeps the review queue size stable (~7% for 1k rows)
    while scores remain comparable on a 0–100 scale.
    """
    out = df.copy()
    num_to_flag = max(1, int(len(out) * flag_rate))
    out["is_flagged"] = False
    top_idx = out.nlargest(num_to_flag, "fraud_score").index
    out.loc[top_idx, "is_flagged"] = True
    return out


def run_pipeline(
    csv_path: str | Path,
    output_path: str | Path | None = None,
    *,
    sensitivity: SensitivityMode = "balanced",
    flag_threshold: float | None = None,
    flag_rate: float | None = None,
) -> dict[str, Any]:
    """
    Full fraud detection pipeline.

    Returns dict with enriched DataFrame, ranked suspicious list, and summary stats.
    """
    config = build_config(sensitivity)
    weights = config["weights"]
    thresholds = config["thresholds"]

    if flag_threshold is not None:
        thresholds["flag_threshold"] = flag_threshold
    if flag_rate is not None:
        thresholds["flag_rate"] = flag_rate

    logger.info(
        "Starting fraud pipeline: sensitivity=%s, flag_rate=%s",
        sensitivity,
        thresholds["flag_rate"],
    )

    df = load_transactions(csv_path)
    featured = build_features(df, thresholds)
    rule_results = apply_rules(featured, thresholds)

    fraud_scores: list[float] = []
    reasons_lists: list[list[str]] = []
    risk_levels: list[str] = []

    for rule_result in rule_results:
        score, _contributions = score_transaction(rule_result, weights)
        bullets = explain_transaction(rule_result, thresholds)

        fraud_scores.append(score)
        reasons_lists.append(bullets)
        risk_levels.append(
            assign_risk_level(
                score,
                high_threshold=thresholds["high_risk_threshold"],
                medium_threshold=thresholds["medium_risk_threshold"],
            )
        )

    enriched = enrich_dataframe(
        df,
        fraud_scores,
        [False] * len(fraud_scores),
        reasons_lists,
        risk_levels,
    )
    enriched = apply_flagging(enriched, thresholds["flag_rate"])

    if output_path:
        write_enriched_csv(enriched, output_path)
        logger.info("Wrote enriched CSV to %s", output_path)

    ranked = ranked_suspicious(enriched)
    flagged_df = flagged_only(enriched)

    summary = {
        "total_transactions": len(enriched),
        "flagged_transactions": len(flagged_df),
        "high_risk_count": int((enriched["risk_level"] == "high").sum()),
        "medium_risk_count": int((enriched["risk_level"] == "medium").sum()),
        "low_risk_count": int((enriched["risk_level"] == "low").sum()),
        "flag_threshold": thresholds["flag_threshold"],
        "flag_rate": thresholds["flag_rate"],
        "sensitivity": sensitivity,
        "min_flagged_score": float(flagged_df["fraud_score"].min())
        if len(flagged_df) > 0
        else 0.0,
        "max_flagged_score": float(flagged_df["fraud_score"].max())
        if len(flagged_df) > 0
        else 0.0,
    }

    logger.info(
        "Pipeline complete: %s total, %s flagged (top %.0f%%)",
        summary["total_transactions"],
        summary["flagged_transactions"],
        thresholds["flag_rate"] * 100,
    )

    return {
        "dataframe": enriched,
        "ranked": ranked,
        "flagged": flagged_df,
        "summary": summary,
    }


def detect_fraud(
    csv_path: str | Path,
    output_path: str | Path = "transactions_flagged.csv",
    sensitivity: SensitivityMode = "balanced",
) -> pd.DataFrame:
    """Backward-compatible API: run pipeline and return enriched DataFrame."""
    result = run_pipeline(csv_path, output_path, sensitivity=sensitivity)
    return result["dataframe"]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    detect_fraud("data/transactions.csv", "data/transactions_flagged.csv")
