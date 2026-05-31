"""Deterministic rule engine: features → fired signals."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import pandas as pd

from .config import ThresholdConfig, WeightConfig

logger = logging.getLogger(__name__)

# Maps signal name → weight key in config
SIGNAL_WEIGHT_KEYS: dict[str, str] = {
    "amount_zscore_high": "amount_anomaly",
    "amount_ratio_spike": "amount_anomaly",
    "amount_ratio_moderate": "amount_anomaly",
    "amount_iqr_outlier": "amount_iqr_outlier",
    "velocity_burst": "velocity_burst",
    "velocity_5min_high": "velocity_burst",
    "new_device": "device_anomaly",
    "new_ip": "ip_anomaly",
    "foreign_transaction": "geography_mismatch",
    "unseen_country": "geography_mismatch",
    "rare_category": "category_rarity",
    "merchant_spike": "merchant_spike",
    "cross_card_device_reuse": "cross_card_device_reuse",
    "cross_card_ip_reuse": "cross_card_ip_reuse",
}


@dataclass
class RuleResult:
    """Fired signals for one transaction (values 0.0–1.0 contribution)."""

    signals: dict[str, float] = field(default_factory=dict)
    context: dict[str, Any] = field(default_factory=dict)


def evaluate_row(row: pd.Series, thresholds: ThresholdConfig) -> RuleResult:
    """Evaluate all rules for a single transaction row."""
    result = RuleResult()
    is_online = str(row.get("channel", "")).lower() == "online"

    zscore = float(row.get("amount_zscore", 0.0))
    ratio = float(row.get("amount_ratio_median", 0.0))

    if zscore >= thresholds["amount_zscore_high"]:
        result.signals["amount_zscore_high"] = 1.0
        result.context["amount_zscore"] = round(zscore, 2)

    if ratio >= thresholds["amount_ratio_spike"]:
        result.signals["amount_ratio_spike"] = 1.0
        result.context["amount_ratio"] = round(ratio, 1)
    elif ratio >= thresholds["amount_ratio_moderate"]:
        result.signals["amount_ratio_moderate"] = 0.6
        result.context["amount_ratio"] = round(ratio, 1)

    if bool(row.get("amount_iqr_outlier", False)):
        result.signals["amount_iqr_outlier"] = 1.0

    tx_5 = int(row.get("tx_count_5min", 0))
    if tx_5 >= thresholds["velocity_5min_count"]:
        result.signals["velocity_5min_high"] = 1.0
        result.context["tx_count_5min"] = tx_5

    if bool(row.get("velocity_burst", False)):
        result.signals["velocity_burst"] = 1.0
        delta = row.get("time_delta_seconds")
        if pd.notna(delta):
            result.context["time_delta_seconds"] = float(delta)

    rarity = float(row.get("category_rarity_pct", 100.0))
    if rarity <= thresholds["category_rarity_max_pct"]:
        result.signals["rare_category"] = 1.0
        result.context["category_rarity_pct"] = round(rarity, 2)
        result.context["merchant_category"] = row.get("merchant_category")

    if bool(row.get("geo_mismatch", False)):
        result.signals["foreign_transaction"] = 1.0
        result.context["merchant_country"] = row.get("merchant_country")
        result.context["cardholder_country"] = row.get("cardholder_country")

    if bool(row.get("unseen_country", False)):
        result.signals["unseen_country"] = 1.0
        result.context["merchant_country"] = row.get("merchant_country")

    if is_online and bool(row.get("new_device", False)):
        result.signals["new_device"] = 1.0

    if is_online and bool(row.get("new_ip", False)):
        result.signals["new_ip"] = 1.0

    device_cards = int(row.get("device_card_count", 0))
    if device_cards >= thresholds["cross_card_device_min_cards"]:
        result.signals["cross_card_device_reuse"] = 1.0
        result.context["device_card_count"] = device_cards

    ip_cards = int(row.get("ip_card_count", 0))
    if ip_cards >= thresholds["cross_card_ip_min_cards"]:
        result.signals["cross_card_ip_reuse"] = 1.0
        result.context["ip_card_count"] = ip_cards

    merchant_tx = int(row.get("merchant_tx_in_window", 0))
    merchant_cards = int(row.get("merchant_unique_cards_in_window", 0))
    if (
        merchant_tx >= thresholds["merchant_spike_tx_count"]
        and merchant_cards >= thresholds["merchant_spike_unique_cards"]
    ):
        result.signals["merchant_spike"] = 1.0
        result.context["merchant_tx_in_window"] = merchant_tx
        result.context["merchant_unique_cards_in_window"] = merchant_cards

    return result


def apply_rules(
    df: pd.DataFrame, thresholds: ThresholdConfig
) -> list[RuleResult]:
    """Evaluate rules for every row; log fired signals at DEBUG."""
    results: list[RuleResult] = []
    for _, row in df.iterrows():
        rule_result = evaluate_row(row, thresholds)
        results.append(rule_result)
        if rule_result.signals and logger.isEnabledFor(logging.DEBUG):
            tx_id = row.get("transaction_id", "?")
            logger.debug(
                "Rules fired for %s: %s",
                tx_id,
                list(rule_result.signals.keys()),
            )
    return results


def max_raw_score(weights: WeightConfig) -> float:
    """Maximum achievable raw score if all signal groups fire at full strength."""
    used_weight_keys: set[str] = set(SIGNAL_WEIGHT_KEYS.values())
    return sum(weights[k] for k in used_weight_keys if k in weights)
