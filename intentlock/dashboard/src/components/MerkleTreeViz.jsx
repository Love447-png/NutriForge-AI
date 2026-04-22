function nodePosition(index, total, level, width, height) {
  const gap = width / Math.max(total, 1);
  return {
    x: gap * index + gap / 2,
    y: 80 + level * height
  };
}

function pairHashes(leaves) {
  const levels = [leaves];
  let current = leaves;
  while (current.length > 1) {
    const next = [];
    for (let index = 0; index < current.length; index += 2) {
      const left = current[index];
      const right = current[index + 1] ?? current[index];
      next.push({
        id: `${left.id}-${right.id}`,
        decision: left.decision === "BLOCK" || right.decision === "BLOCK" ? "BLOCK" : "ALLOW",
        hash: `${left.hash.slice(0, 8)}${right.hash.slice(0, 8)}`
      });
    }
    levels.push(next);
    current = next;
  }
  return levels;
}

export default function MerkleTreeViz({ leaves, root, onSelect }) {
  const sourceLeaves = leaves.map(item => ({
    id: item.id,
    decision: item.decision,
    hash: item.hash
  }));
  const levels = pairHashes(sourceLeaves);
  const width = 860;
  const levelHeight = 110;
  const height = levelHeight * levels.length + 80;

  return (
    <div className="overflow-x-auto rounded-3xl border border-soc-border bg-slate-950/30 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[820px]">
        {levels.map((level, levelIndex) =>
          level.map((node, index) => {
            const current = nodePosition(index, level.length, levelIndex, width, levelHeight);
            const children = levelIndex > 0 ? levels[levelIndex - 1] : null;
            return (
              <g key={`${node.id}-${levelIndex}`}>
                {children
                  ? [index * 2, index * 2 + 1]
                      .filter(childIndex => children[childIndex])
                      .map(childIndex => {
                        const child = nodePosition(childIndex, children.length, levelIndex - 1, width, levelHeight);
                        return (
                          <line
                            key={`${node.id}-${childIndex}`}
                            x1={current.x}
                            y1={current.y}
                            x2={child.x}
                            y2={child.y}
                            stroke="rgba(148,163,184,0.35)"
                            strokeWidth="2"
                          />
                        );
                      })
                  : null}
                <polygon
                  points={`${current.x - 34},${current.y} ${current.x - 17},${current.y - 30} ${current.x + 17},${current.y - 30} ${current.x + 34},${current.y} ${current.x + 17},${current.y + 30} ${current.x - 17},${current.y + 30}`}
                  fill={node.decision === "BLOCK" ? "rgba(239,68,68,0.18)" : "rgba(16,185,129,0.18)"}
                  stroke={node.decision === "BLOCK" ? "#ef4444" : "#10b981"}
                  strokeWidth="2"
                  onClick={() => onSelect?.(node)}
                  className="cursor-pointer transition-opacity hover:opacity-85"
                />
                <text x={current.x} y={current.y + 5} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="'IBM Plex Mono'">
                  {node.hash.slice(0, 8)}
                </text>
              </g>
            );
          })
        )}
        <text x={width / 2} y={height - 16} textAnchor="middle" fill="#a5b4fc" fontSize="12" fontFamily="'IBM Plex Mono'">
          Root {root?.root_hash?.slice(0, 24)}...
        </text>
      </svg>
    </div>
  );
}
