# Fraud Hunter

A full-stack fraud detection tool built for the MPC Hackathon 2026. Upload transaction CSV data, run a rule-based scoring engine, explore results on a dashboard, download a cleaned flagged CSV, and work through suspicious transactions in a reviewer queue.

## Documentation

- [Product Requirements Document (PRD)](docs/PRD.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)

## Overview

Fraud Hunter helps teams analyze card transaction data and surface suspicious activity for human review. The app combines a React and TypeScript frontend with a Python FastAPI backend that scores transactions, assigns risk levels, explains why transactions were flagged, and returns a reviewer-friendly CSV export.

Typical workflow:

1. Upload a transactions.csv file on the Upload page.
2. Analyze transactions through the backend fraud detection API.
3. View summary metrics and charts on the Overview page.
4. Review suspicious transactions one at a time in the Review Queue.
5. Download the cleaned flagged CSV for reporting or further investigation.

## Features

- CSV upload and validation
- FastAPI backend for fraud analysis
- Rule-based fraud scoring engine
- Explainable flag reasons for each suspicious transaction
- Overview dashboard with summary cards and charts
- Review Queue with approve, dismiss, and escalate actions
- Search and filtering in the Review Queue
- Amount range filtering
- Risk level filtering
- Downloadable cleaned flagged CSV
- Dark mode toggle
- Upload conveyor animation
- Responsive dashboard layout

## Flag detection strategy

The backend uses a deterministic, rule-based fraud detection engine. It does not use machine learning. Each transaction receives a fraud score, risk level, flag status, and human-readable explanations.

The main fraud detection logic lives inside backend/fraud_detection/.

The legacy backend/detector.py file only re-exports the package functions so older imports still work.

## Backend architecture

| Module | Role |
|---|---|
| loader.py | Loads and validates CSV files |
| features.py | Builds statistical features and card baselines |
| rules.py | Applies fraud signal rules |
| scorer.py | Combines signals into a fraud score |
| explain.py | Creates human-readable flag explanations |
| export.py | Exports cleaned CSV results |
| config.py | Stores weights, thresholds, and scoring profiles |
| main.py | Orchestrates the fraud detection pipeline |

## Scoring signals

| Signal | What it detects |
|---|---|
| Amount anomaly | Transactions far above a card’s normal spending pattern |
| Category risk | Higher-risk merchant categories such as gift cards, electronics, travel, or ATM |
| Country mismatch | Merchant country differs from cardholder country |
| Device or IP anomaly | New device or IP activity for online transactions |
| Card velocity | Multiple transactions on the same card within a short time window |
| Merchant burst | Many transactions at one merchant across multiple cards |
| Shared device or IP | Same device or IP used across multiple cards |

## Risk levels

| Risk level | Score range |
|---|---|
| High | 80 and above |
| Medium | 50 to 79 |
| Low | Below 50 |

## Flagging policy

Each transaction receives a score from 0 to 100. The backend ranks transactions by fraud score and flags the highest-risk subset for review. Flagged transactions are returned to the frontend for the Overview dashboard and Review Queue.

## CSV export

After analysis, the app generates a cleaned flagged CSV. The exported file focuses on reviewer-friendly columns instead of internal scoring columns.

The exported CSV includes columns such as:

- transaction_id
- timestamp
- card_id
- amount
- merchant_name
- merchant_category
- channel
- cardholder_country
- merchant_country
- fraud_score
- risk_level
- is_flagged
- flag_reasons

## Project structure

MPCHackathon2026/
├── backend/
│   ├── main.py                  # FastAPI app and API endpoints
│   ├── detector.py              # Legacy compatibility wrapper
│   ├── requirements.txt         # Python backend dependencies
│   └── fraud_detection/         # Main fraud detection package
│       ├── __init__.py          # Package exports
│       ├── config.py            # Scoring weights, thresholds, profiles
│       ├── loader.py            # CSV loading and validation
│       ├── features.py          # Feature engineering and baselines
│       ├── rules.py             # Fraud signal rules
│       ├── scorer.py            # Composite fraud score calculation
│       ├── explain.py           # Human-readable flag explanations
│       ├── export.py            # Clean CSV export and ranked results
│       └── main.py              # Pipeline orchestration
├── docs/
│   ├── PRD.md
│   └── IMPLEMENTATION_PLAN.md
├── public/
│   └── images/                  # Static UI assets
├── src/
│   ├── components/              # Theme toggle, conveyor animation, shared UI
│   ├── hooks/                   # Frontend hooks
│   ├── lib/                     # Session learning helpers
│   ├── pages/                   # Upload, Overview, Review Queue pages
│   ├── App.tsx                  # Routes and app shell
│   ├── App.css                  # App-level layout styling
│   ├── index.css                # Global theme variables
│   └── main.tsx                 # React entry point
├── package.json
├── package-lock.json
└── README.md

## How to run

### Prerequisites

- Node.js 18 or newer
- npm
- Python 3.10 or newer

### Backend

From the project root:

cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

The backend runs at:

http://127.0.0.1:8000

### Frontend

From the project root:

npm install
npm run dev

The frontend runs at:

http://localhost:5173

## API endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| /detect-fraud | POST | Uploads CSV and runs fraud detection |
| /download-flagged-csv | GET | Downloads the cleaned flagged CSV |

## CSV format

The uploaded CSV should include columns such as:

- transaction_id
- timestamp
- card_id
- amount
- merchant_name
- merchant_category
- channel
- cardholder_country
- merchant_country
- device_id
- ip_address

## Technologies used

| Area | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | CSS |
| Backend | Python, FastAPI |
| Data processing | Pandas |
| API communication | Fetch API |
| Version control | Git and GitHub |

## Features not implemented

- Full mobile optimization
- Advanced machine learning model
- User authentication
- Persistent reviewer decisions
- Database storage
- Production deployment

## What we would build next

If we had more time, we would improve mobile responsiveness, add more advanced fraud detection signals, persist reviewer decisions in a database, and add user authentication for fraud analysts.
