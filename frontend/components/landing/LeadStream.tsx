import { mockLeads } from '@/lib/mock/leads'

const previewLeads = mockLeads.slice(0, 4)

function LeadLines({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="pro-lead-ticker-group" aria-hidden={duplicate || undefined}>
      {previewLeads.map((lead) => (
        <p className="pro-lead-ticker-line" key={`${duplicate ? 'copy-' : ''}${lead.id}`}>
          <span className="pro-lead-name">{lead.coupleName}</span>
          <span className="pro-lead-budget">· Expected budget {lead.budget}</span>
        </p>
      ))}
    </div>
  )
}

export default function LeadStream() {
  return (
    <div className="pro-lead-ticker" aria-label="Sample couple names and expected budgets">
      <span className="pro-lead-live">LIVE</span>
      <div className="pro-lead-ticker-window">
        <div className="pro-lead-ticker-track" aria-hidden="true">
          <LeadLines />
          <LeadLines duplicate />
        </div>
      </div>
      <span className="sr-only">Sample couple names and expected budgets.</span>
    </div>
  )
}
