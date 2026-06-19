import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

function buildGraphData(center, friends) {
  // Deduplicate nodes; a person can appear as both AMIGO_DE and FAMILIAR_DE
  const nodeMap = new Map()
  nodeMap.set(center, { id: center, label: center, type: 'center' })
  for (const f of friends) {
    if (!nodeMap.has(f.username)) {
      nodeMap.set(f.username, { id: f.username, label: f.nombre || f.username, type: 'friend', relType: f.relType })
    }
  }
  return {
    nodes: [...nodeMap.values()],
    links: friends.map((f, i) => ({
      id: `${f.username}-${f.relType}-${i}`,
      source: center,
      target: f.username,
      relType: f.relType || 'AMIGO_DE'
    }))
  }
}

export default function FriendsGraph({ center, friends }) {
  const graphData = useMemo(() => buildGraphData(center, friends), [center, friends])
  const [hoveredNode, setHoveredNode] = useState(null)
  const containerRef = useRef(null)
  const fgRef = useRef(null)
  const [dims, setDims] = useState({ width: 600, height: 420 })

  useEffect(() => {
    if (!containerRef.current) return
    setDims({
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight
    })
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDims({ width, height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Tune D3 forces: strong repulsion + generous link distance
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    fg.d3Force('charge').strength(-350)
    fg.d3Force('link').distance(130)
  }, [graphData])

  const paintNode = useCallback((node, ctx, globalScale) => {
    const isCenter = node.type === 'center'
    const isHovered = hoveredNode?.id === node.id
    const r = isCenter ? 12 : 8
    const friendColor = node.relType === 'FAMILIAR_DE' ? '#1a5c3a' : '#3d3d52'

    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
    ctx.fillStyle = isCenter ? '#2c4bd8' : friendColor
    ctx.fill()

    ctx.strokeStyle = isHovered ? '#e2552c' : (isCenter ? 'rgba(255,255,255,0.4)' : 'rgba(155,154,176,0.5)')
    ctx.lineWidth = isHovered ? 2.5 : 1.5
    ctx.stroke()

    const fontSize = Math.max(10 / globalScale, 9)
    ctx.font = `${fontSize}px "IBM Plex Mono", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = isCenter ? '#ffffff' : '#e8e6f0'
    ctx.fillText(node.label, node.x, node.y + r + 3)
  }, [hoveredNode])

  const paintNodeArea = useCallback((node, color, ctx) => {
    const r = node.type === 'center' ? 12 : 8
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
  }, [])

  const paintLinkLabel = useCallback((link, ctx) => {
    const start = link.source
    const end = link.target
    if (!start?.x || !end?.x) return
    const mx = (start.x + end.x) / 2
    const my = (start.y + end.y) / 2
    const isFamiliar = link.relType === 'FAMILIAR_DE'
    ctx.font = '8px "IBM Plex Mono", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isFamiliar ? 'rgba(80, 200, 130, 0.75)' : 'rgba(155, 154, 176, 0.7)'
    ctx.fillText(link.relType || 'AMIGO_DE', mx, my - 6)
  }, [])

  return (
    <div className="graph-canvas-wrap" ref={containerRef}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dims.width}
        height={dims.height}
        backgroundColor="transparent"
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={paintNodeArea}
        onNodeHover={setHoveredNode}
        linkCanvasObject={paintLinkLabel}
        linkCanvasObjectMode="after"
        linkColor={(link) => link.relType === 'FAMILIAR_DE' ? 'rgba(80, 200, 130, 0.4)' : 'rgba(155, 154, 176, 0.4)'}
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={(link) => link.relType === 'FAMILIAR_DE' ? 'rgba(80, 200, 130, 0.5)' : 'rgba(155, 154, 176, 0.5)'}
        d3VelocityDecay={0.25}
        d3AlphaDecay={0.015}
      />
      <div className="graph-legend">
        <span className="graph-legend-item"><span className="graph-legend-dot" style={{ background: '#2c4bd8' }} />yo</span>
        <span className="graph-legend-item"><span className="graph-legend-dot" style={{ background: '#3d3d52' }} />AMIGO_DE</span>
        <span className="graph-legend-item"><span className="graph-legend-dot" style={{ background: '#1a5c3a' }} />FAMILIAR_DE</span>
      </div>
      {hoveredNode && (
        <div className="graph-tooltip">
          <strong>{hoveredNode.label}</strong>
          {hoveredNode.type === 'friend' && <> · @{hoveredNode.id}</>}
          {hoveredNode.type === 'center' && <> · nodo central</>}
        </div>
      )}
    </div>
  )
}
