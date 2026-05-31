# Fraud Hunter

A full-stack fraud detection tool built for the MPC Hackathon 2026. Upload transaction CSV data, run a rule-based scoring engine, explore results on a dashboard, download a flagged CSV export, and work through suspicious transactions in a reviewer queue.

## Documentation

- [Product Requirements Document (PRD)](docs/PRD.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)

## Overview

**Fraud Hunter** helps teams analyze card transaction data and surface suspicious activity for human review. The app combines a **React + TypeScript** frontend with a **Python FastAPI** backend that scores transactions, assigns risk levels, explains why transactions were flagged, and returns a reviewer-friendly CSV export.

**Typical workflow:**

1. **Upload** a `transactions.csv` file on the Upload page.
2. **Analyze** transactions through the backend fraud detection API.
3. **Overview** — view summary metrics and charts.
4. **Review Queue** — approve, dismiss, or escalate flagged items one at a time.
5. **Download** the flagged CSV export after analysis.

Dismissals teach the system **within the current session** (threshold tweaks and similar-flag suppression). Learning resets when you upload a new file.

## Features

- CSV upload and validation
- Rule-based fraud scoring engine with explainable `flag_reasons`
- Overview dashboard (summary cards, charts, recent alerts)
- Review Queue (approve / dismiss / escalate, undo)
- Review Queue filters (risk, search, amount range)
- Session learning from dismissals
- Downloadable flagged CSV (`GET /download-flagged-csv`)
- Dark mode toggle
- Upload conveyor animation

## Flag detection strategy

The backend (`backend/fraud_detection/`) uses a **deterministic, rule-based** composite score (no machine learning). `backend/detector.py` is a thin compatibility wrapper around the package.

| Module | Role |
|--------|------|
| `loader.py` | CSV ingest and validation |
| `features.py` | Statistical features (amount, velocity, merchant, geo, device/IP) |
| `rules.py` | Anomaly signals |
| `scorer.py` | Weighted score → 0–100 (one contribution cap per category) |
| `explain.py` | Human-readable bullets (1–5 per flag) |
| `export.py` | Enriched / cleaned CSV output |
| `config.py` | Weights, thresholds, `strict` / `balanced` / `lenient` |
| `main.py` | Pipeline orchestration |

### Scoring signals

| Signal | What it detects |
|--------|------------------|
| Amount anomaly | Spend far above the card’s median |
| Category risk | Gift cards, electronics, travel, ATM, etc. |
| Country mismatch | Merchant country ≠ cardholder country |
| Device / IP anomaly | New device or IP (online channel) |
| Card velocity | Many transactions on one card in a short window |
| Merchant burst | Many cards at one merchant quickly |
| Shared device / IP | Same device or IP across multiple cards |

### Risk levels

| Level | Score |
|-------|--------|
| High | ≥ 65 |
| Medium | ≥ 40 |
| Low | &lt; 40 |

### Flagging policy

Transactions are scored **0–100**, then the **top 7%** by score are flagged (minimum 1 row). Only flagged rows are sent to the frontend for Overview and Review Queue.

---

## Prerequisites

| Tool | Version |
|------|---------|
| **Node.js** | 18+ |
| **npm** | Comes with Node.js |
| **Python** | 3.10+ |

You need **two terminals** — one for the backend, one for the frontend.

---

## Installation and run

### 1. Clone and open the project

```bash
git clone <your-repo-url>
cd MPCHackathon2026
```

### 2. Backend (Python)

All backend commands run from the **`backend`** folder. The API must be running before you click **Analyze Transactions** in the UI.

**macOS / Linux:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Windows (PowerShell):**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

**Windows (Command Prompt):**

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend URL: **http://127.0.0.1:8000**

- Interactive API docs: http://127.0.0.1:8000/docs  
- On first upload, the server writes files under `backend/data/` (this folder is gitignored).

**Optional — run the detector from the CLI:**

```bash
# With venv activated, from backend/
python -m fraud_detection.main
```

(Requires `backend/data/transactions.csv` to exist locally.)

### 3. Frontend (Node)

In a **second terminal**, from the **project root** (not `backend/`):

```bash
npm install
npm run dev
```

Frontend URL: **http://localhost:5173**

### 4. Use the app

1. Open http://localhost:5173  
2. Go to **Upload**  
3. Choose a CSV that matches the [required columns](#csv-format)  
4. Click **Analyze Transactions**  
5. Open **Overview** and **Review Queue**

**Production build (optional):**

```bash
npm run build
npm run preview
```

---

## API endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/detect-fraud` | POST | Upload CSV, run fraud detection, return JSON results |
| `/download-flagged-csv` | GET | Download the last generated flagged CSV |

The frontend calls `http://127.0.0.1:8000` for analysis. Start the backend first.

---

## CSV format

Required columns:

`transaction_id`, `timestamp`, `card_id`, `amount`, `merchant_name`, `merchant_category`, `channel`, `cardholder_country`, `merchant_country`, `device_id`, `ip_address`

---

## Project structure

```
MPCHackathon2026/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── detector.py          # Legacy import wrapper
│   ├── requirements.txt
│   └── fraud_detection/     # Scoring engine
├── docs/
├── public/images/
├── src/
│   ├── pages/               # Upload, Overview, Review Queue
│   ├── components/
│   └── lib/                 # Session learning
├── package.json
└── README.md
```

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| `uvicorn` not found | Activate the venv, then `pip install -r requirements.txt` again from `backend/` |
| `ModuleNotFoundError: detector` | Run `uvicorn` from **`backend/`**, not the repo root |
| Upload fails / network error | Confirm backend is on http://127.0.0.1:8000 and CORS is not blocked |
| `Activate.ps1` disabled (Windows) | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use `activate.bat` |
| No sample CSV in repo | Provide your own `transactions.csv`; nothing is committed under `backend/data/` |
| Port 8000 in use | Stop the other process or run `uvicorn main:app --reload --port 8001` and update the fetch URL in `src/pages/UploadCsvPage.tsx` |

---

## Technologies

| Area | Stack |
|------|--------|
| Frontend | React, TypeScript, Vite, React Router |
| Backend | Python, FastAPI, Uvicorn, Pandas |
| Styling | CSS variables (light / dark theme) |

---

## Features not implemented

- **Mobile friendliness** — desktop-first layout
- **Web optimization** (TTI, CLS, Lighthouse) — no performance pass
- **Novel / ML-based signals** — rule engine only; more time would go toward smarter detection
- User authentication, persistent review history, production deployment

## What we would build next

With more time: mobile layout, performance tuning, smarter detection (fewer false positives/negatives), persisted reviewer decisions, and auth for analyst teams.
