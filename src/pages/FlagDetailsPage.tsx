import React, { useEffect, useState } from "react";

// -----------------------------
// TYPE DEFINITION
// -----------------------------
type Transaction = {
  transaction_id: string;
  timestamp: string;
  card_id: string;
  amount: number;
  merchant_name: string;
  fraud_score: number;
  risk_level: string;
  flag_reasons: string;
};

function FraudDashboard() {
  const [data, setData] = useState<Transaction[]>([]);

  useEffect(() => {
    fetch("/data/transactions_flagged.csv")
      .then((res) => res.text())
      .then((text) => {
        const rows = text.split("\n").slice(1);

        const parsed: Transaction[] = rows
          .filter((r) => r.trim() !== "")
          .map((row) => {
            const cols = row.split(",");

            return {
              transaction_id: cols[0],
              timestamp: cols[1],
              card_id: cols[2],
              amount: Number(cols[3]),
              merchant_name: cols[4],
              fraud_score: Number(cols[5]),
              risk_level: cols[6],
              flag_reasons: cols[7],
            };
          });

        setData(parsed);
      });
  }, []);

  // -----------------------------
  // COLOR LOGIC
  // -----------------------------
  const getColor = (score: number): string => {
    if (score >= 80) return "#ff4d4d"; // RED
    if (score >= 50) return "#ffd11a"; // YELLOW
    return "#66cc66"; // GREEN
  };

  const getRiskLabel = (score: number): string => {
    if (score >= 80) return "🔴 HIGH";
    if (score >= 50) return "🟡 MEDIUM";
    return "🟢 LOW";
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>💳 Fraud Detection Dashboard</h1>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "20px",
        }}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>Card</th>
            <th>Merchant</th>
            <th>Amount</th>
            <th>Fraud Score</th>
            <th>Risk</th>
            <th>Reasons</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => {
            const color = getColor(row.fraud_score);

            return (
              <tr
                key={index}
                style={{
                  backgroundColor: color,
                  color: "black",
                }}
              >
                <td>{row.transaction_id}</td>
                <td>{row.card_id}</td>
                <td>{row.merchant_name}</td>
                <td>${row.amount.toFixed(2)}</td>
                <td>{row.fraud_score}</td>
                <td>{getRiskLabel(row.fraud_score)}</td>
                <td>{row.flag_reasons}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default FraudDashboard;