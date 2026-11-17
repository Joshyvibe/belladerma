// Placeholder packshots drawn in SVG until real product photos are uploaded in /admin.

type Props = { kind: string; name: string; label?: string; className?: string };

export function ProductArt({ kind, name, label, className }: Props) {
  const short = label ?? name.replace(/\s*\(.*\)/, "").toUpperCase();
  const lines = short.length > 12 ? splitTwo(short) : [short];
  return (
    <svg viewBox="0 0 200 300" className={className} role="img" aria-label={name}>
      <defs>
        <linearGradient id="pk-white" x1="0" x2="1">
          <stop offset="0" stopColor="#e6eae7" /><stop offset=".3" stopColor="#fff" /><stop offset="1" stopColor="#d6dcd8" />
        </linearGradient>
        <linearGradient id="pk-green" x1="0" x2="1">
          <stop offset="0" stopColor="#153628" /><stop offset=".4" stopColor="#245a43" /><stop offset="1" stopColor="#153628" />
        </linearGradient>
        <linearGradient id="pk-silver" x1="0" x2="1">
          <stop offset="0" stopColor="#9aa3a0" /><stop offset=".35" stopColor="#eef1f0" /><stop offset="1" stopColor="#8d9693" />
        </linearGradient>
      </defs>
      {kind === "dropper" && (
        <g>
          <rect x="88" y="20" width="24" height="44" rx="12" fill="#2b2f2e" />
          <rect x="80" y="60" width="40" height="36" rx="5" fill="url(#pk-silver)" />
          <rect x="55" y="94" width="90" height="190" rx="18" fill="url(#pk-silver)" />
          <rect x="55" y="140" width="90" height="100" fill="url(#pk-green)" />
        </g>
      )}
      {kind === "tube" && (
        <g>
          <rect x="82" y="248" width="36" height="34" rx="4" fill="#153628" />
          <path d="M58 30 h84 l-6 220 h-72z" fill="url(#pk-white)" />
          <rect x="58" y="22" width="84" height="12" rx="2" fill="#d6dcd8" />
          <path d="M62 110 h76 l-2 90 h-72z" fill="url(#pk-green)" />
        </g>
      )}
      {kind === "jar" && (
        <g>
          <rect x="36" y="120" width="128" height="36" rx="8" fill="url(#pk-green)" />
          <rect x="40" y="152" width="120" height="110" rx="16" fill="url(#pk-white)" />
          <rect x="40" y="180" width="120" height="56" fill="url(#pk-green)" />
        </g>
      )}
      {(kind === "pump" || !["dropper", "tube", "jar"].includes(kind)) && (
        <g>
          <path d="M100 14 h46 a5 5 0 0 1 5 5 v4 a5 5 0 0 1 -5 5 h-34 v14 h-12z" fill="url(#pk-white)" />
          <rect x="90" y="40" width="20" height="28" rx="3" fill="url(#pk-white)" />
          <rect x="78" y="64" width="44" height="22" rx="5" fill="url(#pk-white)" />
          <rect x="50" y="82" width="100" height="204" rx="22" fill="url(#pk-white)" />
          <rect x="50" y="130" width="100" height="112" fill="url(#pk-green)" />
        </g>
      )}
      <Label kind={kind} lines={lines} />
    </svg>
  );
}

function Label({ kind, lines }: { kind: string; lines: string[] }) {
  const y = kind === "jar" ? 200 : kind === "tube" ? 145 : kind === "dropper" ? 170 : 168;
  return (
    <g fontFamily="Georgia, serif" textAnchor="middle">
      <text x="100" y={y - 16} fontSize="8" fill="#a9d4c3" letterSpacing="2">BELLADERMA</text>
      {lines.map((l, i) => (
        <text key={i} x="100" y={y + 6 + i * 18} fontSize={lines.length > 1 ? 14 : 18} fontWeight="700" fill="#c9a24a"
          textLength={Math.min(l.length * 9.5, 76)} lengthAdjust="spacingAndGlyphs">{l}</text>
      ))}
    </g>
  );
}

function splitTwo(s: string) {
  const words = s.split(" ");
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")].filter(Boolean);
}
