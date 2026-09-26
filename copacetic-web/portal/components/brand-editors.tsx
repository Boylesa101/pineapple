'use client';
import { useState } from 'react';
import { toHex, toRgb } from '@/lib/colour';
import { COLOUR_USES, FONT_ROLES, type Colour, type Font } from '@/lib/content/sections';

// Colours: type hex (#1c1917) or RGB (28, 25, 23); stored as hex.
export function ColoursEditor({ value, onChange, readOnly }: { value: Colour[]; onChange: (v: Colour[]) => void; readOnly: boolean }) {
  const [input, setInput] = useState('');
  const [name, setName] = useState('');
  const [use, setUse] = useState('primary');
  const parsed = input.trim() ? toHex(input) : null;

  const add = () => {
    if (!parsed) return;
    onChange([...value, { name: name.trim(), use, hex: parsed }]);
    setInput('');
    setName('');
  };

  return (
    <div className="stack">
      <h2>Colours</h2>
      {value.length === 0 && <p className="small">No colours added yet.</p>}
      <ul style={{ listStyle: 'none' }} className="stack">
        {value.map((c, i) => (
          <li key={i} className="row">
            <span className="swatch" style={{ background: c.hex }} aria-hidden />
            <div style={{ flex: 1, minWidth: 160 }}>
              <strong>{c.name || COLOUR_USES.find((u) => u.id === c.use)?.label}</strong>
              <div className="small mono">{c.hex} · {toRgb(c.hex)}</div>
            </div>
            {!readOnly && (
              <>
                <label className="sr-only" htmlFor={`use-${i}`}>Use for {c.hex}</label>
                <select id={`use-${i}`} value={c.use} style={{ width: 'auto' }}
                  onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, use: e.target.value } : x)))}>
                  {COLOUR_USES.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                </select>
                <button type="button" className="btn danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                  Remove<span className="sr-only"> {c.hex}</span>
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <div className="drop">
          <div className="grid2">
            <div className="field">
              <label htmlFor="colour-value">Colour (hex or RGB)</label>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <span className="swatch" style={{ background: parsed ?? 'transparent' }} aria-hidden />
                <input id="colour-value" value={input} placeholder="#166534 or 22, 101, 52"
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                  aria-invalid={!!input.trim() && !parsed} aria-describedby="colour-help" />
              </div>
              <p className="hint" id="colour-help">
                {input.trim() && !parsed ? 'That isn’t a valid hex or RGB colour.' : parsed ? `Will be saved as ${parsed}` : 'For example #1c1917, #fff or rgb(28, 25, 23).'}
              </p>
            </div>
            <div className="field">
              <label htmlFor="colour-name">Name (optional)</label>
              <input id="colour-name" value={name} maxLength={80} placeholder="e.g. Oxford blue" onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="colour-use">Used for</label>
              <select id="colour-use" value={use} onChange={(e) => setUse(e.target.value)}>
                {COLOUR_USES.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </div>
          </div>
          <button type="button" className="btn ghost" onClick={add} disabled={!parsed}>Add colour</button>
        </div>
      )}
    </div>
  );
}

// Fonts by name (e.g. from Google Fonts). Font files are uploaded separately below.
export function FontsEditor({ value, onChange, readOnly }: { value: Font[]; onChange: (v: Font[]) => void; readOnly: boolean }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('headings');
  const [source, setSource] = useState('');
  const add = () => {
    if (!name.trim()) return;
    onChange([...value, { name: name.trim(), role, source: source.trim() }]);
    setName('');
    setSource('');
  };
  return (
    <div className="stack">
      <h2>Fonts</h2>
      {value.length === 0 && <p className="small">No fonts named yet. You can also upload font files below.</p>}
      <ul style={{ listStyle: 'none' }} className="stack">
        {value.map((f, i) => (
          <li key={i} className="spread">
            <div>
              <strong>{f.name}</strong>
              <div className="small">{FONT_ROLES.find((r) => r.id === f.role)?.label}{f.source && ` · ${f.source}`}</div>
            </div>
            {!readOnly && (
              <button type="button" className="btn danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                Remove<span className="sr-only"> {f.name}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <div className="drop">
          <div className="grid2">
            <div className="field">
              <label htmlFor="font-name">Font name</label>
              <input id="font-name" value={name} maxLength={120} placeholder="e.g. Cormorant Garamond" onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="font-role">Used for</label>
              <select id="font-role" value={role} onChange={(e) => setRole(e.target.value)}>
                {FONT_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="font-source">Where it comes from (optional)</label>
            <input id="font-source" value={source} maxLength={300} placeholder="e.g. Google Fonts, Adobe Fonts, bought from a foundry" onChange={(e) => setSource(e.target.value)} />
          </div>
          <button type="button" className="btn ghost" onClick={add} disabled={!name.trim()}>Add font</button>
        </div>
      )}
    </div>
  );
}
