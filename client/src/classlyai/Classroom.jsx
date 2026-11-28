import { useEffect, useState } from 'react'
import { FiArrowLeft, FiArrowRight, FiBookOpen, FiCheck, FiEdit3, FiFileText, FiGrid, FiLogOut } from 'react-icons/fi'
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom'
import { request, useResource } from './api.js'
import { Brand, ResourceFeedback } from './components.jsx'
import Editor from './Editor.jsx'
import Markdown from './Markdown.jsx'
import PracticeQuiz from './PracticeQuiz.jsx'
import Tutor from './Tutor.jsx'

function SignIn({ onSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  async function signIn(event) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const { user } = await request('/auth/login', { method: 'POST', body: { email, password } })
      onSignIn(user)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="sign-in">
      <div className="sign-in-content">
        <Brand />
        <div className="sign-in-main">
          <h1>Welcome to your classroom.</h1>
          <p>Read your lessons and ask questions grounded in your course material.</p>
          <form onSubmit={signIn} className="sign-in-form">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" name="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" name="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}<FiArrowRight aria-hidden="true" /></button>
          </form>
        </div>
      </div>
      <div className="sign-in-art" aria-hidden="true">
        <div className="art-orbit" />
        <div className="art-page">
          <span className="art-rule" /><span className="art-rule" /><span className="art-rule" /><span className="art-rule" />
          <span className="art-marker" />
        </div>
        <div className="art-source"><FiBookOpen /><span /><span /></div>
      </div>
    </main>
  )
}

function CourseList({ resource }) {
  const resume = resource.data?.courses.filter(course => course.resume)
    .sort((left, right) => Date.parse(right.resume.lastViewedAt) - Date.parse(left.resume.lastViewedAt))[0]

  return (
    <section className="content-page course-library">
      <h1>My courses</h1>
      <ResourceFeedback resource={resource} label="Loading your courses…" />
      {resource.data?.courses.length === 0 && <p className="muted">Your course list is empty. Ask an instructor for access.</p>}
      {resume && (
        <Link className="course-card resume-lesson" to={`/courses/${encodeURIComponent(resume.slug)}/lessons/${encodeURIComponent(resume.resume.lessonSlug)}`}>
          <span className="course-icon"><FiBookOpen aria-hidden="true" /></span>
          <span className="course-card-body"><span className="small-label">Continue learning</span><h2>{resume.resume.title}</h2><p>{resume.title}</p></span>
          <FiArrowRight className="course-arrow" aria-hidden="true" />
        </Link>
      )}
      <div className="course-list">
        {resource.data?.courses.map(course => (
          <Link className="course-card" key={course.id} to={`/courses/${encodeURIComponent(course.slug)}`}>
            <span className="course-icon"><FiBookOpen aria-hidden="true" /></span>
            <div className="course-card-body">
              {course.role === 'instructor' && <span className="small-label">Instructor</span>}
              <h2>{course.title}</h2>
              {course.summary && <p>{course.summary}</p>}
            </div>
            <FiArrowRight aria-hidden="true" className="course-arrow" />
          </Link>
        ))}
      </div>
    </section>
  )
}

function LessonProgress({ path, completed, onVisit, onCompletion }) {
  const [attempt, setAttempt] = useState(0)
  const [viewError, setViewError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    request(path, { method: 'PATCH', body: {}, signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) onVisit() })
      .catch(error => { if (!controller.signal.aborted) setViewError(error.message) })
    return () => controller.abort()
  }, [path, attempt, onVisit])

  async function toggleCompletion() {
    setSaving(true)
    setActionError(null)
    try {
      const { progress } = await request(path, { method: 'PATCH', body: { completed: !completed } })
      setViewError(null)
      onCompletion(progress.completed)
      onVisit()
    } catch (error) {
      setActionError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="lesson-progress">
      <div className="lesson-progress-actions">
        <button className={completed ? 'secondary-button' : 'primary-button'} type="button" disabled={saving} onClick={toggleCompletion}>
          {!completed && <FiCheck aria-hidden="true" />}
          {saving ? 'Saving…' : completed ? 'Mark incomplete' : 'Mark complete'}
        </button>
        <span className="published-label" role="status">{completed && <><FiCheck aria-hidden="true" /> Lesson complete</>}</span>
      </div>
      {viewError && <p className="form-error" role="alert">{viewError} <button type="button" className="text-button" onClick={() => { setViewError(null); setAttempt(value => value + 1) }}>Retry saving progress</button></p>}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
    </div>
  )
}

