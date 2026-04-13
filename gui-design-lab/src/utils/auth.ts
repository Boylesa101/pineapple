import { AUTH_CONFIG } from '../config/auth'

type SessionRecord = {
  authenticated: true
  username: string
  createdAt: string
}

export function validateCredentials(username: string, password: string) {
  return (
    username.trim() === AUTH_CONFIG.username &&
    password === AUTH_CONFIG.password
  )
}

export function createSession(username: string) {
  const session: SessionRecord = {
    authenticated: true,
    username,
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(AUTH_CONFIG.sessionStorageKey, JSON.stringify(session))
}

export function getSession() {
  const raw = localStorage.getItem(AUTH_CONFIG.sessionStorageKey)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionRecord>
    if (parsed.authenticated && typeof parsed.username === 'string') {
      return parsed as SessionRecord
    }
  } catch {
    localStorage.removeItem(AUTH_CONFIG.sessionStorageKey)
  }

  return null
}

export function hasSession() {
  return Boolean(getSession())
}

export function clearSession() {
  localStorage.removeItem(AUTH_CONFIG.sessionStorageKey)
}
