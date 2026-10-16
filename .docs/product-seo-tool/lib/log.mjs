const PAD = (s) => String(s).padEnd(7);
const write = (s) => process.stderr.write(`${s}\n`);

export const log = {
	step: (m, ...a) => write(`[${PAD('step')}] ${m} ${a.join(' ')}`),
	info: (m, ...a) => write(`[${PAD('info')}] ${m} ${a.join(' ')}`),
	warn: (m, ...a) => write(`[${PAD('warn')}] ${m} ${a.join(' ')}`),
	error: (m, ...a) => write(`[${PAD('error')}] ${m} ${a.join(' ')}`),
	ok: (m, ...a) => write(`[${PAD('ok')}] ${m} ${a.join(' ')}`),
};
