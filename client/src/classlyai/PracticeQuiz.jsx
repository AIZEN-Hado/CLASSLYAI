import { useState } from 'react'
import { request } from './api.js'

export default function PracticeQuiz({ path, revisionId, quiz }) {
  const [score, setScore] = useState(quiz.score)
  const [feedback, setFeedback] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  async function submit(event) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    const answers = quiz.questions.map((_, index) => Number(form.get(`answer-${index}`)))
    setPending(true)
    setError(null)
    try {
      const result = await request(path, { method: 'POST', body: { revisionId, answers } })
      setScore(result.score)
      setFeedback(result.feedback)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="practice-quiz" aria-labelledby="practice-quiz-heading">
      <h2 id="practice-quiz-heading">Practice quiz</h2>
      <form onSubmit={submit} onChange={() => setFeedback(null)}>
        {quiz.questions.map(({ prompt, options }, questionIndex) => (
          <fieldset key={questionIndex} disabled={pending} aria-describedby={feedback ? `practice-feedback-${questionIndex}` : undefined}>
            <legend>{prompt}</legend>
            {options.map((option, optionIndex) => (
              <label key={optionIndex}>
                <input type="radio" name={`answer-${questionIndex}`} value={optionIndex} required />
                <span>{option}</span>
              </label>
            ))}
            {feedback && <p className="practice-quiz-feedback" id={`practice-feedback-${questionIndex}`}>
              {feedback[questionIndex] ? 'Correct' : 'Review this question'}
            </p>}
          </fieldset>
        ))}
        <div className="practice-quiz-actions">
          <button className="secondary-button" type="submit" disabled={pending}>
            {score === null ? 'Submit answers' : 'Submit another attempt'}
          </button>
          <p role="status">
            {pending ? 'Submitting answers…' : score !== null && `Latest score: ${score} of ${quiz.questions.length}`}
          </p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </section>
  )
}
