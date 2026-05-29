/**
 * POST /api/feedback
 * Saves a feedback entry to Cloudflare KV.
 * KV binding name: FEEDBACK_KV  (set in Pages → Settings → Functions → KV bindings)
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = { 'Content-Type': 'application/json' };

  if (!env.FEEDBACK_KV) {
    return new Response(
      JSON.stringify({ error: 'FEEDBACK_KV binding not configured' }),
      { status: 500, headers }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const entry = {
    id,
    page:       (body.page       || 'Unknown').slice(0, 80),
    role:       (body.role       || '').slice(0, 80),
    emoji:      (body.emoji      || '').slice(0, 8),
    emojiLabel: (body.emojiLabel || '').slice(0, 20),
    emojiValue: parseInt(body.emojiValue) || 0,
    comment:    (body.comment    || '').slice(0, 1000),
    url:        (body.url        || '').slice(0, 200),
    timestamp:  new Date().toISOString(),
  };

  await env.FEEDBACK_KV.put(`feedback:${id}`, JSON.stringify(entry));

  return new Response(JSON.stringify({ ok: true, id }), { headers });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
