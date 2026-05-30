import { useEffect, useState } from 'react'

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
    .sort((a, b) => {
      if (a.is_flagged !== b.is_flagged) {
        return a.is_flagged ? -1 : 1
      }

      return b.fraud_score - a.fraud_score
    })
}

function FlagDetailsPage() {
  const [data, setData] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const getColor = (score: number): string => {
    if (score >= 80) return '#ff4d4d'
    if (score >= 50) return '#ffd11a'
    return '#66cc66'
  }

  const getRiskLabel = (score: number): string => {
    if (score >= 80) return '🔴 HIGH'
    if (score >= 50) return '🟡 MEDIUM'
    return '🟢 LOW'
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>💳 Fraud Detection Dashboard</h1>

      {loading && <p>Loading transactions...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && data.length === 0 && (
        <p>No transactions found.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '20px',
          }}
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Card</th>
              <th>Merchant</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Fraud Score</th>
              <th>Risk</th>
              <th>Reasons</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => {
              const color = getColor(row.fraud_score)

              return (
                <tr
                  key={row.transaction_id}
                  style={{
                    backgroundColor: color,
                    color: 'black',
                  }}
                >
                  <td>{row.transaction_id}</td>
                  <td>{row.card_id}</td>
                  <td>{row.merchant_name}</td>
                  <td>${row.amount.toFixed(2)}</td>
                  <td>{row.is_flagged ? 'Flagged' : 'Not flagged'}</td>
                  <td>{row.fraud_score}</td>
                  <td>{getRiskLabel(row.fraud_score)}</td>
                  <td>{row.flag_reasons || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default FlagDetailsPage
