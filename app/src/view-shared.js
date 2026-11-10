// Two one-line helpers the pages share.

export const pct = (k, total) => (total ? Math.round(100 * k / total) : 0);

export const f1 = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));
