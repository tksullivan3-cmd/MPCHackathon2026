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

      <nav className="nav">
<<<<<<< HEAD
        <div className="nav__links">
          <NavLink to="/upload">Upload </NavLink>
          <NavLink to="/overview">Overview </NavLink>
          <NavLink to="/review-queue">Review Queue</NavLink>
        </div>
=======
        <NavLink to="/upload">Upload</NavLink>
        <NavLink to="/overview">Overview</NavLink>
        <NavLink to="/review-queue">Review Queue</NavLink>
>>>>>>> 323c4e0 (Connecting API)
      </nav>

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