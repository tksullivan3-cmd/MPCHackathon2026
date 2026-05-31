import { useCallback, useMemo, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import ThemeToggle from './components/ThemeToggle'
import {
  applyDismissalLearning,
  applySessionLearningToAnalysis,
  INITIAL_SESSION_LEARNING,
  revertDismissalLearning,
  type SessionLearningState,
  type TransactionRow,
} from './lib/sessionLearning'
import ReviewQueuePage from './pages/ReviewQueuePage'
import OverviewPage from './pages/OverviewPage'
import UploadCsvPage from './pages/UploadCsvPage'
import './App.css'

function App() {
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [sessionLearning, setSessionLearning] = useState<SessionLearningState>(
    INITIAL_SESSION_LEARNING,
  )

  const handleSetAnalysisResult = useCallback((data: any) => {
    setAnalysisResult(data)
    setSessionLearning(INITIAL_SESSION_LEARNING)
  }, [])

  const displayAnalysisResult = useMemo(() => {
    if (!analysisResult) return null
    return applySessionLearningToAnalysis(analysisResult, sessionLearning)
  }, [analysisResult, sessionLearning])

  const handleLearnFromDismiss = useCallback(
    (
      transaction: TransactionRow,
      pendingAfterDismiss: TransactionRow[],
    ): { ruleId: string; autoSuppressedIds: string[] } => {
      let result = { ruleId: '', autoSuppressedIds: [] as string[] }

      setSessionLearning((current) => {
        const { nextLearning, autoSuppressedIds, rule } = applyDismissalLearning(
          current,
          transaction,
          pendingAfterDismiss,
        )
        result = { ruleId: rule.id, autoSuppressedIds }
        return nextLearning
      })

      return result
    },
    [],
  )

  const handleRevertDismissLearning = useCallback(
    (
      ruleId: string,
      dismissedTransactionId: string,
      autoSuppressedIds: string[],
    ) => {
      setSessionLearning((current) =>
        revertDismissalLearning(
          current,
          ruleId,
          dismissedTransactionId,
          autoSuppressedIds,
        ),
      )
    },
    [],
  )

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
            element={
              <UploadCsvPage setAnalysisResult={handleSetAnalysisResult} />
            }
          />
          <Route
            path="/upload"
            element={
              <UploadCsvPage setAnalysisResult={handleSetAnalysisResult} />
            }
          />
          <Route
            path="/overview"
            element={<OverviewPage analysisResult={displayAnalysisResult} />}
          />
          <Route
            path="/review-queue"
            element={
              <ReviewQueuePage
                analysisResult={analysisResult}
                sessionLearning={sessionLearning}
                onLearnFromDismiss={(transaction, pending) => {
                  const { ruleId, autoSuppressedIds } = handleLearnFromDismiss(
                    transaction,
                    pending,
                  )
                  return { ruleId, autoSuppressedIds }
                }}
                onRevertDismissLearning={handleRevertDismissLearning}
              />
            }
          />
        </Routes>
      </main>

      <footer className="app-footer">
        <p className="app-footer__name">Fraud Hunter</p>
        <p className="app-footer__copyright">
          © {new Date().getFullYear()} Fraud Hunter
        </p>
      </footer>
    </>
  )
}

export default App
