import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  applySessionLearningToAnalysis,
  getLearningSummary,
  type SessionLearningState,
  type TransactionRow,
} from '../lib/sessionLearning'
import './ReviewQueuePage.css'

type ReviewAction = 'approve' | 'dismiss' | 'escalate'

type ReviewHistoryEntry = {
  transactionId: string
  action: ReviewAction
  ruleId?: string
  autoSuppressedIds?: string[]
}

type Transaction = TransactionRow & {
  timestamp: string
  amount: number
  risk_level: string
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

function getActionBadge(action: ReviewAction): string {
  if (action === 'approve') return 'Approved'
  if (action === 'dismiss') return 'Dismissed'
  return 'Escalated'
}

function CollapsedEntry({
  transaction,
  badge,
  reviewed = false,
  suppressed = false,
}: {
  transaction: Transaction
  badge: string
  reviewed?: boolean
  suppressed?: boolean
}) {
  return (
    <article
      className={`review-card${reviewed ? ' review-card--reviewed' : ''}${
        suppressed ? ' review-card--suppressed' : ''
      }`}
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

function ReviewQueuePage({
  analysisResult,
  sessionLearning,
  onLearnFromDismiss,
  onRevertDismissLearning,
}: {
  analysisResult: any
  sessionLearning: SessionLearningState
  onLearnFromDismiss: (
    transaction: TransactionRow,
    pendingAfterDismiss: TransactionRow[],
  ) => { ruleId: string; autoSuppressedIds: string[] }
  onRevertDismissLearning: (
    ruleId: string,
    dismissedTransactionId: string,
    autoSuppressedIds: string[],
  ) => void
}) {
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryEntry[]>([])
  const [learningNotice, setLearningNotice] = useState<string | null>(null)

  const adjustedAnalysis = useMemo(() => {
    if (!analysisResult) return null
    return applySessionLearningToAnalysis(analysisResult, sessionLearning)
  }, [analysisResult, sessionLearning])

  const flaggedQueue = useMemo(
    () =>
      [...(adjustedAnalysis?.transactions ?? [])].sort(
        (a, b) => Number(b.fraud_score) - Number(a.fraud_score),
      ) as Transaction[],
    [adjustedAnalysis],
  )

  const reviewedIds = useMemo(
    () => new Set(reviewHistory.map((entry) => entry.transactionId)),
    [reviewHistory],
  )

  const decisionsByTransactionId = useMemo(() => {
    const map = new Map<string, ReviewAction>()
    for (const entry of reviewHistory) {
      map.set(entry.transactionId, entry.action)
    }
    return map
  }, [reviewHistory])

  const currentTransaction = flaggedQueue.find(
    (transaction) => !reviewedIds.has(transaction.transaction_id),
  )

  const reviewedCount = reviewHistory.length
  const queueComplete =
    flaggedQueue.length > 0 && reviewedCount >= flaggedQueue.length

  const canUndo = reviewHistory.length > 0
  const lastDecision = reviewHistory[reviewHistory.length - 1]
  const learningSummary = getLearningSummary(sessionLearning)

  useEffect(() => {
    setReviewHistory([])
    setLearningNotice(null)
  }, [analysisResult])

  useEffect(() => {
    if (!learningNotice) return
    const timer = window.setTimeout(() => setLearningNotice(null), 5000)
    return () => window.clearTimeout(timer)
  }, [learningNotice])

  function handleReviewAction(action: ReviewAction) {
    if (!currentTransaction) return

    let ruleId: string | undefined
    let autoSuppressedIds: string[] = []

    if (action === 'dismiss') {
      const pendingAfterDismiss = flaggedQueue.filter(
        (transaction) =>
          transaction.transaction_id !== currentTransaction.transaction_id &&
          !reviewedIds.has(transaction.transaction_id),
      )

      const learningResult = onLearnFromDismiss(
        currentTransaction,
        pendingAfterDismiss,
      )

      ruleId = learningResult.ruleId
      autoSuppressedIds = learningResult.autoSuppressedIds

      if (autoSuppressedIds.length > 0) {
        setLearningNotice(
          `Learned from dismissal — ${autoSuppressedIds.length} similar flag${autoSuppressedIds.length === 1 ? '' : 's'} suppressed this session.`,
        )
      } else {
        setLearningNotice(
          'Learned from dismissal — thresholds adjusted for similar transactions this session.',
        )
      }
    }

    setReviewHistory((current) => [
      ...current,
      {
        transactionId: currentTransaction.transaction_id,
        action,
        ruleId,
        autoSuppressedIds,
      },
    ])
  }

  function handleUndo() {
    if (reviewHistory.length === 0) return

    const previous = reviewHistory[reviewHistory.length - 1]

    if (
      previous.action === 'dismiss' &&
      previous.ruleId &&
      previous.autoSuppressedIds
    ) {
      onRevertDismissLearning(
        previous.ruleId,
        previous.transactionId,
        previous.autoSuppressedIds,
      )
      setLearningNotice('Dismissal learning reverted — suppressed flags restored.')
    }

    setReviewHistory((current) => current.slice(0, -1))
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
          Work through flagged transactions one at a time. Dismissing a flag
          teaches the system for this session — thresholds tighten and similar
          flags are suppressed.
        </p>
      </header>

      {learningSummary && (
        <p className="review-queue__learning" role="status">
          Session learning active: {learningSummary}
        </p>
      )}

      {learningNotice && (
        <p className="review-queue__learning review-queue__learning--flash" role="status">
          {learningNotice}
        </p>
      )}

      {flaggedQueue.length === 0 && (
        <p>No flagged transactions in the queue.</p>
      )}

      {flaggedQueue.length > 0 && (
        <>
          {!queueComplete && currentTransaction && (
            <p className="review-queue__progress">
              Reviewing {reviewedCount + 1} of {flaggedQueue.length}
            </p>
          )}

          {canUndo && lastDecision && (
            <div className="review-queue__undo">
              <button
                type="button"
                className="review-queue__undo-btn"
                onClick={handleUndo}
              >
                Undo {getActionBadge(lastDecision.action).toLowerCase()}
              </button>
              <span className="review-queue__undo-hint">
                Return to {lastDecision.transactionId}
              </span>
            </div>
          )}

          {queueComplete && (
            <p className="review-queue__complete" role="status">
              Review queue complete. All flagged entries have been reviewed.
            </p>
          )}

          <section className="review-queue__section">
            <h2 className="review-queue__section-title">Flagged transactions</h2>

            <div className="review-queue__list">
              {flaggedQueue.map((transaction: Transaction) => {
                const isReviewed = reviewedIds.has(transaction.transaction_id)
                const isCurrent =
                  currentTransaction?.transaction_id === transaction.transaction_id

                if (isReviewed) {
                  const action = decisionsByTransactionId.get(
                    transaction.transaction_id,
                  )
                  const wasAutoSuppressed = sessionLearning.autoSuppressedIds.includes(
                    transaction.transaction_id,
                  )

                  return (
                    <CollapsedEntry
                      key={transaction.transaction_id}
                      transaction={transaction}
                      badge={
                        wasAutoSuppressed && action === undefined
                          ? 'Suppressed'
                          : action
                            ? getActionBadge(action)
                            : 'Reviewed'
                      }
                      reviewed
                      suppressed={wasAutoSuppressed}
                    />
                  )
                }

                if (isCurrent && !queueComplete) {
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
                            onClick={() => handleReviewAction('approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="review-card__action review-card__action--dismiss"
                            onClick={() => handleReviewAction('dismiss')}
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            className="review-card__action review-card__action--escalate"
                            onClick={() => handleReviewAction('escalate')}
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
