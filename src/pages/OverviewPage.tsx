import './OverviewPage.css'

function OverviewPage({ analysisResult }: { analysisResult: any }) {
  if (!analysisResult) {
    return (
      <section className="overview-page">
        <header className="overview-page__header">
          <h1>Overview</h1>
          <p className="overview-page__subtitle">
            Upload and analyze transactions first.
          </p>
        </header>
      </section>
    )
  }

  const transactions = analysisResult.transactions ?? []

  const summaryCards = [
    { label: 'Total Transactions', value: analysisResult.total_transactions },
    { label: 'Flagged Transactions', value: analysisResult.flagged_transactions },
    { label: 'High Risk', value: analysisResult.high_risk_count },
    { label: 'Medium Risk', value: analysisResult.medium_risk_count },
    { label: 'Low Risk', value: analysisResult.low_risk_count },
  ]

  const riskBreakdown = [
    { label: 'High Risk', value: analysisResult.high_risk_count },
    { label: 'Medium Risk', value: analysisResult.medium_risk_count },
    { label: 'Low Risk', value: analysisResult.low_risk_count },
  ]

  const scoreBuckets = [
    { label: '50–59', value: transactions.filter((t: any) => t.fraud_score >= 50 && t.fraud_score < 60).length },
    { label: '60–69', value: transactions.filter((t: any) => t.fraud_score >= 60 && t.fraud_score < 70).length },
    { label: '70–79', value: transactions.filter((t: any) => t.fraud_score >= 70 && t.fraud_score < 80).length },
    { label: '80–89', value: transactions.filter((t: any) => t.fraud_score >= 80 && t.fraud_score < 90).length },
    { label: '90+', value: transactions.filter((t: any) => t.fraud_score >= 90).length },
  ]

  const topSuspicious = [...transactions]
    .sort((a, b) => b.fraud_score - a.fraud_score)
    .slice(0, 5)

  const categoryCounts: Record<string, number> = transactions.reduce(
  (acc: Record<string, number>, tx: any) => {
    const category = tx.merchant_category || 'Unknown'
    acc[category] = (acc[category] ?? 0) + 1
    return acc
  },
  {},
)

const fraudByCategory = Object.entries(categoryCounts).map(
  ([category, value]) => ({
    category,
    percent: Math.round((value / Math.max(transactions.length, 1)) * 100),
  }),
)

  const scoreMax = Math.max(...scoreBuckets.map((b) => b.value), 1)
  const riskMax = Math.max(...riskBreakdown.map((r) => r.value), 1)
  const merchantMax = Math.max(...topSuspicious.map((t: any) => t.fraud_score), 1)

  return (
    <section className="overview-page">
      <header className="overview-page__header">
        <h1>Overview</h1>
        <p className="overview-page__subtitle">
          Real fraud detection results from the uploaded transaction file.
        </p>
      </header>

      <section>
        <h2 className="overview-section__title">Summary Cards</h2>
        <div className="overview-cards">
          {summaryCards.map((card) => (
            <article key={card.label} className="overview-card">
              <p className="overview-card__label">{card.label}</p>
              <p className="overview-card__value">{card.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="overview-section__title">Charts</h2>

        <div className="overview-charts">
          <article className="overview-chart">
            <h3 className="overview-chart__title">Risk breakdown</h3>
            <div className="overview-bar-chart overview-bar-chart--horizontal">
              {riskBreakdown.map((risk) => (
                <div key={risk.label} className="overview-h-bar">
                  <span className="overview-h-bar__label">{risk.label}</span>
                  <div className="overview-h-bar__track">
                    <div
                      className="overview-h-bar__fill"
                      style={{ width: `${(risk.value / riskMax) * 100}%` }}
                    />
                  </div>
                  <span className="overview-h-bar__value">{risk.value}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="overview-chart">
            <h3 className="overview-chart__title">Fraud score distribution</h3>
            <div className="overview-bar-chart overview-bar-chart--horizontal">
              {scoreBuckets.map((bucket) => (
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
            <h3 className="overview-chart__title">Top suspicious transactions</h3>
            <ul className="overview-merchant-list">
              {topSuspicious.map((tx: any) => (
                <li key={tx.transaction_id} className="overview-merchant-list__item">
                  <span className="overview-merchant-list__name">
                    {tx.transaction_id} · {tx.merchant_name}
                  </span>
                  <div className="overview-merchant-list__track">
                    <div
                      className="overview-merchant-list__fill"
                      style={{ width: `${(tx.fraud_score / merchantMax) * 100}%` }}
                    />
                  </div>
                  <span className="overview-merchant-list__score">
                    {tx.fraud_score}
                  </span>
                </li>
              ))}
            </ul>
          </article>

          <article className="overview-chart">
            <h3 className="overview-chart__title">Flagged by category</h3>
            <ul className="overview-category-list">
              {fraudByCategory.map((item) => (
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

      <section>
        <h2 className="overview-section__title">Recent Alerts</h2>
        <div className="overview-table-wrap">
          <table className="overview-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Score</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {topSuspicious.map((tx: any) => (
                <tr key={tx.transaction_id}>
                  <td>{tx.transaction_id}</td>
                  <td>
                    <span className="overview-table__score">
                      {tx.fraud_score}
                    </span>
                  </td>
                  <td>{tx.flag_reasons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}

export default OverviewPage