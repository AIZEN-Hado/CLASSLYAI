import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Classroom from './Classroom.jsx'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './classroom.css'
import './editorial.css'

// Cursor spotlight: rows and cards read the pointer position relative to themselves.
document.addEventListener('pointermove', event => {
  const target = event.target instanceof Element ? event.target.closest('.course-card, .lesson-row, .review-card, .starter') : null
  if (!target) return
  const box = target.getBoundingClientRect()
  target.style.setProperty('--mx', `${event.clientX - box.left}px`)
  target.style.setProperty('--my', `${event.clientY - box.top}px`)
}, { passive: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Classroom />
    </BrowserRouter>
  </StrictMode>,
)
