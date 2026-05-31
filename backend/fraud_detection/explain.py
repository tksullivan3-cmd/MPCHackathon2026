"""Convert rule signals and context into human-readable explanations."""

from __future__ import annotations

from .config import ThresholdConfig
from typing import Callable

from .rules import RuleResult


def _bullet_amount_zscore(ctx: dict) -> str:
    z = ctx.get("amount_zscore", "?")
    return f"Amount z-score is {z} (unusually high vs this card's spending)"


def _bullet_amount_ratio(ctx: dict) -> str:
    ratio = ctx.get("amount_ratio", "?")
    return f"Amount is {ratio}× higher than card median"


def _bullet_amount_iqr() -> str:
    return "Amount is an outlier vs this card's typical range (IQR rule)"


def _bullet_velocity(ctx: dict) -> str:
    count = ctx.get("tx_count_5min")
    if count is not None:
        return f"High velocity: {count} transactions within 5 minutes"
    delta = ctx.get("time_delta_seconds")
    if delta is not None:
        minutes = max(1, int(float(delta) // 60))
        return f"High velocity: rapid burst (transactions ~{minutes} min apart)"
    return "High velocity: rapid transaction burst detected"


def _bullet_rare_category(ctx: dict) -> str:
    cat = ctx.get("merchant_category", "category")
    pct = ctx.get("category_rarity_pct", 0)
    return (
        f"Merchant category '{cat}' is rare for this card "
        f"({pct}% of card history)"
    )


def _bullet_foreign(ctx: dict) -> str:
    mc = ctx.get("merchant_country", "?")
    cc = ctx.get("cardholder_country", "?")
    return f"Foreign transaction: merchant in {mc}, cardholder in {cc}"


def _bullet_unseen_country(ctx: dict) -> str:
    country = ctx.get("merchant_country", "?")
    return f"Transaction occurs in new country: {country} (not seen before on this card)"


def _bullet_new_device() -> str:
    return "New device detected for this card (online channel)"


def _bullet_new_ip() -> str:
    return "New IP address detected for this card (online channel)"


def _bullet_device_reuse(ctx: dict) -> str:
    n = ctx.get("device_card_count", "?")
    return f"Device reused across {n} different cards (global anomaly)"


def _bullet_ip_reuse(ctx: dict) -> str:
    n = ctx.get("ip_card_count", "?")
    return f"IP address reused across {n} different cards (global anomaly)"


def _bullet_merchant_spike(ctx: dict) -> str:
    tx = ctx.get("merchant_tx_in_window", "?")
    cards = ctx.get("merchant_unique_cards_in_window", "?")
    return (
        f"Merchant spike: {tx} transactions across {cards} cards "
        f"within the detection window"
    )


SIGNAL_EXPLAINERS: dict[str, Callable[[RuleResult], str]] = {
    "amount_zscore_high": lambda r: _bullet_amount_zscore(r.context),
    "amount_ratio_spike": lambda r: _bullet_amount_ratio(r.context),
    "amount_ratio_moderate": lambda r: _bullet_amount_ratio(r.context),
    "amount_iqr_outlier": lambda _: _bullet_amount_iqr(),
    "velocity_burst": lambda r: _bullet_velocity(r.context),
    "velocity_5min_high": lambda r: _bullet_velocity(r.context),
    "rare_category": lambda r: _bullet_rare_category(r.context),
    "foreign_transaction": lambda r: _bullet_foreign(r.context),
    "unseen_country": lambda r: _bullet_unseen_country(r.context),
    "new_device": lambda _: _bullet_new_device(),
    "new_ip": lambda _: _bullet_new_ip(),
    "cross_card_device_reuse": lambda r: _bullet_device_reuse(r.context),
    "cross_card_ip_reuse": lambda r: _bullet_ip_reuse(r.context),
    "merchant_spike": lambda r: _bullet_merchant_spike(r.context),
}

# Priority order for selecting top N reasons
SIGNAL_PRIORITY: list[str] = [
    "amount_ratio_spike",
    "amount_zscore_high",
    "cross_card_device_reuse",
    "new_device",
    "foreign_transaction",
    "unseen_country",
    "velocity_burst",
    "velocity_5min_high",
    "new_ip",
    "cross_card_ip_reuse",
    "rare_category",
    "merchant_spike",
    "amount_iqr_outlier",
    "amount_ratio_moderate",
]


def explain_transaction(
    rule_result: RuleResult,
    thresholds: ThresholdConfig,
) -> list[str]:
    """Return 1–max_reasons human-readable bullet explanations."""
    bullets: list[str] = []
    fired = set(rule_result.signals.keys())

    for signal_name in SIGNAL_PRIORITY:
        if signal_name not in fired:
            continue
        explainer = SIGNAL_EXPLAINERS.get(signal_name)
        if explainer:
            bullets.append(explainer(rule_result))
        if len(bullets) >= thresholds["max_reasons_per_tx"]:
            break

    # Include any remaining fired signals not in priority list
    if len(bullets) < thresholds["max_reasons_per_tx"]:
        for signal_name in fired:
            if signal_name in SIGNAL_PRIORITY:
                continue
            explainer = SIGNAL_EXPLAINERS.get(signal_name)
            if explainer:
                bullets.append(explainer(rule_result))
            if len(bullets) >= thresholds["max_reasons_per_tx"]:
                break

    return bullets
