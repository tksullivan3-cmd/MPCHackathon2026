import './OverviewPage.css'

function formatLabel(label: string): string {
  return label
    .replaceAll('_', ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

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
  const flaggedCount = transactions.length

  const highRiskCount = transactions.filter(
    (t: any) => t.risk_level === 'high' || t.fraud_score >= 80,
  ).length

  const mediumRiskCount = transactions.filter(
    (t: any) =>
      t.risk_level === 'medium' ||
      (t.fraud_score >= 50 && t.fraud_score < 80),
  ).length

  const lowRiskCount = transactions.filter(
    (t: any) =>
      t.risk_level === 'low' ||
      t.fraud_score < 50,
  ).length

  const summaryCards = [
    { label: 'Total Transactions', value: analysisResult.total_transactions },
    { label: 'Flagged Transactions', value: flaggedCount },
    { label: 'High Risk', value: highRiskCount },
    { label: 'Medium Risk', value: mediumRiskCount },
    { label: 'Low Risk', value: lowRiskCount },
  ]

  const riskBreakdown = [
    { label: 'High', value: highRiskCount },
    { label: 'Medium', value: mediumRiskCount },
    { label: 'Low', value: lowRiskCount },
  ]

  const scoreBuckets = [
    {
      label: '50–59',
      value: transactions.filter(
        (t: any) => t.fraud_score >= 50 && t.fraud_score < 60,
      ).length,
    },
    {
      label: '60–69',
      value: transactions.filter(
        (t: any) => t.fraud_score >= 60 && t.fraud_score < 70,
      ).length,
    },
    {
      label: '70–79',
      value: transactions.filter(
        (t: any) => t.fraud_score >= 70 && t.fraud_score < 80,
      ).length,
    },
    {
      label: '80–89',
      value: transactions.filter(
        (t: any) => t.fraud_score >= 80 && t.fraud_score < 90,
      ).length,
    },
    {
      label: '90+',
      value: transactions.filter((t: any) => t.fraud_score >= 90).length,
    },
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

  const fraudByCategory = Object.entries(categoryCounts)
    .map(([category, value]) => ({
      category,
      value,
      percent: Math.round((value / Math.max(transactions.length, 1)) * 100),
    }))
    .sort((a, b) => b.percent - a.percent)

  const riskMax = Math.max(...riskBreakdown.map((r) => r.value), 1)
  const scoreMax = Math.max(...scoreBuckets.map((b) => b.value), 1)

  const categoryOne = fraudByCategory[0]?.percent ?? 0
  const categoryTwo = fraudByCategory[1]?.percent ?? 0
  const categoryThree = fraudByCategory[2]?.percent ?? 0

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
            <h3 className="overview-chart__title">Risk Breakdown</h3>

            <div className="overview-column-chart">
              {riskBreakdown.map((risk) => (
                <div key={risk.label} className="overview-column-chart__item">
                  <div className="overview-column-chart__bar-wrap">
                    <div
                      className="overview-column-chart__bar"
                      style={{
                        height: `${Math.max((risk.value / riskMax) * 100, 4)}%`,
                      }}
                    />
                  </div>

                  <strong>{risk.value}</strong>
                  <span>{risk.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="overview-chart">
            <h3 className="overview-chart__title">Fraud Score Distribution</h3>

            <div className="overview-column-chart overview-column-chart--scores">
              {scoreBuckets.map((bucket) => (
                <div key={bucket.label} className="overview-column-chart__item">
                  <div className="overview-column-chart__bar-wrap">
                    <div
                      className="overview-column-chart__bar"
                      style={{
                        height: `${Math.max(
                          (bucket.value / scoreMax) * 100,
                          bucket.value > 0 ? 8 : 0,
                        )}%`,
                      }}
                    />
                  </div>

                  <strong>{bucket.value}</strong>
                  <span>{bucket.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="overview-chart">
            <h3 className="overview-chart__title">Top Suspicious Transactions</h3>

            <table className="overview-mini-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Merchant</th>
                  <th>Score</th>
                </tr>
              </thead>

              <tbody>
                {topSuspicious.map((tx: any) => (
                  <tr key={tx.transaction_id}>
                    <td>{tx.transaction_id}</td>
                    <td>{formatLabel(tx.merchant_name)}</td>
                    <td>
                      <span className="overview-score-pill">
                        {tx.fraud_score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="overview-chart overview-chart--category">
            <h3 className="overview-chart__title">Flagged by Category</h3>

            <div className="overview-pie-layout">
              <div
                className="overview-pie"
                style={{
                  background: `conic-gradient(
                    #0057d9 0% ${categoryOne}%,
                    #3b82f6 ${categoryOne}% ${categoryOne + categoryTwo}%,
                    #93c5fd ${categoryOne + categoryTwo}% ${
                      categoryOne + categoryTwo + categoryThree
                    }%,
                    #dbeafe ${categoryOne + categoryTwo + categoryThree}% 100%
                  )`,
                }}
              >
                <div className="overview-pie__center">
                  <strong className="overview-pie__count">
                    {flaggedCount}
                  </strong>
                  <span>flagged</span>
                </div>
              </div>

              <ul className="overview-pie-legend">
                {fraudByCategory.map((item) => (
                  <li key={item.category}>
                    <span className="overview-pie-legend__label">
                      {formatLabel(item.category)}
                    </span>
                    <strong>{item.percent}%</strong>
                  </li>
                ))}
              </ul>
            </div>
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