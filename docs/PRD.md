# Product Requirements Document — Fraud Hunter

**Project:** MPC Hackathon 2026  
**Product:** Fraud Hunter  
**Version:** MVP (24-hour build)  
**Last updated:** May 2026

---

## 1. Summary

Fraud Hunter is a web application that helps fraud and operations teams **upload transaction data, automatically score risk, and review flagged activity** in a focused queue. The product prioritizes **explainability** (why something was flagged), **analyst throughput** (one case at a time), and **lightweight feedback** when an analyst dismisses a false positive.

---

## 2. Target user

**Primary user:** Fraud analyst or operations reviewer at a fintech, payments team, or internal risk group.

**Context:** They receive periodic transaction exports (CSV), need to separate noise from real risk, and must document decisions (approve legitimate flags, dismiss false positives, escalate edge cases). They are not data scientists; they need clear reasons and a simple workflow, not model tuning UIs.

**Secondary user:** Team lead or manager who wants a **high-level overview** (counts, risk mix, categories) after a batch run—without entering the full review queue.

---

## 3. Problem statement

Manual review of large transaction files is slow and inconsistent. Rules-only systems either flood analysts with false positives or hide real fraud. Analysts lack a single place to:

1. Run detection on a new file  
2. See aggregate risk at a glance  
3. Work through flags with context and actions  
4. Reduce repeat noise when they disagree with the engine  

**Fraud Hunter solves:** ingest CSV → score and flag → dashboard + queue → session-aware dismissal feedback.

---

## 4. Goals and success criteria

### Goals

| Goal | Description |
|------|-------------|
| **G1 — Ingest** | Upload a valid transactions CSV and receive scored, flagged results in one flow. |
| **G2 — Understand** | Overview shows summary metrics and charts derived from the current analysis. |
| **G3 — Review** | Review queue presents flagged transactions one at a time with Approve / Dismiss / Escalate. |
| **G4 — Learn (session)** | Dismissing a flag slightly tightens thresholds and can suppress similar flags for the rest of the session. |
| **G5 — Trust** | Every flag includes human-readable `flag_reasons` tied to detector signals. |

### Success looks like

- An analyst can complete **upload → overview → review** without leaving the app.  
- **Top ~7%** of transactions by composite score are flagged for review (configurable in code, fixed for MVP).  
- Dismissals reduce **repeat false positives** for same merchant/category/reason patterns within the session.  
- Empty states guide users when no file has been analyzed (placeholder art + link to Upload).  
- Demo-ready in a **24-hour hackathon** window: stable local run (frontend + backend).

### Non-goals (explicitly out of scope for MVP)

| Out of scope | Rationale |
|--------------|-----------|
| User accounts, auth, RBAC | Hackathon time; single shared session assumed. |
| Persistent learning across sessions / model retraining | Session-only client rules; no ML pipeline. |
| Real-time streaming ingestion | Batch CSV only. |
| Production deployment, SLAs, audit log backend | Local dev; audit/export buttons not wired. |
| Mobile-first / native apps | Desktop-first; responsive partial only. |
| Automated actions (block card, notify customer) | Human-in-the-loop review only. |
| Multi-tenant or role-based workflows | Single analyst persona. |
| Integration with external case management | Export/audit placeholders only. |

---

## 5. User stories (MVP)

1. **As an analyst**, I upload `transactions.csv` so the system can score and flag suspicious rows.  
2. **As an analyst**, I see total vs flagged counts and charts on Overview after analysis.  
3. **As an analyst**, I review flags one at a time and choose Approve, Dismiss, or Escalate.  
4. **As an analyst**, I undo my last review action if I made a mistake.  
5. **As an analyst**, when I dismiss a flag, similar lower-confidence flags are suppressed for this session.  
6. **As an analyst**, I use dark mode for long review sessions.  
7. **As a new user**, I see clear empty states on Overview and Review Queue until I upload data.

---

## 6. Functional requirements

### 6.1 Upload

- Accept `.csv` only; show validation errors for wrong file types.  
- `POST` file to backend; display loading state during analysis.  
- Show success summary (total processed, flagged count).  
- Optional: conveyor animation after analyze (visual demo of scanning).

### 6.2 Detection (backend)

- Parse required columns; score each row with composite signals (amount, category, geo, device/IP, velocity, merchant burst, shared device/IP).  
- Assign `fraud_score`, `risk_level`, `flag_reasons`.  
- Flag top 7% by score (minimum one row).  
- Return flagged rows + aggregate counts to frontend.

### 6.3 Overview

- Summary cards: totals, flagged count, risk breakdown.  
- Charts: risk breakdown, score distribution, top suspicious, category mix, recent alerts table.  
- Empty state with bar-chart placeholder image and link to Upload when no analysis exists.  
- Reflect session learning (reduced flagged counts after dismissals).

### 6.4 Review queue

- List flagged transactions sorted by score (highest first).  
- Active card: ID, card, merchant, amount, risk, reasons, actions.  
- Collapsed rows for reviewed/pending items with action badges.  
- Undo last action; revert dismissal learning when undoing dismiss.  
- Empty state with illustration when no dataset loaded.

### 6.5 Session learning (frontend)

- On dismiss: record suppression rules (merchant, category, reason overlap).  
- Raise session score floor incrementally.  
- Auto-suppress matching pending flags; update Overview counts.  
- Reset learning on new CSV upload.

---

## 7. Non-functional requirements (MVP bar)

- **Performance:** Analysis of hackathon-sized CSVs (&lt; few seconds) on laptop.  
- **Compatibility:** Chrome/Edge; backend on `127.0.0.1:8000`, frontend on Vite dev port.  
- **Accessibility:** Basic semantic HTML; `prefers-reduced-motion` for conveyor.  
- **Theming:** Light/dark mode with persisted preference.

---

## 8. Assumptions and constraints

- Single machine dev setup; CORS allows local frontend origin.  
- One analyst at a time; no concurrent edit conflicts.  
- CSV schema matches hackathon dataset (fixed column set).  
- English-only UI.

---

## 9. Features not implemented

The following were planned or discussed but **not shipped** in the MVP due to the 24-hour hackathon scope:

| Feature | Notes |
|---------|--------|
| **Mobile friendliness** | UI is desktop-first with only partial responsive breakpoints. A full mobile layout (touch targets, stacked charts, review queue on small screens) was deferred. |
| **Web optimization (TTI, CLS, Lighthouse)** | No dedicated pass on Time to Interactive, Cumulative Layout Shift, loading placeholders, code splitting, or Lighthouse-driven performance work. |
| **Novel signal** | Additional detection signals beyond the current rule set were a lower priority. With limited time, the team focused on the existing composite scorer; new signals could be added with more engineering time. |

See also **§10 Future work** and the README “What we would build next” section.

---

## 10. Future work (post-MVP)

Documented separately in README: performance/mobile optimization, smarter detection (fewer FP/FN), full mobile experience, wired export/audit, persistent learning, auth, and production hardening.

---

## 11. Open questions (deferred)

- Should Escalate write to a backend case store? (Not in MVP.)  
- Should Approve/Dismiss persist after refresh? (Not in MVP.)  
- Optimal flag rate vs fixed 7%? (Tuning post-hackathon.)
