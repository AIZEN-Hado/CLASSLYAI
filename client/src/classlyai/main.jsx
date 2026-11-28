import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Classroom from './Classroom.jsx'
import './classroom.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Classroom />
    </BrowserRouter>
  </StrictMode>,
)
