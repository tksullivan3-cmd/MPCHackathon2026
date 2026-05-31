# Fraud Hunter

A full-stack fraud detection tool built for the MPC Hackathon 2026. Upload transaction CSV data, run a rule-based scoring engine, explore results on a dashboard, and work through flagged transactions in a reviewer queue—with session learning that adjusts thresholds when analysts dismiss false positives.

## Documentation

- [Product Requirements Document (PRD)](docs/PRD.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)

## Overview

**Fraud Hunter** helps teams analyze card transaction data and surface suspicious activity for human review. The app combines a **React + TypeScript** frontend with a **Python FastAPI** backend that scores every transaction, assigns risk levels, and flags the highest-risk subset for investigation.

Typical workflow:

1. **Upload** a `transactions.csv` file on the Upload page.
2. **Analyze** transactions via the backend fraud detector.
3. **Overview** — view summary metrics, charts, and recent alerts.
4. **Review Queue** — approve, dismiss, or escalate flagged items one at a time.

Dismissals teach the system **within the current session**: thresholds tighten slightly and similar future flags can be suppressed, reducing repeat false positives without re-running the backend.

## Features

- **CSV upload & validation** — accepts `.csv` files and sends them to the API for analysis
- **Fraud scoring engine** — multi-signal detector with explainable `flag_reasons` per transaction
- **Overview dashboard** — summary cards, risk breakdown, score distribution, top suspicious transactions, category breakdown, and recent alerts table
- **Review queue** — one-at-a-time review with **Approve**, **Dismiss**, and **Escalate**
- **Undo** — revert the last review action (including dismissal learning)
- **Session learning** — dismissing a flag adjusts in-session thresholds and suppresses similar flags (merchant, category, reason patterns)
- **Dark mode** — theme toggle with persisted preference
- **Upload conveyor animation** — visual “scanning” belt with magnifying-glass fraud detection demo
- **Responsive layout** — desktop-first UI with partial responsive breakpoints

## Flag detection strategy

The backend module (`backend/fraud_detection/`) uses a **deterministic, rule-based** composite fraud score (no ML). Each transaction receives a score **0–100**, `is_flagged` (default threshold **60**), `risk_level`, and human-readable `flag_reasons`.

| Module | Role |
|--------|------|
| `loader.py` | CSV ingest + validation |
| `features.py` | Statistical features (amount, velocity, merchant, geo, device/IP) |
| `rules.py` | Anomaly signals (thresholds) |
| `scorer.py` | Weighted score → 0–100 |
| `explain.py` | Human-readable bullets (1–5 per flag) |
| `export.py` | Enriched CSV + ranked output |
| `config.py` | Weights, thresholds, `strict` / `balanced` / `lenient` |

Legacy import: `from detector import detect_fraud` still works.

### Per-card baselines

For each `card_id`, the engine builds a baseline from historical rows in the upload:

- Median spend amount
- Usual merchants, categories, devices, IPs, and countries

### Scoring signals

| Signal | What it detects |
|--------|------------------|
| **Amount anomaly** | Spend far above the card’s median (3×, 5×, 10× tiers) |
| **Category risk** | Higher-risk merchant categories (e.g. gift cards, electronics, travel, ATM) |
| **Country mismatch** | Merchant country ≠ cardholder country |
| **Device / IP anomaly** | New device or IP for online channel transactions |
| **Card velocity** | Many transactions on the same card within 10 minutes |
| **Merchant burst** | Many transactions at one merchant across multiple cards within 30 minutes |
| **Shared device / IP** | Same device or IP used by 3+ different cards |

Scores from all signals are summed into `fraud_score`.

### Risk levels

- **High** — score ≥ 80  
- **Medium** — score ≥ 50  
- **Low** — score &lt; 50  

### Flagging policy

Transactions with `fraud_score >= 60` (configurable; presets: strict 50, balanced 60, lenient 70) are flagged. Only flagged rows are returned to the frontend for the review queue and overview charts.

### Session learning (frontend)

When a reviewer **dismisses** a flag, the React app records suppression rules for the rest of the session (same merchant, category, or overlapping flag reasons with similar scores). This does not retrain the Python model—it filters and adjusts visibility of remaining flags client-side until a new CSV is uploaded.

---

## How to run

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.10+

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload
```

The API runs at **http://127.0.0.1:8000**.

**Dependencies** (`backend/requirements.txt`):

- `fastapi`
- `uvicorn`
- `pandas`
- `python-multipart`

Optional: run the detector directly on a local CSV:

```bash
python detector.py
```

(Ensure `data/transactions.csv` exists relative to `backend/`.)

### Frontend

From the project root:

```bash
npm install
npm run dev
```

The app runs at **http://localhost:5173** (Vite default). The upload page calls `POST http://127.0.0.1:8000/detect-fraud`—start the backend before analyzing a file.

**Production build:**

```bash
npm run build
npm run preview
```

### CSV format

The API expects columns including:

`transaction_id`, `timestamp`, `card_id`, `amount`, `merchant_name`, `merchant_category`, `channel`, `cardholder_country`, `merchant_country`, `device_id`, `ip_address`

---

## Project structure

```
MPCHackathon2026/
├── backend/
│   ├── main.py              # FastAPI app & /detect-fraud endpoint
│   ├── detector.py          # Thin wrapper → fraud_detection
│   ├── fraud_detection/     # Statistical fraud engine (see table above)
│   └── requirements.txt
├── public/images/        # Static assets (review art, conveyor images)
├── src/
│   ├── pages/            # Upload, Overview, Review Queue
│   ├── components/       # Theme toggle, conveyor animation
│   └── lib/              # Session learning helpers
└── package.json
```

---

## Features not implemented

- **Mobile friendliness** — desktop-first UI; full mobile layout was out of scope for the hackathon.
- **Web optimization (TTI, CLS, Lighthouse)** — no dedicated performance or layout-stability pass.
- **Novel signal** — additional fraud detection signals were lower priority given time limits; the current rule engine shipped instead.

See [docs/PRD.md](docs/PRD.md) for full product context.

## What we would build next

With just 24 hours, we only had one sunrise till the next sunrise to go from planning to an MVP with a few additional features. If we had one more week to work on the project, we would have added these features:

1. **Optimization** — we would have worked on optimizing our layout, including web performance, Time to Interactive, CLS, loading placeholders, and most importantly, improving our mobile website (in point 3).

2. **Smarter flag detection** — we would have added smarter algorithms to measure/assess fraudulent transactions across all patterns overall in order to reduce the margin of error and frequency of false positives / false negatives.

3. **Mobile friendly** — It would be really nice to have if we imagine shipping an app that is accessible to all devices.
