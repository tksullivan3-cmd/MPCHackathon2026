import './OverviewPage.css'

const SUMMARY_CARDS = [
  { label: 'Total Transactions', value: '1,000' },
  { label: 'Flagged Transactions', value: '72' },
  { label: 'Fraud Risk Score', value: '6.4 / 10' },
  { label: 'Cards Impacted', value: '38' },
  { label: 'Unique Merchants', value: '214' },
] as const

const TRANSACTIONS_OVER_TIME = [
  { label: 'Mon', value: 62 },
  { label: 'Tue', value: 78 },
  { label: 'Wed', value: 95 },
  { label: 'Thu', value: 88 },
  { label: 'Fri', value: 120 },
  { label: 'Sat', value: 74 },
  { label: 'Sun', value: 58 },
] as const

const FRAUD_SCORE_DISTRIBUTION = [
  { label: '0–20', value: 420 },
  { label: '21–40', value: 310 },
  { label: '41–60', value: 142 },
  { label: '61–80', value: 86 },
  { label: '81–100', value: 42 },
] as const

const TOP_SUSPICIOUS_MERCHANTS = [
  { name: 'QuickPay Intl', score: 92 },
  { name: 'Nova Electronics', score: 87 },
  { name: 'Skyline Travel', score: 81 },
  { name: 'Metro Subscriptions', score: 76 },
  { name: 'Zenith Gaming', score: 71 },
] as const

const FRAUD_BY_CATEGORY = [
  { category: 'Card-not-present', percent: 34 },
  { category: 'Account takeover', percent: 22 },
  { category: 'Velocity abuse', percent: 18 },
  { category: 'Geo mismatch', percent: 16 },
  { category: 'Other', percent: 10 },
] as const

const RECENT_ALERTS = [
  {
    transaction: 'tx_00123',
    score: 95,
    reason: 'New device + foreign country',
  },
  {
    transaction: 'tx_00481',
    score: 88,
    reason: 'Unusual spend velocity',
  },
  {
    transaction: 'tx_00902',
    score: 82,
    reason: 'Merchant category mismatch',
  },
] as const

function maxBarValue<T extends { value: number }>(items: readonly T[]): number {
  return Math.max(...items.map((item) => item.value))
}

function OverviewPage() {
  const txMax = maxBarValue(TRANSACTIONS_OVER_TIME)
  const scoreMax = maxBarValue(FRAUD_SCORE_DISTRIBUTION)
  const merchantMax = Math.max(...TOP_SUSPICIOUS_MERCHANTS.map((m) => m.score))

  return (
    <section className="overview-page">
      <header className="overview-page__header">
        <h1>Overview</h1>
        <p className="overview-page__subtitle">
          General info — high-level transaction and fraud metrics (placeholder
          data)
        </p>
      </header>

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="overview-section__title">
          Summary Cards
        </h2>
        <div className="overview-cards">
          {SUMMARY_CARDS.map((card) => (
            <article key={card.label} className="overview-card">
              <p className="overview-card__label">{card.label}</p>
              <p className="overview-card__value">{card.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="charts-heading">
        <h2 id="charts-heading" className="overview-section__title">
          Charts
        </h2>
        <div className="overview-charts">
          <article className="overview-chart">
            <h3 className="overview-chart__title">Transactions over time</h3>
            <div
              className="overview-bar-chart"
              role="img"
              aria-label="Placeholder bar chart of transactions over time"
            >
              {TRANSACTIONS_OVER_TIME.map((point) => (
                <div key={point.label} className="overview-bar-chart__item">
                  <div
                    className="overview-bar-chart__bar"
                    style={{ height: `${(point.value / txMax) * 100}%` }}
                    title={`${point.label}: ${point.value}`}
                  />
                  <span className="overview-bar-chart__label">
                    {point.label}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="overview-chart">
            <h3 className="overview-chart__title">Fraud score distribution</h3>
            <div
              className="overview-bar-chart overview-bar-chart--horizontal"
              role="img"
              aria-label="Placeholder distribution of fraud scores"
            >
              {FRAUD_SCORE_DISTRIBUTION.map((bucket) => (
                <div key={bucket.label} className="overview-h-bar">
                  <span className="overview-h-bar__label">{bucket.label}</span>
                  <div className="overview-h-bar__track">
                    <div
                      className="overview-h-bar__fill"
                      style={{ width: `${(bucket.value / scoreMax) * 100}%` }}
                    />
                  </div>
                  <span className="overview-h-bar__value">{bucket.value}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="overview-chart">
            <h3 className="overview-chart__title">Top suspicious merchants</h3>
            <ul className="overview-merchant-list">
              {TOP_SUSPICIOUS_MERCHANTS.map((merchant) => (
                <li key={merchant.name} className="overview-merchant-list__item">
                  <span className="overview-merchant-list__name">
                    {merchant.name}
                  </span>
                  <div className="overview-merchant-list__track">
                    <div
                      className="overview-merchant-list__fill"
                      style={{
                        width: `${(merchant.score / merchantMax) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="overview-merchant-list__score">
                    {merchant.score}
                  </span>
                </li>
              ))}
            </ul>
          </article>

          <article className="overview-chart">
            <h3 className="overview-chart__title">Fraud by category</h3>
            <ul className="overview-category-list">
              {FRAUD_BY_CATEGORY.map((item) => (
                <li key={item.category} className="overview-category-list__item">
                  <div className="overview-category-list__row">
                    <span>{item.category}</span>
                    <span>{item.percent}%</span>
                  </div>
                  <div className="overview-category-list__track">
                    <div
                      className="overview-category-list__fill"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section aria-labelledby="alerts-heading">
        <h2 id="alerts-heading" className="overview-section__title">
          Recent Alerts
        </h2>
        <div className="overview-table-wrap">
          <table className="overview-table">
            <thead>
              <tr>
                <th scope="col">Transaction</th>
                <th scope="col">Score</th>
                <th scope="col">Reason</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_ALERTS.map((alert) => (
                <tr key={alert.transaction}>
                  <td>{alert.transaction}</td>
                  <td>
                    <span className="overview-table__score">{alert.score}</span>
                  </td>
                  <td>{alert.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="overview-section__title">
          Quick Actions
        </h2>
        <div className="overview-actions">
          <button type="button" className="overview-actions__btn">
            Review Queue
          </button>
          <button type="button" className="overview-actions__btn">
            Export CSV
          </button>
          <button type="button" className="overview-actions__btn">
            View Audit Log
          </button>
        </div>
      </section>
    </section>
  )
}

export default OverviewPage
