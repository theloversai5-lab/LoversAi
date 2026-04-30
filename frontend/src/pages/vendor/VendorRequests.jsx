import React, { useState } from 'react';

const statusColor = { Pending: 'badge-pending', Accepted: 'badge-open', Revised: 'bg-blue-500/15 text-blue-400 border border-blue-500/25', Rejected: 'bg-red-500/15 text-red-400 border border-red-500/25' };

const mockRequests = [
  { id: 'REQ-001', planner: 'Dream Events', coupleSummary: 'Priya & Arjun · Udaipur · ₹20L · Hindu', items: 'Royal Mandap, Fairy Lights', quote: '₹3.2L', status: 'Pending', note: '' },
  { id: 'REQ-002', planner: 'Beach Weddings Co', coupleSummary: 'Neha & Rahul · Goa · ₹10L · Mixed', items: 'Beach Bohemian Arch', quote: '₹1.1L', status: 'Pending', note: '' },
  { id: 'REQ-003', planner: 'Luxe Weddings', coupleSummary: 'Anjali & Karan · Jaipur · ₹25L · Sikh', items: 'Floral Stage, Mughal Backdrop', quote: '₹5.5L', status: 'Accepted', note: 'Confirmed for April 15' },
  { id: 'REQ-004', planner: 'City Celebrations', coupleSummary: 'Meera & Vikram · Mumbai · ₹7L · Hindu', items: 'Fairy Light Canopy', quote: '₹70K', status: 'Revised', note: 'Revised to ₹85K due to venue size' },
  { id: 'REQ-005', planner: 'Royal Planners', coupleSummary: 'Fatima & Ali · Hyderabad · ₹15L · Muslim', items: 'Mughal Backdrop, Sangeet Package', quote: '₹4L', status: 'Pending', note: '' },
];

export default function VendorRequests() {
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState(mockRequests);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState('Accept');
  const [revisedQuote, setRevisedQuote] = useState('');
  const [responseNote, setResponseNote] = useState('');

  const filtered = requests.filter(r => !search || r.planner.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()) || r.coupleSummary.toLowerCase().includes(search.toLowerCase()));

  const handleRespond = () => {
    if (!selected) return;
    const newStatus = action === 'Accept' ? 'Accepted' : action === 'Reject' ? 'Rejected' : 'Revised';
    const note = action === 'Revise' ? `Revised to ${revisedQuote}. ${responseNote}` : responseNote;
    setRequests(prev => prev.map(r => r.id === selected.id ? { ...r, status: newStatus, note, quote: action === 'Revise' ? revisedQuote : r.quote } : r));
    setSelected(null);
    setRevisedQuote('');
    setResponseNote('');
  };

  return (
    <div className="space-y-5 animate-fadeInUp">
      <h1 className="font-heading text-2xl text-white">Planner Requests</h1>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests..." className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm" />
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider">Request ID</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider">Planner</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider hidden md:table-cell">Couple Summary</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider hidden lg:table-cell">Items</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider">Quote</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider">Status</th>
                <th className="text-right text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02] transition">
                  <td className="p-4 text-xs text-white/30 font-mono">{r.id}</td>
                  <td className="p-4 text-sm font-medium text-white">{r.planner}</td>
                  <td className="p-4 text-xs text-white/30 max-w-[200px] truncate hidden md:table-cell">{r.coupleSummary}</td>
                  <td className="p-4 text-xs text-white/30 hidden lg:table-cell">{r.items}</td>
                  <td className="p-4 text-sm font-semibold text-white">{r.quote}</td>
                  <td className="p-4"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[r.status]}`}>{r.status}</span></td>
                  <td className="p-4 text-right">
                    {r.status === 'Pending' ? (
                      <button onClick={() => setSelected(r)} className="loverai-btn-outline text-[11px] py-1.5 px-3 rounded-lg">Respond</button>
                    ) : (
                      <span className="text-[10px] text-white/20">Responded</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Respond Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="glass-card-strong rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-heading text-lg text-white">Respond to {selected.planner}</h2>
              <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="glass-card-subtle rounded-xl p-3 space-y-1 text-sm">
                <p><span className="text-white/30">Request:</span> <span className="text-white/60">{selected.id}</span></p>
                <p><span className="text-white/30">Couple:</span> <span className="text-white/60">{selected.coupleSummary}</span></p>
                <p><span className="text-white/30">Items:</span> <span className="text-white/60">{selected.items}</span></p>
                <p><span className="text-white/30">Quoted:</span> <span className="text-loverai-gold font-medium">{selected.quote}</span></p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/30">Action</label>
                <select value={action} onChange={e => setAction(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm">
                  <option value="Accept">Accept Quote</option>
                  <option value="Revise">Revise Price/Availability</option>
                  <option value="Reject">Reject Request</option>
                </select>
              </div>
              {action === 'Revise' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-white/30">Revised Quote</label>
                  <input value={revisedQuote} onChange={e => setRevisedQuote(e.target.value)} placeholder="₹X.XL" className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs text-white/30">Note to Planner</label>
                <textarea value={responseNote} onChange={e => setResponseNote(e.target.value)} placeholder="Add availability details, notes..." className="w-full glass-input rounded-xl px-4 py-2.5 text-sm resize-none min-h-[80px]" />
              </div>
              <button onClick={handleRespond} className="w-full loverai-btn-primary text-sm py-3 rounded-xl flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                Send Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
