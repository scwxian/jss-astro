/** Parse a cluster brief file (blogpost-pipeline-N.md) into per-post field objects. */

function clean(s) {
  return s
    .replace(/`/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim();
}

/** List all `### ID — Title` headings in a cluster file. */
export function listBriefs(md) {
  const out = [];
  for (const line of md.split(/\r?\n/)) {
    const m = /^#{2,4}\s+([A-Z]{2}-\d{2})\b\s*[—-]?\s*(.*)$/.exec(line);
    if (m) out.push({ postId: m[1], title: clean(m[2]) });
  }
  return out;
}

/**
 * Parse one post's field table. Returns { postId, heading, fields, block }.
 * Supported field keys: Slug, SEO title, Category, Intent / E-E-A-T, Source, Ref model,
 * Role, Rationale, Must-have keywords, High-volume, Long-tail / PAA, Local, Links / notes.
 */
export function parseBrief(md, postId) {
  const lines = md.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => new RegExp(`^#{2,4}\\s+${postId}\\b`).test(l));
  if (startIdx === -1) throw new Error(`POST_ID ${postId} not found in cluster file`);

  const heading = lines[startIdx].replace(/^#+\s*/, '');
  const level = (lines[startIdx].match(/^#+/) || [''])[0].length;

  let end = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+)\s/);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }

  const block = lines.slice(startIdx, end).join('\n');
  const fields = {};
  for (const row of block.split(/\r?\n/)) {
    const m = /^\|\s*\*\*(.+?)\*\*\s*\|\s*(.*?)\s*\|$/.exec(row);
    if (m) fields[m[1].trim()] = clean(m[2]);
  }
  return { postId, heading, level, fields, block };
}

/** Split a brief list field ("a · b · c" or comma-separated) into trimmed tokens. */
export function splitList(value) {
  if (!value) return [];
  return String(value)
    .split(/·|,|;|\s\/\s/)
    .map((s) => clean(s))
    .filter(Boolean);
}

/** Extract slug from a brief Slug cell: "/blog/what-is-x/" -> "what-is-x" */
export function slugFromField(value) {
  if (!value) return null;
  const m = String(value).match(/\/blog\/([a-z0-9-]+)/i);
  return m ? m[1] : clean(value).replace(/^\/|\/$/g, '');
}

/**
 * Pull ref-model domain hints from a free-text cell.
 * Fill REF_MODELS with your own competitor/ref-model aliases: { alias: 'example.com' }.
 */
const REF_MODELS = {};

export function refModelHints(value, known = REF_MODELS) {
  if (!value) return [];
  const lower = String(value).toLowerCase();
  const out = [];
  for (const [k, domain] of Object.entries(known)) if (lower.includes(k)) out.push(domain);
  return out;
}
