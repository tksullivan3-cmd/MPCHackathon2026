import { useEffect, useState } from 'react'
import {
  applyTheme,
  getInitialTheme,
  getStoredTheme,
  getSystemTheme,
  type Theme,
} from '../theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function handleChange() {
      if (getStoredTheme() === null) {
        setTheme(getSystemTheme())
      }
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  function toggleTheme() {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }

  return { theme, toggleTheme }
}
