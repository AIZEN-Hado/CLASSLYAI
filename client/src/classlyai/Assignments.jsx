import { useState } from 'react'
import { FiArrowLeft, FiArrowRight, FiPlus, FiTrash2 } from 'react-icons/fi'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { request, useResource } from './api.js'
import { ResourceFeedback } from './components.jsx'
import OrbLoader from './OrbLoader.jsx'

const base = courseSlug => `/courses/${encodeURIComponent(courseSlug)}`

export function AssignmentList({ courseSlug }) {
  const resource = useResource(`${base(courseSlug)}/assignments`)
  const data = resource.data
  const instructor = data?.role === 'instructor'
  if (!data && !resource.loading && !resource.error) return null

  return (
    <section className="assignment-list" aria-labelledby="assignments-heading">
      <div className="assignment-list-header">
        <h2 id="assignments-heading">Assignments</h2>
        {instructor && <Link className="text-button" to={`${base(courseSlug)}/assignments/new`}><FiPlus aria-hidden="true" /> New assignment</Link>}
      </div>
      <ResourceFeedback resource={resource} label="Loading assignments…" orbSize={40} />
      {data?.assignments.length === 0 && <p className="muted">{instructor ? 'No assignments yet. Create one with a rubric.' : 'No assignments have been set.'}</p>}
      {data?.assignments.map(item => (
        <Link key={item.id} className="lesson-row assignment-row" to={`${base(courseSlug)}/assignments/${item.id}`}>
          <span className="lesson-icon" />
          <span>{item.title}</span>
          <span className="lesson-status">
            {instructor
              ? `${item.submissionCount} submitted${item.needsReview ? ` · ${item.needsReview} to review` : ''}`
              : item.submitted ? `${item.reviewed ? 'Reviewed' : 'Checked'} · ${item.score} of ${item.pointCount}` : 'Not submitted'}
            <FiArrowRight aria-hidden="true" />
          </span>
        </Link>
      ))}
    </section>
  )
}

function Marks({ marks }) {
  return (
    <ul className="assignment-marks">
      {marks.map((mark, index) => (
        <li key={index} data-met={Boolean(mark.awarded)}>
          <span className="mark-state">{mark.awarded ? 'Met' : 'Not met'}</span>
          <span>{mark.description}</span>
        </li>
      ))}
    </ul>
  )
}

function StudentView({ courseSlug, assignment, initial }) {
  const path = `${base(courseSlug)}/assignments/${assignment.id}`
  const [submission, setSubmission] = useState(initial)
  const [answer, setAnswer] = useState(initial?.answer ?? '')
  const [state, setState] = useState({ pending: false, error: null })

  async function submit(event) {
    event.preventDefault()
    setState({ pending: true, error: null })
    try {
      const data = await request(path + '/submit', { method: 'POST', body: { answer } })
      setSubmission(data.submission)
      setState({ pending: false, error: null })
    } catch (failure) {
      setState({ pending: false, error: failure.message })
    }
  }

  return (
    <>
      <p className="assignment-prompt">{assignment.prompt}</p>
      <h2 className="assignment-subhead">What a strong answer covers</h2>
      <ol className="assignment-rubric">{assignment.points.map((point, index) => <li key={index}>{point}</li>)}</ol>
      <form className="assignment-form" onSubmit={submit}>
        <label htmlFor="assignment-answer">Your answer</label>
        <textarea id="assignment-answer" rows="8" value={answer} maxLength={2000} required disabled={state.pending} onChange={event => setAnswer(event.target.value)} />
        <div className="editor-actions">
          <button className="primary-button" type="submit" disabled={state.pending || !answer.trim()}>{submission ? 'Submit again' : 'Submit answer'}</button>
          <span className="muted">{answer.length} / 2000</span>
        </div>
        {state.pending && <div className="loading-state" role="status"><OrbLoader size={44} /><span>Checking your answer with the local model. This can take up to a minute.</span></div>}
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
      </form>
      {submission && (
        <section className="assignment-result" aria-live="polite">
          <h2 className="assignment-subhead">{submission.reviewed ? 'Reviewed by your instructor' : 'Automatic marks'}</h2>
          <p className="muted">{submission.reviewed
            ? 'These marks were confirmed by your instructor.'
            : 'A local model checked each point. These marks are advisory until your instructor reviews them.'}</p>
          <Marks marks={submission.marks} />
          <p className="assignment-score">{submission.marks.filter(mark => mark.awarded).length} of {submission.marks.length} points</p>
        </section>
      )}
    </>
  )
}

