import { useEffect, useRef } from 'react'

const ORBS = [
  { color: '27, 26, 23', speed: 1.0, phase: 0, orbit: 0.34, size: 0.2 },
  { color: '94, 88, 74', speed: -1.4, phase: 2.1, orbit: 0.27, size: 0.15 },
  { color: '200, 69, 42', speed: 1.9, phase: 4.2, orbit: 0.4, size: 0.12 },
  { color: '140, 132, 114', speed: -0.8, phase: 1.1, orbit: 0.2, size: 0.1 },
  { color: '27, 26, 23', speed: 2.4, phase: 3.3, orbit: 0.14, size: 0.08 },
]

// Glowing orbs on a Lissajous-style orbit, drawn on a small 2D canvas.
export default function OrbLoader({ size = 72 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * ratio
    canvas.height = size * ratio
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    let frame = 0
    const started = performance.now()

    function draw(now) {
      const t = still.matches ? 1.2 : (now - started) / 1000
      const c = size / 2
      const k = 0.66 // keeps the widest orbit and glow inside the canvas
      context.clearRect(0, 0, size, size)
      const points = ORBS.map(({ speed, phase, orbit }) => ({
        x: c + Math.cos(t * speed + phase) * orbit * size * 1.15 * k,
        y: c + Math.sin(t * speed * 0.8 + phase * 1.3) * orbit * size * k * (1 + 0.12 * Math.sin(t))
      }))
      context.lineWidth = 1
      points.forEach((a, i) => points.slice(i + 1).forEach(b => {
        const alpha = Math.max(0, 0.28 - Math.hypot(a.x - b.x, a.y - b.y) / size * 0.5)
        context.strokeStyle = `rgba(27, 26, 23, ${alpha})`
        context.beginPath()
        context.moveTo(a.x, a.y)
        context.lineTo(b.x, b.y)
        context.stroke()
      }))
      ORBS.forEach(({ color, size: radius, speed }, i) => {
        const { x, y } = points[i]
        const r = radius * size * k * (1 + 0.14 * Math.sin(t * 2.2 * Math.abs(speed) + i))
        const gradient = context.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r * 1.9)
        gradient.addColorStop(0, `rgba(${color}, 1)`)
        gradient.addColorStop(0.45, `rgba(${color}, .55)`)
        gradient.addColorStop(1, `rgba(${color}, 0)`)
        context.fillStyle = gradient
        context.beginPath()
        context.arc(x, y, r * 1.9, 0, Math.PI * 2)
        context.fill()
      })
      if (!still.matches) frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [size])

  return <canvas ref={canvasRef} className="orb-loader" style={{ width: size, height: size }} aria-hidden="true" />
}
