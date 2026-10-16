import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

export function ensureDir(p) {
	mkdirSync(p, { recursive: true });
}
export function exists(p) {
	return existsSync(p);
}
export function readJson(p) {
	return JSON.parse(readFileSync(p, 'utf8'));
}
export function writeJson(p, obj) {
	ensureDir(dirname(p));
	writeFileSync(p, JSON.stringify(obj, null, 2));
}
export function writeText(p, s) {
	ensureDir(dirname(p));
	writeFileSync(p, s);
}
