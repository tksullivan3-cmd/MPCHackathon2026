import { useEffect, useMemo, useState } from 'react'
import './ReviewQueuePage.css'

type Transaction = {
  transaction_id: string
  timestamp: string
  card_id: string
  amount: number
  merchant_name: string
  fraud_score: number
  risk_level: string
  flag_reasons: string
  is_flagged: boolean
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

function parseTransactionsCsv(text: string): Transaction[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return []
  }

  const headers = parseCsvLine(lines[0])

  return lines
    .slice(1)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const cols = parseCsvLine(line)
      const row = Object.fromEntries(
        headers.map((header, index) => [header, cols[index] ?? '']),
      )

      return {
        transaction_id: row.transaction_id,
        timestamp: row.timestamp,
        card_id: row.card_id,
        amount: Number(row.amount),
        merchant_name: row.merchant_name,
        fraud_score: Number(row.fraud_score),
        risk_level: row.risk_level,
        flag_reasons: row.flag_reasons,
        is_flagged: row.is_flagged === 'True',
      }
    })
}

function getRiskClass(score: number): string {
  if (score >= 80) return 'review-card__risk--high'
  if (score >= 50) return 'review-card__risk--medium'
  return 'review-card__risk--low'
}

function getRiskLabel(score: number): string {
  if (score >= 80) return 'High risk'
  if (score >= 50) return 'Medium risk'
  return 'Low risk'
}

function CollapsedEntry({
  transaction,
  badge,
  reviewed = false,
}: {
  transaction: Transaction
  badge: string
  reviewed?: boolean
}) {
  return (
    <article
      className={`review-card${reviewed ? ' review-card--reviewed' : ''}`}
    >
      <div className="review-card__summary">
        <span className="review-card__summary-text">
          <span>{transaction.transaction_id}</span>
          <span>{transaction.card_id}</span>
          <span>{transaction.merchant_name}</span>
        </span>
        <span className="review-card__badge">{badge}</span>
      </div>
    </article>
  )
}

function ReviewQueuePage() {
  const [data, setData] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    fetch('/data/transactions_flagged.csv')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load CSV (${res.status})`)
        }
        return res.text()
      })
      .then((text) => {
        setData(parseTransactionsCsv(text))
        setError(null)
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load transaction data'
        setError(message)
        setData([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const flaggedQueue = useMemo(
    () =>
      data
        .filter((row) => row.is_flagged)
        .sort((a, b) => b.fraud_score - a.fraud_score),
    [data],
  )

  const otherTransactions = useMemo(
    () => data.filter((row) => !row.is_flagged),
    [data],
  )

  const queueComplete = flaggedQueue.length > 0 && activeIndex >= flaggedQueue.length

  function handleReviewAction() {
    setActiveIndex((current) => current + 1)
  }

  return (
    <section className="review-queue">
      <header className="review-queue__header">
        <h1>Review Queue</h1>
        <p className="review-queue__subtitle">
          Work through flagged transactions one at a time.
        </p>
      </header>

      {loading && <p>Loading review queue...</p>}
      {error && (
        <p className="review-queue__error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && flaggedQueue.length === 0 && (
        <p>No flagged transactions in the queue.</p>
      )}

      {!loading && !error && flaggedQueue.length > 0 && (
        <>
          {!queueComplete && (
            <p className="review-queue__progress">
              Reviewing {activeIndex + 1} of {flaggedQueue.length}
            </p>
          )}

          {queueComplete && (
            <p className="review-queue__complete" role="status">
              Review queue complete. All flagged entries have been reviewed.
            </p>
          )}

          <section className="review-queue__section" aria-label="Flagged queue">
            <h2 className="review-queue__section-title">Flagged transactions</h2>
            <div className="review-queue__list">
              {flaggedQueue.map((transaction, index) => {
                if (index < activeIndex) {
                  return (
                    <CollapsedEntry
                      key={transaction.transaction_id}
                      transaction={transaction}
                      badge="Reviewed"
                      reviewed
                    />
                  )
                }

                if (index === activeIndex && !queueComplete) {
                  return (
                    <article
                      key={transaction.transaction_id}
                      className="review-card review-card--active"
                    >
                      <div className="review-card__body">
                        <span
                          className={`review-card__risk ${getRiskClass(transaction.fraud_score)}`}
                        >
                          {getRiskLabel(transaction.fraud_score)} ·{' '}
                          {transaction.fraud_score}
                        </span>

                        <p className="review-card__reason">
                          <span className="review-card__reason-label">
                            Why flagged
                          </span>
                          {transaction.flag_reasons || 'No reason provided.'}
                        </p>

                        <dl className="review-card__details">
                          <div className="review-card__detail">
                            <dt>ID</dt>
                            <dd>{transaction.transaction_id}</dd>
                          </div>
                          <div className="review-card__detail">
                            <dt>Card</dt>
                            <dd>{transaction.card_id}</dd>
                          </div>
                          <div className="review-card__detail">
                            <dt>Merchant</dt>
                            <dd>{transaction.merchant_name}</dd>
                          </div>
                          <div className="review-card__detail">
                            <dt>Amount</dt>
                            <dd>${transaction.amount.toFixed(2)}</dd>
                          </div>
                        </dl>

                        <div className="review-card__actions">
                          <button
                            type="button"
                            className="review-card__action review-card__action--approve"
                            onClick={handleReviewAction}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="review-card__action review-card__action--dismiss"
                            onClick={handleReviewAction}
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            className="review-card__action review-card__action--escalate"
                            onClick={handleReviewAction}
                          >
                            Escalate
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                }

                return (
                  <CollapsedEntry
                    key={transaction.transaction_id}
                    transaction={transaction}
                    badge="Pending"
                  />
                )
              })}
            </div>
          </section>

          {otherTransactions.length > 0 && (
            <section
              className="review-queue__section"
              aria-label="Non-flagged transactions"
            >
              <h2 className="review-queue__section-title">
                Non-flagged transactions
              </h2>
              <div className="review-queue__list">
                {otherTransactions.map((transaction) => (
                  <CollapsedEntry
                    key={transaction.transaction_id}
                    transaction={transaction}
                    badge="Not flagged"
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  )
}

export default ReviewQueuePage
