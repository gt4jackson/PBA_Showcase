/**
 * PBA Showcase — Shared Feedback Widget
 * Drop <script src="feedback.js"></script> before </body> on any page.
 * Auto-detects hub vs. task page from document.title / URL.
 */
(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────────── */
  const API_URL = '/api/feedback';

  const EMOJIS = [
    { emoji: '😕', label: 'Not it',  value: 1 },
    { emoji: '😐', label: 'Meh',     value: 2 },
    { emoji: '🙂', label: 'Good',    value: 3 },
    { emoji: '😄', label: 'Nice',    value: 4 },
    { emoji: '🤩', label: 'Wow',     value: 5 },
  ];

  const ROLES = [
    'Research & Assessment',
    'Product & Technology',
    'Business & Strategy',
    'Leadership',
    'Other',
  ];

  /* ── Detect context ──────────────────────────────────────── */
  const path = window.location.pathname;
  const isHub = path === '/' || path.endsWith('index.html') || path === '';
  const pageTitle = document.title || 'Unknown';

  /* ── Inject styles ───────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    #fb-trigger {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9000;
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 9px 16px 9px 12px;
      background: #242e3d;
      border: 1px solid rgba(77,211,254,0.3);
      border-radius: 24px;
      color: #4dd3fe;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      transition: background 0.18s, border-color 0.18s, transform 0.12s;
      user-select: none;
    }
    #fb-trigger:hover {
      background: #2d3a4f;
      border-color: rgba(77,211,254,0.55);
      transform: translateY(-1px);
    }
    #fb-trigger svg { flex-shrink: 0; }

    #fb-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9001;
      background: rgba(0,0,0,0.55);
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 24px;
    }
    #fb-overlay.open { display: flex; }

    #fb-modal {
      background: #1a212b;
      border: 1px solid rgba(242,233,216,0.12);
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.6);
      font-family: inherit;
      color: #f2e9d8;
      position: relative;
      animation: fb-slide-up 0.22s ease;
    }
    @keyframes fb-slide-up {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    #fb-close {
      position: absolute;
      top: 14px; right: 16px;
      background: none; border: none;
      color: rgba(242,233,216,0.4);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      transition: color 0.15s;
    }
    #fb-close:hover { color: #f2e9d8; }

    #fb-modal h3 {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 700;
      color: #f2e9d8;
    }
    #fb-modal .fb-sub {
      font-size: 12px;
      color: rgba(242,233,216,0.45);
      margin: 0 0 18px;
    }

    .fb-label {
      font-size: 12px;
      font-weight: 600;
      color: rgba(242,233,216,0.6);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }

    .fb-emoji-row {
      display: flex;
      gap: 8px;
      margin-bottom: 18px;
    }
    .fb-emoji-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 4px 8px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(242,233,216,0.08);
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, transform 0.1s;
      font-family: inherit;
      color: rgba(242,233,216,0.55);
      font-size: 11px;
    }
    .fb-emoji-btn .fb-em { font-size: 22px; line-height: 1; }
    .fb-emoji-btn:hover {
      background: rgba(77,211,254,0.08);
      border-color: rgba(77,211,254,0.3);
      transform: translateY(-2px);
      color: rgba(242,233,216,0.85);
    }
    .fb-emoji-btn.selected {
      background: rgba(77,211,254,0.14);
      border-color: #4dd3fe;
      color: #4dd3fe;
      transform: translateY(-2px);
    }

    #fb-role-wrap {
      margin-bottom: 18px;
    }
    #fb-role {
      width: 100%;
      padding: 9px 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(242,233,216,0.12);
      border-radius: 8px;
      color: #f2e9d8;
      font-family: inherit;
      font-size: 13px;
      appearance: none;
      cursor: pointer;
      outline: none;
      transition: border-color 0.15s;
    }
    #fb-role:focus { border-color: rgba(77,211,254,0.45); }
    #fb-role option { background: #1a212b; }

    #fb-comment {
      width: 100%;
      padding: 10px 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(242,233,216,0.12);
      border-radius: 8px;
      color: #f2e9d8;
      font-family: inherit;
      font-size: 13px;
      resize: vertical;
      min-height: 72px;
      outline: none;
      margin-bottom: 16px;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    #fb-comment:focus { border-color: rgba(77,211,254,0.45); }
    #fb-comment::placeholder { color: rgba(242,233,216,0.3); }

    #fb-submit {
      width: 100%;
      padding: 11px;
      background: #4dd3fe;
      border: none;
      border-radius: 8px;
      color: #1a212b;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
    }
    #fb-submit:hover { background: #6cdeff; }
    #fb-submit:disabled { opacity: 0.45; cursor: default; }

    #fb-thanks {
      text-align: center;
      padding: 28px 0 12px;
    }
    #fb-thanks .fb-thanks-emoji { font-size: 42px; margin-bottom: 10px; }
    #fb-thanks h3 { margin: 0 0 6px; font-size: 17px; }
    #fb-thanks p { margin: 0; font-size: 13px; color: rgba(242,233,216,0.5); }
  `;
  document.head.appendChild(style);

  /* ── Build trigger button ────────────────────────────────── */
  const trigger = document.createElement('button');
  trigger.id = 'fb-trigger';
  trigger.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1C3.91 1 1 3.46 1 6.5c0 1.47.67 2.8 1.77 3.79L2 13l3.18-1.27C5.83 11.9 6.65 12 7.5 12c3.59 0 6.5-2.46 6.5-5.5S11.09 1 7.5 1Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
    </svg>
    Feedback`;
  document.body.appendChild(trigger);

  /* ── Build overlay + modal ───────────────────────────────── */
  const overlay = document.createElement('div');
  overlay.id = 'fb-overlay';

  overlay.innerHTML = `
    <div id="fb-modal">
      <button id="fb-close" aria-label="Close">✕</button>

      <div id="fb-form-view">
        <h3>How's this landing?</h3>
        <p class="fb-sub">${pageTitle}</p>

        <div class="fb-label">Your reaction</div>
        <div class="fb-emoji-row" id="fb-emoji-row">
          ${EMOJIS.map(e => `
            <button class="fb-emoji-btn" data-value="${e.value}" data-emoji="${e.emoji}" data-label="${e.label}" type="button">
              <span class="fb-em">${e.emoji}</span>
              <span>${e.label}</span>
            </button>`).join('')}
        </div>

        ${isHub ? `
        <div id="fb-role-wrap">
          <div class="fb-label">Your role</div>
          <select id="fb-role">
            <option value="">Select your role…</option>
            ${ROLES.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
        </div>` : ''}

        <div class="fb-label">Any thoughts?</div>
        <textarea id="fb-comment" placeholder="Whatever's on your mind…" maxlength="1000"></textarea>

        <button id="fb-submit" disabled>Send feedback</button>
      </div>

      <div id="fb-thanks" style="display:none">
        <div class="fb-thanks-emoji">🙌</div>
        <h3>Thanks!</h3>
        <p>Your feedback helps make these prototypes better.</p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  /* ── State ───────────────────────────────────────────────── */
  let selectedEmoji = null;

  /* ── Wire interactions ───────────────────────────────────── */
  trigger.addEventListener('click', () => {
    overlay.classList.add('open');
    document.getElementById('fb-form-view').style.display = '';
    document.getElementById('fb-thanks').style.display = 'none';
    selectedEmoji = null;
    document.querySelectorAll('.fb-emoji-btn').forEach(b => b.classList.remove('selected'));
    if (document.getElementById('fb-comment')) document.getElementById('fb-comment').value = '';
    if (document.getElementById('fb-role')) document.getElementById('fb-role').value = '';
    document.getElementById('fb-submit').disabled = true;
  });

  document.getElementById('fb-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  function close() {
    overlay.classList.remove('open');
  }

  document.getElementById('fb-emoji-row').addEventListener('click', e => {
    const btn = e.target.closest('.fb-emoji-btn');
    if (!btn) return;
    document.querySelectorAll('.fb-emoji-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedEmoji = {
      emoji: btn.dataset.emoji,
      label: btn.dataset.label,
      value: parseInt(btn.dataset.value),
    };
    document.getElementById('fb-submit').disabled = false;
  });

  document.getElementById('fb-submit').addEventListener('click', async () => {
    if (!selectedEmoji) return;

    const submit = document.getElementById('fb-submit');
    submit.disabled = true;
    submit.textContent = 'Sending…';

    const payload = {
      page:       pageTitle,
      emoji:      selectedEmoji.emoji,
      emojiLabel: selectedEmoji.label,
      emojiValue: selectedEmoji.value,
      comment:    (document.getElementById('fb-comment')?.value || '').trim(),
      role:       (document.getElementById('fb-role')?.value || ''),
      url:        window.location.href,
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Network error');
    } catch (err) {
      console.warn('Feedback submission failed:', err);
    }

    // Show thanks regardless (avoid frustrating the user on network error)
    document.getElementById('fb-form-view').style.display = 'none';
    document.getElementById('fb-thanks').style.display = '';
    setTimeout(close, 2200);
  });

})();
