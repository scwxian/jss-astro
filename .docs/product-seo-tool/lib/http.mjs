export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Strip tracking params (srsltid, utm_*, gclid, …) and fragments from a URL. */
export function cleanUrl(u) {
	if (!u) return u;
	try {
		const url = new URL(u);
		for (const k of [...url.searchParams.keys()]) {
			if (/^(srsltid|gclid|fbclid|msclkid|yclid)$/i.test(k) || /^utm_/i.test(k)) url.searchParams.delete(k);
		}
		url.hash = '';
		const s = url.toString();
		return s.endsWith('?') ? s.slice(0, -1) : s;
	} catch {
		return u;
	}
}

export async function request(url, { method = 'GET', headers = {}, body, timeout = 30000 } = {}) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), timeout);
	try {
		return await fetch(url, {
			method,
			headers,
			body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
			signal: ctrl.signal,
		});
	} finally {
		clearTimeout(timer);
	}
}

export async function requestJson(url, opts = {}, { retries = 3, backoff = 1000 } = {}) {
	let lastErr;
	for (let i = 0; i <= retries; i++) {
		try {
			const res = await request(url, opts);
			const text = await res.text();
			let json;
			try {
				json = JSON.parse(text);
			} catch {
				json = { raw: text };
			}
			if (res.ok) return json;
			lastErr = new Error(`HTTP ${res.status} ${url}: ${text.slice(0, 240)}`);
		} catch (e) {
			lastErr = e;
		}
		if (i < retries) await sleep(backoff * 2 ** i);
	}
	throw lastErr;
}
