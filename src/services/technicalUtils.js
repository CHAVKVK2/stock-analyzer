export function normalizeDateString(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function diffDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

export function percentDistance(a, b) {
  if (!isNumber(a) || !isNumber(b) || b === 0) return Infinity;
  return Math.abs(a - b) / Math.abs(b);
}

export function sumScores(breakdown) {
  return Object.values(breakdown).reduce((sum, value) => sum + value, 0);
}

export function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function avg(values) {
  const filtered = values.filter(isNumber);
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

export function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function rnd(n) {
  if (!isNumber(n)) return null;
  return Math.round(n * 100) / 100;
}

export function crossedAbove(prevA, prevB, currA, currB) {
  return isNumber(prevA) && isNumber(prevB) && isNumber(currA) && isNumber(currB) && prevA <= prevB && currA > currB;
}

export function crossedBelow(prevA, prevB, currA, currB) {
  return isNumber(prevA) && isNumber(prevB) && isNumber(currA) && isNumber(currB) && prevA >= prevB && currA < currB;
}
