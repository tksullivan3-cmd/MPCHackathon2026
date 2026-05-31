"""Statistical feature engineering (deterministic, no ML)."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .config import ThresholdConfig


def _safe_std(series: pd.Series) -> float:
    std = float(series.std(ddof=0))
    return std if std > 0 else 1e-9


def add_amount_features(df: pd.DataFrame) -> pd.DataFrame:
    """Per-card amount mean, median, std, z-score, ratio, IQR outlier flag."""
    out = df.copy()
    grouped = out.groupby("card_id")["amount"]

    out["card_amount_mean"] = grouped.transform("mean")
    out["card_amount_median"] = grouped.transform("median")
    out["card_amount_std"] = grouped.transform(lambda s: _safe_std(s))

    out["amount_zscore"] = (
        (out["amount"] - out["card_amount_mean"]) / out["card_amount_std"]
    ).abs()

    median = out["card_amount_median"].replace(0, np.nan)
    out["amount_ratio_median"] = out["amount"] / median
    out["amount_ratio_median"] = out["amount_ratio_median"].fillna(0.0)

    q1 = grouped.transform(lambda s: s.quantile(0.25))
    q3 = grouped.transform(lambda s: s.quantile(0.75))
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    out["amount_iqr_outlier"] = (out["amount"] < lower) | (out["amount"] > upper)

    return out


def add_velocity_features(
    df: pd.DataFrame, thresholds: ThresholdConfig
) -> pd.DataFrame:
    """Time deltas and transaction counts in rolling windows per card."""
    out = df.copy()
    out["time_delta_seconds"] = np.nan
    out["tx_count_5min"] = 0
    out["tx_count_1hr"] = 0

    window_5 = pd.Timedelta(minutes=5)
    window_1h = pd.Timedelta(hours=1)

    for card_id, group in out.groupby("card_id", sort=False):
        indices = group.index.to_list()
        times = group["timestamp"].to_list()

        for pos, idx in enumerate(indices):
            if pos > 0:
                delta = (times[pos] - times[pos - 1]).total_seconds()
                out.at[idx, "time_delta_seconds"] = delta

            current_time = times[pos]
            start_5 = current_time - window_5
            start_1h = current_time - window_1h

            count_5 = sum(1 for t in times[: pos + 1] if t >= start_5)
            count_1h = sum(1 for t in times[: pos + 1] if t >= start_1h)

            out.at[idx, "tx_count_5min"] = count_5
            out.at[idx, "tx_count_1hr"] = count_1h

    burst_minutes = thresholds["velocity_burst_minutes"]
    out["velocity_burst"] = (
        (out["time_delta_seconds"].notna())
        & (out["time_delta_seconds"] <= burst_minutes * 60)
        & (out["tx_count_5min"] >= thresholds["velocity_5min_count"])
    )

    return out


def add_merchant_features(df: pd.DataFrame) -> pd.DataFrame:
    """Category frequency and rarity per card."""
    out = df.copy()
    out["category_rarity_pct"] = 100.0

    for card_id, group in out.groupby("card_id", sort=False):
        total = len(group)
        if total == 0:
            continue
        counts = group["merchant_category"].value_counts(normalize=True)
        for idx in group.index:
            category = out.at[idx, "merchant_category"]
            if pd.isna(category):
                continue
            pct = float(counts.get(category, 0.0) * 100.0)
            out.at[idx, "category_rarity_pct"] = pct

    return out


def add_geography_features(df: pd.DataFrame) -> pd.DataFrame:
    """Country mismatch and first-seen merchant country per card."""
    out = df.copy()
    out["geo_mismatch"] = (
        out["merchant_country"].astype(str) != out["cardholder_country"].astype(str)
    )

    out["unseen_country"] = False
    seen_countries: dict[str, set[str]] = {}

    for idx, row in out.iterrows():
        card = str(row["card_id"])
        country = str(row["merchant_country"])
        if card not in seen_countries:
            seen_countries[card] = set()
        if country not in seen_countries[card] and len(seen_countries[card]) > 0:
            out.at[idx, "unseen_country"] = True
        seen_countries[card].add(country)

    return out


def add_device_ip_features(df: pd.DataFrame) -> pd.DataFrame:
    """New device/IP per card and global reuse counts."""
    out = df.copy()

    device_card_counts = (
        out.dropna(subset=["device_id"])
        .groupby("device_id")["card_id"]
        .nunique()
        .to_dict()
    )
    ip_card_counts = (
        out.dropna(subset=["ip_address"])
        .groupby("ip_address")["card_id"]
        .nunique()
        .to_dict()
    )

    out["device_card_count"] = out["device_id"].map(device_card_counts).fillna(0).astype(int)
    out["ip_card_count"] = out["ip_address"].map(ip_card_counts).fillna(0).astype(int)

    out["new_device"] = False
    out["new_ip"] = False
    card_devices: dict[str, set[str]] = {}
    card_ips: dict[str, set[str]] = {}

    for idx, row in out.iterrows():
        if str(row["channel"]).lower() != "online":
            continue

        card = str(row["card_id"])
        device = row["device_id"]
        ip = row["ip_address"]

        if card not in card_devices:
            card_devices[card] = set()
        if card not in card_ips:
            card_ips[card] = set()

        if pd.notna(device):
            if device not in card_devices[card] and len(card_devices[card]) > 0:
                out.at[idx, "new_device"] = True
            card_devices[card].add(str(device))

        if pd.notna(ip):
            if ip not in card_ips[card] and len(card_ips[card]) > 0:
                out.at[idx, "new_ip"] = True
            card_ips[card].add(str(ip))

    return out


def add_merchant_global_features(
    df: pd.DataFrame, thresholds: ThresholdConfig
) -> pd.DataFrame:
    """Merchant-level spike: many txs / many cards in a time window."""
    out = df.copy()
    out["merchant_tx_in_window"] = 0
    out["merchant_unique_cards_in_window"] = 0

    window = pd.Timedelta(minutes=thresholds["merchant_spike_window_minutes"])

    for merchant, group in out.groupby("merchant_name", sort=False):
        group = group.sort_values("timestamp")
        indices = group.index.to_list()
        times = group["timestamp"].to_list()
        cards = group["card_id"].to_list()

        for pos, idx in enumerate(indices):
            current_time = times[pos]
            start = current_time - window
            in_window = [
                i
                for i, t in enumerate(times[: pos + 1])
                if t >= start
            ]
            out.at[idx, "merchant_tx_in_window"] = len(in_window)
            unique_cards = len({cards[i] for i in in_window})
            out.at[idx, "merchant_unique_cards_in_window"] = unique_cards

    return out


def build_features(df: pd.DataFrame, thresholds: ThresholdConfig) -> pd.DataFrame:
    """Run full feature pipeline."""
    featured = add_amount_features(df)
    featured = add_velocity_features(featured, thresholds)
    featured = add_merchant_features(featured)
    featured = add_geography_features(featured)
    featured = add_device_ip_features(featured)
    featured = add_merchant_global_features(featured, thresholds)
    return featured
