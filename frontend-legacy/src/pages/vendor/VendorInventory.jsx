import React, { useState } from 'react';

const mockInventory = [
  { id: 1, name: 'Royal Mandap Setup', description: 'Traditional wooden mandap with floral canopy, marigold drapes, and LED fairy lights', price: '₹1.2L – ₹2.5L', photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop', traditions: ['Hindu', 'Sikh'], availability: 'Mar – Jun 2026', status: 'Available' },
  { id: 2, name: 'Beach Bohemian Arch', description: 'Driftwood arch with white orchids, flowing fabric, and seashell accents', price: '₹80K – ₹1.5L', photo: 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=400&h=300&fit=crop', traditions: ['Christian', 'Hindu'], availability: 'Year-round', status: 'Available' },
  { id: 3, name: 'Mughal-Inspired Backdrop', description: 'Intricate jali-pattern panels with cascading jasmine and warm lighting', price: '₹1.8L – ₹3L', photo: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&h=300&fit=crop', traditions: ['Muslim', 'Hindu'], availability: 'Apr – Dec 2026', status: 'Booked' },
  { id: 4, name: 'Fairy Light Canopy', description: 'Overhead warm-white LED canopy covering 2000 sq ft, dimmable', price: '₹45K – ₹90K', photo: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&h=300&fit=crop', traditions: ['All'], availability: 'Year-round', status: 'Available' },
  { id: 5, name: 'Floral Stage Design', description: '360° stage with roses, carnations, and baby\'s breath — customizable colors', price: '₹2L – ₹4L', photo: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=300&fit=crop', traditions: ['Hindu', 'Christian', 'Sikh'], availability: 'May – Nov 2026', status: 'Available' },
  { id: 6, name: 'Sangeet DJ + Lights Package', description: 'Full DJ setup with LED dance floor, moving heads, and fog machines', price: '₹60K – ₹1.2L', photo: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop', traditions: ['All'], availability: 'Year-round', status: 'Draft' },
];

const statusBadge = { Available: 'badge-open', Booked: 'bg-blue-500/15 text-blue-400 border border-blue-500/25', Draft: 'badge-closed' };
const traditionOptions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'All'];

export default function VendorInventory() {
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [items, setItems] = useState(mockInventory);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', traditions: [], availability: '', photo: '' });

  const filtered = items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()));

  const handleUpload = () => {
    if (!newItem.name.trim()) return;
    const item = {
      id: Date.now(), name: newItem.name, description: newItem.description,
      price: newItem.price || 'Price TBD', photo: newItem.photo || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop',
      traditions: newItem.traditions.length ? newItem.traditions : ['All'],
      availability: newItem.availability || 'TBD', status: 'Draft',
    };
    setItems([item, ...items]);
    setNewItem({ name: '', description: '', price: '', traditions: [], availability: '', photo: '' });
    setShowUpload(false);
  };

  return (
    <div className="space-y-5 animate-fadeInUp">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-white">Inventory</h1>
        <button onClick={() => setShowUpload(true)} className="loverai-btn-primary text-sm py-2 px-4 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Upload New Item
        </button>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory..." className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="glass-card rounded-xl overflow-hidden hover-lift hover-glow group">
            <div className="relative h-44 overflow-hidden">
              <img src={item.photo} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <span className={`absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge[item.status]}`}>{item.status}</span>
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-medium text-sm text-white">{item.name}</h3>
              <p className="text-[11px] text-white/30 line-clamp-2">{item.description}</p>
              <div className="flex items-center gap-1 text-loverai-gold font-semibold text-sm">₹ {item.price}</div>
              <div className="flex flex-wrap gap-1">
                {item.traditions.map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0 rounded glass-card-subtle text-white/25">{t}</span>
                ))}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-white/20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {item.availability}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="glass-card-strong rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-heading text-lg text-white">Upload New Item</h2>
              <button onClick={() => setShowUpload(false)} className="text-white/30 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-white/30">Item Name</label>
                <input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Crystal Chandelier Setup" className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/30">Description</label>
                <textarea value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} placeholder="Describe the item..." className="w-full glass-input rounded-xl px-4 py-2.5 text-sm resize-none min-h-[80px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/30">Price Range</label>
                  <input value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} placeholder="₹50K – ₹1L" className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-white/30">Availability</label>
                  <input value={newItem.availability} onChange={e => setNewItem({ ...newItem, availability: e.target.value })} placeholder="Mar – Jun 2026" className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/30">Traditions Compatible</label>
                <div className="flex flex-wrap gap-2">
                  {traditionOptions.map(t => (
                    <button key={t} onClick={() => setNewItem({ ...newItem, traditions: newItem.traditions.includes(t) ? newItem.traditions.filter(x => x !== t) : [...newItem.traditions, t] })}
                      className={`text-xs px-3 py-1.5 rounded-lg transition ${newItem.traditions.includes(t) ? 'bg-loverai-gold/20 text-loverai-gold border border-loverai-gold/30' : 'glass-card-subtle text-white/30 hover:text-white/50'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/30">Photo URL</label>
                <input value={newItem.photo} onChange={e => setNewItem({ ...newItem, photo: e.target.value })} placeholder="https://... (or leave blank for default)" className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <button onClick={handleUpload} className="w-full loverai-btn-primary text-sm py-3 rounded-xl flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                Add to Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
