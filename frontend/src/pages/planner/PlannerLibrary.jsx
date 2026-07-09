import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { paymentAPI } from '../../api/api';

const defaultTemplates = {
  'Haldi, Mehendi & Mayra': [
    {
      id: 'ppt-cl1',
      title: 'Carnival Lunch Pitch Deck 1',
      description: 'Vibrant and colorful outdoor setups, bohemian-style details, and festive food stall presentation slide templates.',
      price: 20000,
      purchased: false,
      slides: [
        '/Carnival Lunch-1/Screenshot 2026-07-07 at 10.37.27 PM.webp',
        '/Carnival Lunch-1/Screenshot 2026-07-07 at 10.37.38 PM.webp',
        '/Carnival Lunch-1/Screenshot 2026-07-07 at 10.37.50 PM.webp',
        '/Carnival Lunch-1/Screenshot 2026-07-07 at 10.38.01 PM.webp',
        '/Carnival Lunch-1/Screenshot 2026-07-07 at 10.38.10 PM.webp',
        '/Carnival Lunch-1/Screenshot 2026-07-07 at 10.38.20 PM.webp'
      ],
      fileName: 'Wedding_Carnival_Lunch_Pitch_Deck_1.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=1ybJjV6N0ChqZPxBfrixqNjmKrtdECRUr',
      slideCount: 6
    },
    {
      id: 'ppt-m1',
      title: 'Mehndi Pitch Deck 1',
      description: 'Elegant custom mehndi stage setups, warm floral backdrops, and traditional henna lounge slide templates.',
      price: 20000,
      purchased: false,
      slides: [
        '/Mehndi-1/Screenshot 2026-07-07 at 10.48.38 PM.webp',
        '/Mehndi-1/Screenshot 2026-07-07 at 10.48.45 PM.webp',
        '/Mehndi-1/Screenshot 2026-07-07 at 10.48.56 PM.webp',
        '/Mehndi-1/Screenshot 2026-07-07 at 10.49.10 PM.webp',
        '/Mehndi-1/Screenshot 2026-07-07 at 10.49.17 PM.webp'
      ],
      fileName: 'Wedding_Mehndi_Pitch_Deck_1.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=1A_Fo2xiqL5S0pJGmRRgbn3h9fj4_VMAA',
      slideCount: 5
    },
    {
      id: 'ppt-m2',
      title: 'Mehndi Pitch Deck 2',
      description: 'Royal vibrant green floral mehendi lounge configurations, swing setup designs, and luxury canopy seating slides.',
      price: 20000,
      purchased: false,
      slides: [
        '/Mehndi-2/Screenshot 2026-07-07 at 10.58.08 PM.webp',
        '/Mehndi-2/Screenshot 2026-07-07 at 10.58.16 PM.webp',
        '/Mehndi-2/Screenshot 2026-07-07 at 10.58.25 PM.webp',
        '/Mehndi-2/Screenshot 2026-07-07 at 10.58.36 PM.webp',
        '/Mehndi-2/Screenshot 2026-07-07 at 10.58.45 PM.webp',
        '/Mehndi-2/Screenshot 2026-07-07 at 10.58.54 PM.webp'
      ],
      fileName: 'Wedding_Mehndi_Pitch_Deck_2.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=19zHc6HLnDWUgrfeGVjZGMO4n7e-SVULP',
      slideCount: 6
    },
    {
      id: 'ppt-m3',
      title: 'Mehndi Pitch Deck 3',
      description: 'Boho-style marigold and mirror hanging mehndi backdrops, custom bride-groom seating configurations, and luxury presentation layout designs.',
      price: 20000,
      purchased: false,
      slides: [
        '/Mehndi-3/Screenshot 2026-07-07 at 11.04.25 PM.webp',
        '/Mehndi-3/Screenshot 2026-07-07 at 11.04.35 PM.webp',
        '/Mehndi-3/Screenshot 2026-07-07 at 11.04.44 PM.webp',
        '/Mehndi-3/Screenshot 2026-07-07 at 11.04.56 PM.webp',
        '/Mehndi-3/Screenshot 2026-07-07 at 11.05.05 PM.webp',
        '/Mehndi-3/Screenshot 2026-07-07 at 11.05.14 PM.webp'
      ],
      fileName: 'Wedding_Mehndi_Pitch_Deck_3.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=15ng_pQ72_tLiR5vtqYe6q8AaWqvaVwtH',
      slideCount: 6
    },
    {
      id: 'ppt-m4',
      title: 'Mehndi Pitch Deck 4',
      description: 'Premium floral dome configurations, bright yellow-and-green drapery, and luxury seating setups for mehndi ceremonies.',
      price: 20000,
      purchased: false,
      slides: [
        '/Mehndi-4/Screenshot 2026-07-07 at 11.06.46 PM.webp',
        '/Mehndi-4/Screenshot 2026-07-07 at 11.06.58 PM.webp',
        '/Mehndi-4/Screenshot 2026-07-07 at 11.07.07 PM.webp',
        '/Mehndi-4/Screenshot 2026-07-07 at 11.07.15 PM.webp',
        '/Mehndi-4/Screenshot 2026-07-07 at 11.07.31 PM.webp',
        '/Mehndi-4/Screenshot 2026-07-07 at 11.07.39 PM.webp'
      ],
      fileName: 'Wedding_Mehndi_Pitch_Deck_4.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=1irgadKjN7KHQQiV3eLtC9HUaMnFAPAtL',
      slideCount: 6
    },
    {
      id: 'ppt-m5',
      title: 'Mehndi Pitch Deck 5',
      description: 'Modern fusion mehndi setups, pastel floral details, and bright marigold backdrop presentation slide layouts.',
      price: 20000,
      purchased: false,
      slides: [
        '/Mehndi-5/Screenshot 2026-07-07 at 11.12.14 PM.webp',
        '/Mehndi-5/Screenshot 2026-07-07 at 11.12.22 PM.webp',
        '/Mehndi-5/Screenshot 2026-07-07 at 11.12.34 PM.webp',
        '/Mehndi-5/Screenshot 2026-07-07 at 11.12.41 PM.webp',
        '/Mehndi-5/Screenshot 2026-07-07 at 11.12.49 PM.webp',
        '/Mehndi-5/Screenshot 2026-07-07 at 11.12.56 PM.webp'
      ],
      fileName: 'Wedding_Mehndi_Pitch_Deck_5.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=1TbgTa9rWP0p_58Ts2vwCJhL9zvNj2uYP',
      slideCount: 6
    },
    {
      id: 'ppt-my1',
      title: 'Mayra Pitch Deck 1',
      description: 'Traditional royal Mayra setup configurations, marigold hangings, and premium guest welcoming seating configurations.',
      price: 20000,
      purchased: false,
      slides: [
        '/Myra-2/Screenshot 2026-07-07 at 11.16.15 PM.webp',
        '/Myra-2/Screenshot 2026-07-07 at 11.16.48 PM.webp',
        '/Myra-2/Screenshot 2026-07-07 at 11.16.55 PM.webp',
        '/Myra-2/Screenshot 2026-07-07 at 11.17.03 PM.webp',
        '/Myra-2/Screenshot 2026-07-07 at 11.17.11 PM.webp',
        '/Myra-2/Screenshot 2026-07-07 at 11.17.18 PM.webp'
      ],
      fileName: 'Wedding_Mayra_Pitch_Deck_1.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=1gmvCap7DJ6nStFPLVFL3P5-KGPbxe2Kb',
      slideCount: 6
    },
    {
      id: 'ppt-h1',
      title: 'Haldi Pitch Deck 1',
      description: 'Sunshine yellow themes, marigold backdrop designs, traditional brass vessel seating arrangements, and floral pathway setup presentation slides.',
      price: 20000,
      purchased: false,
      slides: [
        '/Haldi-1/Screenshot 2026-07-07 at 11.39.37 PM.webp',
        '/Haldi-1/Screenshot 2026-07-07 at 11.39.56 PM.webp',
        '/Haldi-1/Screenshot 2026-07-07 at 11.40.04 PM.webp',
        '/Haldi-1/Screenshot 2026-07-07 at 11.40.11 PM.webp',
        '/Haldi-1/Screenshot 2026-07-07 at 11.40.20 PM.webp',
        '/Haldi-1/Screenshot 2026-07-07 at 11.40.27 PM.webp'
      ],
      fileName: 'Wedding_Haldi_Pitch_Deck_1.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=10D4QuEEdFbaXfeBr_pttNTGHbe6VrU85',
      slideCount: 6
    },
    {
      id: 'ppt-h2',
      title: 'Haldi Pitch Deck 2',
      description: 'Premium outdoor poolside Haldi themes, vibrant yellow floral structures, marigold hangings, and modern lounge seating configurations.',
      price: 20000,
      purchased: false,
      slides: [
        '/Haldi-2/Screenshot 2026-07-07 at 11.41.51 PM.webp',
        '/Haldi-2/Screenshot 2026-07-07 at 11.42.00 PM.webp',
        '/Haldi-2/Screenshot 2026-07-07 at 11.42.06 PM.webp',
        '/Haldi-2/Screenshot 2026-07-07 at 11.42.19 PM.webp',
        '/Haldi-2/Screenshot 2026-07-07 at 11.42.26 PM.webp',
        '/Haldi-2/Screenshot 2026-07-07 at 11.42.32 PM.webp'
      ],
      fileName: 'Wedding_Haldi_Pitch_Deck_2.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=15jKwe-dwBOvEEUGe8eVwTUrFdgD14kT-',
      slideCount: 6
    },
    {
      id: 'ppt-h3',
      title: 'Haldi Pitch Deck 3',
      description: 'Royal Marigold backdrops, traditional setup designs, hanging flower garlands, and elegant guest welcoming configurations.',
      price: 20000,
      purchased: false,
      slides: [
        '/Haldi-3/Screenshot 2026-07-07 at 11.45.00 PM.webp',
        '/Haldi-3/Screenshot 2026-07-07 at 11.45.12 PM.webp',
        '/Haldi-3/Screenshot 2026-07-07 at 11.45.21 PM.webp',
        '/Haldi-3/Screenshot 2026-07-07 at 11.45.30 PM.webp',
        '/Haldi-3/Screenshot 2026-07-07 at 11.45.39 PM.webp',
        '/Haldi-3/Screenshot 2026-07-07 at 11.45.50 PM.webp'
      ],
      fileName: 'Wedding_Haldi_Pitch_Deck_3.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=1fd-JLq5lmT16bt0oHMCCEQaPPo7aUJ9u',
      slideCount: 6
    }
  ],
  'Sangeet, Shaadi & Reception': [
    {
      id: 'ppt-sh1',
      title: 'Shaadi Pitch Deck 1',
      description: 'Vibrant and luxurious Shaadi mandap setups, starlit floral pathways, and traditional red-and-gold presentation slides.',
      price: 20000,
      purchased: false,
      slides: [
        '/Shaadi-1/Screenshot 2026-07-07 at 9.55.32 PM.webp',
        '/Shaadi-1/Screenshot 2026-07-07 at 9.55.43 PM.webp',
        '/Shaadi-1/Screenshot 2026-07-07 at 9.55.53 PM.webp',
        '/Shaadi-1/Screenshot 2026-07-07 at 9.56.00 PM.webp',
        '/Shaadi-1/Screenshot 2026-07-07 at 9.56.08 PM.webp',
        '/Shaadi-1/Screenshot 2026-07-07 at 9.56.14 PM.webp'
      ],
      fileName: 'Wedding_Shaadi_Pitch_Deck_1.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=1gm5XzjZlFcZbk8Cw_6n6rpndhmMjs9xw',
      slideCount: 6
    },
    {
      id: 'ppt-sh2',
      title: 'Shaadi Pitch Deck 2',
      description: 'Premium floral mandap configurations, royal aisle decorations, and premium banquet lounge slide designs.',
      price: 20000,
      purchased: false,
      slides: [
        '/Shaadi-2/Screenshot 2026-07-07 at 10.31.26 PM.webp',
        '/Shaadi-2/Screenshot 2026-07-07 at 10.31.59 PM.webp',
        '/Shaadi-2/Screenshot 2026-07-07 at 10.32.10 PM.webp',
        '/Shaadi-2/Screenshot 2026-07-07 at 10.32.18 PM.webp',
        '/Shaadi-2/Screenshot 2026-07-07 at 10.32.27 PM.webp',
        '/Shaadi-2/Screenshot 2026-07-07 at 10.32.37 PM.webp'
      ],
      fileName: 'Wedding_Shaadi_Pitch_Deck_2.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=1C6PAwWDFhx2PCra8G-pefNJDksqgfl9Z',
      slideCount: 6
    },
    {
      id: 'ppt-s1',
      title: 'Sangeet Pitch Deck 1',
      description: 'Starlit musical night themes, neon stage configurations, and modern dance floor setup slides.',
      price: 20000,
      purchased: false,
      slides: [
        '/sangeet-1/Screenshot 2026-07-07 at 11.21.55 PM.webp',
        '/sangeet-1/Screenshot 2026-07-07 at 11.22.03 PM.webp',
        '/sangeet-1/Screenshot 2026-07-07 at 11.22.11 PM.webp',
        '/sangeet-1/Screenshot 2026-07-07 at 11.22.19 PM.webp',
        '/sangeet-1/Screenshot 2026-07-07 at 11.22.28 PM.webp',
        '/sangeet-1/Screenshot 2026-07-07 at 11.22.35 PM.webp'
      ],
      fileName: 'Wedding_Sangeet_Pitch_Deck_1.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=17NV8JNyzU7nRrBb0xQ5-UJLN8OTr_sdp',
      slideCount: 6
    },
    {
      id: 'ppt-s2',
      title: 'Sangeet Pitch Deck 2',
      description: 'Premium concert-style stages, led screen backdrops, disco lighting configurations, and dynamic performance layout presentation templates.',
      price: 20000,
      purchased: false,
      slides: [
        '/Sangeet-2/Screenshot 2026-07-07 at 11.23.56 PM.webp',
        '/Sangeet-2/Screenshot 2026-07-07 at 11.24.05 PM.webp',
        '/Sangeet-2/Screenshot 2026-07-07 at 11.24.29 PM.webp',
        '/Sangeet-2/Screenshot 2026-07-07 at 11.24.40 PM.webp',
        '/Sangeet-2/Screenshot 2026-07-07 at 11.24.50 PM.webp',
        '/Sangeet-2/Screenshot 2026-07-07 at 11.25.05 PM.webp'
      ],
      fileName: 'Wedding_Sangeet_Pitch_Deck_2.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=1k0wb04dUtalOZ4drIKcfQ9ygkZtbb7ng',
      slideCount: 6
    },
    {
      id: 'ppt-s3',
      title: 'Sangeet Pitch Deck 3',
      description: 'Royal palaces background settings, traditional instrument setup graphics, and premium royal seating configurations for sangeet nights.',
      price: 20000,
      purchased: false,
      slides: [
        '/Sangeet-3/Screenshot 2026-07-07 at 11.28.44 PM.webp',
        '/Sangeet-3/Screenshot 2026-07-07 at 11.28.52 PM.webp',
        '/Sangeet-3/Screenshot 2026-07-07 at 11.29.00 PM.webp',
        '/Sangeet-3/Screenshot 2026-07-07 at 11.29.22 PM.webp',
        '/Sangeet-3/Screenshot 2026-07-07 at 11.29.30 PM.webp',
        '/Sangeet-3/Screenshot 2026-07-07 at 11.29.37 PM.webp'
      ],
      fileName: 'Wedding_Sangeet_Pitch_Deck_3.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=1Te9kD89UKpehjtLFEmKNqz3chrHa2xH_',
      slideCount: 6
    },
    {
      id: 'ppt-s4',
      title: 'Sangeet Pitch Deck 4',
      description: 'Modern floral stage designs, hanging crystal elements, elegant seating configurations, and luxury ballroom sangeet presentation slides.',
      price: 20000,
      purchased: false,
      slides: [
        '/sangeet-4/Screenshot 2026-07-07 at 11.34.07 PM.webp',
        '/sangeet-4/Screenshot 2026-07-07 at 11.34.16 PM.webp',
        '/sangeet-4/Screenshot 2026-07-07 at 11.34.24 PM.webp',
        '/sangeet-4/Screenshot 2026-07-07 at 11.34.33 PM.webp',
        '/sangeet-4/Screenshot 2026-07-07 at 11.34.39 PM.webp',
        '/sangeet-4/Screenshot 2026-07-07 at 11.34.50 PM.webp'
      ],
      fileName: 'Wedding_Sangeet_Pitch_Deck_4.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=1AY66PCBnQ_HJrzOBpLZ1eyScH63VX-rj',
      slideCount: 6
    },
    {
      id: 'ppt-r1',
      title: 'Reception Pitch Deck 1',
      description: 'Stunning Reception stage backdrops, grand entrance arch configurations, luxurious floral pillars, and modern reception lighting setup slides.',
      price: 20000,
      purchased: false,
      slides: [
        '/reception-1/Screenshot 2026-07-07 at 11.49.52 PM.webp',
        '/reception-1/Screenshot 2026-07-07 at 11.49.58 PM.webp',
        '/reception-1/Screenshot 2026-07-07 at 11.50.06 PM.webp',
        '/reception-1/Screenshot 2026-07-07 at 11.50.14 PM.webp',
        '/reception-1/Screenshot 2026-07-07 at 11.50.35 PM.webp',
        '/reception-1/Screenshot 2026-07-07 at 11.50.42 PM.webp'
      ],
      fileName: 'Wedding_Reception_Pitch_Deck_1.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=14cVNo_TwwtLALxWTKbSFvYXU297fSK1Q',
      slideCount: 6
    },
    {
      id: 'ppt-r2',
      title: 'Reception Pitch Deck 2',
      description: 'Modern glasshouse reception layout designs, golden lighting accents, starlit ceiling structures, and luxury floral tabletop setups.',
      price: 20000,
      purchased: false,
      slides: [
        '/reception-2/Screenshot 2026-07-07 at 11.52.17 PM.webp',
        '/reception-2/Screenshot 2026-07-07 at 11.52.24 PM.webp',
        '/reception-2/Screenshot 2026-07-07 at 11.52.29 PM.webp',
        '/reception-2/Screenshot 2026-07-07 at 11.52.35 PM.webp',
        '/reception-2/Screenshot 2026-07-07 at 11.52.41 PM.webp',
        '/reception-2/Screenshot 2026-07-07 at 11.52.47 PM.webp'
      ],
      fileName: 'Wedding_Reception_Pitch_Deck_2.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=100rHJxjoml8cMcsN2PsCkPTx3iWPhB0I',
      slideCount: 6
    },
    {
      id: 'ppt-r3',
      title: 'Reception Pitch Deck 3',
      description: 'Royal red and gold stage settings, elegant floral frame backdrops, premium seating designs, and velvet drapes layout templates.',
      price: 20000,
      purchased: false,
      slides: [
        '/reception-3/Screenshot 2026-07-07 at 11.55.22 PM.webp',
        '/reception-3/Screenshot 2026-07-07 at 11.55.29 PM.webp',
        '/reception-3/Screenshot 2026-07-07 at 11.55.41 PM.webp',
        '/reception-3/Screenshot 2026-07-07 at 11.55.48 PM.webp',
        '/reception-3/Screenshot 2026-07-07 at 11.55.55 PM.webp',
        '/reception-3/Screenshot 2026-07-07 at 11.56.02 PM.webp'
      ],
      fileName: 'Wedding_Reception_Pitch_Deck_3.pptx',
      downloadUrl: 'https://docs.google.com/uc?export=download&id=1BNftLDLPFOCGZ5K6I3i60J-d7hbmwbAi',
      slideCount: 6
    }
  ]
};

