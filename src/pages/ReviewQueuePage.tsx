import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
    <article className={`review-card${reviewed ? ' review-card--reviewed' : ''}`}>
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

function ReviewQueuePage({ analysisResult }: { analysisResult: any }) {
  const [activeIndex, setActiveIndex] = useState(0)

  const flaggedQueue = useMemo(
    () =>
      (analysisResult?.transactions ?? [])
        .filter((row: Transaction) => row.is_flagged !== false)
        .sort((a: Transaction, b: Transaction) => b.fraud_score - a.fraud_score),
    [analysisResult],
  )

  const queueComplete = flaggedQueue.length > 0 && activeIndex >= flaggedQueue.length

  function handleReviewAction() {
    setActiveIndex((current) => current + 1)
  }

  if (!analysisResult) {
    return (
      <section className="review-queue review-queue--empty">
        <div className="review-queue__empty">
          <h1 className="review-queue__empty-title">Upload the dataset first</h1>
          <p className="review-queue__empty-text">
            Analyze your transactions on the Upload page before reviewing flagged
            entries here.
          </p>
          <img
            className="review-queue__empty-art"
            src="/images/review_queue_art.png"
            alt="Review queue illustration"
          />
          <Link className="review-queue__empty-link" to="/upload">
            Go to Upload
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="review-queue">
      <header className="review-queue__header">
        <h1>Review Queue</h1>
        <p className="review-queue__subtitle">
          Work through flagged transactions one at a time.
        </p>
      </header>

      {flaggedQueue.length === 0 && <p>No flagged transactions in the queue.</p>}

      {flaggedQueue.length > 0 && (
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

          <section className="review-queue__section">
            <h2 className="review-queue__section-title">Flagged transactions</h2>

            <div className="review-queue__list">
              {flaggedQueue.map((transaction: Transaction, index: number) => {
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
                          className={`review-card__risk ${getRiskClass(
                            transaction.fraud_score,
                          )}`}
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
                            <dd>${Number(transaction.amount).toFixed(2)}</dd>
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
        </>
      )}
    </section>
  )
}

export default ReviewQueuePage