function CoursePage({ onProgressChange }) {
  const { courseSlug, lessonSlug } = useParams()
  const [completionOverrides, setCompletionOverrides] = useState({})
  const coursePath = `/courses/${encodeURIComponent(courseSlug)}`
  const lessonPath = lessonSlug ? `${coursePath}/lessons/${encodeURIComponent(lessonSlug)}` : null
  const overview = useResource(coursePath)
  const content = useResource(lessonPath)
  const course = overview.data?.course
  const lesson = content.data?.lesson

  return (
    <section className="content-page course-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">My courses</Link>
        {course && lessonSlug && <><span aria-hidden="true">/</span><Link to={coursePath}>{course.title}</Link></>}
      </nav>
      <ResourceFeedback resource={overview} label="Loading course…" />
      {course && (
        <>
          <div className="course-header">
            <div>
              <h1>{lessonSlug ? lesson?.title || 'Lesson' : course.title}</h1>
              {!lessonSlug && course.summary && <p className="page-description">{course.summary}</p>}
            </div>
            <div className="course-actions">
              {course.role === 'instructor' && <Link className="secondary-button" to={`${lessonPath || coursePath}/editor`}><FiEdit3 aria-hidden="true" /> Edit lesson</Link>}
              <a className="secondary-button tutor-jump" href="#course-tutor"><FiBookOpen aria-hidden="true" /> Ask the tutor</a>
            </div>
          </div>
          <div className="course-grid">
            <div className="reader">
              {lessonSlug ? (
                <>
                  <ResourceFeedback resource={content} label="Loading lesson…" />
                  {lesson && <article><Markdown text={lesson.markdown} /></article>}
                  {lesson && course.role === 'student' && <LessonProgress
                    key={lesson.id}
                    path={`${lessonPath}/progress`}
                    completed={completionOverrides[lesson.id] ?? lesson.completed}
                    onVisit={onProgressChange}
                    onCompletion={completed => setCompletionOverrides(previous => ({ ...previous, [lesson.id]: completed }))}
                  />}
                  {course.role === 'student' && lesson?.quiz && <PracticeQuiz
                    key={lesson.revisionId}
                    path={`${lessonPath}/quiz`}
                    revisionId={lesson.revisionId}
                    quiz={lesson.quiz}
                  />}
                  <Link to={coursePath} className="back-link reader-back"><FiArrowLeft aria-hidden="true" /> All lessons</Link>
                </>
              ) : (
                <div className="lesson-list">
                  <h2>Lessons</h2>
                  {course.lessons.length === 0 && <p className="muted">Lessons will appear here once they’re published.</p>}
                  {course.lessons.map(item => (
                    <Link key={item.id} className="lesson-row" to={`${coursePath}/lessons/${encodeURIComponent(item.slug)}`}>
                      <span className="lesson-icon"><FiFileText aria-hidden="true" /></span>
                      <span>{item.title}</span>
                      {(completionOverrides[item.id] ?? item.completed)
                        ? <span className="published-label"><FiCheck aria-hidden="true" /> Complete</span>
                        : <FiArrowRight aria-hidden="true" />}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Tutor key={courseSlug} courseSlug={courseSlug} />
          </div>
        </>
      )}
    </section>
  )
}

function Workspace({ user, onSignOut }) {
  const courses = useResource('/courses')
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(null)

  async function signOut() {
    setSigningOut(true)
    setSignOutError(null)
    try {
      await request('/auth/logout', { method: 'POST' })
      onSignOut()
    } catch (failure) {
      setSignOutError(failure.message)
      setSigningOut(false)
    }
  }

  return (
    <div className="workspace">
      <a className="skip-link" href="#workspace-content">Skip to content</a>
      <header className="workspace-header">
        <Brand linked />
        <div className="account-menu">
          <span className="account-avatar" aria-hidden="true">{user.displayName.trim().slice(0, 1).toUpperCase()}</span>
          <span className="account-name">{user.displayName}</span>
          <button className="icon-button sign-out" onClick={signOut} disabled={signingOut} aria-label="Sign out" title="Sign out" type="button"><FiLogOut aria-hidden="true" /></button>
        </div>
      </header>
      {signOutError && <p className="account-feedback form-error" role="alert">{signOutError}</p>}
      <div className="workspace-body">
        <nav className="workspace-nav" aria-label="Classroom">
          <NavLink className="workspace-nav-home" to="/" end><FiGrid aria-hidden="true" /> My courses</NavLink>
          {courses.data?.courses.map(course => (
            <NavLink key={course.id} to={`/courses/${encodeURIComponent(course.slug)}`}>
              <FiBookOpen aria-hidden="true" /><span>{course.title}</span>
            </NavLink>
          ))}
        </nav>
        <main id="workspace-content" className="workspace-main" tabIndex="-1">
          <Routes>
            <Route path="/" element={<CourseList resource={courses} />} />
            <Route path="/courses/:courseSlug" element={<CoursePage onProgressChange={courses.retry} />} />
            <Route path="/courses/:courseSlug/lessons/:lessonSlug" element={<CoursePage onProgressChange={courses.retry} />} />
            <Route path="/courses/:courseSlug/editor" element={<Editor />} />
            <Route path="/courses/:courseSlug/lessons/:lessonSlug/editor" element={<Editor />} />
            <Route path="*" element={<section className="content-page"><h1>Page not found</h1><Link className="back-link" to="/"><FiArrowLeft aria-hidden="true" /> Back to your courses</Link></section>} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function Classroom() {
  const session = useResource('/auth/me')
  const [account, setAccount] = useState(undefined)
  const user = account === undefined ? session.data?.user : account
  const sessionFailed = session.error && session.error.status !== 401

  useEffect(() => {
    document.title = 'ClasslyAI'
  }, [])

  if (user) return <Workspace user={user} onSignOut={() => setAccount(null)} />
  if (account === undefined && (session.loading || sessionFailed)) {
    return (
      <main className="session-state">
        <Brand />
        <ResourceFeedback resource={session} label="Opening your classroom…" />
      </main>
    )
  }
  return <SignIn onSignIn={setAccount} />
}

export default Classroom
