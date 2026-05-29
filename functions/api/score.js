/**
 * Cloudflare Pages Function: /api/score
 * Proxies assessment scoring requests to the Anthropic Claude API.
 * API key stored as Cloudflare Pages environment variable: ANTHROPIC_API_KEY
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // ── CORS (same-origin only for Pages, but kept for local dev) ──
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Check API key is configured
  if (!env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const { persona, construct, question, history = [], followUpCount = 0 } = body;

  // ── BUILD RUBRIC HINT FROM SCORER SPEC ──
  let rubricHint = '';
  if (question?.scorer) {
    const s = question.scorer;
    const highTerms = s.high?.slice(0, 6).join(', ');
    const midTerms  = s.mid?.slice(0, 6).join(', ');
    const keyTerms  = s.keywords?.slice(0, 8).join(', ');
    if (highTerms) rubricHint += `Strong answer demonstrates: ${highTerms}. `;
    if (midTerms)  rubricHint += `Partial credit if mentions: ${midTerms}. `;
    if (keyTerms)  rubricHint += `Key concepts: ${keyTerms}. `;
  }

  // ── SYSTEM PROMPT ──
  const systemPrompt = `You are ${persona?.name ?? 'an AI assessor'}, a warm and knowledgeable friend who chats casually — like texting. You're assessing someone's understanding of ${construct ?? 'the subject'}.

The question you asked: "${question?.text ?? '(see conversation)'}"
Assessment dimension: ${question?.dimension ?? 'general understanding'}
${rubricHint ? `Scoring rubric: ${rubricHint}` : ''}

Score the most recent user reply on a 0–2 scale:
• 2 — clear, accurate understanding with relevant detail
• 1 — partial understanding; gets the gist but misses key concepts or is vague
• 0 — no real understanding, off-topic, or too short/vague to evaluate

${followUpCount > 0
  ? 'This is already a follow-up exchange. Set "followUp" to null — do NOT ask another follow-up.'
  : 'You may include ONE short follow-up question if the answer was incomplete or vague. Set "followUp" to null if the answer was solid (score 2) or if a follow-up wouldn\'t add value.'}

Your reply should be 1–3 casual sentences as ${persona?.name ?? 'the assessor'}. React authentically — affirm what was right, gently surface any gaps without being preachy. Keep it conversational and warm, not academic.

Respond with ONLY valid JSON — no markdown, no extra text:
{
  "score": <0|1|2>,
  "reply": "<your casual in-persona response>",
  "followUp": "<one clarifying question, or null>",
  "evidence": "<one sentence about what their answer revealed>"
}`;

  // ── BUILD MESSAGES ARRAY ──
  // history already includes the user's latest message at the end
  const messages = history.slice(-12); // last 12 messages for context window efficiency

  // Ensure messages alternate properly and the last is from the user
  const cleanMessages = messages.filter(m => m.role && m.content);

  // ── CALL CLAUDE ──
  let claudeResp;
  try {
    claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: systemPrompt,
        messages: cleanMessages,
      }),
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Network error calling Anthropic API', detail: e.message }),
      { status: 502, headers: corsHeaders }
    );
  }

  if (!claudeResp.ok) {
    const errText = await claudeResp.text().catch(() => '');
    return new Response(
      JSON.stringify({ error: 'Anthropic API error', status: claudeResp.status, detail: errText }),
      { status: 502, headers: corsHeaders }
    );
  }

  const claudeData = await claudeResp.json();
  const rawText = claudeData?.content?.[0]?.text ?? '';

  // ── PARSE CLAUDE'S JSON RESPONSE ──
  let parsed;
  try {
    // Claude should return pure JSON, but strip any accidental markdown fences
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: return a neutral score with Claude's raw text as the reply
    parsed = {
      score: 1,
      reply: rawText.slice(0, 300) || 'Got it, thanks for sharing that.',
      followUp: null,
      evidence: 'Response parse error — used raw output as reply.',
    };
  }

  // Clamp score to valid range
  parsed.score = Math.max(0, Math.min(2, parseInt(parsed.score) || 0));
  parsed.followUp = parsed.followUp || null;

  return new Response(JSON.stringify(parsed), { headers: corsHeaders });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
