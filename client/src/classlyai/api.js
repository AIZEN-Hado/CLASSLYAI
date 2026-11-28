import { useEffect, useState } from 'react'

export async function request(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    signal,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const data = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : null

  if (!response.ok || (response.status !== 204 && !data)) {
    const error = new Error(data?.message || 'The classroom service is unavailable. Try again in a moment.')
    error.status = response.status
    throw error
  }

  return data
}

export function useResource(path) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    request(path, { signal: controller.signal })
      .then(data => setResult({ path, attempt, data }))
      .catch(error => {
        if (!controller.signal.aborted) setResult({ path, attempt, error })
      })
    return () => controller.abort()
  }, [path, attempt])

  const current = result?.path === path && result.attempt === attempt ? result : null
  return {
    data: current?.data,
    error: current?.error,
    loading: Boolean(path) && !current,
    retry: () => setAttempt(value => value + 1),
  }
}
