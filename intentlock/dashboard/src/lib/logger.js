export function log(level, message, meta) {
  const timestamp = new Date().toISOString();
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  console[level]?.(`[${timestamp}] ${message}${payload}`);
}

