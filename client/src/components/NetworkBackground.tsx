/**
 * Animated SVG "transfer network" background — faint nodes (people/merchants)
 * with pulses travelling along the edges between them, evoking money moving
 * between people (the P2P angle). Pure CSS animation (no library); each edge's
 * pulse is a single dash whose offset animates seamlessly. Sits behind content
 * at very low opacity, decorative only, and disables under reduced-motion.
 */

// Node coordinates in a 1440×900 viewBox, spread toward the edges so the
// network frames the content rather than crowding it.
const NODES: [number, number][] = [
  [110, 150], // 0
  [330, 80], // 1
  [520, 230], // 2
  [250, 360], // 3
  [710, 140], // 4
  [930, 270], // 5
  [1150, 160], // 6
  [1320, 350], // 7
  [1000, 470], // 8
  [1200, 600], // 9
  [770, 560], // 10
  [470, 640], // 11
  [180, 620], // 12
];

// Sparse edges connecting nearby nodes.
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 3],
  [2, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [5, 8],
  [8, 9],
  [8, 10],
  [10, 11],
  [11, 12],
  [3, 11],
  [4, 10],
  [7, 9],
];

export default function NetworkBackground() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* static faint edges */}
      <g stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1">
        {EDGES.map(([a, b], i) => (
          <line
            key={`e${i}`}
            x1={NODES[a][0]}
            y1={NODES[a][1]}
            x2={NODES[b][0]}
            y2={NODES[b][1]}
          />
        ))}
      </g>

      {/* travelling pulses — one bright dash per edge, staggered */}
      <g stroke="#c8a24a" strokeWidth="2" strokeLinecap="round" fill="none">
        {EDGES.map(([a, b], i) => (
          <line
            key={`p${i}`}
            x1={NODES[a][0]}
            y1={NODES[a][1]}
            x2={NODES[b][0]}
            y2={NODES[b][1]}
            pathLength={1}
            strokeDasharray="0.06 0.94"
            className="net-pulse"
            style={{
              animation: `net-pulse ${4 + (i % 5) * 0.9}s linear infinite`,
              animationDelay: `${(i % 7) * 0.7}s`,
              opacity: 0.5,
            }}
          />
        ))}
      </g>

      {/* nodes */}
      <g fill="#ffffff">
        {NODES.map(([x, y], i) => (
          <circle
            key={`n${i}`}
            cx={x}
            cy={y}
            r={i % 4 === 0 ? 3 : 2}
            className="net-node"
            style={{
              animation: `net-breathe ${5 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${(i % 5) * 0.6}s`,
            }}
          />
        ))}
      </g>
    </svg>
  );
}
