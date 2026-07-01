import React, { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const MOCK_USER = {
  id: 'usr_001',
  name: 'Alexandra Chen',
  email: 'alexandra.chen@globalfinance.com',
  role: 'Senior Finance Manager',
  organization: 'GlobalFinance Corp',
  avatar: null,
  permissions: ['read', 'write', 'approve', 'admin'],
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('icfdra_user')
    return saved ? JSON.parse(saved) : null
  })
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (email, password) => {
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    // Mock auth — accept any credentials
    const loggedUser = { ...MOCK_USER, email }
    localStorage.setItem('icfdra_user', JSON.stringify(loggedUser))
    setUser(loggedUser)
    setIsLoading(false)
    return loggedUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('icfdra_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