function ReviewCard({ path, points, submission }) {
  const [record, setRecord] = useState(submission)
  const [finals, setFinals] = useState(() => submission.marks.map(mark => mark.final_awarded ?? mark.auto_awarded))
  const [state, setState] = useState({ pending: false, error: null })

  async function confirm() {
    setState({ pending: true, error: null })
    try {
      const data = await request(`${path}/submissions/${record.id}/review`, { method: 'PUT', body: { marks: finals } })
      setRecord(data.submission)
      setState({ pending: false, error: null })
    } catch (failure) {
      setState({ pending: false, error: failure.message })
    }
  }

  return (
    <article className="review-card" data-reviewed={Boolean(record.reviewedAt)}>
      <header>
        <h3>{record.studentName}</h3>
        <span className="small-label">{record.reviewedAt ? 'Reviewed' : 'Needs review'} · {new Date(record.submittedAt).toLocaleString()}</span>
      </header>
      <p className="review-answer">{record.answer}</p>
      <ul className="review-marks">
        {record.marks.map((mark, index) => (
          <li key={index} data-flagged={mark.flagged && !record.reviewedAt}>
            <label>
              <input type="checkbox" checked={finals[index]} disabled={state.pending} onChange={event => setFinals(previous => previous.map((value, i) => (i === index ? event.target.checked : value)))} />
              <span>{points[index]}</span>
            </label>
            <span className="review-note">
              {mark.flagged && !record.reviewedAt ? 'The two checkers disagree. Please check this point.' : `Model: ${mark.auto_awarded ? 'met' : 'not met'}`}
            </span>
          </li>
        ))}
      </ul>
      <div className="editor-actions">
        <button className="primary-button" type="button" disabled={state.pending} onClick={confirm}>{record.reviewedAt ? 'Update review' : 'Confirm marks'}</button>
        <span className="muted">{finals.filter(Boolean).length} of {finals.length} points</span>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </article>
  )
}

export function AssignmentPage() {
  const { courseSlug, assignmentId } = useParams()
  const path = `${base(courseSlug)}/assignments/${encodeURIComponent(assignmentId)}`
  const resource = useResource(path)
  const data = resource.data

  return (
    <section className="content-page assignment-page">
      <Link className="back-link" to={base(courseSlug)}><FiArrowLeft aria-hidden="true" /> Course</Link>
      <h1>{data?.assignment.title ?? 'Assignment'}</h1>
      <ResourceFeedback resource={resource} label="Loading assignment…" />
      {data && data.submissions === undefined && <StudentView key={assignmentId} courseSlug={courseSlug} assignment={data.assignment} initial={data.submission} />}
      {data?.submissions && (
        <>
          <p className="assignment-prompt">{data.assignment.prompt}</p>
          <ol className="assignment-rubric">{data.assignment.points.map((point, index) => <li key={index}>{point}</li>)}</ol>
          <h2 className="assignment-subhead">Submissions ({data.submissions.length})</h2>
          {data.submissions.length === 0 && <p className="muted">Nothing has been submitted yet.</p>}
          {data.submissions.map(item => <ReviewCard key={item.id} path={path} points={data.assignment.points} submission={item} />)}
        </>
      )}
    </section>
  )
}

export function NewAssignment() {
  const { courseSlug } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [points, setPoints] = useState([''])
  const [state, setState] = useState({ pending: false, error: null })

  async function create(event) {
    event.preventDefault()
    setState({ pending: true, error: null })
    try {
      const { assignment } = await request(`${base(courseSlug)}/assignments`, { method: 'POST', body: { title, prompt, points } })
      navigate(`${base(courseSlug)}/assignments/${assignment.id}`)
    } catch (failure) {
      setState({ pending: false, error: failure.message })
    }
  }

  return (
    <section className="content-page editor-page">
      <Link className="back-link" to={base(courseSlug)}><FiArrowLeft aria-hidden="true" /> Course</Link>
      <h1>New assignment</h1>
      <form className="editor-form" onSubmit={create}>
        <div className="editor-fields">
          <label htmlFor="assignment-title">Title</label>
          <input id="assignment-title" value={title} maxLength={160} required onChange={event => setTitle(event.target.value)} />
          <label htmlFor="assignment-prompt">Prompt <span>what students answer</span></label>
          <textarea id="assignment-prompt" rows="5" value={prompt} maxLength={2000} required onChange={event => setPrompt(event.target.value)} />
        </div>
        <fieldset className="quiz-question">
          <legend>Rubric points, one mark each</legend>
          <p className="muted">Write each point as what a correct answer says, for example “the server returns the saved result without repeating the purchase”.</p>
          <ul className="quiz-options rubric-inputs">
            {points.map((point, index) => (
              <li key={index}>
                <span className="small-label">{index + 1}</span>
                <input value={point} maxLength={300} required aria-label={`Rubric point ${index + 1}`} onChange={event => setPoints(previous => previous.map((value, i) => (i === index ? event.target.value : value)))} />
                {points.length > 1 && <button type="button" className="icon-button" aria-label={`Remove point ${index + 1}`} onClick={() => setPoints(previous => previous.filter((_, i) => i !== index))}><FiTrash2 aria-hidden="true" /></button>}
              </li>
            ))}
          </ul>
          {points.length < 6 && <div className="quiz-question-actions"><button type="button" className="text-button" onClick={() => setPoints(previous => [...previous, ''])}><FiPlus aria-hidden="true" /> Add point</button></div>}
        </fieldset>
        <div className="editor-actions">
          <button className="primary-button" type="submit" disabled={state.pending}>{state.pending ? 'Creating…' : 'Create assignment'}</button>
        </div>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
      </form>
    </section>
  )
}
