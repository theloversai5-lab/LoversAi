import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { vendorAPI } from '../../api/api';

const mockPortfolio = [
  { id: 1, title: 'Royal Palace Wedding — Udaipur', photo: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&h=400&fit=crop', views: 145, category: 'Decor' },
  { id: 2, title: 'Beach Sunset Ceremony — Goa', photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop', views: 98, category: 'Setup' },
  { id: 3, title: 'Mughal Garden Reception', photo: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&h=400&fit=crop', views: 210, category: 'Decor' },
  { id: 4, title: 'Sangeet Night Stage', photo: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop', views: 76, category: 'Entertainment' },
  { id: 5, title: 'Floral Mandap Close-up', photo: 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=600&h=400&fit=crop', views: 189, category: 'Floral' },
  { id: 6, title: 'Fairy Light Reception Hall', photo: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&h=400&fit=crop', views: 122, category: 'Lighting' },
];

export default function VendorPortfolio() {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorAPI.getPortfolio().then(res => {
      if (res.success && res.portfolio?.length > 0) {
        setPortfolio(res.portfolio.map((p, i) => ({
          id: p._id || i, title: p.title || 'Untitled', photo: p.image || mockPortfolio[i % mockPortfolio.length].photo,
          views: p.views || 0, category: p.category || 'General',
        })));
      } else { setPortfolio(mockPortfolio); }
    }).catch(() => setPortfolio(mockPortfolio)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-white">Portfolio</h1>
        <button className="loverai-btn-primary text-sm py-2 px-4 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Work
        </button>
      </div>

      {loading ? (
        <div className="text-center text-white/30 py-12">Loading portfolio...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolio.map(p => (
            <div key={p.id} className="glass-card rounded-xl overflow-hidden hover-lift hover-glow group cursor-pointer">
              <div className="relative h-48 overflow-hidden">
                <img src={p.photo} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="font-medium text-sm text-white">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0 rounded glass-card-subtle text-white/40">{p.category}</span>
                    <span className="text-[10px] text-white/30 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      {p.views}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
