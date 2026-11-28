import { PiArrowUpRight, PiBookOpen } from 'react-icons/pi'
import { Link } from 'react-router-dom'
import OrbLoader from './OrbLoader.jsx'

export function Brand({ linked = false }) {
  const inner = <><span className="brand-mark"><PiBookOpen aria-hidden="true" /></span><span>Classly<span className="brand-accent">AI</span></span></>
  return linked ? <Link className="brand" to="/">{inner}</Link> : <div className="brand">{inner}</div>
}

export function ResourceFeedback({ resource, label, orbSize = 56 }) {
  if (resource.loading) return <div className="loading-state" role="status"><OrbLoader size={orbSize} /><span>{label}</span></div>
  if (!resource.error) return null
  return (
    <div className="inline-feedback">
      <p role="alert">{resource.error.message}</p>
      <button className="text-button" onClick={resource.retry} type="button">Try again <PiArrowUpRight aria-hidden="true" /></button>
    </div>
  )
}
