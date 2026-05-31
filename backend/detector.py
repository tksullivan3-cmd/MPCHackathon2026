import pandas as pd
from collections import defaultdict


# -----------------------------
# 1. Load and prepare dataset
# -----------------------------

def load_transactions(csv_path):
    df = pd.read_csv(csv_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    df["fraud_score"] = 0
    df["risk_level"] = "low"
    df["flag_reasons"] = ""

    return df


# -----------------------------
# 2. Per-card baselines
# -----------------------------

def build_card_baselines(df):
    baselines = {}

    for card_id, group in df.groupby("card_id"):
        baselines[card_id] = {
            "median_amount": group["amount"].median(),
            "usual_categories": set(group["merchant_category"].dropna()),
            "usual_merchants": set(group["merchant_name"].dropna()),
            "usual_devices": set(group["device_id"].dropna()),
            "usual_ips": set(group["ip_address"].dropna()),
            "usual_countries": set(group["merchant_country"].dropna()),
        }

    return baselines


# -----------------------------
# 3. Amount anomaly detector
# -----------------------------

def amount_anomaly(row, baseline):
    score = 0
    reasons = []

    median = baseline["median_amount"]

    if median > 0:
        ratio = row["amount"] / median

        if ratio >= 10:
            score += 35
            reasons.append(f"Amount is {ratio:.1f}x this card's median")
        elif ratio >= 5:
            score += 20
            reasons.append(f"Amount is {ratio:.1f}x this card's median")
        elif ratio >= 3:
            score += 10
            reasons.append(f"Amount is {ratio:.1f}x this card's median")

    return score, reasons


# -----------------------------
# 4. Risky category detector
# -----------------------------

def category_risk(row):
    score = 0
    reasons = []

    category = row["merchant_category"]

    if category == "gift_card":
        score += 30
        reasons.append("Gift card purchase")

    elif category == "electronics":
        score += 15
        reasons.append("Electronics purchase")

    elif category == "travel":
        score += 10
        reasons.append("Travel purchase")

    elif category == "atm":
        score += 10
        reasons.append("ATM transaction")

    return score, reasons


# -----------------------------
# 5. Country mismatch detector
# -----------------------------

def country_mismatch(row):
    score = 0
    reasons = []

    if row["merchant_country"] != row["cardholder_country"]:
        score += 15
        reasons.append("Merchant country differs from cardholder country")

    return score, reasons


# -----------------------------
# 6. New device / new IP detector
# -----------------------------

def device_ip_anomaly(row, baseline):
    score = 0
    reasons = []

    if row["channel"] == "online":
        device = row["device_id"]
        ip = row["ip_address"]

        if pd.notna(device) and device not in baseline["usual_devices"]:
            score += 20
            reasons.append("New device for this card")

        if pd.notna(ip) and ip not in baseline["usual_ips"]:
            score += 15
            reasons.append("New IP address for this card")

    return score, reasons


# -----------------------------
# 7. Card velocity detector
# Same card making many purchases quickly
# -----------------------------

def add_card_velocity_signal(df):
    df["card_velocity_score"] = 0
    df["card_velocity_reason"] = ""

    for card_id, group in df.groupby("card_id"):
        group = group.sort_values("timestamp")

        for idx, row in group.iterrows():
            start_time = row["timestamp"] - pd.Timedelta(minutes=10)

            recent = group[
                (group["timestamp"] >= start_time) &
                (group["timestamp"] <= row["timestamp"])
            ]

            if len(recent) >= 4:
                df.loc[idx, "card_velocity_score"] += 30
                df.loc[idx, "card_velocity_reason"] = (
                    f"{len(recent)} transactions on same card within 10 minutes"
                )

    return df


# -----------------------------
# 8. Merchant burst detector
# Many cards using same merchant quickly
# -----------------------------

def add_merchant_burst_signal(df):
    df["merchant_burst_score"] = 0
    df["merchant_burst_reason"] = ""

    for merchant, group in df.groupby("merchant_name"):
        group = group.sort_values("timestamp")

        for idx, row in group.iterrows():
            start_time = row["timestamp"] - pd.Timedelta(minutes=30)

            recent = group[
                (group["timestamp"] >= start_time) &
                (group["timestamp"] <= row["timestamp"])
            ]

            unique_cards = recent["card_id"].nunique()

            if len(recent) >= 5 and unique_cards >= 4:
                df.loc[idx, "merchant_burst_score"] += 35
                df.loc[idx, "merchant_burst_reason"] = (
                    f"Merchant burst: {len(recent)} transactions "
                    f"across {unique_cards} cards within 30 minutes"
                )

    return df


# -----------------------------
# 9. Shared device / shared IP detector
# Same online device/IP used by multiple cards
# -----------------------------

def add_shared_device_ip_signal(df):
    df["shared_device_ip_score"] = 0
    df["shared_device_ip_reason"] = ""

    device_to_cards = df.groupby("device_id")["card_id"].nunique()
    ip_to_cards = df.groupby("ip_address")["card_id"].nunique()

    for idx, row in df.iterrows():
        reasons = []
        score = 0

        device = row["device_id"]
        ip = row["ip_address"]

        if pd.notna(device) and device_to_cards.get(device, 0) >= 3:
            score += 25
            reasons.append(
                f"Device used by {device_to_cards[device]} different cards"
            )

        if pd.notna(ip) and ip_to_cards.get(ip, 0) >= 3:
            score += 25
            reasons.append(
                f"IP address used by {ip_to_cards[ip]} different cards"
            )

        df.loc[idx, "shared_device_ip_score"] = score
        df.loc[idx, "shared_device_ip_reason"] = "; ".join(reasons)

    return df


# -----------------------------
# 10. Main fraud detector
# -----------------------------

def detect_fraud(csv_path, output_path="transactions_flagged.csv"):
    df = load_transactions(csv_path)

    baselines = build_card_baselines(df)

    df = add_card_velocity_signal(df)
    df = add_merchant_burst_signal(df)
    df = add_shared_device_ip_signal(df)

    all_scores = []
    all_reasons = []

    for idx, row in df.iterrows():
        card_id = row["card_id"]
        baseline = baselines[card_id]

        score = 0
        reasons = []

        detectors = [
            amount_anomaly(row, baseline),
            category_risk(row),
            country_mismatch(row),
            device_ip_anomaly(row, baseline),
        ]

        for detector_score, detector_reasons in detectors:
            score += detector_score
            reasons.extend(detector_reasons)

        score += row["card_velocity_score"]
        score += row["merchant_burst_score"]
        score += row["shared_device_ip_score"]

        for col in [
            "card_velocity_reason",
            "merchant_burst_reason",
            "shared_device_ip_reason",
        ]:
            if row[col]:
                reasons.append(row[col])

        all_scores.append(score)
        all_reasons.append("; ".join(reasons))

    df["fraud_score"] = all_scores
    df["flag_reasons"] = all_reasons

    df["risk_level"] = df["fraud_score"].apply(assign_risk_level)

    # Flag top 7% of transactions
    num_to_flag = max(1, int(len(df) * 0.07))

    df["is_flagged"] = False

    top_idx = df.nlargest(num_to_flag, "fraud_score").index
    df.loc[top_idx, "is_flagged"] = True

    download_columns = [
    "transaction_id",
    "timestamp",
    "card_id",
    "amount",
    "merchant_name",
    "merchant_category",
    "channel",
    "cardholder_country",
    "merchant_country",
    "fraud_score",
    "risk_level",
    "is_flagged",
    "flag_reasons",
    ]

    df[download_columns].to_csv(output_path, index=False)
    return df


# -----------------------------
# 11. Risk labels
# -----------------------------

def assign_risk_level(score):
    if score >= 80:
        return "high"
    elif score >= 50:
        return "medium"
    else:
        return "low"


# -----------------------------
# 12. Run directly
# -----------------------------

if __name__ == "__main__":
    result = detect_fraud(
        csv_path="data/transactions.csv",
        output_path="data/transactions_flagged.csv"
    )

    flagged = result[result["is_flagged"] == True]

    print("Total transactions:", len(result))
    print("Flagged transactions:", len(flagged))
    print()
    print(flagged[[
        "transaction_id",
        "timestamp",
        "card_id",
        "amount",
        "merchant_name",
        "fraud_score",
        "risk_level",
        "flag_reasons"
    ]].head(30))