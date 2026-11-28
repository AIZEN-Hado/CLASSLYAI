import { useEffect, useState } from 'react'
import { FiArrowLeft, FiCheck, FiFileText } from 'react-icons/fi'
import { Link, useParams } from 'react-router-dom'
import { request, useResource } from './api.js'
import { ResourceFeedback } from './components.jsx'

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
          {record.status === 'ready' && <span className="published-label"><FiCheck aria-hidden="true" /> Available to students</span>}
        </div>
      </div>
    </form>
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
      <Link className="back-link" to={coursePath}><FiArrowLeft aria-hidden="true" /> Course reader</Link>
      <h1>Lesson editor</h1>
      {course && <p className="page-description">{course.title}</p>}
      <ResourceFeedback resource={overview} label="Loading course…" />
      {course && (
        <nav className="editor-nav" aria-label="Lessons to edit">
          {course.lessons.map(lesson => (
            <Link key={lesson.id} to={`${coursePath}/lessons/${encodeURIComponent(lesson.slug)}/editor`} aria-current={lesson.slug === lessonSlug ? 'page' : undefined}>
              <FiFileText aria-hidden="true" /> {lesson.title || lesson.slug}
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
