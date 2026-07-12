/* Markdown.jsx — tiny, dependency-free Markdown renderer for AI answers.
   Handles the subset LLMs emit: headings, bold/italic, inline code, code
   blocks, links, ordered/unordered lists, GFM pipe tables, and a lightweight
   ```chart fenced block (label: value → horizontal bars). Renders to real React
   nodes (React escapes text) — no dangerouslySetInnerHTML, so it's XSS-safe. */
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
    else { const mm = t.match(/\[([^\]]+)\]\(([^)]+)\)/); if (mm) out.push(<a key={key} href={mm[2]} target="_blank" rel="noopener noreferrer" style={{ color:'var(--m-link, #4f46e5)', textDecoration:'underline' }}>{mm[1]}</a>); else out.push(t); }
    rest = rest.slice(m.index + t.length);
  }
  return out;
}

// A GFM table separator row (e.g. `| --- | :--: |`) — dashes + pipes only.
const isTableSep = (s) => s.includes('|') && s.includes('-') && /^[\s|:-]+$/.test(s);
const tableCells = (s) => s.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

// A ```chart block body: lines of `Label: value [suffix]`.
function parseChart(text) {
  return String(text).split('\n').map((l) => {
    const m = l.match(/^\s*(.+?):\s*([\d.,]+)\s*(.*)$/);
    return m ? { label: m[1].trim(), value: parseFloat(m[2].replace(/,/g, '')) || 0, suffix: m[3].trim() } : null;
  }).filter(Boolean);
}

function MarkdownInner({ text, style }) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = []; let i = 0;
  const listRe = /^\s*([-*•]|\d+\.)\s+/;
  const tableAt = (n) => lines[n] && lines[n].includes('|') && n + 1 < lines.length && isTableSep(lines[n + 1]);
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      const lang = line.trim().replace(/^`+/, '').trim().toLowerCase();
      const body = []; i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { body.push(lines[i]); i++; }
      i++; blocks.push({ type: lang === 'chart' ? 'chart' : 'code', text: body.join('\n') }); continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { blocks.push({ type:'heading', level:h[1].length, text:h[2] }); i++; continue; }
    // GFM pipe table: a header row followed by a --- separator row.
    if (tableAt(i)) {
      const headers = tableCells(line); i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') { rows.push(tableCells(lines[i])); i++; }
      blocks.push({ type:'table', headers, rows }); continue;
    }
    if (listRe.test(line)) {
      const items = []; const ordered = /^\s*\d+\.\s+/.test(line);
      while (i < lines.length && listRe.test(lines[i])) { items.push(lines[i].replace(listRe, '')); i++; }
      blocks.push({ type:'list', ordered, items }); continue;
    }
    if (line.trim() === '') { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^```/.test(lines[i].trim()) && !/^#{1,3}\s+/.test(lines[i]) && !listRe.test(lines[i]) && !tableAt(i)) { para.push(lines[i]); i++; }
    blocks.push({ type:'para', text: para.join('\n') });
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2, ...style }}>
      {blocks.map((b, bi) => {
        if (b.type === 'code') return <pre key={bi} style={preStyle}><code>{b.text}</code></pre>;
        if (b.type === 'heading') { const fs = b.level === 1 ? 17 : b.level === 2 ? 15.5 : 14.5; return <div key={bi} style={{ fontWeight:700, fontSize:fs, margin:'4px 0 1px' }}>{renderInline(b.text, `h${bi}`)}</div>; }
        if (b.type === 'table') return (
          <div key={bi} style={{ overflowX:'auto', margin:'6px 0', border:'1px solid var(--m-border, #e5e7eb)', borderRadius:10 }}>
            <table style={{ borderCollapse:'collapse', width:'100%', fontSize:13.5, whiteSpace:'nowrap' }}>
              <thead><tr>{b.headers.map((hh, hi) => <th key={hi} style={{ textAlign:'left', padding:'8px 11px', background:'var(--m-surface-2, #f1f3f9)', borderBottom:'1px solid var(--m-border, #e5e7eb)', fontWeight:700 }}>{renderInline(hh, `th${bi}-${hi}`)}</th>)}</tr></thead>
              <tbody>{b.rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} style={{ padding:'8px 11px', borderBottom: ri < b.rows.length - 1 ? '1px solid var(--m-border, #e5e7eb)' : 'none', verticalAlign:'top' }}>{renderInline(c, `td${bi}-${ri}-${ci}`)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
        if (b.type === 'chart') {
          const rows = parseChart(b.text);
          if (!rows.length) return <pre key={bi} style={preStyle}><code>{b.text}</code></pre>;
          const max = Math.max(1, ...rows.map((r) => r.value));
          return (
            <div key={bi} style={{ display:'flex', flexDirection:'column', gap:8, margin:'8px 0' }}>
              {rows.map((r, ri) => (
                <div key={ri} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ width:96, fontSize:12.5, color:'var(--m-fg2, #374151)', textAlign:'right', flexShrink:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.label}</span>
                  <span style={{ flex:1, height:18, background:'var(--m-surface-2, #f1f3f9)', borderRadius:6, overflow:'hidden', minWidth:40 }}><span style={{ display:'block', height:'100%', width:`${Math.max(3, Math.round(r.value / max * 100))}%`, background:'var(--m-grad, linear-gradient(135deg,#5b2c9c,#8b3fea))', borderRadius:6 }} /></span>
                  <span style={{ width:70, fontSize:12, fontWeight:700, color:'var(--m-fg1, #111827)', flexShrink:0, textAlign:'right' }}>{r.value.toLocaleString()}{r.suffix ? ` ${r.suffix}` : ''}</span>
                </div>
              ))}
            </div>
          );
        }
        if (b.type === 'list') {
          const items = Array.isArray(b.items) ? b.items : [];
          const liStyle = { marginBottom: 2 };
          return b.ordered
            ? <ol key={bi} style={{ margin:'4px 0', paddingLeft:22 }}>{items.map((it, li) => <li key={li} style={liStyle}>{renderInline(it, `li${bi}-${li}`)}</li>)}</ol>
            : <ul key={bi} style={{ margin:'4px 0', paddingLeft:22 }}>{items.map((it, li) => <li key={li} style={liStyle}>{renderInline(it, `li${bi}-${li}`)}</li>)}</ul>;
        }
        const parts = String(b.text || '').split('\n');
        return <div key={bi} style={{ margin:'2px 0' }}>{parts.map((pt, pi) => <React.Fragment key={pi}>{renderInline(pt, `p${bi}-${pi}`)}{pi < parts.length - 1 && <br />}</React.Fragment>)}</div>;
      })}
    </div>
  );
}

// Rendering LLM-authored Markdown (tables, charts, arbitrary text) must never
// white-screen the app. This boundary catches any render error and falls back to
// the raw text — still readable — and logs the real cause to the console.
class Markdown extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { try { console.error('[YoteAI] Markdown render failed:', err); } catch { /* ignore */ } }
  componentDidUpdate(prev) { if (prev.text !== this.props.text && this.state.failed) this.setState({ failed: false }); }
  render() {
    if (this.state.failed) {
      return <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, ...this.props.style }}>{String(this.props.text || '')}</div>;
    }
    return <MarkdownInner {...this.props} />;
  }
}

export default Markdown;
