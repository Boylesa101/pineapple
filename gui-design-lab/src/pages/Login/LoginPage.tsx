import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createSession, validateCredentials } from '../../utils/auth'
import styles from './LoginPage.module.css'

type LocationState = {
  from?: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validateCredentials(username, password)) {
      setError('Incorrect credentials. Update src/config/auth.ts if you need to reset them.')
      return
    }

    createSession(username.trim())
    const state = location.state as LocationState | null
    navigate(state?.from ?? '/dashboard', { replace: true })
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.orb} />
          <span>Pineapple GUI Design Lab</span>
        </div>
        <h1 className={styles.title}>GUI Design</h1>
        <p className={styles.subtitle}>
          Private review space for premium Pineapple screen iteration, click-through testing, and versioned design feedback.
        </p>
        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Username</span>
            <input className={styles.input} value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Password</span>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button className={styles.button} type="submit">
            Enter
          </button>
        </form>
        <p className={styles.hint}>Default access is stored in src/config/auth.ts for easy manual reset.</p>
      </section>
    </main>
  )
}
