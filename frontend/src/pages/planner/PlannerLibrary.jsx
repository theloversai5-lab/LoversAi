import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { paymentAPI } from '../../api/api';

const defaultTemplates = {
  Mehndi: [
    {
      id: 'ppt-m1',
      title: 'Mehndi Luxury Pitch Deck',
      description: 'Elegant custom mehndi stage setups, warm floral backdrops, and traditional henna lounge slide templates.',
      price: 20000,
      purchased: false,
      slides: [
        '/images/Library/Mehndi-1.png',
        '/images/Library/Mehndi-2.png',
        '/images/Library/Mehndi-3.png',
        '/images/Library/Mehndi-4.png',
      ],
      fileName: 'mehndi_luxury_pitch_deck.pptx',
      downloadUrl: '/MEHENDI .pptx',
      slideCount: 32
    }
  ],
  Sangeet: [
    {
      id: 'ppt-s1',
      title: 'Sangeet Starlit Pitch Deck',
      description: 'Concert-style stages, neon lighting arrangements, and high-energy starlit dance floor slide templates.',
      price: 20000,
      purchased: false,
      slides: [
        '/images/Library/Sangeet-1.png',
        '/images/Library/Sangeet-2.png',
        '/images/Library/Sangeet-3.png',
        '/images/Library/Sangeet-4.png',
      ],
      fileName: 'sangeet_starlit_pitch_deck.pptx',
      downloadUrl: '/NEON SANGEET.pptx',
      slideCount: 25
    }
  ],
  Haldi: [
    {
      id: 'ppt-h1',
      title: 'Haldi Sunshine Pitch Deck',
      description: 'Bright marigold canopies, classic seating setups, and organic yellow color palette presentation themes.',
      price: 20000,
      purchased: false,
      slides: [
        '/images/Library/Haldi-1.png',
        '/images/Library/Haldi-2.png',
        '/images/Library/Haldi-3.png',
        '/images/Library/Haldi-4.png',
      ],
      fileName: 'haldi_sunshine_pitch_deck.pptx',
      downloadUrl: '/haldi.pptx',
      slideCount: 26
    }
  ],
  Shaadi: [
    {
      id: 'ppt-sh1',
      title: 'Shaadi Royal Mandap Pitch Deck',
      description: 'Imperial mandap configurations, entrance layouts, and traditional red-and-gold luxury slide motifs.',
      price: 20000,
      purchased: false,
      slides: [
        '/images/Library/Wedding-1.png',
        '/images/Library/Wedding-2.png',
        '/images/Library/Wedding-3.png',
        '/images/Library/Wedding-4.png',
      ],
      fileName: 'shaadi_royal_pitch_deck.pptx',
      downloadUrl: '/wedding.pptx',
      slideCount: 39
    }
  ],
};

