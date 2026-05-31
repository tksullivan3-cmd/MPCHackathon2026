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


def run_pipeline(
    csv_path: str | Path,
    output_path: str | Path | None = None,
    *,
    sensitivity: SensitivityMode = "balanced",
    flag_threshold: float | None = None,
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

    logger.info(
        "Starting fraud pipeline: sensitivity=%s, flag_threshold=%s",
        sensitivity,
        thresholds["flag_threshold"],
    )

    df = load_transactions(csv_path)
    featured = build_features(df, thresholds)
    rule_results = apply_rules(featured, thresholds)

    fraud_scores: list[float] = []
    reasons_lists: list[list[str]] = []
    is_flagged: list[bool] = []
    risk_levels: list[str] = []

    for rule_result in rule_results:
        score, _contributions = score_transaction(rule_result, weights)
        bullets = explain_transaction(rule_result, thresholds)
        flagged = score >= thresholds["flag_threshold"]

        fraud_scores.append(score)
        reasons_lists.append(bullets)
        is_flagged.append(flagged)
        risk_levels.append(
            assign_risk_level(
                score,
                high_threshold=thresholds["high_risk_threshold"],
                medium_threshold=thresholds["medium_risk_threshold"],
            )
        )

    enriched = enrich_dataframe(
        df, fraud_scores, is_flagged, reasons_lists, risk_levels
    )

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
        "sensitivity": sensitivity,
    }

    logger.info(
        "Pipeline complete: %s total, %s flagged",
        summary["total_transactions"],
        summary["flagged_transactions"],
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
