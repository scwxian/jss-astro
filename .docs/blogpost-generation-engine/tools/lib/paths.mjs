import { join, isAbsolute } from 'node:path';
import { ENGINE_DIR } from './env.mjs';

export const ROOT = join(ENGINE_DIR, '..', '..'); // repo root
export const DOCS_DIR = join(ROOT, '.docs');
export const RESEARCH_DIR = join(DOCS_DIR, 'blog-research');
export const ENGINE_OUTPUT_DIR = join(ENGINE_DIR, 'output');
export const CACHE_DIR = join(ENGINE_OUTPUT_DIR, '.cache');

export const INDEX_FILE = join(RESEARCH_DIR, 'blogpost-pipeline-index.md');
export const INVENTORY_FILE = join(RESEARCH_DIR, 'blog-inventory-references.md');

export function clusterFile(name) {
  // Accept: bare filename ("blogpost-pipeline-1.md"), repo-relative, or absolute path.
  if (isAbsolute(name)) return name;
  if (name.includes('/') || name.includes('\\')) return join(ROOT, name);
  return join(RESEARCH_DIR, name);
}

export function postCacheDir(postId) {
  return join(CACHE_DIR, postId);
}

export function postOutputFile(postId, slug) {
  return join(ENGINE_OUTPUT_DIR, `${postId}-${slug}-references.md`);
}
