export function corsHeaders(event: { headers: Record<string, string | undefined> }) {
  const origin = event.headers?.origin || '';
  const configuredOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (process.env.URL) configuredOrigins.push(process.env.URL);
  if (process.env.DEPLOY_PRIME_URL) configuredOrigins.push(process.env.DEPLOY_PRIME_URL);

  const allowOrigin = configuredOrigins.includes(origin)
    ? origin
    : origin || configuredOrigins[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Pin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };
}
