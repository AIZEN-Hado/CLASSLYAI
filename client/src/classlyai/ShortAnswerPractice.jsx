import { useState } from 'react'
import { request, useResource } from './api.js'
import { ResourceFeedback } from './components.jsx'

export default function ShortAnswerPractice({ path, revisionId }) {
  const resource = useResource(path)
  const [result, setResult] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const practice = resource.data?.practice

  async function submit(event) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    const answer = form.get('answer')
    setPending(true)
    setResult(null)
    setError(null)
    try {
      setResult(await request(path, { method: 'POST', body: { revisionId, answer } }))
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  if (resource.error?.status === 404) return null
  if (resource.error) return <ResourceFeedback resource={resource} />
  if (practice?.revisionId !== revisionId) return null

  return (
    <section className="practice-quiz short-answer" aria-labelledby="short-answer-heading">
      <h2 id="short-answer-heading">Experimental short-answer practice</h2>
      <p className="muted">A local model estimates which rubric points your answer covers. Marks are tentative and apply to this practice response only.</p>
      <form onSubmit={submit} onChange={() => { setResult(null); setError(null) }}>
        <div className="short-answer-field">
          <label htmlFor="practice-short-answer">{practice.prompt}</label>
          <textarea id="practice-short-answer" name="answer" maxLength={practice.maxLength} rows={4} required disabled={pending} />
        </div>
        <div className="practice-quiz-actions">
          <button className="secondary-button" type="submit" disabled={pending}>{pending ? 'Checking answer…' : 'Check answer'}</button>
          <p role="status">{result && `Tentative mark · ${result.score} of ${result.maxScore}`}</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {result && (
          <ul className="short-answer-marks" aria-label="Tentative rubric marks">
            {result.points.map(point => (
              <li key={point.id}>{point.description}<span className="practice-quiz-feedback">{point.awarded ? 1 : 0}/1</span></li>
            ))}
          </ul>
        )}
      </form>
    </section>
  )
}
