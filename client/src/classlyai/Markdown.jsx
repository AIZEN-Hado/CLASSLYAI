import { Fragment } from 'react'

function ItalicText({ text }) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={index}>{part.slice(1, -1)}</code>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

function Markdown({ text }) {
  const sections = text.replaceAll('\r\n', '\n').split(/(^```[^\n]*\n[\s\S]*?^```[ \t]*$)/gm)
  return (
    <div className="lesson-prose">
      {sections.flatMap((section, sectionIndex) => {
        if (section.startsWith('```')) {
          return <pre key={sectionIndex}><code>{section.split('\n').slice(1, -1).join('\n')}</code></pre>
        }
        return section.split(/\n\s*\n/).filter(block => block.trim()).map((block, blockIndex) => {
          const key = `${sectionIndex}-${blockIndex}`
          const heading = block.match(/^(#{1,6})\s+([^\n]+)(?:\n([\s\S]+))?/)
          const lines = block.trim().split('\n')
          if (heading) {
            const Heading = heading[1].length <= 2 ? 'h2' : 'h3'
            return (
              <Fragment key={key}>
                <Heading><ItalicText text={heading[2]} /></Heading>
                {heading[3] && <p><ItalicText text={heading[3]} /></p>}
              </Fragment>
            )
          }

          const bullet = /^[-*+]\s+/
          const number = /^\d+\.\s+/
          const prefix = lines.every(line => bullet.test(line)) ? bullet : lines.every(line => number.test(line)) ? number : null
          if (prefix) {
            const List = prefix === bullet ? 'ul' : 'ol'
            return <List key={key}>{lines.map((line, index) => <li key={index}><ItalicText text={line.replace(prefix, '')} /></li>)}</List>
          }

          if (lines.every(line => /^>\s?/.test(line))) {
            return <blockquote key={key}><ItalicText text={lines.map(line => line.replace(/^>\s?/, '')).join('\n')} /></blockquote>
          }
          return <p key={key}><ItalicText text={block.trim()} /></p>
        })
      })}
    </div>
  )
}

export default Markdown
