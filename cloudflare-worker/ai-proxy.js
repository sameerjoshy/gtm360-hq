const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function searchWeb(query, env, num = 5) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': env.SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num }),
  });
  if (!res.ok) throw new Error(`Serper ${res.status}`);
  const data = await res.json();
  return (data.organic || []).map(r => ({
    title:   r.title,
    snippet: r.snippet,
    link:    r.link,
  }));
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);

    // ── /apollo — Apollo people search ───────────────────────────────────────
    if (url.pathname === '/apollo') {
      const { domain, titles } = await request.json();
      if (!domain) {
        return new Response(JSON.stringify({ error: 'No domain provided' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
      try {
        const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': env.APOLLO_API_KEY,
          },
          body: JSON.stringify({
            api_key: env.APOLLO_API_KEY,
            organization_domains: [domain],
            person_titles: titles || ['CEO','Founder','Co-Founder','CRO','VP Sales','CFO','COO','President'],
            page: 1,
            per_page: 10,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || `Apollo returned ${res.status}`);
        }
        const data = await res.json();
        const people = (data.people || []).map(p => ({
          name:         `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          title:        p.title        || '',
          linkedin_url: p.linkedin_url || null,
          email:        p.email        || null,
        }));
        return new Response(JSON.stringify({ people }), {
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
    }

    // ── /search — Serper web search ──────────────────────────────────────────
    if (url.pathname === '/search') {
      const { query, num = 5 } = await request.json();
      try {
        const results = await searchWeb(query, env, num);
        return new Response(JSON.stringify({ results }), {
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
    }

    // ── / — AI inference (llama) ─────────────────────────────────────────────
    const { prompt, system, max_tokens = 800 } = await request.json();

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const response = await env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      { messages, max_tokens }
    );

    return new Response(JSON.stringify({ response: response.response }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};
