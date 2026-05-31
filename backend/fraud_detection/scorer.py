"""Combine rule signals into a normalized fraud score (0–100)."""

from __future__ import annotations

from .config import WeightConfig
from .rules import RuleResult, SIGNAL_WEIGHT_KEYS


def score_transaction(
    rule_result: RuleResult, weights: WeightConfig
) -> tuple[float, dict[str, float]]:
    """
    Weighted score with **one contribution cap per weight category**.

    Multiple signals in the same category (e.g. amount z-score + ratio spike)
    only count the strongest signal once, preventing inflated scores.
    """
    category_contributions: dict[str, float] = {}

    for signal_name, signal_value in rule_result.signals.items():
        weight_key = SIGNAL_WEIGHT_KEYS.get(signal_name)
        if not weight_key or weight_key not in weights:
            continue
        points = weights[weight_key] * min(1.0, float(signal_value))
        category_contributions[weight_key] = max(
            category_contributions.get(weight_key, 0.0),
            points,
        )

    raw = sum(category_contributions.values())
    ceiling = sum(weights.values())
    normalized = min(100.0, (raw / ceiling) * 100.0) if ceiling > 0 else 0.0
    return round(normalized, 2), category_contributions


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


def max_possible_score(weights: WeightConfig) -> float:
    """Sum of all category weights (= score when every category fires fully)."""
    return float(sum(weights.values()))
