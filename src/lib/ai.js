const AI_PROXY = 'https://gtm360-ai-proxy.sameerjoshy.workers.dev';

export async function apolloSearchPeople(domain, signal) {
  if (!domain) throw new Error('No company domain provided')
  const response = await fetch(`${AI_PROXY}/apollo`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain })
  });
  if (!response.ok) throw new Error(`Apollo proxy returned ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.people || [];
}

export async function searchWeb(query, num = 5) {
  const response = await fetch(`${AI_PROXY}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, num })
  });
  if (!response.ok) throw new Error(`Search proxy returned ${response.status}`);
  const data = await response.json();
  return data.results || [];
}

export async function callAI(prompt, system = '', max_tokens = 800) {
  const response = await fetch(AI_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, system, max_tokens })
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error || `AI proxy returned ${response.status}`);
  }
  const data = await response.json();
  return data.response;
}

export async function callAIJson(prompt, system = '', max_tokens = 800) {
  const raw = await callAI(prompt, system, max_tokens);
  let clean = raw.trim();
  if (clean.startsWith('```')) {
    clean = clean.split('```')[1];
    if (clean.startsWith('json')) clean = clean.slice(4);
  }
  return JSON.parse(clean.trim());
}
