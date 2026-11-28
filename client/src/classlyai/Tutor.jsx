import { useEffect, useRef, useState } from 'react'
import { FiArrowRight, FiBookOpen, FiSend, FiX } from 'react-icons/fi'
import { request, useResource } from './api.js'

function RetrievalDetails({ trace }) {
  const entries = [
    ['Mode', trace.mode],
    ['Search', trace.strategy],
    ['Vector engine', trace.vectorEngine],
    ['Passages considered', trace.passages?.length],
    ...[
      ['Retrieval time', trace.timingsMs?.retrieval],
      ['Answer time', trace.timingsMs?.generation],
      ['Total time', trace.timingsMs?.total],
    ].map(([label, duration]) => [label, Number.isFinite(duration) ? `${Math.round(duration)} ms` : undefined]),
  ]

  return (
    <details className="tutor-trace">
      <summary>Retrieval details</summary>
      <dl>
        {entries.filter(([, value]) => value !== undefined && value !== null).map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </details>
  )
}

function EvidenceDialog({ courseSlug, citation, onClose }) {
  const dialog = useRef(null)
  const closeButton = useRef(null)
  const source = useResource(`/courses/${encodeURIComponent(courseSlug)}/citations/${encodeURIComponent(citation.id)}`)
  const passage = source.data?.citation
  const markdown = passage?.markdown
  const start = passage?.startOffset
  const end = passage?.endOffset
  const hasExactExcerpt = typeof markdown === 'string' && Number.isInteger(start) && Number.isInteger(end)
    && start >= 0 && end > start && end <= markdown.length && markdown.slice(start, end) === passage.excerpt

  useEffect(() => {
    const modal = dialog.current
    const previous = document.activeElement
    modal.showModal()
    closeButton.current.focus()
    return () => {
      if (modal.open) modal.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialog}
      className="evidence-dialog"
      aria-labelledby="evidence-title"
      onCancel={event => { event.preventDefault(); onClose() }}
    >
      <div className="dialog-header">
        <span className="small-label"><FiBookOpen aria-hidden="true" /> Source passage</span>
        <button ref={closeButton} type="button" className="icon-button" onClick={onClose} aria-label="Close source"><FiX aria-hidden="true" /></button>
      </div>
      <h2 id="evidence-title">{passage?.lessonTitle || citation.lessonTitle}</h2>
      {source.loading && <p role="status" className="muted">Loading the published source…</p>}
      {source.error && (
        <div className="inline-feedback" role="alert">
          <p>{source.error.message}</p>
          <button type="button" className="text-button" onClick={source.retry}>Retry</button>
        </div>
      )}
      {passage && (
        <>
          {passage.section && <p className="muted">{passage.section}</p>}
          <div className="source-text">
            {hasExactExcerpt && <span>{markdown.slice(Math.max(0, start - 240), start)}</span>}
            <mark>{hasExactExcerpt ? markdown.slice(start, end) : passage.excerpt}</mark>
            {hasExactExcerpt && <span>{markdown.slice(end, end + 240)}</span>}
          </div>
        </>
      )}
    </dialog>
  )
}

function Tutor({ courseSlug }) {
  const [question, setQuestion] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [answer, setAnswer] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const [citation, setCitation] = useState(null)

  async function ask(event) {
    event.preventDefault()
    const value = question.trim()
    if (!value || pending) return

    setPending(true)
    setError(null)
    setAnswer(null)
    setSubmitted(value)
    try {
      const data = await request(`/courses/${encodeURIComponent(courseSlug)}/tutor`, {
        method: 'POST',
        body: { question: value },
      })
      setAnswer(data)
      setQuestion('')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  const citations = answer?.citations ?? []

  return (
    <aside id="course-tutor" className="tutor-panel" aria-labelledby="tutor-title" tabIndex="-1">
      <div className="tutor-heading">
        <span className="tutor-symbol"><FiBookOpen aria-hidden="true" /></span>
        <div><h2 id="tutor-title">Course tutor</h2><p>Answers with links to the lesson.</p></div>
      </div>
      <div className="tutor-body" aria-live="polite" aria-atomic="false" aria-busy={pending}>
        {!submitted && <p className="tutor-prompt">Ask a question about this course. Open any citation to read the original passage.</p>}
        {submitted && <p className="question">{submitted}</p>}
        {pending && <p role="status" className="muted">Looking through course material…</p>}
        {error && <p role="alert" className="form-error">{error}</p>}
        {answer?.status === 'insufficient_evidence' && <p>The published lessons don’t give enough evidence to answer that question.</p>}
        {answer?.status === 'answered' && answer.claims?.map((claim, index) => (
          <p key={index} className="claim">
            {claim.text}
            {claim.citationIds?.map(id => {
              const position = citations.findIndex(source => source.id === id)
              if (position < 0) return null
              const source = citations[position]
              return <button key={id} className="citation-button" type="button" onClick={() => setCitation(source)} aria-label={`Open source ${position + 1}, ${source.lessonTitle}`}>{position + 1}</button>
            })}
          </p>
        ))}
        {citations.length > 0 && (
          <div className="tutor-sources">
            <h3 className="small-label">Sources</h3>
            {citations.map((source, index) => (
              <button key={source.id} type="button" onClick={() => setCitation(source)} className="source-link">
                <span className="source-number">{index + 1}</span>
                <span>{source.section || source.lessonTitle}</span>
                <FiArrowRight aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
        {answer?.trace && <RetrievalDetails trace={answer.trace} />}
      </div>
      <form onSubmit={ask} className="tutor-form">
        <label htmlFor="question">Ask a question</label>
        <div className="ask-field">
          <textarea id="question" rows="2" value={question} maxLength={1000} onChange={event => setQuestion(event.target.value)} placeholder="How does this concept work?" required />
          <button className="icon-button send-button" type="submit" disabled={pending || !question.trim()} aria-label="Ask course tutor"><FiSend aria-hidden="true" /></button>
        </div>
      </form>
      {citation && <EvidenceDialog courseSlug={courseSlug} citation={citation} onClose={() => setCitation(null)} />}
    </aside>
  )
}

export default Tutor
