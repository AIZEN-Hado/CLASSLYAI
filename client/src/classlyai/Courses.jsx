import { useState } from 'react'
import { PiArrowLeft, PiArrowRight, PiCopy, PiPlus, PiTrash } from 'react-icons/pi'
import { Link, useNavigate } from 'react-router-dom'
import { request, useResource } from './api.js'
import { ResourceFeedback } from './components.jsx'

const base = courseSlug => `/courses/${encodeURIComponent(courseSlug)}`

export function NewCourse({ onCreated }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [state, setState] = useState({ pending: false, error: null })

  async function create(event) {
    event.preventDefault()
    setState({ pending: true, error: null })
    try {
      const { course } = await request('/courses', { method: 'POST', body: { title, summary } })
      onCreated()
      navigate(base(course.slug))
    } catch (failure) {
      setState({ pending: false, error: failure.message })
    }
  }

  return (
    <section className="content-page editor-page">
      <Link className="back-link" to="/"><PiArrowLeft aria-hidden="true" /> My courses</Link>
      <h1>Create a course</h1>
      <p className="page-description">You become its instructor. Students join with a code you can share, and you can rotate the code at any time.</p>
      <form className="editor-form" onSubmit={create}>
        <div className="editor-fields">
          <label htmlFor="course-title">Course title</label>
          <input id="course-title" value={title} maxLength={120} required onChange={event => setTitle(event.target.value)} />
          <label htmlFor="course-summary">Summary <span>optional, one or two sentences</span></label>
          <textarea id="course-summary" rows="3" value={summary} maxLength={300} onChange={event => setSummary(event.target.value)} />
        </div>
        <div className="editor-actions">
          <button className="primary-button" type="submit" disabled={state.pending || !title.trim()}>{state.pending ? 'Creating…' : 'Create course'}</button>
        </div>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
      </form>
    </section>
  )
}

export function JoinCourse({ onJoined }) {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [state, setState] = useState({ pending: false, error: null })

  async function join(event) {
    event.preventDefault()
    setState({ pending: true, error: null })
    try {
      const { course } = await request('/courses/join', { method: 'POST', body: { code } })
      onJoined()
      navigate(base(course.slug))
    } catch (failure) {
      setState({ pending: false, error: failure.message })
    }
  }

  return (
    <form className="join-course" onSubmit={join}>
      <label htmlFor="join-code">Join a course with a code</label>
      <div className="join-row">
        <input id="join-code" value={code} maxLength={12} autoComplete="off" spellCheck="false" placeholder="ABCD-2345" required onChange={event => setCode(event.target.value)} />
        <button className="secondary-button" type="submit" disabled={state.pending || !code.trim()}>{state.pending ? 'Joining…' : 'Join'} <PiArrowRight aria-hidden="true" /></button>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  )
}

export function AddLesson({ courseSlug }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [state, setState] = useState({ pending: false, error: null })

  async function add(event) {
    event.preventDefault()
    setState({ pending: true, error: null })
    try {
      const { lesson } = await request(`${base(courseSlug)}/lessons`, { method: 'POST', body: { title } })
      navigate(`${base(courseSlug)}/lessons/${encodeURIComponent(lesson.slug)}/editor`)
    } catch (failure) {
      setState({ pending: false, error: failure.message })
    }
  }

  return (
    <form className="add-lesson" onSubmit={add}>
      <label htmlFor="new-lesson-title">Add a lesson</label>
      <div className="join-row">
        <input id="new-lesson-title" value={title} maxLength={160} placeholder="Lesson title" required onChange={event => setTitle(event.target.value)} />
        <button className="secondary-button" type="submit" disabled={state.pending || !title.trim()}><PiPlus aria-hidden="true" /> {state.pending ? 'Adding…' : 'Add'}</button>
      </div>
      <p className="muted">New lessons start as drafts. Write it in the editor, then publish.</p>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  )
}

export function MembersPanel({ courseSlug }) {
  const [version, setVersion] = useState(0)
  const resource = useResource(`${base(courseSlug)}/members?v=${version}`)
  const [state, setState] = useState({ error: null, copied: false })
  const data = resource.data

  async function act(path, options) {
    setState({ error: null, copied: false })
    try {
      await request(path, options)
      setVersion(value => value + 1)
    } catch (failure) {
      setState({ error: failure.message, copied: false })
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(data.joinCode)
      setState({ error: null, copied: true })
    } catch {
      setState({ error: 'Copy failed. Select the code and copy it by hand.', copied: false })
    }
  }

  return (
    <section className="members-panel" aria-labelledby="members-heading">
      <h2 id="members-heading">People</h2>
      <ResourceFeedback resource={resource} label="Loading members…" orbSize={40} />
      {data && (
        <>
          <div className="join-code">
            <span className="small-label">Join code</span>
            {data.joinCode
              ? <><strong aria-label={`Join code ${data.joinCode.split('').join(' ')}`}>{data.joinCode.slice(0, 4)} {data.joinCode.slice(4)}</strong>
                <button type="button" className="text-button" onClick={copy}><PiCopy aria-hidden="true" /> {state.copied ? 'Copied' : 'Copy'}</button></>
              : <span className="muted">No code yet.</span>}
            <button type="button" className="text-button" onClick={() => act(`${base(courseSlug)}/join-code`, { method: 'POST', body: {} })}>{data.joinCode ? 'New code' : 'Create a code'}</button>
          </div>
          <ul className="member-list">
            {data.members.map(member => (
              <li key={member.id}>
                <span><strong>{member.displayName}</strong><small>{member.email}</small></span>
                <span className="lesson-status">{member.role === 'instructor' ? 'Instructor' : 'Student'}</span>
                {member.role === 'student'
                  ? <button type="button" className="icon-button" aria-label={`Remove ${member.displayName}`} onClick={() => act(`${base(courseSlug)}/members/${member.id}`, { method: 'DELETE' })}><PiTrash aria-hidden="true" /></button>
                  : <span />}
              </li>
            ))}
          </ul>
          {data.members.length === 1 && <p className="muted">Share the code so students can join. A new code stops further joins without removing anyone.</p>}
        </>
      )}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </section>
  )
}
