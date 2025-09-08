import React from 'react'
import { setToken as persistToken, getToken as restoreToken } from './api'

type AuthContextType = {
  token: string
  setToken: (t: string) => void
  logout: () => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = React.useState<string>(restoreToken())
  const setToken = React.useCallback((t: string) => {
    setTokenState(t)
    persistToken(t)
  }, [])
  const logout = React.useCallback(() => setToken(''), [setToken])
  const value = React.useMemo(() => ({ token, setToken, logout }), [token, setToken, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

