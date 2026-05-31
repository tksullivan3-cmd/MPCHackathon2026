"""Central configuration for thresholds, weights, and sensitivity presets."""

from __future__ import annotations

from typing import Any, Literal, TypedDict

SensitivityMode = Literal["strict", "balanced", "lenient"]


class WeightConfig(TypedDict):
    amount_anomaly: float
    device_anomaly: float
    ip_anomaly: float
    geography_mismatch: float
    category_rarity: float
    velocity_burst: float
    merchant_spike: float
    cross_card_device_reuse: float
    cross_card_ip_reuse: float
    amount_iqr_outlier: float


class ThresholdConfig(TypedDict):
    amount_zscore_high: float
    amount_ratio_spike: float
    amount_ratio_moderate: float
    velocity_5min_count: int
    velocity_1hr_count: int
    velocity_burst_minutes: float
    category_rarity_max_pct: float
    merchant_spike_tx_count: int
    merchant_spike_unique_cards: int
    merchant_spike_window_minutes: int
    cross_card_device_min_cards: int
    cross_card_ip_min_cards: int
    flag_threshold: float
    high_risk_threshold: float
    medium_risk_threshold: float
    max_reasons_per_tx: int


DEFAULT_WEIGHTS: WeightConfig = {
    "amount_anomaly": 25.0,
    "device_anomaly": 20.0,
    "ip_anomaly": 15.0,
    "geography_mismatch": 15.0,
    "category_rarity": 10.0,
    "velocity_burst": 10.0,
    "merchant_spike": 5.0,
    "cross_card_device_reuse": 12.0,
    "cross_card_ip_reuse": 10.0,
    "amount_iqr_outlier": 8.0,
}

DEFAULT_THRESHOLDS: ThresholdConfig = {
    "amount_zscore_high": 3.0,
    "amount_ratio_spike": 5.0,
    "amount_ratio_moderate": 3.0,
    "velocity_5min_count": 4,
    "velocity_1hr_count": 8,
    "velocity_burst_minutes": 5.0,
    "category_rarity_max_pct": 5.0,
    "merchant_spike_tx_count": 5,
    "merchant_spike_unique_cards": 4,
    "merchant_spike_window_minutes": 30,
    "cross_card_device_min_cards": 3,
    "cross_card_ip_min_cards": 3,
    "flag_threshold": 60.0,
    "high_risk_threshold": 80.0,
    "medium_risk_threshold": 50.0,
    "max_reasons_per_tx": 5,
}

SENSITIVITY_PRESETS: dict[SensitivityMode, dict[str, Any]] = {
    "strict": {
        "flag_threshold": 50.0,
        "weight_multiplier": 1.15,
    },
    "balanced": {
        "flag_threshold": 60.0,
        "weight_multiplier": 1.0,
    },
    "lenient": {
        "flag_threshold": 70.0,
        "weight_multiplier": 0.88,
    },
}


def build_config(
    sensitivity: SensitivityMode = "balanced",
    *,
    weights: WeightConfig | None = None,
    thresholds: ThresholdConfig | None = None,
) -> dict[str, Any]:
    """Merge defaults with sensitivity preset overrides."""
    preset = SENSITIVITY_PRESETS[sensitivity]
    merged_weights = dict(weights or DEFAULT_WEIGHTS)
    multiplier = float(preset["weight_multiplier"])
    merged_weights = {k: v * multiplier for k, v in merged_weights.items()}

    merged_thresholds = dict(DEFAULT_THRESHOLDS)
    merged_thresholds["flag_threshold"] = float(preset["flag_threshold"])
    if thresholds:
        merged_thresholds.update(thresholds)

    return {
        "weights": merged_weights,
        "thresholds": merged_thresholds,
        "sensitivity": sensitivity,
    }
