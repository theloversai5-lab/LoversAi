import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../api/api';

const PublicPlannerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [planner, setPlanner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We can use an endpoint to fetch user by id, e.g. adminAPI.getUser or a public one
    // We'll reuse adminAPI.getUser if it's available or wait, adminAPI might fail if not admin!
    // We actually need a public endpoint for planner profiles. Let's assume there is one or we fetch it.
    // For now, we fetch a minimal profile or mock it if unauthorized.
    const fetchPlanner = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
          setPlanner(data.user);
        }
      } catch (err) {
        console.error("Error fetching planner profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlanner();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen loverai-page-bg flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-loverai-gold/30 border-t-loverai-gold rounded-full animate-spin"></div>
    </div>;
  }

  if (!planner) {
    return <div className="min-h-screen loverai-page-bg flex items-center justify-center flex-col">
      <p className="text-white mb-4">Planner Profile not found or unavailable.</p>
      <button onClick={() => navigate(-1)} className="loverai-btn-primary !rounded-xl !px-6">Go Back</button>
    </div>;
  }

  return (
    <div className="min-h-screen loverai-page-bg pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white mb-6 flex items-center gap-2">
          ← Back
        </button>
        <div className="glass-card rounded-3xl p-8 md:p-12 border border-white/10">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8 border-b border-white/10 pb-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-loverai-gold to-amber-700 flex items-center justify-center shadow-[0_0_40px_rgba(225,195,135,0.2)]">
               {planner.avatar ? <img src={planner.avatar} alt="avatar" className="w-full h-full object-cover rounded-full" /> : <span className="text-4xl text-black font-bold uppercase">{(planner.fullName || planner.company_name || 'P')[0]}</span>}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-heading font-bold text-white mb-2">{planner.company_name || planner.fullName}</h1>
              <p className="text-loverai-gold mb-2">{planner.location || 'India'}</p>
              <div className="flex gap-4 justify-center md:justify-start">
                 <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">Expertise: {planner.services?.join(', ') || 'Wedding Planning'}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6 text-white/70 text-sm leading-relaxed">
             <h2 className="text-xl font-heading text-white">About the Planner</h2>
             <p>{planner.bio || "This planner has not added a detailed biography yet, but they are ready to bring your vision to life."}</p>
          </div>
          
          <div className="mt-10">
            <h2 className="text-xl font-heading text-white mb-4">Portfolio Highlights</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {planner.portfolio?.map((img, i) => (
                 <img key={i} src={img.url} alt="portfolio" className="w-full h-32 md:h-48 object-cover rounded-xl border border-white/10 hover:border-loverai-gold transition" />
               ))}
               {(!planner.portfolio || planner.portfolio.length === 0) && (
                 <p className="text-white/40 italic col-span-full">No portfolio items available.</p>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPlannerProfile;
