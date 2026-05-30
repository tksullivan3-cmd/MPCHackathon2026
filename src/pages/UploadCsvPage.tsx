import { useState } from 'react'
import './UploadCsvPage.css'

const CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
])

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase()

  if (!name.endsWith('.csv')) {
    return false
  }

  const type = file.type.toLowerCase()

  if (!type) {
    return true
  }

  return CSV_MIME_TYPES.has(type)
}

function UploadCsvPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setSelectedFile(null)
      setFileError(null)
      return
    }

    if (!isCsvFile(file)) {
      setSelectedFile(null)
      setFileError('Only .csv files are accepted.')
      return
    }

    setSelectedFile(file)
    setFileError(null)
    setUploadError(null)
    setAnalysisResult(null)
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
          <p className="eyebrow">MCP Hacks Fraud Detection Tool</p>
          <h1>Upload Transaction Data</h1>
          <p className="hero-text">
            Load the provided <strong>transactions.csv</strong> file to run the
            fraud detection engine. After the analysis completes, use the
            Overview and Flag Details pages to inspect the results.
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

          {selectedFile && <p className="file-name">{selectedFile.name}</p>}
          {fileError && <p className="error">{fileError}</p>}
          {uploadError && <p className="error">{uploadError}</p>}

          <button onClick={handleUploadClick} disabled={!selectedFile || isLoading}>
            {isLoading ? 'Analyzing...' : 'Analyze Transactions'}
          </button>
        </div>
      </section>

      {analysisResult && (
        <section className="success-card">
          <div>
            <p className="success-label">Analysis Complete</p>
            <h2>{analysisResult.total_transactions} transactions processed</h2>
            <p>
              The detector flagged{' '}
              <strong>{analysisResult.flagged_transactions}</strong> suspicious
              transactions for further review.
            </p>
          </div>

          <div className="success-stats">
            <div>
              <strong>{analysisResult.high_risk_count}</strong>
              <span>High Risk</span>
            </div>

            <div>
              <strong>{analysisResult.medium_risk_count}</strong>
              <span>Medium Risk</span>
            </div>

            <div>
              <strong>{analysisResult.low_risk_count}</strong>
              <span>Low Risk</span>
            </div>
          </div>

          <p className="next-step">
            Next: open the Overview page for charts, then Flag Details to review
            individual suspicious transactions.
          </p>
        </section>
      )}
    </main>
  )
}

export default UploadCsvPage