/* scope-css.mjs — one-time build helper.
   Rewrites a kit's global stylesheet so every rule is scoped under a wrapper class,
   letting full prototype themes (their own :root vars, body styles, [data-theme] dark
   mode) live inside one React route without colliding with the rest of the app.

   Usage: node scripts/scope-css.mjs <input.css> <output.css> <.scopeClass>
   - :root / html / body            -> .scope
   - [data-theme="dark"] …          -> [data-theme="dark"] .scope …   (theme set on <html>)
   - *                              -> .scope *
   - any other selector             -> .scope <selector>
   - @media / @supports / @container -> recurse into the block
   - @keyframes / @font-face / …    -> left untouched
*/
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath, scope] = process.argv;
if (!inPath || !outPath || !scope) {
  console.error('usage: node scripts/scope-css.mjs <in.css> <out.css> <.scope>');
  process.exit(1);
}

let css = readFileSync(inPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function splitTopLevel(str) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of str) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function transformSelector(raw) {
  const sel = raw.trim();
  if (!sel) return sel;
  if (sel === ':root' || sel === 'html' || sel === 'body' || sel === 'html,body') return scope;
  if (sel === '*') return `${scope} *`;
  const dark = sel.match(/^\[data-theme=("dark"|'dark'|dark)\]\s*/);
  if (dark) {
    const rest = sel.slice(dark[0].length).trim();
    return rest ? `[data-theme="dark"] ${scope} ${rest}` : `[data-theme="dark"] ${scope}`;
  }
  // Class-based dark mode (html.dark …) — used by the marketers kit + marketing site.
  const darkClass = sel.match(/^html\.dark\s*/);
  if (darkClass) {
    const rest = sel.slice(darkClass[0].length).trim();
    return rest ? `html.dark ${scope} ${rest}` : `html.dark ${scope}`;
  }
  return `${scope} ${sel}`;
}

function scopeRules(input) {
  let out = '';
  let i = 0;
  const n = input.length;
  while (i < n) {
    while (i < n && /\s/.test(input[i])) { out += input[i]; i++; }
    if (i >= n) break;
    let prelude = '';
    while (i < n && input[i] !== '{' && input[i] !== ';' && input[i] !== '}') { prelude += input[i]; i++; }
    if (i < n && input[i] === ';') { out += `${prelude};`; i++; continue; }
    if (i >= n || input[i] === '}') { out += prelude; if (input[i] === '}') { out += '}'; i++; } continue; }
    // input[i] === '{' — capture the balanced block body
    let depth = 0;
    let j = i;
    let body = '';
    for (; j < n; j++) {
      const c = input[j];
      if (c === '{') { depth++; if (depth === 1) continue; }
      else if (c === '}') { depth--; if (depth === 0) break; }
      if (depth >= 1) body += c;
    }
    i = j + 1;
    const pre = prelude.trim();
    const lower = pre.toLowerCase();
    if (pre.startsWith('@')) {
      if (lower.startsWith('@media') || lower.startsWith('@supports') || lower.startsWith('@container')) {
        out += `${pre}{${scopeRules(body)}}`;
      } else {
        out += `${pre}{${body}}`;
      }
    } else {
      out += `${splitTopLevel(pre).map(transformSelector).join(', ')}{${body}}`;
    }
  }
  return out;
}

let scoped = scopeRules(css);
scoped += `\n${scope}{min-height:100vh;}\n`;
writeFileSync(outPath, `${scoped.trim()}\n`);
console.log(`scoped ${inPath} -> ${outPath} under ${scope}`);
