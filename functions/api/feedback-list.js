/**
 * GET /api/feedback-list
 * Returns all feedback entries from Cloudflare KV.
 * KV binding name: FEEDBACK_KV
 */
export async function onRequestGet(context) {
  const { env } = context;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!env.FEEDBACK_KV) {
    return new Response(
      JSON.stringify({ error: 'FEEDBACK_KV binding not configured' }),
      { status: 500, headers }
    );
  }

  // List all keys with the "feedback:" prefix
  const list = await env.FEEDBACK_KV.list({ prefix: 'feedback:' });

  // Fetch all entries in parallel
  const entries = await Promise.all(
    list.keys.map(async ({ name }) => {
      const val = await env.FEEDBACK_KV.get(name);
      try { return JSON.parse(val); } catch { return null; }
    })
  );

  // Filter nulls, sort newest first
  const sorted = entries
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return new Response(JSON.stringify({ ok: true, entries: sorted, total: sorted.length }), { headers });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
