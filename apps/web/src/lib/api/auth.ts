import { fetchApi, fetchApiAuth } from './core'

export const adminLogin = (password: string) =>
  fetchApi<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })

export const verifyToken = () =>
  fetchApiAuth<{ valid: boolean }>('/auth/verify')
