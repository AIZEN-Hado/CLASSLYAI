import { FiArrowUpRight, FiBookOpen } from 'react-icons/fi'
import { Link } from 'react-router-dom'

export function Brand({ linked = false }) {
  const inner = <><span className="brand-mark"><FiBookOpen aria-hidden="true" /></span><span>Classly<span className="brand-accent">AI</span></span></>
  return linked ? <Link className="brand" to="/">{inner}</Link> : <div className="brand">{inner}</div>
}

export function ResourceFeedback({ resource, label }) {
  if (resource.loading) return <p className="loading-state" role="status">{label}</p>
  if (!resource.error) return null
  return (
    <div className="inline-feedback">
      <p role="alert">{resource.error.message}</p>
      <button className="text-button" onClick={resource.retry} type="button">Try again <FiArrowUpRight aria-hidden="true" /></button>
    </div>
  )
}
