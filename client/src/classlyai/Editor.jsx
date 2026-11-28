import { useEffect, useState } from 'react'
import { PiArrowLeft, PiCheck, PiFileText, PiPlus, PiTrash } from 'react-icons/pi'
import { Link, useParams } from 'react-router-dom'
import { request, useResource } from './api.js'
import { ResourceFeedback } from './components.jsx'
import OrbLoader from './OrbLoader.jsx'

const statusLabels = {
  draft: 'Draft',
  queued: 'Queued for indexing',
  processing: 'Indexing',
  ready: 'Published',
  failed: 'Indexing failed',
}

const indexing = status => status === 'queued' || status === 'processing'

function EditorForm({ path, lesson }) {
  const [record, setRecord] = useState(lesson)
  const [title, setTitle] = useState(lesson.title ?? '')
  const [markdown, setMarkdown] = useState(lesson.markdown ?? '')
  const [action, setAction] = useState('')
  const [error, setError] = useState(null)
  const dirty = title !== (record.title ?? '') || markdown !== (record.markdown ?? '')
  const waiting = indexing(record.status)

  useEffect(() => {
    if (!waiting) return
    const controller = new AbortController()
    let timeout

    function plan(delay) {
      timeout = window.setTimeout(async () => {
        try {
          const { lesson: latest } = await request(path + '/editor', { signal: controller.signal })
          if (controller.signal.aborted) return
          setRecord(latest)
          if (indexing(latest.status)) plan(1400)
        } catch {
          if (!controller.signal.aborted) plan(3500)
        }
      }, delay)
    }

    plan(1000)
    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [path, waiting])

  async function save(event) {
    event.preventDefault()
    setAction('save')
    setError(null)
    try {
      const data = await request(path + '/draft', { method: 'POST', body: { title, markdown } })
      setRecord(data.lesson)
      setTitle(data.lesson.title)
      setMarkdown(data.lesson.markdown)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setAction('')
    }
  }

  async function publish() {
    setAction('publish')
    setError(null)
    try {
      const data = await request(path + '/publish', { method: 'POST', body: { revisionId: record.revisionId } })
      setRecord(data.lesson)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setAction('')
    }
  }

  return (
    <>
    <form className="editor-form" onSubmit={save}>
      <div className="editor-fields">
        <label htmlFor="lesson-title">Lesson title</label>
        <input id="lesson-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} disabled={Boolean(action) || waiting} required />
        <label htmlFor="lesson-markdown">Lesson content <span>Markdown</span></label>
        <textarea id="lesson-markdown" rows="15" value={markdown} maxLength={12000} onChange={event => setMarkdown(event.target.value)} disabled={Boolean(action) || waiting} required />
      </div>
      <div className="editor-summary">
        <p className="editor-status" role="status"><span className={`status-dot status-${record.status}`} />{statusLabels[record.status] || 'Draft'}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {record.status === 'failed' && <p className="form-error">{record.error || 'The lesson couldn’t be indexed. Retry publishing.'}</p>}
        {waiting && <p className="muted">Students can still read the last published revision while this version is indexed.</p>}
        {dirty && <p className="muted">You have unsaved changes.</p>}
        <div className="editor-actions">
          <button className="secondary-button" type="submit" disabled={!dirty || !title.trim() || !markdown.trim() || Boolean(action) || waiting}>{action === 'save' ? 'Saving…' : 'Save draft'}</button>
          {(record.status === 'draft' || record.status === 'failed') && (
            <button className="primary-button" type="button" disabled={dirty || Boolean(action) || !record.revisionId} onClick={publish}>
              {action === 'publish' ? 'Requesting…' : record.status === 'failed' ? 'Retry publishing' : 'Publish lesson'}
            </button>
          )}
          {record.status === 'ready' && <span className="published-label"><PiCheck aria-hidden="true" /> Available to students</span>}
        </div>
      </div>
    </form>
    <QuizEditor key={record.revisionId} path={path} />
    <NotesEditor key={`notes-${record.revisionId}`} path={path} />
    </>
  )
}

const blankQuestion = () => ({ prompt: '', options: ['', ''], correct: 0, source: 'manual' })

function QuizForm({ path, quiz }) {
  const [questions, setQuestions] = useState(quiz.questions.length ? quiz.questions : [blankQuestion()])
  const [state, setState] = useState({ pending: false, error: null, saved: false })
  const locked = quiz.locked

  const edit = (index, change) => {
    setQuestions(previous => previous.map((question, i) => (i === index ? { ...question, ...change } : question)))
    setState({ pending: false, error: null, saved: false })
  }

  function removeOption(index, optionIndex) {
    const question = questions[index]
    const options = question.options.filter((_, i) => i !== optionIndex)
    const correct = question.correct === optionIndex ? 0 : question.correct > optionIndex ? question.correct - 1 : question.correct
    edit(index, { options, correct })
  }

  async function draft() {
    setState({ pending: true, error: null, saved: false, drafting: true })
    try {
      const { questions: generated } = await request(path + '/quiz/generate', { method: 'POST', body: {} })
      setQuestions(previous => [...previous.filter(question => question.prompt.trim()), ...generated.map(({ prompt, options, correct, source }) => ({ prompt, options, correct, source }))].slice(0, 10))
      setState({ pending: false, error: null, saved: false })
    } catch (failure) {
      setState({ pending: false, error: failure.message, saved: false })
    }
  }

  async function save(event) {
    event.preventDefault()
    setState({ pending: true, error: null, saved: false })
    try {
      await request(path + '/quiz', { method: 'PUT', body: { revisionId: quiz.revisionId, questions } })
      setState({ pending: false, error: null, saved: true })
    } catch (failure) {
      setState({ pending: false, error: failure.message, saved: false })
    }
  }

  return (
    <form className="quiz-editor" onSubmit={save}>
      <h2>Practice quiz</h2>
      <p className="muted">
        {locked
          ? 'This revision is published, so its quiz is locked. Save a new lesson revision above to write a new quiz; it starts from these questions.'
          : 'Students take this quiz once the revision is published. Mark the correct option for each question.'}
      </p>
      {questions.map((question, index) => (
        <fieldset key={index} className="quiz-question" disabled={locked || state.pending}>
          <legend>Question {index + 1}{question.source === 'generated' && <span className="quiz-source"> · drafted by the local model, review before publishing</span>}</legend>
          <label htmlFor={`prompt-${index}`}>Prompt</label>
          <textarea id={`prompt-${index}`} rows="2" value={question.prompt} maxLength={300} required onChange={event => edit(index, { prompt: event.target.value })} />
          <ul className="quiz-options">
            {question.options.map((option, optionIndex) => (
              <li key={optionIndex}>
                <input type="radio" name={`correct-${index}`} checked={question.correct === optionIndex} onChange={() => edit(index, { correct: optionIndex })} aria-label={`Option ${optionIndex + 1} is correct`} />
                <textarea rows="1" value={option} maxLength={200} required aria-label={`Option ${optionIndex + 1}`} onChange={event => edit(index, { options: question.options.map((value, i) => (i === optionIndex ? event.target.value : value)) })} />
                {question.options.length > 2 && <button type="button" className="icon-button" aria-label={`Remove option ${optionIndex + 1}`} onClick={() => removeOption(index, optionIndex)}><PiTrash aria-hidden="true" /></button>}
              </li>
            ))}
          </ul>
          <div className="quiz-question-actions">
            {question.options.length < 6 && <button type="button" className="text-button" onClick={() => edit(index, { options: [...question.options, ''] })}><PiPlus aria-hidden="true" /> Add option</button>}
            {questions.length > 1 && <button type="button" className="text-button" onClick={() => { setQuestions(previous => previous.filter((_, i) => i !== index)); setState({ pending: false, error: null, saved: false }) }}>Remove question</button>}
          </div>
        </fieldset>
      ))}
      {!locked && (
        <div className="editor-actions">
          {questions.length < 10 && <button type="button" className="secondary-button" disabled={state.pending} onClick={() => setQuestions(previous => [...previous, blankQuestion()])}><PiPlus aria-hidden="true" /> Add question</button>}
          {questions.length < 10 && <button type="button" className="secondary-button" disabled={state.pending} onClick={draft}>Draft with the local model</button>}
          <button className="primary-button" type="submit" disabled={state.pending}>{state.pending ? 'Saving…' : 'Save quiz'}</button>
          <p role="status" className="muted">{state.saved && 'Quiz saved.'}</p>
        </div>
      )}
      {state.drafting && state.pending && <div className="loading-state" role="status"><OrbLoader size={44} /><span>Drafting questions from the lesson. This can take a minute.</span></div>}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  )
}

function QuizEditor({ path }) {
  const resource = useResource(path + '/quiz')
  return (
    <>
      <ResourceFeedback resource={resource} label="Loading quiz…" />
      {resource.data?.quiz && <QuizForm key={resource.data.quiz.revisionId} path={path} quiz={resource.data.quiz} />}
    </>
  )
}

function NotesForm({ path, notes }) {
  const [items, setItems] = useState(notes.items.length ? notes.items : [{ heading: '', body: '', source: 'manual' }])
  const [state, setState] = useState({ pending: false, error: null, saved: false })
  const locked = notes.locked

  const edit = (index, change) => {
    setItems(previous => previous.map((item, i) => (i === index ? { ...item, ...change } : item)))
    setState({ pending: false, error: null, saved: false })
  }

  async function draft() {
    setState({ pending: true, error: null, saved: false, drafting: true })
    try {
      const { items: generated } = await request(path + '/notes/generate', { method: 'POST', body: {} })
      setItems(generated)
      setState({ pending: false, error: null, saved: false })
    } catch (failure) {
      setState({ pending: false, error: failure.message, saved: false })
    }
  }

  async function save(event) {
    event.preventDefault()
    setState({ pending: true, error: null, saved: false })
    try {
      await request(path + '/notes', { method: 'PUT', body: { revisionId: notes.revisionId, items } })
      setState({ pending: false, error: null, saved: true })
    } catch (failure) {
      setState({ pending: false, error: failure.message, saved: false })
    }
  }

  return (
    <form className="quiz-editor notes-editor" onSubmit={save}>
      <h2>Study notes</h2>
      <p className="muted">
        {locked
          ? 'This revision is published, so its notes are locked. Save a new lesson revision above to write new notes; they start from these.'
          : 'Short notes students read under the lesson. Drafting replaces the list below, so review every note before saving.'}
      </p>
      {items.map((item, index) => (
        <fieldset key={index} className="quiz-question" disabled={locked || state.pending}>
          <legend>Note {index + 1}{item.source === 'generated' && <span className="quiz-source"> · drafted by the local model, review before publishing</span>}</legend>
          <label htmlFor={`note-heading-${index}`}>Heading</label>
          <input id={`note-heading-${index}`} value={item.heading} maxLength={120} required onChange={event => edit(index, { heading: event.target.value })} />
          <label htmlFor={`note-body-${index}`}>Note</label>
          <textarea id={`note-body-${index}`} rows="3" value={item.body} maxLength={600} required onChange={event => edit(index, { body: event.target.value })} />
          {items.length > 1 && <div className="quiz-question-actions"><button type="button" className="text-button" onClick={() => { setItems(previous => previous.filter((_, i) => i !== index)); setState({ pending: false, error: null, saved: false }) }}>Remove note</button></div>}
        </fieldset>
      ))}
      {!locked && (
        <div className="editor-actions">
          {items.length < 12 && <button type="button" className="secondary-button" disabled={state.pending} onClick={() => setItems(previous => [...previous, { heading: '', body: '', source: 'manual' }])}><PiPlus aria-hidden="true" /> Add note</button>}
          <button type="button" className="secondary-button" disabled={state.pending} onClick={draft}>Draft with the local model</button>
          <button className="primary-button" type="submit" disabled={state.pending}>{state.pending ? 'Saving…' : 'Save notes'}</button>
          <p role="status" className="muted">{state.saved && 'Notes saved.'}</p>
        </div>
      )}
      {state.drafting && state.pending && <div className="loading-state" role="status"><OrbLoader size={44} /><span>Drafting notes from the lesson. This can take a minute.</span></div>}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  )
}

function NotesEditor({ path }) {
  const resource = useResource(path + '/notes')
  return (
    <>
      <ResourceFeedback resource={resource} label="Loading notes…" />
      {resource.data?.notes && <NotesForm key={resource.data.notes.revisionId} path={path} notes={resource.data.notes} />}
    </>
  )
}

function Editor() {
  const { courseSlug, lessonSlug } = useParams()
  const coursePath = `/courses/${encodeURIComponent(courseSlug)}`
  const lessonPath = lessonSlug ? `${coursePath}/lessons/${encodeURIComponent(lessonSlug)}` : null
  const overview = useResource(coursePath + '/instructor')
  const detail = useResource(lessonPath ? lessonPath + '/editor' : null)
  const course = overview.data?.course

  return (
    <section className="editor-page content-page">
      <Link className="back-link" to={coursePath}><PiArrowLeft aria-hidden="true" /> Course reader</Link>
      <h1>Lesson editor</h1>
      {course && <p className="page-description">{course.title}</p>}
      <ResourceFeedback resource={overview} label="Loading course…" />
      {course && (
        <nav className="editor-nav" aria-label="Lessons to edit">
          {course.lessons.map(lesson => (
            <Link key={lesson.id} to={`${coursePath}/lessons/${encodeURIComponent(lesson.slug)}/editor`} aria-current={lesson.slug === lessonSlug ? 'page' : undefined}>
              <PiFileText aria-hidden="true" /> {lesson.title || lesson.slug}
            </Link>
          ))}
        </nav>
      )}
      <ResourceFeedback resource={detail} label="Loading lesson editor…" />
      {course && !lessonSlug && <p className="muted">{course.lessons.length ? 'Select a lesson to open its draft and publishing history.' : 'This course has no lessons yet.'}</p>}
      {detail.data?.lesson && <EditorForm key={lessonPath} path={lessonPath} lesson={detail.data.lesson} />}
    </section>
  )
}

export default Editor