export default function PlannerLibrary() {
  const { currentUser } = useAuth();

  const isAdminEmail = (email) => {
    const adminEmails = (process.env.REACT_APP_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return !!(email && adminEmails.includes(email.toLowerCase()));
  };

  const [activeFolder, setActiveFolder] = useState('Mehndi');
  const [templates, setTemplates] = useState(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [downloadingId, setDownloadingId] = useState(null);
  
  // Checkout & Upload Dialog states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // New PPT Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Mehndi');
  const [newPrice, setNewPrice] = useState(20000);
  const [newPPTFile, setNewPPTFile] = useState(null);
  const [newSlideFiles, setNewSlideFiles] = useState([null, null, null, null]);

  // Handle slide click in template card
  const handleOpenPreview = (template) => {
    setSelectedTemplate(template);
    setPreviewSlideIndex(0);
  };

  // Load purchased templates from backend on mount
  useEffect(() => {
    if (!currentUser) return;
    const fetchPurchasedTemplates = async () => {
      try {
        const response = await paymentAPI.getPaymentStatus();
        if (response.success && response.purchasedTemplates) {
          const purchasedIds = response.purchasedTemplates;
          setTemplates(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(cat => {
              updated[cat] = updated[cat].map(t => 
                purchasedIds.includes(t.id) ? { ...t, purchased: true } : t
              );
            });
            return updated;
          });
        }
      } catch (err) {
        console.error("Failed to load purchased templates", err);
      }
    };
    fetchPurchasedTemplates();
  }, [currentUser]);

  // Load Razorpay SDK Script
  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  // Handle actual Razorpay payment for template
  const handlePurchaseTemplate = async (template) => {
    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        return;
      }

      setPurchasing(true);
      toast.loading("Initializing payment...", { id: "payment" });
      const orderData = await paymentAPI.createLibraryOrder({
        templateId: template.id,
        price: Math.round(template.price * 1.18),
      });

      if (!orderData || !orderData.orderId) {
        toast.error("Server error: Could not create order", { id: "payment" });
        setPurchasing(false);
        return;
      }

      toast.dismiss("payment");

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "LoversAI Platform",
        description: `Unlock ${template.title}`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            toast.loading("Verifying payment...", { id: "verify" });
            const verifyRes = await paymentAPI.verifyLibraryPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              templateId: template.id,
            });

            if (verifyRes.success) {
              toast.success("Payment successful! PPT Deck unlocked.", {
                id: "verify",
              });
              
              // Update template purchased state in our lists
              setTemplates(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(cat => {
                  updated[cat] = updated[cat].map(t => 
                    t.id === template.id ? { ...t, purchased: true } : t
                  );
                });
                return updated;
              });

              // Update selectedTemplate state if open
              setSelectedTemplate(prev => {
                if (prev && prev.id === template.id) {
                  return { ...prev, purchased: true };
                }
                return prev;
              });
            } else {
              toast.error("Payment verification failed", { id: "verify" });
            }
          } catch (verifyErr) {
            console.error("Verification error", verifyErr);
            toast.error("Server connection lost during verification", {
              id: "verify",
            });
          } finally {
            setPurchasing(false);
          }
        },
        prefill: {
          name: currentUser?.fullName || "Valued User",
          email: currentUser?.email || "user@loversai.com",
        },
        theme: {
          color: "#b89f79",
        },
        modal: {
          ondismiss: function() {
            setPurchasing(false);
          }
        }
      };

      const razorpayWindow = new window.Razorpay(options);
      razorpayWindow.on("payment.failed", function (res) {
        console.error(res.error);
        toast.error(res.error.description || "Payment failed");
        setPurchasing(false);
      });

      razorpayWindow.open();
    } catch (error) {
      console.error("Error during purchase:", error);
      toast.error(
        `Failed to initiate purchase: ${error.response?.data?.error || error.message}`,
        { id: "payment" }
      );
      setPurchasing(false);
    }
  };

  // Mock PPT Download
  const handleDownload = async (template) => {
    try {
      setDownloadingId(template.id);
      if (template.downloadUrl) {
        const response = await fetch(template.downloadUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = template.fileName || `${template.title.toLowerCase().replace(/\s+/g, '_')}_template.pptx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const content = `Mock PPTX Presentation: ${template.title}\nPrice: ₹${template.price}\nLoversAI Design Pitch Deck`;
        const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = template.fileName || `${template.title.toLowerCase().replace(/\s+/g, '_')}_template.pptx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      toast.success(`${template.title} downloaded successfully!`);
    } catch (err) {
      console.error(err);
      toast.error('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  // Slide File Handler for Upload
  const handleSlideChange = (file, idx) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setNewSlideFiles(prev => {
      const copy = [...prev];
      copy[idx] = url;
      return copy;
    });
  };

  // PPT Template Submission
  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!newTitle || !newDescription || newSlideFiles.some(f => !f)) {
      toast.error('Please fill in all details and upload exactly 4 slide previews.');
      return;
    }

    const newTemplate = {
      id: `ppt-custom-${Date.now()}`,
      title: newTitle,
      description: newDescription,
      price: Number(newPrice) || 20000,
      purchased: false,
      slides: newSlideFiles,
      fileName: newPPTFile ? newPPTFile.name : `${newTitle.toLowerCase().replace(/\s+/g, '_')}_template.pptx`
    };

    setTemplates(prev => ({
      ...prev,
      [newCategory]: [...(prev[newCategory] || []), newTemplate]
    }));

    // Reset Form
    setNewTitle('');
    setNewDescription('');
    setNewCategory('Mehndi');
    setNewPrice(20000);
    setNewPPTFile(null);
    setNewSlideFiles([null, null, null, null]);
    setShowUploadModal(false);

    toast.success('PPT template uploaded successfully!');
  };

  const activeAssets = templates[activeFolder] || [];

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-white tracking-wide" style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}>
            Design Library
          </h1>
          <p className="text-xs text-white/30 mt-1">Acquire premium PPT pitch decks to wow your wedding planning clients</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isAdminEmail(currentUser?.email) && (
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="rounded-full px-5 py-2 text-xs font-semibold bg-white/5 border border-white/10 hover:border-loverai-gold hover:text-loverai-gold transition active:scale-95 text-white flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload PPT
            </button>
          )}
          <div className="text-xs font-medium text-loverai-gold bg-loverai-gold/10 border border-loverai-gold/20 px-3.5 py-1.5 rounded-full">
            Company Store
          </div>
        </div>
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.keys(templates).map((folderName) => {
          const isActive = activeFolder === folderName;
          const count = templates[folderName].length;

          return (
            <button
              key={folderName}
              onClick={() => {
                setActiveFolder(folderName);
                setSelectedTemplate(null);
              }}
              className={`relative text-left rounded-2xl p-5 border transition-all duration-300 group hover-lift ${
                isActive
                  ? 'glass-card border-loverai-gold text-loverai-gold shadow-lg shadow-loverai-gold/5 scale-[1.02]'
                  : 'glass-card border-white/5 text-white/70 hover:border-white/20 hover:text-white'
              }`}
            >
              {/* Folder tab design accent */}
              <div className={`absolute top-0 left-6 -translate-y-[6px] h-[6px] w-12 rounded-t-md transition-colors duration-300 ${
                isActive ? 'bg-loverai-gold' : 'bg-white/10 group-hover:bg-white/30'
              }`} />
              
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                  isActive ? 'bg-loverai-gold/10 text-loverai-gold' : 'bg-white/5 text-white/40 group-hover:bg-white/10'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17a5 5 0 01-.9-9.9 5 5 0 019.2 0 5 5 0 019.2 0 5 5 0 01-.2 9.9M7 19h10a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-medium tracking-wide">
                    {folderName}
                  </h3>
                  <p className="text-[10px] text-white/30 group-hover:text-white/40 mt-0.5">
                    {count} {count === 1 ? 'Deck' : 'Decks'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Gallery Section */}
      <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-loverai-gold" />
            <h2 className="text-lg font-medium text-white font-heading">
              {activeFolder} PPT Templates
            </h2>
          </div>
          <span className="text-[10px] text-white/30 bg-white/5 px-2.5 py-1 rounded-md">
            ₹20,000 / Deck
          </span>
        </div>

        {activeAssets.length === 0 ? (
          <div className="text-center py-16 text-white/30 rounded-2xl bg-black/10 border border-white/5 p-8">
            <svg className="w-12 h-12 mx-auto mb-3 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-heading text-lg text-white/50 mb-1" style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}>No Templates Uploaded</p>
            <p className="text-xs text-white/20">Decks will be added to the {activeFolder} catalog soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeAssets.map((asset) => (
              <div
                key={asset.id}
                className="group glass-card-subtle border border-white/5 rounded-2xl overflow-hidden hover-glow transition-all duration-300 flex flex-col sm:flex-row h-full"
              >
                {/* PPT Slide Preview Aspect Box */}
                <div 
                  className="relative w-full sm:w-[220px] aspect-[4/3] sm:aspect-auto sm:h-full bg-black/40 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden border-b sm:border-b-0 sm:border-r border-white/5"
                  onClick={() => handleOpenPreview(asset)}
                >
                  <img
                    src={asset.slides[0]}
                    alt={asset.title}
                    className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-500"
                  />
                  
                  {/* Click to Preview Indicator */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-white/90 bg-black/60 border border-white/10 rounded-full px-2.5 py-1 backdrop-blur-sm tracking-wider flex items-center gap-1 shadow-lg">
                      Preview Deck
                    </span>
                  </div>
                </div>

                {/* Card Content details */}
                <div className="p-5 flex flex-col justify-between flex-1 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-loverai-gold/70 bg-loverai-gold/5 px-2 py-0.5 rounded-full border border-loverai-gold/10 font-semibold tracking-wider uppercase">
                        PPT Deck
                      </span>
                      <span className="text-[11px] text-white/35">
                        {asset.slideCount ? `${asset.slideCount} Slides (4 Previewed)` : '4 Slides Preview'}
                      </span>
                    </div>
                    <h3 className="text-white font-medium text-base line-clamp-1 group-hover:text-loverai-gold transition-colors font-heading" style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}>
                      {asset.title}
                    </h3>
                    <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                      {asset.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest leading-none">Price</p>
                      <p className="text-sm font-semibold text-loverai-gold mt-1 leading-none">
                        {asset.purchased ? 'Unlocked' : `\u20B9${asset.price.toLocaleString('en-IN')}`}
                      </p>
                    </div>

                    {asset.purchased ? (
                      <button
                        type="button"
                        disabled={downloadingId === asset.id}
                        onClick={() => handleDownload(asset)}
                        className={`flex items-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-xl bg-loverai-gold text-[#201913] hover:brightness-105 transition-all active:scale-95 ${
                          downloadingId === asset.id ? 'opacity-50 cursor-wait' : ''
                        }`}
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(asset)}
                        className="flex items-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-xl border border-white/10 text-white bg-white/5 hover:border-loverai-gold hover:text-loverai-gold hover:bg-loverai-gold/5 transition-all active:scale-95"
                      >
                        Preview & Buy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Slide Preview Modal */}
      {selectedTemplate && createPortal(
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4 select-none animate-fadeIn"
          onClick={() => setSelectedTemplate(null)}
        >
          {/* Top Bar */}
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between mb-4 px-4 z-50">
            <div className="text-white/80 font-heading text-lg">
              {selectedTemplate.title} <span className="text-white/30 text-xs font-light">(Slide {previewSlideIndex + 1}/4)</span>
            </div>
            
            <button 
              type="button"
              onClick={() => setSelectedTemplate(null)}
              className="w-10 h-10 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 flex items-center justify-center text-white transition shadow-lg"
              aria-label="Close template view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Core Content: Left Carousel + Right Purchase Details */}
          <div 
            className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 bg-[#16100D]/80 border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md"
            onClick={e => e.stopPropagation()}
          >
            {/* Slide Preview Grid/Carousel */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-[4/3] bg-black/40 border border-white/5 rounded-2xl overflow-hidden flex items-center justify-center">
                {/* Prev Arrow */}
                <button
                  type="button"
                  onClick={() => setPreviewSlideIndex(p => (p - 1 + 4) % 4)}
                  className="absolute left-3 z-20 w-10 h-10 rounded-full border border-white/10 bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Selected Slide */}
                <img
                  src={selectedTemplate.slides[previewSlideIndex]}
                  alt={`Slide ${previewSlideIndex + 1}`}
                  className="w-full h-full object-contain select-none transition duration-300"
                />

                {/* Next Arrow */}
                <button
                  type="button"
                  onClick={() => setPreviewSlideIndex(p => (p + 1) % 4)}
                  className="absolute right-3 z-20 w-10 h-10 rounded-full border border-white/10 bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Dots / Thumbnails row */}
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewSlideIndex(idx)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      previewSlideIndex === idx ? 'bg-loverai-gold scale-110 w-6' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Template Side Purchase Panel */}
            <div className="flex flex-col justify-between py-2 text-left gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-loverai-gold/70 bg-loverai-gold/5 px-2 py-0.5 rounded-full border border-loverai-gold/10 font-bold uppercase tracking-wider">
                    Exclusive Presentation Pitch
                  </span>
                  <h2 className="text-white text-2xl font-semibold font-heading mt-2" style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}>
                    {selectedTemplate.title}
                  </h2>
                </div>

                <p className="text-sm text-white/60 leading-relaxed font-light">
                  {selectedTemplate.description}
                </p>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-white/80">Features Included:</h4>
                  <ul className="space-y-1.5 text-xs text-white/50">
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-loverai-gold" />
                      4 Fully Designed Slide Preview pages
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-loverai-gold" />
                      {selectedTemplate.slideCount ? `Full Deck contains ${selectedTemplate.slideCount} slides` : 'Fully Editable PowerPoint PPTX file download'}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-loverai-gold" />
                      Licensed for client pitches and presentations
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                {!selectedTemplate.purchased ? (
                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-white/50 font-light">
                      <span>Base Price</span>
                      <span>₹{selectedTemplate.price.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/50 font-light">
                      <span>GST (18%)</span>
                      <span>₹{(selectedTemplate.price * 0.18).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      <span className="text-sm text-white/70 font-semibold">Total Amount</span>
                      <span className="text-xl font-bold text-loverai-gold">
                        ₹{(selectedTemplate.price * 1.18).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                    <span className="text-sm text-white/50 font-light">Status</span>
                    <span className="text-xl font-bold text-loverai-gold">Unlocked</span>
                  </div>
                )}

                {selectedTemplate.purchased ? (
                  <button
                    type="button"
                    disabled={downloadingId === selectedTemplate.id}
                    onClick={() => handleDownload(selectedTemplate)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-loverai-gold text-[#201913] font-bold text-sm hover:brightness-105 active:scale-98 transition duration-200"
                  >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PPTX ({selectedTemplate.slideCount} Slides)
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={purchasing}
                    onClick={() => handlePurchaseTemplate(selectedTemplate)}
                    className={`w-full py-3 rounded-xl bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#201913] font-bold text-sm hover:brightness-115 active:scale-98 transition duration-200 flex items-center justify-center gap-2 ${
                      purchasing ? 'opacity-50 cursor-wait' : ''
                    }`}
                  >
                    {purchasing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay ₹${(selectedTemplate.price * 1.18).toLocaleString('en-IN')} (Incl. 18% GST)`
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Admin PPT Upload Modal */}
      {showUploadModal && isAdminEmail(currentUser?.email) && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowUploadModal(false)}
        >
          <div 
            className="w-full max-w-xl bg-[#1C120C] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl text-left my-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="font-heading text-xl text-white">Upload PPT Template</h3>
                <p className="text-xs text-white/40 mt-1">Publish a new PowerPoint Pitch Deck template</p>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase tracking-wider block font-medium">Category Folder</label>
                  <select
                     value={newCategory}
                     onChange={(e) => setNewCategory(e.target.value)}
                     className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white/90 focus:outline-none focus:border-loverai-gold cursor-pointer"
                  >
                    <option value="Mehndi" className="bg-[#1C120C] text-white">Mehndi</option>
                    <option value="Sangeet" className="bg-[#1C120C] text-white">Sangeet</option>
                    <option value="Haldi" className="bg-[#1C120C] text-white">Haldi</option>
                    <option value="Shaadi" className="bg-[#1C120C] text-white">Shaadi</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase tracking-wider block font-medium">Price (₹)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white/90 focus:outline-none focus:border-loverai-gold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/50 uppercase tracking-wider block font-medium">Template Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Mehndi Luxury Rose Deck"
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white/90 focus:outline-none focus:border-loverai-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/50 uppercase tracking-wider block font-medium">Description</label>
                <textarea
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Provide features and setup summaries included in this presentation deck..."
                  rows="3"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/90 focus:outline-none focus:border-loverai-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/50 uppercase tracking-wider block font-medium">PPT Template File (.pptx)</label>
                <input
                  type="file"
                  required
                  accept=".pptx,.pdf"
                  onChange={(e) => setNewPPTFile(e.target.files[0])}
                  className="w-full text-xs text-white/40 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white file:hover:bg-white/20 cursor-pointer"
                />
              </div>

              {/* Upload 4 Slides Section */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] text-white/50 uppercase tracking-wider block font-medium">Slide Previews (Exactly 4 slides)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div 
                      key={idx}
                      className="relative aspect-video rounded-lg border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden hover:border-white/25 transition cursor-pointer"
                    >
                      {newSlideFiles[idx] ? (
                        <img src={newSlideFiles[idx]} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white/30 text-[10px]">Slide {idx + 1}</span>
                      )}
                      <input
                        type="file"
                        required
                        accept="image/*"
                        onChange={(e) => handleSlideChange(e.target.files[0], idx)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white font-medium text-sm bg-white/5 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-loverai-gold hover:brightness-105 text-black font-semibold text-sm transition active:scale-95"
                >
                  Upload Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
