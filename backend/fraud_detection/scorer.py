"""Combine rule signals into a normalized fraud score (0–100)."""

from __future__ import annotations

from .config import WeightConfig
from .rules import RuleResult, SIGNAL_WEIGHT_KEYS, max_raw_score


def score_transaction(
    rule_result: RuleResult, weights: WeightConfig
) -> tuple[float, dict[str, float]]:
    """
    Weighted sum of signals, normalized to 0–100.
    Returns (fraud_score, contribution_by_weight_category).
    """
    raw = 0.0
    contributions: dict[str, float] = {}

    for signal_name, signal_value in rule_result.signals.items():
        weight_key = SIGNAL_WEIGHT_KEYS.get(signal_name)
        if not weight_key or weight_key not in weights:
            continue
        weight = weights[weight_key]
        points = weight * signal_value
        raw += points
        contributions[weight_key] = contributions.get(weight_key, 0.0) + points

    ceiling = max_raw_score(weights)
    normalized = min(100.0, (raw / ceiling) * 100.0) if ceiling > 0 else 0.0
    return round(normalized, 2), contributions


def assign_risk_level(
    fraud_score: float,
    *,
    high_threshold: float = 80.0,
    medium_threshold: float = 50.0,
) -> str:
    if fraud_score >= high_threshold:
        return "high"
    if fraud_score >= medium_threshold:
        return "medium"
    return "low"
