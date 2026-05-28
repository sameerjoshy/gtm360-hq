/**
 * Apollo.io API client
 * Searches for executives at a company domain.
 * Key stored in VITE_APOLLO_KEY (sourced from Supabase Vault: apollo_api_key)
 */

const APOLLO_BASE = 'https://api.apollo.io/v1'

const EXEC_TITLES = [
  'CEO', 'Co-Founder', 'Founder', 'CRO', 'Chief Revenue Officer',
  'VP Sales', 'VP of Sales', 'Head of Sales', 'CFO', 'COO',
  'President', 'Managing Director', 'General Manager',
]

/**
 * Search for executives at a company domain.
 * Returns array of { name, title, linkedin_url, email }
 */
export async function apolloSearchPeople(domain, signal) {
  const apiKey = import.meta.env.VITE_APOLLO_KEY
  if (!apiKey) throw new Error('VITE_APOLLO_KEY not configured in .env.local')
  if (!domain) throw new Error('No company domain provided')

  const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      organization_domains: [domain],
      person_titles: EXEC_TITLES,
      page: 1,
      per_page: 10,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message || `Apollo returned ${res.status}`)
  }

  const data = await res.json()
  return (data.people || []).map(p => ({
    name:         `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    title:        p.title        || '',
    linkedin_url: p.linkedin_url || null,
    email:        p.email        || null,
  }))
}
