# Implementation Plan — Fraud Hunter

**Project:** MPC Hackathon 2026  
**Timeline:** ~24 hours (planning → MVP)  
**Team:** Kyle Velasco, Thomas, Awale

---

## 1. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React 19 + TypeScript + Vite)                     │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────────┐  │
│  │  Upload  │  │ Overview │  │     Review Queue        │  │
│  └────┬─────┘  └────▲─────┘  └───────────▲─────────────┘  │
│       │             │                     │                │
│       │    App state: analysisResult      │                │
│       │              sessionLearning      │                │
│       └──────────────┼─────────────────────┘                │
│                      │ fetch (multipart CSV)                │
└──────────────────────┼──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI (Python) — main.py                                 │
│  POST /detect-fraud  →  detector.detect_fraud()             │
│  Returns JSON: counts + flagged transactions[]                │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  detector.py (pandas)                                       │
│  Baselines → per-row signals → fraud_score → top 7% flag    │
└─────────────────────────────────────────────────────────────┘
```

**Data flow:** User selects CSV → frontend `FormData` → FastAPI saves file → `detect_fraud()` writes flagged CSV + returns flagged rows → React stores in `analysisResult` → Overview and Review Queue read derived state (with optional `sessionLearning` overlay).

---

## 2. Tech choices

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React 19, TypeScript, Vite | Fast dev, team familiarity, Thomas’s npm bootstrap |
| Routing | React Router 7 | Three main pages + nav |
| Styling | CSS modules per page + CSS variables | No extra UI kit; Kyle-owned visual system, dark mode |
| Charts | CSS bar charts + conic-gradient pie | Avoid chart lib integration time in 24h |
| Backend | FastAPI + uvicorn | Simple upload endpoint, auto OpenAPI |
| Data / scoring | pandas | CSV ingest, groupby baselines, vectorized loops |
| API format | JSON records from flagged subset only | Smaller payload for review UI |

**Not chosen:** PostgreSQL, Redis, ML frameworks, Recharts in production path (listed in package.json but charts implemented in CSS for MVP speed), cloud deploy, Docker.

---

## 3. Repository layout

| Path | Responsibility |
|------|----------------|
| `backend/main.py` | CORS, upload handler, response shaping |
| `backend/detector.py` | All fraud logic and flag policy |
| `src/App.tsx` | Global state, routes, learning callbacks |
| `src/lib/sessionLearning.ts` | Dismissal rules, suppression, derived analysis |
| `src/pages/UploadCsvPage.tsx` | CSV UX, API call, conveyor |
| `src/pages/OverviewPage.tsx` | Metrics, charts, empty state |
| `src/pages/ReviewQueuePage.tsx` | Queue UX, undo, learning hooks |
| `src/components/` | ThemeToggle, ConveyorAnimation |
| `public/images/` | Placeholder art, conveyor assets |

---

## 4. Team division of work

| Team member | Ownership | Contributions |
|-------------|-----------|---------------|
| **Awale** | Backend & detection | `detector.py` signal design (amount, category, geo, device/IP, velocity, merchant burst, shared device/IP); top-7% flagging; `main.py` FastAPI endpoint; CSV validation; debugging scoring edge cases |
| **Thomas** | Integration & tooling | Initial `npm`/Vite project setup; `POST /detect-fraud` wiring from Upload page; CORS/origin config; shared debugging across stack |
| **Kyle** | Frontend UI/UX | Page layouts (Upload, Overview, Review Queue); blue theme + dark mode; summary cards and CSS charts; empty states and illustrations; conveyor animation; review actions, undo, session-learning UI; visual polish and frontend debugging |

**Collaboration:** End-to-end testing (upload → overview → review); PRD-aligned scope cuts; README and docs.

---

## 5. Key implementation decisions

1. **Flag only top 7%** — Keeps review queue manageable for demo; score still visible for context.  
2. **Return flagged rows only from API** — Overview operates on flagged set; total count in response metadata.  
3. **Session learning on client** — No backend retrain in 24h; dismissal updates `sessionLearning` in React and filters queue + overview.  
4. **Composite score + reasons string** — Explainability without separate reason API.  
5. **One-at-a-time review queue** — Simpler state than full table + filters; supports undo by transaction ID.  
6. **Hardcoded API URL** (`127.0.0.1:8000`) — Acceptable for hackathon demo; env config deferred.

---

## 6. What we skipped (and why)

| Skipped | Why |
|---------|-----|
| Auth / users | Not required for demo; adds session and DB work |
| Database | CSV in, JSON out sufficient for MVP |
| Persistent review decisions | Refresh clears queue progress |
| Export CSV / audit log buttons | UI placeholder only; no backend |
| ML / anomaly models | Rule engine faster to explain and ship |
| Full mobile layout | Desktop-first; time box |
| Automated tests | Manual E2E for hackathon |
| CI/CD & production hosting | Local run documented in README |
| WebSocket / streaming | Batch upload only |

---

## 7. Risks and mitigations (hackathon)

| Risk | Mitigation |
|------|------------|
| False positive flood | Top-7% cap + session dismiss suppression |
| CORS / port mismatch | Document fixed ports; Thomas verified origins |
| Large CSV slow | pandas acceptable for provided dataset size |
| State bugs on undo + learning | `transactionId`-based history; revert rule on undo dismiss |

---

## 8. Runbook (developer)

1. Backend: `cd backend` → venv → `pip install -r requirements.txt` → `uvicorn main:app --reload`  
2. Frontend: `npm install` → `npm run dev`  
3. Upload CSV from Upload page → verify Overview + Review Queue  

See root `README.md` for CSV schema and feature list.

---

## 9. Next engineering steps (if extended)

- Env-based API URL; persist reviews to API  
- Smarter detection (Awale) + mobile/responsive pass (Kyle)  
- Performance: code-split, chart skeletons, TTI/CLS (team)  
- Integration tests on `detector.py` and upload contract (Thomas + Awale)
