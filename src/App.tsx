import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import ThemeToggle from './components/ThemeToggle'
import ReviewQueuePage from './pages/ReviewQueuePage'
import OverviewPage from './pages/OverviewPage'
import UploadCsvPage from './pages/UploadCsvPage'
import './App.css'

function App() {
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  return (
    <>
      <ThemeToggle />

      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__icon">🛡️</span>
          <span className="app-header__title">Fraud Detection Tool</span>
        </div>

        <nav className="nav">
          <NavLink to="/upload">Upload</NavLink>
          <NavLink to="/overview">Overview</NavLink>
          <NavLink to="/review-queue">Review Queue</NavLink>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route
            path="/"
            element={<UploadCsvPage setAnalysisResult={setAnalysisResult} />}
          />
          <Route
            path="/upload"
            element={<UploadCsvPage setAnalysisResult={setAnalysisResult} />}
          />
          <Route
            path="/overview"
            element={<OverviewPage analysisResult={analysisResult} />}
          />
          <Route
            path="/review-queue"
            element={<ReviewQueuePage analysisResult={analysisResult} />}
          />
        </Routes>
      </main>
    </>
  )
}

export default App