import { NavLink, Route, Routes } from 'react-router-dom'
import ReviewQueuePage from './pages/ReviewQueuePage'
import OverviewPage from './pages/OverviewPage'
import UploadCsvPage from './pages/UploadCsvPage'
import './App.css'

function App() {
  return (
    <>
      <nav className="nav">
        <NavLink to="/upload">Upload </NavLink>
        <NavLink to="/overview">Overview </NavLink>
        <NavLink to="/review-queue">Review Queue</NavLink>
      </nav>

      <main className="main">
        <Routes>
          <Route path="/" element={<UploadCsvPage />} />
          <Route path="/upload" element={<UploadCsvPage />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/review-queue" element={<ReviewQueuePage />} />
        </Routes>
      </main>
    </>
  )
}

export default App
