/* Markdown.jsx — tiny, dependency-free Markdown renderer for AI answers.
   Handles the subset LLMs emit: headings, bold/italic, inline code, code
   blocks, links, and ordered/unordered lists. Renders to real React nodes
   (React escapes text) — no dangerouslySetInnerHTML, so it's XSS-safe. */
import React from 'react';

const codeStyle = { background:'rgba(127,127,127,.16)', borderRadius:5, padding:'1px 5px', fontSize:'.9em', fontFamily:'ui-monospace, Menlo, Consolas, monospace' };
const preStyle = { background:'rgba(127,127,127,.14)', borderRadius:10, padding:'10px 12px', margin:'6px 0', overflowX:'auto', fontSize:'.88em', lineHeight:1.45, fontFamily:'ui-monospace, Menlo, Consolas, monospace' };

// Inline: `code`, **bold**, __bold__, *italic*, _italic_, [text](url).
const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)|(\[[^\]]+\]\([^)]+\))/;
function renderInline(text, kp) {
  const out = []; let rest = String(text); let k = 0;
  while (rest) {
    const m = rest.match(INLINE);
    if (!m) { out.push(rest); break; }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const t = m[0]; const key = `${kp}-${k++}`;
    if (t.startsWith('`')) out.push(<code key={key} style={codeStyle}>{t.slice(1, -1)}</code>);
    else if (t.startsWith('**') || t.startsWith('__')) out.push(<strong key={key}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('*') || t.startsWith('_')) out.push(<em key={key}>{t.slice(1, -1)}</em>);
    else { const mm = t.match(/\[([^\]]+)\]\(([^)]+)\)/); out.push(<a key={key} href={mm[2]} target="_blank" rel="noopener noreferrer" style={{ color:'var(--m-link, #4f46e5)', textDecoration:'underline' }}>{mm[1]}</a>); }
    rest = rest.slice(m.index + t.length);
  }
  return out;
}

export default function Markdown({ text, style }) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = []; let i = 0;
  const listRe = /^\s*([-*•]|\d+\.)\s+/;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      const body = []; i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { body.push(lines[i]); i++; }
      i++; blocks.push({ type:'code', text: body.join('\n') }); continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { blocks.push({ type:'heading', level:h[1].length, text:h[2] }); i++; continue; }
    if (listRe.test(line)) {
      const items = []; const ordered = /^\s*\d+\.\s+/.test(line);
      while (i < lines.length && listRe.test(lines[i])) { items.push(lines[i].replace(listRe, '')); i++; }
      blocks.push({ type:'list', ordered, items }); continue;
    }
    if (line.trim() === '') { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^```/.test(lines[i].trim()) && !/^#{1,3}\s+/.test(lines[i]) && !listRe.test(lines[i])) { para.push(lines[i]); i++; }
    blocks.push({ type:'para', text: para.join('\n') });
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2, ...style }}>
      {blocks.map((b, bi) => {
        if (b.type === 'code') return <pre key={bi} style={preStyle}><code>{b.text}</code></pre>;
        if (b.type === 'heading') { const fs = b.level === 1 ? 17 : b.level === 2 ? 15.5 : 14.5; return <div key={bi} style={{ fontWeight:700, fontSize:fs, margin:'4px 0 1px' }}>{renderInline(b.text, `h${bi}`)}</div>; }
        if (b.type === 'list') return React.createElement(b.ordered ? 'ol' : 'ul', { key:bi, style:{ margin:'2px 0', paddingLeft:20, display:'flex', flexDirection:'column', gap:2 } }, b.items.map((it, ii) => <li key={ii}>{renderInline(it, `l${bi}-${ii}`)}</li>));
        const parts = b.text.split('\n');
        return <div key={bi} style={{ margin:'2px 0' }}>{parts.map((pt, pi) => <React.Fragment key={pi}>{renderInline(pt, `p${bi}-${pi}`)}{pi < parts.length - 1 && <br />}</React.Fragment>)}</div>;
      })}
    </div>
  );
}
