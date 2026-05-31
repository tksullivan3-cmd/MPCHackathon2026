export type TransactionRow = {
  transaction_id: string
  card_id?: string
  merchant_name?: string
  merchant_category?: string
  fraud_score: number
  flag_reasons?: string
  is_flagged?: boolean
}

export type SuppressionRule = {
  id: string
  sourceTransactionId: string
  merchantName?: string
  merchantCategory?: string
  cardId?: string
  reasonTokens: string[]
  dismissedScore: number
  minScoreForMerchant: number
  minScoreForCategory: number
}

export type SessionLearningState = {
  rules: SuppressionRule[]
  dismissedIds: string[]
  autoSuppressedIds: string[]
  /** Raised after each dismiss; similar flags need a higher score to stay visible */
  scoreFloor: number
}

export const INITIAL_SESSION_LEARNING: SessionLearningState = {
  rules: [],
  dismissedIds: [],
  autoSuppressedIds: [],
  scoreFloor: 0,
}

const SCORE_FLOOR_STEP = 1
const MERCHANT_SCORE_BUFFER = 4
const CATEGORY_SCORE_BUFFER = 3
const REASON_SCORE_BUFFER = 4

function parseReasonTokens(flagReasons: string | undefined): string[] {
  if (!flagReasons) return []
  return flagReasons
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 4)
}

export function createRuleFromDismissal(transaction: TransactionRow): SuppressionRule {
  const dismissedScore = Number(transaction.fraud_score) || 0

  return {
    id: crypto.randomUUID(),
    sourceTransactionId: transaction.transaction_id,
    merchantName: transaction.merchant_name || undefined,
    merchantCategory: transaction.merchant_category || undefined,
    cardId: transaction.card_id || undefined,
    reasonTokens: parseReasonTokens(transaction.flag_reasons),
    dismissedScore,
    minScoreForMerchant: dismissedScore + MERCHANT_SCORE_BUFFER,
    minScoreForCategory: dismissedScore + CATEGORY_SCORE_BUFFER,
  }
}

function sharesReasonPattern(
  transaction: TransactionRow,
  rule: SuppressionRule,
): boolean {
  if (rule.reasonTokens.length === 0) return false

  const reasons = (transaction.flag_reasons || '').toLowerCase()

  return rule.reasonTokens.some((token) => {
    const needle = token.toLowerCase().slice(0, 24)
    return needle.length > 4 && reasons.includes(needle)
  })
}

export function isSuppressedByRule(
  transaction: TransactionRow,
  rule: SuppressionRule,
  scoreFloor: number,
): boolean {
  if (transaction.transaction_id === rule.sourceTransactionId) {
    return false
  }

  const score = Number(transaction.fraud_score) || 0

  if (
    rule.merchantName &&
    transaction.merchant_name === rule.merchantName &&
    score <= rule.dismissedScore + MERCHANT_SCORE_BUFFER + scoreFloor
  ) {
    return true
  }

  if (
    rule.merchantCategory &&
    transaction.merchant_category === rule.merchantCategory &&
    score <= rule.dismissedScore + CATEGORY_SCORE_BUFFER + scoreFloor
  ) {
    return true
  }

  if (
    sharesReasonPattern(transaction, rule) &&
    score <= rule.dismissedScore + REASON_SCORE_BUFFER + scoreFloor
  ) {
    return true
  }

  return false
}

export function isSuppressedBySession(
  transaction: TransactionRow,
  learning: SessionLearningState,
): boolean {
  if (learning.dismissedIds.includes(transaction.transaction_id)) {
    return true
  }

  if (learning.autoSuppressedIds.includes(transaction.transaction_id)) {
    return true
  }

  return learning.rules.some((rule) =>
    isSuppressedByRule(transaction, rule, learning.scoreFloor),
  )
}

export function findAutoSuppressed(
  pending: TransactionRow[],
  learning: SessionLearningState,
): string[] {
  return pending
    .filter((transaction) => isSuppressedBySession(transaction, learning))
    .map((transaction) => transaction.transaction_id)
}

export function applyDismissalLearning(
  learning: SessionLearningState,
  transaction: TransactionRow,
  pendingAfterDismiss: TransactionRow[],
): {
  nextLearning: SessionLearningState
  autoSuppressedIds: string[]
  rule: SuppressionRule
} {
  const rule = createRuleFromDismissal(transaction)

  const nextLearning: SessionLearningState = {
    ...learning,
    rules: [...learning.rules, rule],
    dismissedIds: [...learning.dismissedIds, transaction.transaction_id],
    scoreFloor: learning.scoreFloor + SCORE_FLOOR_STEP,
  }

  const autoSuppressedIds = findAutoSuppressed(pendingAfterDismiss, nextLearning).filter(
    (id) => !nextLearning.dismissedIds.includes(id),
  )

  return {
    nextLearning: {
      ...nextLearning,
      autoSuppressedIds: [
        ...new Set([...nextLearning.autoSuppressedIds, ...autoSuppressedIds]),
      ],
    },
    autoSuppressedIds,
    rule,
  }
}

export function revertDismissalLearning(
  learning: SessionLearningState,
  ruleId: string,
  dismissedTransactionId: string,
  autoSuppressedIds: string[],
): SessionLearningState {
  const rules = learning.rules.filter((rule) => rule.id !== ruleId)
  const dismissedIds = learning.dismissedIds.filter((id) => id !== dismissedTransactionId)

  const autoSet = new Set(learning.autoSuppressedIds)
  for (const id of autoSuppressedIds) {
    autoSet.delete(id)
  }

  return {
    rules,
    dismissedIds,
    autoSuppressedIds: [...autoSet],
    scoreFloor: Math.max(0, learning.scoreFloor - SCORE_FLOOR_STEP),
  }
}

export type AnalysisResult = {
  total_transactions: number
  flagged_transactions: number
  high_risk_count?: number
  medium_risk_count?: number
  low_risk_count?: number
  transactions: TransactionRow[]
}

export function applySessionLearningToAnalysis(
  base: AnalysisResult,
  learning: SessionLearningState,
): AnalysisResult {
  const transactions = base.transactions.filter(
    (transaction) => !isSuppressedBySession(transaction, learning),
  )

  const highRiskCount = transactions.filter(
    (t) => Number(t.fraud_score) >= 80,
  ).length
  const mediumRiskCount = transactions.filter((t) => {
    const score = Number(t.fraud_score)
    return score >= 50 && score < 80
  }).length
  const lowRiskCount = transactions.filter((t) => Number(t.fraud_score) < 50).length

  return {
    ...base,
    transactions,
    flagged_transactions: transactions.length,
    high_risk_count: highRiskCount,
    medium_risk_count: mediumRiskCount,
    low_risk_count: lowRiskCount,
  }
}

export function getLearningSummary(learning: SessionLearningState): string | null {
  const ruleCount = learning.rules.length
  if (ruleCount === 0) return null

  const suppressedCount = learning.autoSuppressedIds.length
  const parts = [
    `${ruleCount} dismissal${ruleCount === 1 ? '' : 's'} learned`,
    learning.scoreFloor > 0 ? `score floor +${learning.scoreFloor}` : null,
    suppressedCount > 0
      ? `${suppressedCount} similar flag${suppressedCount === 1 ? '' : 's'} suppressed`
      : null,
  ].filter(Boolean)

  return parts.join(' · ')
}
