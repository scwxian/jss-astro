import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIB_DIR = dirname(fileURLToPath(import.meta.url));
export const TOOL_DIR = join(LIB_DIR, '..');
export const ENV_PATH = join(TOOL_DIR, '.env');

let loaded = false;

/** Load `product-seo-tool/.env` into process.env (never overrides existing vars). */
export function loadEnv(force = false) {
	if (loaded && !force) return;
	loaded = true;
	if (!existsSync(ENV_PATH)) return;
	const text = readFileSync(ENV_PATH, 'utf8');
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const eq = line.indexOf('=');
		if (eq === -1) continue;
		const key = line.slice(0, eq).trim();
		let val = line.slice(eq + 1).trim();
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		if (!(key in process.env)) process.env[key] = val;
	}
}

export function env(name, { required = false } = {}) {
	loadEnv();
	const v = process.env[name];
	if ((v === undefined || v === '') && required) {
		throw new Error(`Missing env var ${name}. Add it to ${ENV_PATH} (see .env.example).`);
	}
	return v;
}