export default function PlannerLibrary({ onClose }) {
  const { currentUser } = useAuth();

  const isAdminEmail = (email) => {
    const adminEmails = (process.env.REACT_APP_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return !!(email && adminEmails.includes(email.toLowerCase()));
  };

  const [activeFolder, setActiveFolder] = useState('Haldi, Mehendi & Mayra');
  const [templates, setTemplates] = useState(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [downloadingId, setDownloadingId] = useState(null);
  const [viewPurchasedOnly, setViewPurchasedOnly] = useState(false);

  // Cart states
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  
  // Checkout & Upload Dialog states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const isInCart = (id) => cart.some(item => item.id === id);

  const handleToggleCart = (template) => {
    if (template.purchased) {
      toast.error("You have already purchased this template!");
      return;
    }
    const exists = cart.some(item => item.id === template.id);
    if (exists) {
      toast.success(`Removed "${template.title}" from cart.`);
      setCart(prev => prev.filter(item => item.id !== template.id));
    } else {
      toast.success(`Added "${template.title}" to cart.`);
      setCart(prev => [...prev, template]);
    }
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const cartGst = Math.round(cartSubtotal * 0.18);
  const cartTotal = cartSubtotal + cartGst;

  // New PPT Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Haldi, Mehendi & Mayra');
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

  const handlePurchaseCart = async () => {
    if (cart.length === 0) return;
    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        return;
      }

      setPurchasing(true);
      toast.loading("Initializing payment...", { id: "payment" });
      
      const templateIds = cart.map(item => item.id).join(',');
      const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);
      const totalWithGst = Math.round(totalPrice * 1.18);

      const orderData = await paymentAPI.createLibraryOrder({
        templateId: templateIds,
        price: totalWithGst,
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
        description: `Unlock ${cart.length} Templates`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            toast.loading("Verifying payment...", { id: "verify" });
            const verifyRes = await paymentAPI.verifyLibraryPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              templateId: templateIds,
            });

            if (verifyRes.success) {
              toast.success("Payment successful! PPT Decks unlocked.", {
                id: "verify",
              });
              
              const purchasedIds = templateIds.split(',');
              // Update template purchased state in our lists
              setTemplates(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(cat => {
                  updated[cat] = updated[cat].map(t => 
                    purchasedIds.includes(t.id) ? { ...t, purchased: true } : t
                  );
                });
                return updated;
              });

              // Clear cart and close modal
              setCart([]);
              setShowCartModal(false);
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
    if (!template.purchased) {
      toast.error("Please purchase the template to unlock downloading!");
      return;
    }
    try {
      setDownloadingId(template.id);
      if (template.downloadUrl && (template.downloadUrl.startsWith('http://') || template.downloadUrl.startsWith('https://'))) {
        window.open(template.downloadUrl, '_blank');
        toast.success(`${template.title} download started!`);
      } else if (template.downloadUrl) {
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
        toast.success(`${template.title} downloaded successfully!`);
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
        toast.success(`${template.title} downloaded successfully!`);
      }
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
    setNewCategory('Haldi, Mehendi & Mayra');
    setNewPrice(20000);
    setNewPPTFile(null);
    setNewSlideFiles([null, null, null, null]);
    setShowUploadModal(false);

    toast.success('PPT template uploaded successfully!');
  };

  const activeAssets = viewPurchasedOnly 
    ? Object.values(templates).flat().filter(t => t.purchased)
    : (templates[activeFolder] || []);
  const isSingle = true;

  return (
    <div className="space-y-4 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="mr-2 p-2 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:text-loverai-gold transition"
              aria-label="Back to AI Tools"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="font-heading text-3xl text-white tracking-wide" style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}>
              Design Library
            </h1>
            <p className="text-xs text-white/30 mt-1">Acquire premium PPT pitch decks to wow your wedding planning clients</p>
          </div>
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
          {/* Cart Button */}
          <button
            type="button"
            onClick={() => setShowCartModal(true)}
            className="relative rounded-full px-5 py-2 text-xs font-semibold bg-white/5 border border-white/10 hover:border-loverai-gold hover:text-loverai-gold transition active:scale-95 text-white flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Cart
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-loverai-gold text-loverai-deep text-[10px] font-bold shadow-lg animate-scaleIn">
                {cart.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setViewPurchasedOnly(prev => !prev);
              setSelectedTemplate(null);
            }}
            className={`rounded-full px-5 py-2 text-xs font-semibold border transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              viewPurchasedOnly
                ? 'bg-loverai-gold text-loverai-deep border-loverai-gold shadow-lg shadow-loverai-gold/10 font-bold'
                : 'bg-white/5 border-white/10 text-white hover:border-loverai-gold hover:text-loverai-gold'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            Company Store
          </button>
        </div>
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.keys(templates).map((folderName) => {
          const isActive = !viewPurchasedOnly && activeFolder === folderName;
          const count = templates[folderName].length;

          return (
            <button
              key={folderName}
              onClick={() => {
                setActiveFolder(folderName);
                setViewPurchasedOnly(false);
                setSelectedTemplate(null);
              }}
              className={`relative text-left rounded-2xl p-4 border transition-all duration-300 group hover-lift ${
                isActive
                  ? 'glass-card border-loverai-gold text-loverai-gold shadow-lg shadow-loverai-gold/5 scale-[1.01]'
                  : 'glass-card border-white/5 text-white/70 hover:border-white/20 hover:text-white'
              }`}
            >
              {/* Folder tab design accent */}
              <div className={`absolute top-0 left-6 -translate-y-[6px] h-[5px] w-12 rounded-t-md transition-colors duration-300 ${
                isActive ? 'bg-loverai-gold' : 'bg-white/10 group-hover:bg-white/30'
              }`} />
              
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                  isActive ? 'bg-loverai-gold/10 text-loverai-gold' : 'bg-white/5 text-white/40 group-hover:bg-white/10'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="glass-card rounded-2xl border border-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full bg-loverai-gold ${viewPurchasedOnly ? 'animate-pulse' : ''}`} />
            <h2 className="text-lg font-medium text-white font-heading">
              {viewPurchasedOnly ? 'Company Store • Purchased Decks' : `${activeFolder} PPT Templates`}
            </h2>
          </div>
          {viewPurchasedOnly ? (
            <span className="text-[10px] text-loverai-gold bg-loverai-gold/10 px-2.5 py-1 rounded-md border border-loverai-gold/20 font-bold">
              {activeAssets.length} {activeAssets.length === 1 ? 'Deck' : 'Decks'} Unlocked
            </span>
          ) : (
            <span className="text-[10px] text-white/30 bg-white/5 px-2.5 py-1 rounded-md">
              ₹23,600 / Deck (Incl. GST)
            </span>
          )}
        </div>

        {activeAssets.length === 0 ? (
          viewPurchasedOnly ? (
            <div className="text-center py-20 text-white/35 rounded-2xl bg-black/10 border border-white/5 p-8 max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="font-heading text-xl text-white/70" style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}>Your Company Store is Empty</p>
              <p className="text-xs text-white/30 max-w-sm mx-auto">Templates you purchase will automatically be copied here for direct download access at any time.</p>
              <button
                type="button"
                onClick={() => setViewPurchasedOnly(false)}
                className="px-6 py-2.5 bg-loverai-gold hover:brightness-105 text-[#201913] rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
              >
                Browse Pitch Decks
              </button>
            </div>
          ) : (
            <div className="text-center py-16 text-white/30 rounded-2xl bg-black/10 border border-white/5 p-8">
              <svg className="w-12 h-12 mx-auto mb-3 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="font-heading text-lg text-white/50 mb-1" style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}>No Templates Uploaded</p>
              <p className="text-xs text-white/20">Decks will be added to the {activeFolder} catalog soon.</p>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 max-w-5xl mx-auto gap-6">
            {activeAssets.map((asset) => (
              <div
                key={asset.id}
                className={`group glass-card-subtle border border-white/5 rounded-2xl overflow-hidden hover-glow transition-all duration-300 flex flex-col sm:flex-row h-full ${
                  isSingle ? 'min-h-[320px]' : 'min-h-[220px]'
                }`}
              >
                {/* PPT Slide Preview Aspect Box */}
                <div 
                  className={`relative w-full ${isSingle ? 'sm:w-[420px]' : 'sm:w-[220px]'} aspect-[16/9] sm:aspect-auto sm:h-full bg-black/40 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden border-b sm:border-b-0 sm:border-r border-white/5`}
                  onClick={() => handleOpenPreview(asset)}
                >
                  <img
                    src={asset.slides[0]}
                    alt={asset.title}
                    className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-500 filter brightness-[1.12] saturate-[1.08] contrast-[1.02]"
                  />
                  
                  {!asset.purchased && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none z-10 overflow-hidden bg-black/10">
                      <div className="text-white/50 font-heading font-black text-xs sm:text-sm uppercase tracking-[0.2em] -rotate-12 drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)] text-center leading-tight">
                        <div>@Lovers AI</div>
                        <div className="text-[9px] sm:text-[10px] tracking-[0.1em] mt-1 font-mono opacity-80">9821640951</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Click to Preview Indicator */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-white/90 bg-black/60 border border-white/10 rounded-full px-2.5 py-1 backdrop-blur-sm tracking-wider flex items-center gap-1 shadow-lg">
                      Preview Deck
                    </span>
                  </div>
                </div>

                {/* Card Content details */}
                <div className={`flex flex-col justify-between flex-1 gap-4 ${isSingle ? 'p-6 md:p-8' : 'p-5'}`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-loverai-gold/70 bg-loverai-gold/5 px-2 py-0.5 rounded-full border border-loverai-gold/10 font-semibold tracking-wider uppercase">
                        PPT Deck
                      </span>
                      <span className="text-[11px] text-white/35">
                        High-Quality Images
                      </span>
                    </div>
                    <h3 className={`text-white font-medium group-hover:text-loverai-gold transition-colors font-heading ${isSingle ? 'text-xl md:text-2xl' : 'text-base line-clamp-1'}`} style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}>
                      {asset.title}
                    </h3>
                    <p className={`text-white/50 leading-relaxed ${isSingle ? 'text-sm line-clamp-3' : 'text-xs line-clamp-2'}`}>
                      {asset.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest leading-none">Price (Incl. GST)</p>
                      <p className={`font-semibold text-loverai-gold mt-1 leading-none ${isSingle ? 'text-lg' : 'text-sm'}`}>
                        {asset.purchased ? 'Unlocked' : `\u20B9${Math.round(asset.price * 1.18).toLocaleString('en-IN')}`}
                      </p>
                    </div>

                    {asset.purchased ? (
                      <button
                        type="button"
                        disabled={downloadingId === asset.id}
                        onClick={() => handleDownload(asset)}
                        className={`flex items-center gap-1.5 font-semibold rounded-xl bg-loverai-gold text-[#201913] hover:brightness-105 transition-all active:scale-95 ${
                          isSingle ? 'text-sm py-2.5 px-5' : 'text-xs py-2 px-4'
                        } ${
                          downloadingId === asset.id ? 'opacity-50 cursor-wait' : ''
                        }`}
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(asset)}
                          className={`flex items-center gap-1 font-semibold rounded-xl border border-white/10 text-white bg-white/5 hover:border-loverai-gold hover:text-loverai-gold transition-all active:scale-95 ${
                            isSingle ? 'text-sm py-2.5 px-4' : 'text-xs py-2 px-3'
                          }`}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCart(asset)}
                          className={`flex items-center gap-1 font-semibold rounded-xl transition-all active:scale-95 ${
                            isSingle ? 'text-sm py-2.5 px-4' : 'text-xs py-2 px-3'
                          } ${
                            isInCart(asset.id)
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                              : 'bg-loverai-gold text-loverai-deep hover:bg-white hover:text-black'
                          }`}
                        >
                          {isInCart(asset.id) ? 'Remove' : 'Add to Cart'}
                        </button>
                      </div>
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
          className="fixed inset-0 bg-[#080605] z-[9999] flex flex-col select-none animate-fadeIn overflow-hidden"
          onClick={() => setSelectedTemplate(null)}
        >
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between py-4 px-6 md:px-10 border-b border-white/5 z-50 bg-[#080605]">
            <div className="text-white/90 font-heading text-xl flex items-center gap-3">
              <span>{selectedTemplate.title}</span>
              {selectedTemplate.slides.length > 1 && (
                <span className="text-white/40 text-sm font-body font-light">
                  (Slide {previewSlideIndex + 1} of {selectedTemplate.slides.length})
                </span>
              )}
            </div>
            
            <button 
              type="button"
              onClick={() => setSelectedTemplate(null)}
              className="w-10 h-10 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 flex items-center justify-center text-white transition shadow-lg cursor-pointer"
              aria-label="Close template view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Core Content: Left Carousel (main focus) + Right Purchase Details */}
          <div 
            className="w-full flex-1 grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Slide Preview Grid/Carousel */}
            <div className="flex flex-col justify-center p-6 md:p-10 gap-4 h-full overflow-hidden bg-black">
              <div className="relative w-full flex-1 bg-black/20 rounded-2xl overflow-hidden flex items-center justify-center border border-white/5">
                {/* Prev Arrow */}
                {selectedTemplate.slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPreviewSlideIndex(p => (p - 1 + selectedTemplate.slides.length) % selectedTemplate.slides.length)}
                    className="absolute left-4 z-20 w-12 h-12 rounded-full border border-white/10 bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                {/* Selected Slide (Made bright with brightness-112 and saturate-108) */}
                <img
                  src={selectedTemplate.slides[previewSlideIndex]}
                  alt={`Slide ${previewSlideIndex + 1}`}
                  className={`max-w-full max-h-[70vh] object-contain select-none transition duration-300 ${
                    !selectedTemplate.purchased
                      ? (previewSlideIndex % 2 === 1)
                        ? 'filter blur-[12px] brightness-[0.35] pointer-events-none'
                        : 'filter brightness-[1.12] saturate-[1.08] contrast-[1.02]'
                      : 'filter brightness-[1.12] saturate-[1.08] contrast-[1.02]'
                  }`}
                />

                {/* Watermark Overlay for Unpurchased Templates */}
                {!selectedTemplate.purchased && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none z-10 overflow-hidden bg-black/5">
                    <div 
                      className="uppercase -rotate-12 font-heading font-black tracking-[0.25em] text-white/50 drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] select-none text-center"
                    >
                      <div className={
                        (previewSlideIndex % 2 === 0) 
                          ? 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl opacity-100 font-extrabold' 
                          : 'text-2xl sm:text-4xl md:text-5xl opacity-45 font-bold'
                      }>
                        @Lovers AI
                      </div>
                      <div className={`font-mono tracking-[0.15em] mt-2 opacity-95 ${
                        (previewSlideIndex % 2 === 0) 
                          ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl' 
                          : 'text-lg sm:text-xl md:text-2xl'
                      }`}>
                        9821640951
                      </div>
                    </div>
                  </div>
                )}

                {(!selectedTemplate.purchased && (previewSlideIndex % 2 === 1)) && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px] transition duration-300 z-20">
                    <div className="w-14 h-14 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-loverai-gold shadow-lg animate-pulse">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-white font-medium text-xs tracking-wide bg-black/80 px-4 py-2 rounded-full border border-white/10 shadow-md">
                      Unlock full PPTX to view all slides
                    </p>
                  </div>
                )}

                {/* Next Arrow */}
                {selectedTemplate.slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPreviewSlideIndex(p => (p + 1) % selectedTemplate.slides.length)}
                    className="absolute right-4 z-20 w-12 h-12 rounded-full border border-white/10 bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Dots / Thumbnails row */}
              {selectedTemplate.slides.length > 1 && (
                <div className="flex justify-center gap-2">
                  {selectedTemplate.slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewSlideIndex(idx)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
                        previewSlideIndex === idx ? 'bg-loverai-gold scale-110 w-6' : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Template Side Purchase Panel (Clean & Minimal) */}
            <div className="flex flex-col justify-center p-6 md:p-10 text-left gap-6 border-t lg:border-t-0 lg:border-l border-white/5 bg-[#212121]">
              <div className="space-y-3">
                <span className="text-[9px] text-loverai-gold/70 bg-loverai-gold/5 px-2 py-0.5 rounded-full border border-loverai-gold/10 font-bold uppercase tracking-widest">
                  PPT Deck Template
                </span>
                <h2 className="text-white text-3xl font-semibold font-heading leading-tight" style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}>
                  {selectedTemplate.title}
                </h2>
                <p className="text-xs text-white/40 leading-relaxed">Includes full presentation deck with editable layouts and premium placeholders.</p>
              </div>

              <div className="space-y-4">
                {!selectedTemplate.purchased ? (
                  <div className="pt-4 border-t border-white/5 space-y-1">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Total Amount</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-loverai-gold">
                        ₹{(selectedTemplate.price * 1.18).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-white/35">(Incl. 18% GST)</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-sm text-white/50 font-light">Status</span>
                    <span className="text-xl font-bold text-loverai-gold">Unlocked</span>
                  </div>
                )}

                <div className="pt-2">
                  {selectedTemplate.purchased ? (
                    <button
                      type="button"
                      disabled={downloadingId === selectedTemplate.id}
                      onClick={() => handleDownload(selectedTemplate)}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-loverai-gold text-[#201913] font-bold text-sm hover:brightness-105 active:scale-98 transition duration-200 cursor-pointer shadow-lg"
                    >
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download PPTX
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleCart(selectedTemplate)}
                        className={`w-full py-4 rounded-xl font-bold text-sm transition duration-200 border cursor-pointer flex items-center justify-center gap-2 ${
                          isInCart(selectedTemplate.id)
                            ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'border-white/10 bg-white/5 text-white hover:border-loverai-gold hover:text-loverai-gold hover:bg-loverai-gold/5'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {isInCart(selectedTemplate.id) ? 'Remove from Cart' : 'Add to Cart'}
                      </button>
                      <button
                        type="button"
                        disabled={purchasing}
                        onClick={() => handlePurchaseTemplate(selectedTemplate)}
                        className={`w-full py-4 rounded-xl bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#201913] font-bold text-sm hover:brightness-115 active:scale-98 transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                          purchasing ? 'opacity-50 cursor-wait' : ''
                        }`}
                      >
                        {purchasing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          `Buy Now`
                        )}
                      </button>
                    </div>
                  )}
                </div>
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
                    <option value="Haldi, Mehendi & Mayra" className="bg-[#1C120C] text-white">Haldi, Mehendi & Mayra</option>
                    <option value="Sangeet, Shaadi & Reception" className="bg-[#1C120C] text-white">Sangeet, Shaadi & Reception</option>
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
      {/* Cart Modal / Drawer */}
      {showCartModal && (
        <div 
          className="fixed inset-0 z-[99999] overflow-hidden"
          role="dialog" 
          aria-modal="true"
        >
          {/* Backdrop Overlay */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
            onClick={() => setShowCartModal(false)}
          />

          {/* Slide-over Panel */}
          <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
            <div 
              className="w-screen max-w-md bg-[#120D0A] border-l border-white/10 shadow-2xl flex flex-col justify-between animate-slideDrawer overflow-hidden text-left"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-[#1A1310]/40">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <svg className="w-6 h-6 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    {cart.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-loverai-gold text-loverai-deep font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-[#120D0A] shadow-md">
                        {cart.length}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-heading text-xl text-white tracking-wide">Shopping Bag</h3>
                    <p className="text-[10px] text-white/40 mt-0.5 tracking-wide">Review & unlock premium templates</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowCartModal(false)}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition cursor-pointer active:scale-95 border border-white/5"
                  aria-label="Close cart"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Cart Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/20 mb-2">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Your bag is currently empty</p>
                      <p className="text-xs text-white/35 mt-1 max-w-[200px] mx-auto">Explore our design library to add premium pitch decks to your cart.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCartModal(false)}
                      className="px-6 py-2.5 bg-loverai-gold hover:brightness-105 text-[#201913] rounded-xl text-xs font-bold transition duration-200 cursor-pointer shadow-lg active:scale-95"
                    >
                      Start Exploring Decks
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div 
                        key={item.id}
                        className="group flex gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/5 transition-all duration-300"
                      >
                        {/* Slide Image */}
                        <div className="w-24 aspect-[16/9] bg-black rounded-lg overflow-hidden shrink-0 border border-white/5 relative">
                          <img src={item.slides[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/10" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <span className="text-[9px] text-loverai-gold/60 font-bold uppercase tracking-wider font-body">PPT Deck</span>
                            <h4 className="text-xs font-semibold text-white/90 truncate mt-0.5" title={item.title}>{item.title}</h4>
                          </div>
                          <p className="text-xs font-bold text-loverai-gold mt-1">₹{item.price.toLocaleString('en-IN')}</p>
                        </div>
                        
                        {/* Delete Button */}
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => handleToggleCart(item)}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/20 transition active:scale-95 cursor-pointer hover:bg-red-500/5"
                            title="Remove item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Summary & Checkout */}
              {cart.length > 0 && (
                <div className="bg-[#0B0806] border-t border-white/5 p-6 md:p-8 space-y-6">
                  {/* Pricing Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-white/40 font-light">
                      <span>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
                      <span className="font-mono text-white/70">₹{cartSubtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/40 font-light">
                      <span>GST (18%)</span>
                      <span className="font-mono text-white/70">₹{cartGst.toLocaleString('en-IN')}</span>
                    </div>
                    
                    <div className="h-px bg-white/5 my-2" />
                    
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-white/80">Total Amount</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-loverai-gold font-mono">
                          ₹{cartTotal.toLocaleString('en-IN')}
                        </span>
                        <p className="text-[9px] text-white/30 mt-0.5">Includes 18% GST</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-4">
                    <button 
                      type="button"
                      disabled={purchasing}
                      onClick={handlePurchaseCart}
                      className="w-full py-4 rounded-xl bg-loverai-gold hover:brightness-105 text-[#201913] font-bold text-sm transition duration-200 active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-loverai-gold/5"
                    >
                      {purchasing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#201913]/30 border-t-[#201913] rounded-full animate-spin" />
                          Securing Checkout...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Pay & Unlock Access
                        </>
                      )}
                    </button>
                    
                    <div className="flex items-center justify-center gap-1.5 text-white/20 text-[10px] uppercase tracking-wider font-semibold">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Secure Checkout by Razorpay
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
