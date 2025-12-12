import api from './api'

export const authService = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }).then(res => res.data),
  
  refresh: (refreshToken) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }).then(res => res.data),
  
  logout: () =>
    api.post('/auth/logout').then(res => res.data),
  
  getMe: () =>
    api.get('/auth/me').then(res => res.data)
}
