import { createContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const userData = await authService.getMe()
      setUser(userData)
    } catch (err) {
      console.error('Failed to fetch user:', err)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      setError(null)
      const response = await authService.login(email, password)
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      setUser(response.user)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      const response = await authService.refresh(refreshToken)
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      setUser(response.user)
      return response
    } catch (err) {
      logout()
      throw err
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      logout,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  )
}
