import { useState } from 'react'

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

  function rejectFile(input: HTMLInputElement, message: string) {
    input.value = ''
    setSelectedFile(null)
    setFileError(message)
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0] ?? null

    if (!file) {
      setSelectedFile(null)
      setFileError(null)
      return
    }

    if (!isCsvFile(file)) {
      rejectFile(
        input,
        'Only .csv files are accepted. Please choose a valid CSV file.',
      )
      return
    }

    setSelectedFile(file)
    setFileError(null)
  }

  function handleUploadClick() {
    if (!selectedFile) {
      setFileError('Please choose a .csv file before uploading.')
      return
    }

    if (!isCsvFile(selectedFile)) {
      setSelectedFile(null)
      setFileError('Only .csv files are accepted. Please choose a valid CSV file.')
      return
    }

    // Backend integration will go here.
  }

  return (
    <section className="upload-page">
      <h1>Upload .csv</h1>

      <p className="upload-page__intro">
        Let&apos;s hunt for fraudsters. Upload your transaction data, and
        we&apos;ll help hunt your pesky fraudsters
      </p>

      <div className="upload-page__controls">
        <label className="upload-page__file-label" htmlFor="csv-file">
          Choose a .csv file
        </label>
        <input
          id="csv-file"
          className="upload-page__file-input"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          aria-invalid={fileError ? true : undefined}
          aria-describedby={fileError ? 'csv-file-error' : undefined}
        />
        {fileError && (
          <p id="csv-file-error" className="upload-page__error" role="alert">
            {fileError}
          </p>
        )}
        {selectedFile && !fileError && (
          <p className="upload-page__file-name">{selectedFile.name}</p>
        )}

        <button
          type="button"
          className="upload-page__submit"
          onClick={handleUploadClick}
          disabled={!selectedFile}
        >
          Upload and analyze
        </button>
      </div>
    </section>
  )
}

export default UploadCsvPage
