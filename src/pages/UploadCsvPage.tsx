import { useState } from 'react'
import ConveyorAnimation from '../components/ConveyorAnimation'
import './UploadCsvPage.css'

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv')
}

function getFlaggedRiskCounts(result: {
  transactions?: Array<{ risk_level?: string; fraud_score?: number }>
  high_risk_count?: number
  medium_risk_count?: number
  low_risk_count?: number
}) {
  const transactions = result.transactions ?? []

  if (transactions.length > 0) {
    let high = 0
    let medium = 0
    let low = 0

    for (const t of transactions) {
      const score = Number(t.fraud_score)
      if (t.risk_level === 'high' || score >= 65) {
        high += 1
      } else if (t.risk_level === 'medium' || score >= 40) {
        medium += 1
      } else {
        low += 1
      }
    }

    return { high, medium, low }
  }

  return {
    high: result.high_risk_count ?? 0,
    medium: result.medium_risk_count ?? 0,
    low: result.low_risk_count ?? 0,
  }
}

function UploadCsvPage({
  setAnalysisResult,
}: {
  setAnalysisResult: (data: any) => void
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [localAnalysisResult, setLocalAnalysisResult] = useState<any>(null)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null

    if (!file) return

    if (!isCsvFile(file)) {
      setSelectedFile(null)
      setFileError('Only .csv files are accepted.')
      return
    }

    setSelectedFile(file)
    setFileError(null)
    setUploadError(null)
    setLocalAnalysisResult(null)
  }

  async function handleUploadClick() {
    if (!selectedFile) {
      setFileError('Please choose a CSV file first.')
      return
    }

    setIsLoading(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch('http://127.0.0.1:8000/detect-fraud', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Backend failed to process CSV.')
      }

      setAnalysisResult(data)
      setLocalAnalysisResult(data)
    } catch (error: any) {
      setUploadError(error.message || 'Failed to analyze CSV.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="upload-page">
      <section className="upload-card">
        <div className="upload-copy">
          <h1>Upload Transaction Data</h1>
          <p className="hero-text">
            Load the provided <strong>transactions.csv</strong> file to run the
            fraud detection engine. After analysis, use the Overview and Review
            Queue pages to inspect the results.
          </p>
        </div>

        <div className="upload-box">
          <h2>Upload File</h2>

          <label htmlFor="csv-file" className="file-label">
            Choose transactions.csv
          </label>

          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
          />

          <ConveyorAnimation key="upload-box-conveyor" />

          {selectedFile && <p className="file-name">{selectedFile.name}</p>}
          {fileError && <p className="error">{fileError}</p>}
          {uploadError && <p className="error">{uploadError}</p>}

          <button onClick={handleUploadClick} disabled={!selectedFile || isLoading}>
            {isLoading ? 'Analyzing...' : 'Analyze Transactions'}
          </button>
        </div>
      </section>

      {(isLoading || localAnalysisResult) && (
        <ConveyorAnimation
          wide
          key={`analysis-conveyor-${selectedFile?.name ?? 'conveyor'}`}
        />
      )}

      {localAnalysisResult && (
        <section className="success-card">
          <p className="success-label">Analysis Complete</p>

          <h2>{localAnalysisResult.total_transactions} transactions processed</h2>

          <p>
            The detector flagged{' '}
            <strong>
              {localAnalysisResult.flagged_transactions ??
                localAnalysisResult.transactions?.length ??
                0}
            </strong>{' '}
            suspicious transactions for review.
          </p>

          {(() => {
            const risk = getFlaggedRiskCounts(localAnalysisResult)
            return (
              <>
                <p className="success-stats-caption">
                  Risk breakdown among flagged transactions
                </p>
                <div className="success-stats">
                  <div>
                    <strong>{risk.high}</strong>
                    <span>High Risk</span>
                  </div>

                  <div>
                    <strong>{risk.medium}</strong>
                    <span>Medium Risk</span>
                  </div>

                  <div>
                    <strong>{risk.low}</strong>
                    <span>Low Risk</span>
                  </div>
                </div>
              </>
            )
          })()}

          <a
            className="download-csv-button"
            href="http://127.0.0.1:8000/download-flagged-csv"
            download
          >
            Download updated flagged CSV
          </a>

          <p className="next-step">
            Next: open the Overview page for charts, then Review Queue to review
            individual suspicious transactions.
          </p>
        </section>
      )}
    </main>
  )
}

export default UploadCsvPage