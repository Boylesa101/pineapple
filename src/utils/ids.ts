let recordCounter = 0;
const sessionEntropy = buildSessionEntropy();

function buildSessionEntropy() {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${time}${random}`.slice(-12);
}

export function createId(prefix: string) {
  recordCounter = (recordCounter + 1) % 1679616;
  const timestamp = Date.now().toString(36);
  const perf = Math.floor((globalThis.performance?.now?.() ?? 0) * 1000)
    .toString(36)
    .slice(-6)
    .padStart(6, '0');
  const counter = recordCounter.toString(36).padStart(4, '0');
  const jitter = Math.floor(Math.random() * 2176782336)
    .toString(36)
    .slice(-6)
    .padStart(6, '0');

  return `${prefix}_${timestamp}${counter}${perf}${sessionEntropy}${jitter}`;
}
