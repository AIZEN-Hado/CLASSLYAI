import { useEffect, useRef } from 'react'

const INK = '27, 26, 23'
const SIGNAL = '200, 69, 42'
const MERIDIANS = 14
const PARALLELS = [-60, -40, -20, 0, 20, 40, 60]
// Cited passages: where they sit on the sphere, and the section they point to.
const CITATIONS = [
  { lat: 28, lon: 20, label: 'Retrying a request' },
  { lat: -18, lon: 105, label: 'Atomic writes' },
  { lat: 40, lon: 200, label: 'Retrieval recall' },
  { lat: -35, lon: 280, label: 'Isolation' },
  { lat: 8, lon: 330, label: 'Unsupported questions' },
]
const deg = Math.PI / 180

// Stable pseudo-random speckle so the surface reads as engraved texture.
const speckle = Array.from({ length: 170 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453
  const b = Math.sin(i * 78.233) * 24634.6345
  return { lat: (a - Math.floor(a) - 0.5) * 170, lon: (b - Math.floor(b)) * 360 }
})

const toVector = (lat, lon) => ({ x: Math.cos(lat * deg) * Math.sin(lon * deg), y: -Math.sin(lat * deg), z: Math.cos(lat * deg) * Math.cos(lon * deg) })

function rotate({ x, y, z }, yaw, pitch) {
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw)
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw)
  return { x: x1, y: y * Math.cos(pitch) - z1 * Math.sin(pitch), z: y * Math.sin(pitch) + z1 * Math.cos(pitch) }
}

export default function SignInScene() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    let width = 0
    let height = 0
    let frame = 0
    let visible = true
    let last = performance.now()
    let time = still.matches ? 3 : 0

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      draw()
    }

    function draw() {
      const radius = Math.min(width * 0.28, height * 0.32)
      const cx = width * 0.5
      const cy = height * 0.47
      const yaw = time * 0.11 + pointer.x * 0.5
      const pitch = -0.38 + pointer.y * 0.3
      const point = vector => {
        const r = rotate(vector, yaw, pitch)
        return { x: cx + r.x * radius, y: cy + r.y * radius, z: r.z }
      }

      context.clearRect(0, 0, width, height)
      context.lineWidth = 0.8
      const polyline = (vectors, closed) => {
        let previous
        vectors.forEach(vector => {
          const p = point(vector)
          if (previous) {
            const front = (p.z + previous.z) / 2 > 0
            context.strokeStyle = `rgba(${INK}, ${front ? 0.62 : 0.14})`
            context.beginPath()
            context.moveTo(previous.x, previous.y)
            context.lineTo(p.x, p.y)
            context.stroke()
          }
          previous = p
        })
        return closed
      }
      for (let m = 0; m < MERIDIANS; m++) {
        polyline(Array.from({ length: 49 }, (_, i) => toVector(-90 + (i / 48) * 180, (m / MERIDIANS) * 360)))
      }
      PARALLELS.forEach(lat => polyline(Array.from({ length: 73 }, (_, i) => toVector(lat, (i / 72) * 360))))

      // Outline of the globe.
      context.strokeStyle = `rgba(${INK}, .85)`
      context.lineWidth = 1.1
      context.beginPath()
      context.arc(cx, cy, radius, 0, Math.PI * 2)
      context.stroke()

      // A tilted ring, drawn as a pair of arcs so it passes in front of and behind the sphere.
      const ring = Array.from({ length: 121 }, (_, i) => {
        const a = (i / 120) * Math.PI * 2
        return point(rotate({ x: Math.cos(a) * 1.38, y: 0, z: Math.sin(a) * 1.38 }, 0, 0.5))
      })
      ring.forEach((p, i) => {
        if (!i) return
        context.strokeStyle = `rgba(${INK}, ${(p.z + ring[i - 1].z) / 2 > 0 ? 0.5 : 0.12})`
        context.lineWidth = 0.8
        context.beginPath()
        context.moveTo(ring[i - 1].x, ring[i - 1].y)
        context.lineTo(p.x, p.y)
        context.stroke()
      })

      speckle.forEach(({ lat, lon }) => {
        const p = point(toVector(lat, lon))
        if (p.z < 0) return
        context.fillStyle = `rgba(${INK}, ${0.15 + p.z * 0.5})`
        context.fillRect(p.x, p.y, 1.4, 1.4)
      })

      context.font = '11px "Geist Mono Variable", ui-monospace, Menlo, monospace'
      context.textBaseline = 'middle'
      CITATIONS.forEach(({ lat, lon, label }, index) => {
        const p = point(toVector(lat, lon))
        if (p.z < 0.05) return
        const strength = Math.min(1, (p.z - 0.05) / 0.35)
        const text = `§${index + 1}  ${label}`
        const span = context.measureText(text).width + 46 + radius * 0.12
        let side = p.x >= cx ? 1 : -1
        if (side > 0 ? p.x + span > width - 24 : p.x - span < 24) side = -side
        const elbow = { x: p.x + side * (26 + radius * 0.12), y: p.y - 22 }
        context.strokeStyle = `rgba(${SIGNAL}, ${0.85 * strength})`
        context.lineWidth = 1
        context.beginPath()
        context.moveTo(p.x, p.y)
        context.lineTo(elbow.x, elbow.y)
        context.lineTo(elbow.x + side * 14, elbow.y)
        context.stroke()
        context.fillStyle = `rgb(${SIGNAL})`
        context.globalAlpha = strength
        context.beginPath()
        context.arc(p.x, p.y, 3.4, 0, Math.PI * 2)
        context.fill()
        context.lineWidth = 1
        context.strokeStyle = `rgba(${SIGNAL}, .5)`
        context.beginPath()
        context.arc(p.x, p.y, 7 + 1.5 * Math.sin(time * 2 + index), 0, Math.PI * 2)
        context.stroke()
        context.textAlign = side > 0 ? 'left' : 'right'
        context.lineJoin = 'round'
        context.lineWidth = 5
        context.strokeStyle = 'rgba(235, 228, 212, .95)'
        context.strokeText(text, elbow.x + side * 20, elbow.y)
        context.fillStyle = `rgb(${INK})`
        context.fillText(text, elbow.x + side * 20, elbow.y)
        context.globalAlpha = 1
      })
    }

    function tick(now) {
      const delta = Math.min((now - last) / 1000, 0.05)
      last = now
      time += delta
      pointer.x += (pointer.tx - pointer.x) * 0.04
      pointer.y += (pointer.ty - pointer.y) * 0.04
      draw()
      frame = visible && !still.matches ? requestAnimationFrame(tick) : 0
    }

    function start() {
      if (!frame && visible && !still.matches) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }

    const onPointer = event => {
      const box = canvas.getBoundingClientRect()
      pointer.tx = ((event.clientX - box.left) / box.width - 0.5) * 2
      pointer.ty = ((event.clientY - box.top) / box.height - 0.5) * 2
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      start()
    })
    const resizer = new ResizeObserver(resize)
    observer.observe(canvas)
    resizer.observe(canvas)
    window.addEventListener('pointermove', onPointer, { passive: true })
    still.addEventListener('change', start)
    document.fonts?.ready.then(draw)
    resize()
    start()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      resizer.disconnect()
      window.removeEventListener('pointermove', onPointer)
      still.removeEventListener('change', start)
    }
  }, [])

  return (
    <aside className="sign-in-art" aria-hidden="true">
      <canvas ref={canvasRef} className="scene-canvas" />
      <p className="scene-note"><span>Plate 1</span>Each marked point is a passage the tutor can cite. Ask a question and the answer carries its section number back to the page.</p>
    </aside>
  )
}
