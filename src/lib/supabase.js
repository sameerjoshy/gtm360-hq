import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dtqsnojfatzjsklsjzwj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cXNub2pmYXR6anNrbHNqendqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTk2MjgsImV4cCI6MjA5NTE5NTYyOH0.IOnNkAmFw-iGnWq2h2vVg0VRE7Smm-sNSMYUDcL3GLQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Stage display mapping
export const STAGE_LABELS = {
  appointmentscheduled: 'Radar',
  qualifiedtobuy:       'Connected',
  presentationscheduled:'Engaged',
  decisionmakerboughtin:'Discovery',
  contractsent:         'Proposal',
  closedwon:            'Active',
}

export const SERVICE_LABELS = {
  DIAG: 'GTM Diagnostic',
  FCRO: 'Fractional CRO',
  ROPS: 'RevOps Audit',
}

export const fmt$ = (n) =>
  n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`

// deal_name format in HubSpot: "revVana — Fractional CRO"
// company_name column is null — parse from deal_name
export const getCompanyName = (deal) => {
  if (deal.company_name) return deal.company_name
  if (deal.deal_name) return deal.deal_name.split(/\s*[—–-]{1,2}\s*/)[0].trim()
  return 'Unknown'
}
