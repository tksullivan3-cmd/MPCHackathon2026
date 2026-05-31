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
  merchant_category?: string
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

function getRiskGroup(transaction: Transaction): 'high' | 'medium' | 'low' {
  const score = Number(transaction.fraud_score)

  if (transaction.risk_level === 'high' || score >= 80) {
    return 'high'
  }

  if (transaction.risk_level === 'medium' || (score >= 50 && score < 80)) {
    return 'medium'
  }

  return 'low'
}

function getActionBadge(action: ReviewAction): string {
  if (action === 'approve') return 'Approved'
  if (action === 'dismiss') return 'Dismissed'
  return 'Escalated'
}

function formatMoney(amount: number): string {
  return `$${Number(amount).toFixed(2)}`
}

function splitReasons(reasonText: string): string[] {
  if (!reasonText) {
    return ['No reason provided.']
  }

  return reasonText
    .split(';')
    .map((reason) => reason.trim())
    .filter(Boolean)
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
  sessionLearning?: SessionLearningState
  onLearnFromDismiss?: (
    transaction: TransactionRow,
    pendingAfterDismiss: TransactionRow[],
  ) => { ruleId: string; autoSuppressedIds: string[] }
  onRevertDismissLearning?: (
    ruleId: string,
    dismissedTransactionId: string,
    autoSuppressedIds: string[],
  ) => void
}) {
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryEntry[]>([])
  const [learningNotice, setLearningNotice] = useState<string | null>(null)

  const [riskFilter, setRiskFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  const adjustedAnalysis = useMemo(() => {
    if (!analysisResult) return null

    if (!sessionLearning) {
      return analysisResult
    }

    return applySessionLearningToAnalysis(analysisResult, sessionLearning)
  }, [analysisResult, sessionLearning])

  const flaggedQueue = useMemo(
    () =>
      [...(adjustedAnalysis?.transactions ?? [])].sort(
        (a, b) => Number(b.fraud_score) - Number(a.fraud_score),
      ) as Transaction[],
    [adjustedAnalysis],
  )

  const filteredQueue = useMemo(() => {
    return flaggedQueue.filter((transaction) => {
      const riskGroup = getRiskGroup(transaction)

      if (riskFilter !== 'all' && riskGroup !== riskFilter) {
        return false
      }

      const amount = Number(transaction.amount)
      const min = minAmount ? Number(minAmount) : null
      const max = maxAmount ? Number(maxAmount) : null

      if (min !== null && amount < min) {
        return false
      }

      if (max !== null && amount > max) {
        return false
      }

      const search = searchTerm.trim().toLowerCase()

      if (search) {
        const searchableText = [
          transaction.transaction_id,
          transaction.card_id,
          transaction.merchant_name,
          transaction.merchant_category,
          transaction.risk_level,
          transaction.fraud_score,
          transaction.amount,
          transaction.flag_reasons,
          transaction.timestamp,
        ]
          .join(' ')
          .toLowerCase()

        if (!searchableText.includes(search)) {
          return false
        }
      }

      return true
    })
  }, [flaggedQueue, riskFilter, searchTerm, minAmount, maxAmount])

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

  const currentTransaction = filteredQueue.find(
    (transaction) => !reviewedIds.has(transaction.transaction_id),
  )

  const reviewedFilteredCount = filteredQueue.filter((transaction) =>
    reviewedIds.has(transaction.transaction_id),
  ).length

  const queueComplete = filteredQueue.length > 0 && !currentTransaction
  const canUndo = reviewHistory.length > 0
  const lastDecision = reviewHistory[reviewHistory.length - 1]

  const learningSummary = sessionLearning
    ? getLearningSummary(sessionLearning)
    : null

  useEffect(() => {
    setReviewHistory([])
    setLearningNotice(null)
    setRiskFilter('all')
    setSearchTerm('')
    setMinAmount('')
    setMaxAmount('')
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

    if (action === 'dismiss' && sessionLearning && onLearnFromDismiss) {
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
          `Learned from dismissal — ${autoSuppressedIds.length} similar flag${
            autoSuppressedIds.length === 1 ? '' : 's'
          } suppressed this session.`,
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
      previous.autoSuppressedIds &&
      sessionLearning &&
      onRevertDismissLearning
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

  function clearFilters() {
    setRiskFilter('all')
    setSearchTerm('')
    setMinAmount('')
    setMaxAmount('')
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
        <p
          className="review-queue__learning review-queue__learning--flash"
          role="status"
        >
          {learningNotice}
        </p>
      )}

      <section className="review-filters" aria-label="Review queue filters">
        <div className="review-filter">
          <label htmlFor="risk-filter">Risk</label>

          <select
            id="risk-filter"
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value)}
          >
            <option value="all">All risks</option>
            <option value="high">High risk</option>
            <option value="medium">Medium risk</option>
            <option value="low">Low risk</option>
          </select>
        </div>

        <div className="review-filter review-filter--wide">
          <label htmlFor="search-filter">Search transactions</label>

          <input
            id="search-filter"
            type="text"
            placeholder="Search merchant, transaction ID, amount, reason..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="review-filter">
          <label htmlFor="min-amount">Min amount</label>

          <input
            id="min-amount"
            type="number"
            min="0"
            placeholder="0"
            value={minAmount}
            onChange={(event) => setMinAmount(event.target.value)}
          />
        </div>

        <div className="review-filter">
          <label htmlFor="max-amount">Max amount</label>

          <input
            id="max-amount"
            type="number"
            min="0"
            placeholder="2000"
            value={maxAmount}
            onChange={(event) => setMaxAmount(event.target.value)}
          />
        </div>

        <button type="button" className="review-filter__clear" onClick={clearFilters}>
          Clear
        </button>
      </section>

      <p className="review-queue__progress">
        Showing {filteredQueue.length} of {flaggedQueue.length} flagged
        transactions
      </p>

      {filteredQueue.length === 0 && (
        <p className="review-queue__error">
          No flagged transactions match the current filters.
        </p>
      )}

      {filteredQueue.length > 0 && (
        <>
          {!queueComplete && currentTransaction && (
            <p className="review-queue__progress">
              Reviewing {reviewedFilteredCount + 1} of {filteredQueue.length}
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
              Review queue complete. All matching flagged entries have been
              reviewed.
            </p>
          )}

          <section className="review-queue__section">
            <h2 className="review-queue__section-title">Flagged transactions</h2>

            <div className="review-queue__list">
              {filteredQueue.map((transaction: Transaction) => {
                const isReviewed = reviewedIds.has(transaction.transaction_id)

                const isCurrent =
                  currentTransaction?.transaction_id ===
                  transaction.transaction_id

                if (isReviewed) {
                  const action = decisionsByTransactionId.get(
                    transaction.transaction_id,
                  )

                  const wasAutoSuppressed =
                    sessionLearning?.autoSuppressedIds.includes(
                      transaction.transaction_id,
                    ) ?? false

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
                  const reasons = splitReasons(transaction.flag_reasons ?? '')

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

                        <div className="review-card__reason">
                          <span className="review-card__reason-label">
                            Why flagged
                          </span>

                          <ol className="review-card__reason-list">
                            {reasons.map((reason, reasonIndex) => (
                              <li key={`${transaction.transaction_id}-${reasonIndex}`}>
                                {reason}
                              </li>
                            ))}
                          </ol>
                        </div>

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
                            <dd>{formatMoney(transaction.amount)}</dd>
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