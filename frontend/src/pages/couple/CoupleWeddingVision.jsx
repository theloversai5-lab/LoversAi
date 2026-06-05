import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { coupleMoodboardAPI, userAPI } from "../../api/api";
import { saveThemeMoodboard } from "./CoupleThemeMoodboard";
import { useAuth } from "../../context/AuthContext";

const FUNCTION_OPTIONS = [
  "Haldi",
  "Mehendi",
  "Sangeet",
  "Wedding Ceremony",
  "Reception",
  "Small Event (Birthday, Wedding Ceremony)",
];

const ATMOSPHERE_OPTIONS = [
  "Warm & Festive",
  "Romantic & Intimate",
  "Grand & Opulent",
  "Minimal & Elegant",
  "Bohemian & Free-spirited",
  "Royal & Regal",
];

const TIMING_OPTIONS = [
  "Morning (Day light)",
  "Afternoon (Bright)",
  "Sunset (Golden Hour)",
  "Evening (Warm Glow)",
  "Night (Under Stars)",
];

const PLANNING_OPTIONS = [
  "Decor / Planning / Venue",
  "Fashion / Photography",
  "Sounds / Lights / Entertainment"
];
const VENUE_OPTIONS = ["Open lawn", "Banquet"];
const THEME_OPTIONS = ["Carnival", "Royal", "Pastel", "Garden", "Minimal Luxe"];

const EDIT_COLOR_TONE_OPTIONS = ["Original", "Warm Gold", "Cool Pastel", "Vibrant Emerald", "Classic Crimson"];
const EDIT_LIGHTING_OPTIONS = ["Original", "Candlelight", "Daylight", "Sunset Glow", "Dramatic Spotlight"];
const EDIT_THEME_OPTIONS = ["Original", "Bohemian", "Royal Palace", "Minimalist Modern", "Floral Wonderland"];

const TITLE_MAP = {
  Haldi: "Golden Dreams of Haldi",
  Mehendi: "Henna Garden Reverie",
  "Wedding Ceremony": "Eternal Sacred Vows",
  Reception: "A Night to Remember",
  Sangeet: "Rhythms of Celebration",
  Engagement: "Promise of Forever",
  Nikah: "Blessings of Nikkah",
};

const getThemeFromFunction = (value = "") => {
  const text = value.toLowerCase();
  if (text.includes("haldi")) return "haldi";
  if (text.includes("mehendi") || text.includes("mehandi")) return "mehendi";
  if (text.includes("sangeet")) return "sangeet";
  return "wedding";
};

const formatBudgetLabel = (budget) => {
  if (budget >= 100) return "1 Cr";
  return `${budget} L`;
};

const PhotoIcon = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="10" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

const SparkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
    <path d="M19 16v5" />
    <path d="M21.5 18.5h-5" />
  </svg>
);

const callGroqAPI = async (messages, responseFormat = null) => {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === "image_url")) 
        ? "llama-3.2-11b-vision-preview" 
        : "llama-3.3-70b-versatile",
      messages,
      temperature: 0.3,
      max_tokens: 2048,
      ...(responseFormat ? { response_format: responseFormat } : {})
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errorText.substring(0, 300)}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
};

export default function CoupleWeddingVision() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Load wedding profile details from backend (dynamic - real data entered during onboarding)
  const [weddingProfile, setWeddingProfile] = useState({});

  useEffect(() => {
    userAPI.getProfile()
      .then((data) => {
        // Backend returns the profile; map fields to what we display
        const wp = data?.weddingProfile || data?.user?.weddingProfile || data || {};
        setWeddingProfile({
          brideName: wp.partnerName1 || wp.brideName || "",
          groomName: wp.partnerName2 || wp.groomName || "",
          weddingDate: wp.weddingDate || "",
          dateNotDecided: wp.dateNotDecided || false,
          city: wp.city || "",
          religion: wp.tradition || wp.religion || "",
          budget: wp.budget || "",
          guestCount: wp.guestCount || "",
        });
      })
      .catch(() => {
        // Fallback to localStorage if API fails
        try {
          const saved = localStorage.getItem("lovers-ai-couple-profile");
          if (saved) setWeddingProfile(JSON.parse(saved));
        } catch { /* ignore */ }
      });
  }, []);

  const formatWeddingDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();
    } catch { return null; }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      setProfileMenuOpen(false);
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  const getUserInitials = () => {
    if (!currentUser?.displayName && !currentUser?.email) return "U";
    const name = currentUser.displayName || currentUser.email;
    return name.charAt(0).toUpperCase();
  };

  const [venueImage, setVenueImage] = useState(null);
  const [venuePreview, setVenuePreview] = useState(null);
  const [decorImage, setDecorImage] = useState(null);
  const [decorPreview, setDecorPreview] = useState(null);

  const [style, setStyle] = useState("Modern");
  const [functionType, setFunctionType] = useState("Haldi");
  const [atmosphere, setAtmosphere] = useState("Warm & Festive");
  const [timing, setTiming] = useState("Morning (Day light)");
  const [userPrompt, setUserPrompt] = useState("");
  const [budget, setBudget] = useState(11);
  const [guestCount, setGuestCount] = useState(0);
  const [planningType, setPlanningType] = useState("Decor / Planning / Venue");
  const [venueType, setVenueType] = useState("Banquet");
  const [theme, setTheme] = useState("Carnival");

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [generatedImages, setGeneratedImages] = useState([]);
  const [moodboardTitle, setMoodboardTitle] = useState("");
  const [generationMeta, setGenerationMeta] = useState(null);
  const [error, setError] = useState(null);
  const [savedTheme, setSavedTheme] = useState("");
  const [savedToMoodboard, setSavedToMoodboard] = useState(false);
  const [showMoodboardModal, setShowMoodboardModal] = useState(false);

  const venueInputRef = useRef(null);
  const decorInputRef = useRef(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [selectedColorTone, setSelectedColorTone] = useState("Original");
  const [selectedLighting, setSelectedLighting] = useState("Original");
  const [selectedTheme, setSelectedTheme] = useState("Original");
  const [activeEditTool, setActiveEditTool] = useState("add"); // "add" | "remove"
  const [showCompare, setShowCompare] = useState(false);
  const [refining, setRefining] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // "colorTone" | "lighting" | "theme" | null
  
  const [editedImages, setEditedImages] = useState({
    0: { colorTone: "Original", lighting: "Original", theme: "Original", prompt: "", filterStr: "", activeTool: "add", strokes: [] },
    1: { colorTone: "Original", lighting: "Original", theme: "Original", prompt: "", filterStr: "", activeTool: "add", strokes: [] },
    2: { colorTone: "Original", lighting: "Original", theme: "Original", prompt: "", filterStr: "", activeTool: "add", strokes: [] },
    3: { colorTone: "Original", lighting: "Original", theme: "Original", prompt: "", filterStr: "", activeTool: "add", strokes: [] }
  });

  const [strokes, setStrokes] = useState([]);
  const [currentPath, setCurrentPath] = useState("");

  const handleOpenEditModal = (index) => {
    setEditingIndex(index);
    const saved = editedImages[index] || { colorTone: "Original", lighting: "Original", theme: "Original", prompt: "", filterStr: "", activeTool: "add", strokes: [] };
    setSelectedColorTone(saved.colorTone);
    setSelectedLighting(saved.lighting);
    setSelectedTheme(saved.theme);
    setRefinePrompt(saved.prompt);
    setActiveEditTool(saved.activeTool || "add");
    setStrokes(saved.strokes || []);
    setShowCompare(false);
    setOpenDropdown(null);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingIndex(null);
    setRefinePrompt("");
    setStrokes([]);
    setCurrentPath("");
    setOpenDropdown(null);
  };

  const handleSaveEditModal = () => {
    const filterStr = getFinalFilterStr();
    setEditedImages((prev) => ({
      ...prev,
      [editingIndex]: {
        colorTone: selectedColorTone,
        lighting: selectedLighting,
        theme: selectedTheme,
        prompt: refinePrompt,
        filterStr: filterStr,
        activeTool: activeEditTool,
        strokes: strokes
      }
    }));
    handleCloseEditModal();
  };

  const getFinalFilterStr = () => {
    const toneFilters = {
      "Original": "",
      "Warm Gold": "sepia(0.25) saturate(1.2) hue-rotate(-5deg) contrast(1.05)",
      "Cool Pastel": "saturate(0.9) brightness(1.05) contrast(0.95) hue-rotate(5deg)",
      "Vibrant Emerald": "hue-rotate(60deg) saturate(1.1) brightness(0.95)",
      "Classic Crimson": "hue-rotate(-30deg) saturate(1.3) contrast(1.1)"
    };
    
    const lightingFilters = {
      "Original": "",
      "Candlelight": "brightness(0.9) saturate(1.3) sepia(0.3)",
      "Daylight": "brightness(1.1) contrast(1.05) saturate(1.0)",
      "Sunset Glow": "brightness(0.95) sepia(0.15) saturate(1.4) hue-rotate(-15deg)",
      "Dramatic Spotlight": "contrast(1.3) brightness(0.9) saturate(0.85)"
    };

    const themeFilters = {
      "Original": "",
      "Bohemian": "sepia(0.1) saturate(0.95) contrast(0.9) brightness(1.02)",
      "Royal Palace": "saturate(1.25) contrast(1.1) brightness(0.98)",
      "Minimalist Modern": "grayscale(0.1) brightness(1.05) contrast(1.0)",
      "Floral Wonderland": "saturate(1.35) hue-rotate(-10deg) brightness(1.02)"
    };

    return [
      toneFilters[selectedColorTone],
      lightingFilters[selectedLighting],
      themeFilters[selectedTheme]
    ].filter(Boolean).join(" ");
  };

  const handleDropdownChange = (key, value) => {
    setRefining(true);
    if (key === "colorTone") setSelectedColorTone(value);
    if (key === "lighting") setSelectedLighting(value);
    if (key === "theme") setSelectedTheme(value);
    setTimeout(() => {
      setRefining(false);
    }, 600);
  };

  const triggerAIRefinement = () => {
    if (!refinePrompt.trim()) return;
    setRefining(true);
    setTimeout(() => {
      const tones = ["Warm Gold", "Cool Pastel", "Vibrant Emerald", "Classic Crimson"];
      const randomTone = tones[Math.floor(Math.random() * tones.length)];
      setSelectedColorTone(randomTone);
      setRefining(false);
    }, 1200);
  };

  const handleSelectTool = (tool) => {
    setActiveEditTool(tool);
    setShowCompare(false);
  };

  const handleResetEdits = () => {
    setRefining(true);
    setSelectedColorTone("Original");
    setSelectedLighting("Original");
    setSelectedTheme("Original");
    setRefinePrompt("");
    setStrokes([]);
    setCurrentPath("");
    setTimeout(() => {
      setRefining(false);
    }, 500);
  };

  const handleDrawingMouseDown = (e) => {
    if (showCompare || refining) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPath(`M ${x} ${y}`);
  };

  const handleDrawingMouseMove = (e) => {
    if (!currentPath || showCompare || refining) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPath((prev) => `${prev} L ${x} ${y}`);
  };

  const handleDrawingMouseUp = () => {
    if (!currentPath || showCompare || refining) return;
    setStrokes((prev) => [...prev, { path: currentPath, tool: activeEditTool }]);
    setCurrentPath("");
  };

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const handleFileSelect = (file, type) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File too large. Maximum size is 50MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "venue") {
        setVenueImage(file);
        setVenuePreview(reader.result);
      } else {
        setDecorImage(file);
        setDecorPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const buildVisionPrompt = () => {
    const chips = [
      `${style} styling`,
      functionType,
      atmosphere,
      timing,
      `${venueType} venue`,
      `${theme} theme`,
      `${planningType.toLowerCase()} focus`,
      `budget around ${formatBudgetLabel(budget)}`,
      guestCount > 0 ? `${guestCount} guests` : null,
    ].filter(Boolean);

    const base = userPrompt.trim() || "Create a cinematic wedding scene with layered decor details.";
    return `${base}. ${chips.join(", ")}. Keep the result premium, photoreal, editorial, and celebration-ready.`;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSavedToMoodboard(false);
    setSavedTheme("");
    setGeneratedImages([]);
    setGenerationMeta(null);
    setMoodboardTitle("");
    setProgress("Preparing your wedding vision...");

    try {
      let decorStyleDescription = "";
      if (decorPreview) {
        setProgress("Analyzing decor inspiration with Groq Vision...");
        try {
          const visionContent = [
            { type: "text", text: "Describe the wedding decoration style, floral arrangements, colors, and key elements in this image in 2-3 sentences. Focus on specific visual components." },
            { type: "image_url", image_url: { url: decorPreview } }
          ];
          decorStyleDescription = await callGroqAPI([{ role: "user", content: visionContent }]);
        } catch (err) {
          console.error("Groq vision analysis failed for decor image:", err);
        }
      }

      let venueDescription = "";
      if (venuePreview) {
        setProgress("Analyzing venue reference with Groq Vision...");
        try {
          const visionContent = [
            { type: "text", text: "Describe the architectural style, flooring, ceiling, pillars, and structural elements of the venue in this image in 2-3 sentences." },
            { type: "image_url", image_url: { url: venuePreview } }
          ];
          venueDescription = await callGroqAPI([{ role: "user", content: visionContent }]);
        } catch (err) {
          console.error("Groq vision analysis failed for venue image:", err);
        }
      }

      setProgress("Generating custom scene concepts with Groq...");
      const systemPrompt = `You are a world-class Indian wedding visual planner and prompt engineer.
Given the following design filters selected by the couple:
- Style: ${style}
- Function/Ceremony: ${functionType}
- Atmosphere: ${atmosphere}
- Time of Day: ${timing}
- Venue Type: ${venueType}
- Theme: ${theme}
- Primary Planning Focus: ${planningType}
- Estimated Budget: ${formatBudgetLabel(budget)}
- Guest Count: ${guestCount} PAX
${userPrompt ? `- User's Vision Note: "${userPrompt}"` : ""}
${decorStyleDescription ? `- Inspiration Image Description: "${decorStyleDescription}"` : ""}
${venueDescription ? `- Venue Image Description: "${venueDescription}"` : ""}

You need to generate 4 distinct, highly detailed text-to-image prompts (about 60-80 words each) for 4 different aspects of this wedding. The prompts must match the selected theme, budget, style, and atmosphere, ensuring cultural accuracy and premium luxury aesthetics.

Generate prompts for these 4 specific slots:
1. "Primary Wedding Scene" (Label: "Primary Wedding Scene"): A breathtaking wide-angle editorial shot of the couple at the center of the ceremony. Focus on the main setup, mandap/altar, and overall grand scale.
2. "Decor & Detailing" (Label: "Decor & Detailing"): A close-up macro/editorial shot focusing on intricate decor details like luxury table settings, fine cutlery, floral centerpieces, candles, and custom stationery.
3. "Venue Atmosphere" (Label: "Venue Atmosphere"): A wide-angle atmospheric shot showing the scale and lighting of the entire venue (e.g., resort lawns, heritage palace courtyards, beachfront). Focus on the ambient light, fairy lights, lanterns, and structural mood.
4. "Ceremony & Theme Detail" (Label: "Ceremony & Theme Detail"): A detailed shot capturing specific ceremonial rituals, traditional elements (like sacred fire, garlands, incense), and thematic custom fabric/structures.

Format your response as a JSON object with exactly these 4 keys: "primary", "decor", "atmosphere", "ceremony".
Ensure each prompt is highly descriptive, containing specific camera angles (e.g., wide shot, macro detail, cinematic lighting, f/1.8 bokeh, f/4 sharpness), lighting conditions (e.g., golden hour glow, warm candle lights, twilight), and styling elements. Do not wrap the JSON in markdown code blocks or add any text other than the JSON string.`;

      const groqResponse = await callGroqAPI([
        { role: "user", content: systemPrompt }
      ], { type: "json_object" });

      let promptJSON;
      try {
        promptJSON = JSON.parse(groqResponse);
      } catch (jsonErr) {
        console.error("JSON parsing of Groq response failed, trying to extract JSON string:", jsonErr);
        const match = groqResponse.match(/\{[\s\S]*\}/);
        if (match) {
          promptJSON = JSON.parse(match[0]);
        } else {
          throw new Error("Failed to parse Groq response as JSON");
        }
      }

      const primaryPrompt = promptJSON.primary || buildVisionPrompt() + " Primary Wedding Scene";
      const decorPrompt = promptJSON.decor || buildVisionPrompt() + " Decor & Detailing close up";
      const atmospherePrompt = promptJSON.atmosphere || buildVisionPrompt() + " Venue Atmosphere ambient lighting";
      const ceremonyPrompt = promptJSON.ceremony || buildVisionPrompt() + " Ceremony & Theme Detail traditional setup";

      const seeds = [
        Math.floor(Math.random() * 1000000),
        Math.floor(Math.random() * 1000000),
        Math.floor(Math.random() * 1000000),
        Math.floor(Math.random() * 1000000)
      ];

      const getPollinationsUrl = (p, s) => {
        const cleanPrompt = p.replace(/[^\w\s\-\,\.\']/gi, '');
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=768&seed=${s}&nologo=true&model=flux`;
      };

      const imageUrls = [
        getPollinationsUrl(primaryPrompt, seeds[0]),
        getPollinationsUrl(decorPrompt, seeds[1]),
        getPollinationsUrl(atmospherePrompt, seeds[2]),
        getPollinationsUrl(ceremonyPrompt, seeds[3])
      ];

      setProgress("Generating 4 high-fidelity wedding visual scenes...");
      
      const preloadImage = (url) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = url;
          img.onload = () => resolve(url);
          img.onerror = (e) => reject(e);
        });
      };

      // Preload in parallel, catching failures gracefully to ensure robust loading
      await Promise.all(
        imageUrls.map(url => 
          preloadImage(url).catch(err => {
            console.error("Failed to preload image:", url, err);
            return url;
          })
        )
      );

      const finalGeneratedImages = [
        { url: imageUrls[0], label: "Primary Wedding Scene", seed: seeds[0] },
        { url: imageUrls[1], label: "Decor & Detailing", seed: seeds[1] },
        { url: imageUrls[2], label: "Venue Atmosphere", seed: seeds[2] },
        { url: imageUrls[3], label: "Ceremony & Theme Detail", seed: seeds[3] }
      ];

      setGeneratedImages(finalGeneratedImages);
      setMoodboardTitle(TITLE_MAP[functionType] || "Wedding Vision");
      setGenerationMeta({
        success: true,
        generatedImages: finalGeneratedImages,
        moodboardTitle: TITLE_MAP[functionType] || "Wedding Vision",
        finalPrompt: `Primary: ${primaryPrompt} | Decor: ${decorPrompt} | Atmosphere: ${atmospherePrompt} | Ceremony: ${ceremonyPrompt}`
      });
    } catch (err) {
      console.error("Moodboard generation error:", err);
      setError(err.message || "Generation failed. Please try again.");
    } finally {
      setProgress("");
      setGenerating(false);
    }
  };

  const handleAddToMoodboard = () => {
    if (generatedImages.length === 0) return;

    const boardTheme = saveThemeMoodboard({
      title: moodboardTitle || TITLE_MAP[functionType] || "Wedding Vision",
      images: generatedImages,
      style,
      functionType,
      atmosphere,
      timing,
      prompt: generationMeta?.finalPrompt || buildVisionPrompt(),
      details: {
        budget,
        guestCount,
        planningType,
        venueType,
        theme,
      },
    });

    setSavedTheme(boardTheme);
    setSavedToMoodboard(true);
    setShowMoodboardModal(true);
  };

  const openThemeBoard = () => {
    const boardTheme = savedTheme || getThemeFromFunction(functionType);
    navigate(`/couple/moodboard/${boardTheme}`);
  };

  const planAnotherFunction = () => {
    setShowMoodboardModal(false);
    setGeneratedImages([]);
    setGenerationMeta(null);
    setMoodboardTitle("");
    setSavedToMoodboard(false);
  };

  const FilterSection = ({ title, children }) => (
    <div className="rounded-[12px] border border-white/8 bg-white/5 p-3">
      <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[#e6c6b2]">
        {title}
      </p>
      {children}
    </div>
  );

  const SelectField = ({ value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (containerRef.current && !containerRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div className="relative w-full" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-[10px] border border-[#e6c6b2]/20 bg-[#f2dad0] px-3.5 py-2.5 text-[14px] font-semibold text-[#251f1b] outline-none transition focus:border-[#e6c6b2] cursor-pointer shadow-sm hover:bg-[#e6c6b2] hover:text-[#251f1b] duration-200"
        >
          <span>{value}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 mt-1.5 z-[999] rounded-[10px] border border-white/10 bg-[#201913] p-1 shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-fadeIn">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                  option === value
                    ? "bg-[#e6c6b2] text-[#251f1b]"
                    : "text-white/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{option}</span>
                {option === value && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const UploadBox = ({ label, preview, inputRef, onSelect }) => (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-full overflow-hidden rounded-[12px] border border-dashed border-white/15 bg-white/5 text-left transition hover:border-[#e6c6b2] hover:bg-white/10"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onSelect(e.target.files[0])}
      />
      {preview ? (
        <div className="relative h-20 w-full">
          <img src={preview} alt={label} className="h-full w-full object-cover" />
          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white">
            {label}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3.5 w-full text-[13px] font-semibold text-white/80 group">
          <div className="flex items-center gap-2.5">
            <svg
              className="text-[#e6c6b2]/75 group-hover:text-[#e6c6b2] transition-colors"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="group-hover:text-white transition-colors">
              {label.toLowerCase().startsWith("add") || label.toLowerCase().startsWith("upload") ? label : `Upload ${label}`}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border border-[#e6c6b2]/10 bg-[#e6c6b2]/5 text-[#e6c6b2] group-hover:bg-[#e6c6b2] group-hover:text-[#251f1b] transition-all duration-200">
            Browse
          </span>
        </div>
      )}
    </button>
  );

  const renderCanvas = () => {
    const showPlaceholder = !generating && generatedImages.length === 0;

    const GridBlock = ({ index, label, subLabel, customClass = "" }) => {
      const hasImage = generatedImages[index]?.url;

      if (generating) {
        return (
          <div className={`relative flex flex-col items-center justify-center overflow-hidden rounded-[14px] border border-white/8 bg-white/5 p-4 animate-shimmer ${customClass}`}>
            <div className="flex flex-col items-center text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e6c6b2]/30 border-t-[#e6c6b2]" />
              <span className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-[#e6c6b2]/90">
                Generating...
              </span>
              <span className="mt-1 text-[9px] text-white/40">
                Crafting {label.toLowerCase()}
              </span>
            </div>
          </div>
        );
      }

      if (showPlaceholder) {
        return (
          <div className={`relative flex flex-col items-center justify-center overflow-hidden rounded-[14px] border border-white/10 bg-white/5 backdrop-blur-md p-4 text-center transition duration-300 hover:bg-white/8 hover:border-white/15 ${customClass}`}>
            <div className="rounded-full border border-white/8 bg-white/5 p-2 text-white/45">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <strong className="mt-2.5 font-['Cormorant_Garamond'] text-[15px] font-semibold text-white/80 tracking-wide">
              {label}
            </strong>
            <span className="mt-0.5 text-[10px] text-white/35">
              {subLabel}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditModal(index);
              }}
              className="absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-sm transition duration-200 hover:bg-[#e6c6b2] hover:text-[#3D1B2D] hover:scale-105 shadow-md cursor-pointer"
              title="Edit details"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          </div>
        );
      }

      return (
        <div className={`relative overflow-hidden rounded-[14px] border border-white/10 bg-[#251f1b] ${customClass}`}>
          {hasImage ? (
            <img
              src={generatedImages[index].url}
              alt={generatedImages[index]?.label || label}
              className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
              style={{ filter: editedImages[index]?.filterStr || "" }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center text-white/30">
              <span className="text-[11px] font-medium">{label} Ready</span>
            </div>
          )}
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditModal(index);
            }}
            className="absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-sm transition duration-200 hover:bg-[#e6c6b2] hover:text-[#3D1B2D] hover:scale-105 shadow-md cursor-pointer"
            title="Edit details"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>

          <div className="absolute bottom-2.5 left-2.5 rounded-[6px] bg-black/60 px-2 py-1 text-[9px] uppercase tracking-wider text-white backdrop-blur-sm border border-white/5">
            {generatedImages[index]?.label || label}
          </div>
        </div>
      );
    };

    return (
      <div className="flex h-full flex-col min-h-0">
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-[1.15fr_1fr] min-h-0">
          {/* Column 1 (Left): Tall Portrait (Top) & Standard Landscape (Bottom) */}
          <div className="grid grid-rows-[1.4fr_1fr] gap-3 min-h-0 h-full">
            <GridBlock
              index={0}
              label="Primary Wedding Scene"
              subLabel="Key generated vision scene"
              customClass="h-full"
            />
            <GridBlock
              index={3}
              label="Ceremony & Theme Detail"
              subLabel="Specific ritual & ceremonial setup"
              customClass="h-full"
            />
          </div>

          {/* Column 2 (Right): Compact Square (Top) & Tall Portrait (Bottom) */}
          <div className="grid grid-rows-[0.95fr_1.45fr] gap-3 min-h-0 h-full">
            <GridBlock
              index={1}
              label="Decor & Detailing"
              subLabel="Table settings & floral design"
              customClass="h-full"
            />
            <GridBlock
              index={2}
              label="Venue Atmosphere"
              subLabel="Atmospheric lighting & scale"
              customClass="h-full"
            />
          </div>
        </div>

        {!generating && generatedImages.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={handleAddToMoodboard}
              className={`inline-flex items-center gap-2 rounded-[12px] border px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                savedToMoodboard
                  ? "border-[#89b86b] bg-[#89b86b]/15 text-[#d8efc8]"
                  : "border-white/10 bg-[#f1ede7] text-[#1f1a17] hover:bg-white shadow-lg shadow-white/5"
              }`}
            >
              <SparkIcon />
              {savedToMoodboard ? "Added to Moodboard" : "Add to Moodboard"}
            </button>

            <button
              type="button"
              onClick={openThemeBoard}
              className="rounded-[12px] border border-white/10 bg-white/10 px-5 py-2.5 text-xs font-semibold text-white/80 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:border-white/25 hover:bg-white/15"
            >
              View More
            </button>
          </div>
        )}

        <div className="mt-4 pt-2 border-t border-white/5 flex justify-center flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate("/couple/moodboard/wedding")}
            className="inline-flex items-center gap-2 rounded-[12px] border border-[#e6c6b2]/30 bg-[#e6c6b2]/10 px-6 py-2.5 text-sm font-semibold text-[#e6c6b2] transition-all duration-200 hover:bg-[#e6c6b2]/20 hover:border-[#e6c6b2]/60 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Move to Moodboard
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="h-screen w-screen relative px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-5 text-white overflow-hidden flex flex-col">
      {/* Background Image Setup */}
      <div
        className="absolute inset-0 bg-cover bg-center -z-20 animate-scaleIn"
        style={{
          backgroundImage: 'url("/images/signup.png")',
          filter: "brightness(0.75) contrast(1.05)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-[#0a0604] -z-10" />

      <div className="mx-auto w-full max-w-[1380px] relative z-10 flex flex-col flex-1 min-h-0">
        <div className="mb-2.5 flex items-center justify-between text-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white/10"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => navigate("/couple/moodboard/wedding")}
              className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white/10"
            >
              Moodboards
            </button>
          </div>
          
          {/* Hamburger Menu Toggle Button inside the single top line */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-10 h-10 rounded-full border border-white/15 bg-white/10 flex items-center justify-center text-white transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95"
              aria-label="Toggle Menu"
            >
              <div className="flex flex-col gap-[3px]">
                <span className={`block h-[2px] w-4 bg-white transition-all duration-300 ${profileMenuOpen ? "translate-y-[5px] rotate-45" : ""}`} />
                <span className={`block h-[2px] w-4 bg-white transition-all duration-300 ${profileMenuOpen ? "opacity-0" : "opacity-100"}`} />
                <span className={`block h-[2px] w-4 bg-white transition-all duration-300 ${profileMenuOpen ? "-translate-y-[5px] -rotate-45" : ""}`} />
              </div>
            </button>
            
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2.5 w-48 rounded-2xl bg-gradient-to-br from-[#1c120e]/95 to-[#120c09]/95 backdrop-blur-md border border-[#e6c6b2]/20 p-3.5 shadow-2xl flex flex-col gap-1 z-50 animate-fadeIn text-left">
                {currentUser && (
                  <div className="px-2 py-2 border-b border-white/10 mb-2 flex items-center gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-[#e6c6b2] to-amber-700 rounded-full flex items-center justify-center text-[#201913] text-[11px] font-bold">
                      {getUserInitials()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#e6c6b2] truncate">
                        {currentUser.displayName || currentUser.email?.split("@")[0]}
                      </p>
                      <p className="text-[9px] text-white/40 truncate leading-none mt-0.5">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    navigate("/couple/cart");
                    setProfileMenuOpen(false);
                  }}
                  className="group flex items-center w-full px-3 py-2 text-xs font-semibold rounded-lg text-white/70 hover:bg-white/5 hover:text-[#e6c6b2] border border-transparent hover:border-[#e6c6b2]/10 transition-all duration-300 text-left"
                >
                  My Cart
                </button>
                <button
                  onClick={() => {
                    navigate("/profile");
                    setProfileMenuOpen(false);
                  }}
                  className="group flex items-center w-full px-3 py-2 text-xs font-semibold rounded-lg text-white/70 hover:bg-white/5 hover:text-[#e6c6b2] border border-transparent hover:border-[#e6c6b2]/10 transition-all duration-300 text-left"
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2.5 text-xs font-semibold rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300 text-left border-t border-white/10 mt-1.5 pt-2.5"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <section className="rounded-[24px] border border-white/15 bg-white/5 backdrop-blur-2xl p-4 md:p-5 shadow-[0_30px_70px_rgba(0,0,0,0.45)] flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-0.5 py-0.5 flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="text-center mb-3 flex-shrink-0">
              <h1 className="font-['Cormorant_Garamond'] text-2xl md:text-[30px] font-semibold text-[#ffffff] tracking-wide leading-none">
                Create Your Wedding Vision
              </h1>
              <p className="text-[10px] text-white/70 uppercase tracking-widest mt-1">
                See your unique wedding design come to life
              </p>

            </div>

            {error && (
              <div className="mb-3 rounded-[8px] border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-3.5 grid gap-4 lg:grid-cols-[420px_1fr] flex-1 min-h-0 overflow-hidden">
              {/* Left Column: Style Filters Sidebar */}
              <aside className="rounded-[20px] border border-white/10 bg-white/5 backdrop-blur-md p-3.5 flex flex-col h-full min-h-0 overflow-hidden">
                <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1.5 flex-shrink-0">
                  <p className="text-[14px] font-bold text-white uppercase tracking-wider">Style Filters</p>
                </div>

                {/* 1. Static Reference Uploads at the top (Fixed, does not scroll!) */}
                <div className="flex-shrink-0 mb-3.5">
                  <FilterSection title="Reference Uploads">
                    <div className="grid gap-2">
                      <UploadBox label="Add Your Inspiration (Instagram Reel, Screenshot, Pinterest)" preview={decorPreview} inputRef={decorInputRef} onSelect={(file) => handleFileSelect(file, "decor")} />
                    </div>
                  </FilterSection>
                </div>

                {/* 2. Scrollable Style Filters List */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 custom-scrollbar">
                  {/* Budget Slider at the very top of the scrollable list */}
                  <FilterSection title="Budget (in Rupees)">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="w-full accent-[#e6c6b2]"
                    />
                    <div className="mt-1.5 flex items-center justify-between text-[13px] font-semibold text-white/80">
                      <span>1 L</span>
                      <span className="text-[#e6c6b2] font-bold">{formatBudgetLabel(budget)}</span>
                      <span>1 Cr</span>
                    </div>
                  </FilterSection>

                  {/* Functions Select dropdown right below Budget */}
                  <FilterSection title="Functions">
                    <SelectField value={functionType} onChange={setFunctionType} options={FUNCTION_OPTIONS} />
                  </FilterSection>

                  {/* Guest Slider right below Functions */}
                  <FilterSection title="Guest (PAX)">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full accent-[#e6c6b2]"
                    />
                    <div className="mt-1.5 flex items-center justify-between text-[13px] font-semibold text-white/80">
                      <span>0</span>
                      <span className="text-[#e6c6b2] font-bold">{guestCount}</span>
                      <span>1000</span>
                    </div>
                  </FilterSection>

                  {/* Style toggle button options */}
                  <FilterSection title="Theme">
                    <div className="grid grid-cols-2 gap-1.5">
                      {["Modern", "Traditional"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setStyle(option)}
                          className={`rounded-[8px] border px-2.5 py-2.5 text-[13px] font-bold transition duration-200 ${
                            style === option
                              ? "border-[#e6c6b2] bg-[#e6c6b2] text-[#3D1B2D]"
                              : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </FilterSection>

                  <FilterSection title="Event Flow">
                    <SelectField value={planningType} onChange={setPlanningType} options={PLANNING_OPTIONS} />
                  </FilterSection>

                  <FilterSection title="Venue">
                    <SelectField value={venueType} onChange={setVenueType} options={VENUE_OPTIONS} />
                  </FilterSection>


                  <FilterSection title="Timing">
                    <SelectField value={timing} onChange={setTiming} options={TIMING_OPTIONS} />
                  </FilterSection>
                </div>
              </aside>

              {/* Right Column: Prompt row at top, Bento canvas below */}
              <section className="rounded-[20px] border border-white/10 bg-white/5 backdrop-blur-md p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden gap-3.5">
                {/* Prompt Row placed inside the right section (next to the Style Filters sidebar!) */}
                <div className="flex flex-col gap-3 lg:flex-row flex-shrink-0">
                  <div className="flex flex-1 items-center gap-3 rounded-[12px] border border-white/15 bg-white/5 px-4 py-2.5 backdrop-blur-md">
                    <SparkIcon />
                    <input
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="Describe your Wedding Scene..."
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                    />
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={generating}
                      className="rounded-[8px] border border-white/15 p-2 text-white/80 transition hover:bg-white/10 hover:border-white/30 disabled:opacity-50"
                      aria-label="Generate vision"
                    >
                      <SparkIcon />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#e6c6b2] to-[#e6c6b2] px-6 py-3.5 text-sm font-semibold text-[#3D1B2D] transition hover:scale-[1.02] shadow-[0_10px_25px_rgba(230,198,178,0.25)] disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-95 hover:border-white/15"
                  >
                    <SparkIcon />
                    Generate
                  </button>
                </div>

                {/* Staggered Bento canvas container */}
                <div className="rounded-[14px] border border-white/5 bg-white/5 p-3 md:p-3.5 flex-1 min-h-0 flex flex-col">
                  {renderCanvas()}
                </div>
              </section>
            </div>
          </div>
        </section>
        {showMoodboardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-[360px] rounded-[10px] bg-[#f7f2eb] p-5 text-center text-[#1e1815] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <button
                type="button"
                onClick={() => setShowMoodboardModal(false)}
                className="absolute right-3 top-3 text-sm text-[#1e1815]/70 transition hover:text-[#1e1815]"
                aria-label="Close"
              >
                ×
              </button>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#3BFF47] text-white shadow-[0_12px_30px_rgba(59,255,71,0.25)]">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h2 className="font-['Cormorant_Garamond'] text-[24px] font-semibold">
                Added to Moodboard
              </h2>
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={planAnotherFunction}
                  className="rounded-[6px] bg-[#1d1714] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                >
                  Plan Another Function
                </button>
                <button
                  type="button"
                  onClick={openThemeBoard}
                  className="rounded-[6px] bg-[#1d1714] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                >
                  Go To Moodboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1-to-1 Premium Glassmorphic Refine Details Modal Overlay */}
        {editModalOpen && editingIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(61,27,45,0.2)_0%,rgba(0,0,0,0.85)_100%)] p-4 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-[880px] h-[90vh] max-h-[640px] rounded-[32px] bg-[#16100d]/90 border border-white/12 p-5 flex flex-col text-white shadow-[0_24px_80px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-[30px] overflow-hidden animate-scaleIn">
              
              {/* Modal Header */}
              <header className="flex items-center justify-between border-b border-white/10 pb-3.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="h-10 w-10 rounded-full border border-white/[0.08] flex items-center justify-center bg-white/[0.03] text-white/80 hover:text-[#3D1B2D] hover:bg-[#e6c6b2] hover:border-[#e6c6b2]/50 hover:shadow-[0_0_15px_rgba(230,198,178,0.3)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                  aria-label="Back"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveEditModal}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#e6c6b2] via-[#eed7c5] to-[#e6c6b2] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-[#3D1B2D] shadow-[0_8px_25px_rgba(230,198,178,0.3)] hover:shadow-[0_8px_30px_rgba(230,198,178,0.55)] transition-all duration-300 hover:scale-[1.04] active:scale-95 cursor-pointer border border-white/10 hover:brightness-110"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Save
                  </button>
                </div>
              </header>

              {/* Modal Main Title */}
              <div className="text-center mt-4 mb-3.5 flex-shrink-0">
                <h2 className="font-['Cormorant_Garamond'] text-[26px] md:text-[32px] font-semibold tracking-wide leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/80">
                  Love lies in the details ~
                </h2>
                <p className="text-[11px] text-[#e6c6b2]/60 uppercase tracking-widest font-bold mt-1.5">
                  Let's Edit them
                </p>
              </div>

              {/* Refinement Prompter bar */}
              <div className="mx-auto w-full max-w-[480px] mb-5 flex-shrink-0">
                <div className="flex items-center justify-between rounded-full border border-white/12 bg-[#120b09]/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl px-5 py-2 focus-within:border-white/20 focus-within:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_0_20px_rgba(255,255,255,0.05)] focus-within:bg-[#120b09]/80 transition-all duration-300">
                  <div className="flex items-center gap-3 flex-1">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#e6c6b2]/85 flex-shrink-0">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    <input
                      type="text"
                      value={refinePrompt}
                      onChange={(e) => setRefinePrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && triggerAIRefinement()}
                      placeholder="Refine every detail..."
                      className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/30 font-medium tracking-wide"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={triggerAIRefinement}
                    disabled={refining}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-black shadow-md hover:bg-white/90 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 cursor-pointer ml-3"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Grid content: Left panel settings & Right panel editor canvas */}
              <div className="flex-1 min-h-0 flex gap-4 overflow-hidden mb-3">
                
                {/* Left Panel settings container */}
                <aside className="w-[190px] flex-shrink-0 flex flex-col justify-start">
                  <div className="rounded-[24px] border border-white/[0.08] bg-[#16100d]/40 backdrop-blur-2xl p-4 flex flex-col gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)]">
                    
                    {/* Custom Color Tone Dropdown */}
                    <div className="relative flex flex-col gap-1.5">
                      <label className="text-[9px] uppercase font-black tracking-widest text-[#e6c6b2]/80">Color Tone</label>
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === "colorTone" ? null : "colorTone")}
                        className={`relative flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-[11px] font-bold text-white/90 outline-none cursor-pointer hover:bg-white/[0.04] transition-all duration-300 ${
                          openDropdown === "colorTone"
                            ? "bg-[#120b09]/95 border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.05)]"
                            : "bg-[#120b09]/80 border-white/10"
                        }`}
                      >
                        <span>{selectedColorTone}</span>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          className={`text-[#e6c6b2]/85 transition-transform duration-300 ${
                            openDropdown === "colorTone" ? "rotate-180" : ""
                          }`}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>

                      {openDropdown === "colorTone" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-[180px] overflow-y-auto rounded-xl border border-white/10 bg-[#1e1713]/95 p-1 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.6)] animate-fadeIn">
                            {EDIT_COLOR_TONE_OPTIONS.map((o) => (
                              <button
                                key={o}
                                type="button"
                                onClick={() => {
                                  handleDropdownChange("colorTone", o);
                                  setOpenDropdown(null);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] font-bold transition duration-200 cursor-pointer ${
                                  selectedColorTone === o
                                    ? "bg-[#e6c6b2]/15 text-[#e6c6b2]"
                                    : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                                }`}
                              >
                                <span>{o}</span>
                                {selectedColorTone === o && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-[#e6c6b2]">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Custom Lighting Dropdown */}
                    <div className="relative flex flex-col gap-1.5">
                      <label className="text-[9px] uppercase font-black tracking-widest text-[#e6c6b2]/80">Lighting</label>
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === "lighting" ? null : "lighting")}
                        className={`relative flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-[11px] font-bold text-white/90 outline-none cursor-pointer hover:bg-white/[0.04] transition-all duration-300 ${
                          openDropdown === "lighting"
                            ? "bg-[#120b09]/95 border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.05)]"
                            : "bg-[#120b09]/80 border-white/10"
                        }`}
                      >
                        <span>{selectedLighting}</span>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          className={`text-[#e6c6b2]/85 transition-transform duration-300 ${
                            openDropdown === "lighting" ? "rotate-180" : ""
                          }`}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>

                      {openDropdown === "lighting" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-[180px] overflow-y-auto rounded-xl border border-white/10 bg-[#1e1713]/95 p-1 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.6)] animate-fadeIn">
                            {EDIT_LIGHTING_OPTIONS.map((o) => (
                              <button
                                key={o}
                                type="button"
                                onClick={() => {
                                  handleDropdownChange("lighting", o);
                                  setOpenDropdown(null);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] font-bold transition duration-200 cursor-pointer ${
                                  selectedLighting === o
                                    ? "bg-[#e6c6b2]/15 text-[#e6c6b2]"
                                    : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                                }`}
                              >
                                <span>{o}</span>
                                {selectedLighting === o && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-[#e6c6b2]">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Custom Theme Dropdown */}
                    <div className="relative flex flex-col gap-1.5">
                      <label className="text-[9px] uppercase font-black tracking-widest text-[#e6c6b2]/80">Theme</label>
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === "theme" ? null : "theme")}
                        className={`relative flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-[11px] font-bold text-white/90 outline-none cursor-pointer hover:bg-white/[0.04] transition-all duration-300 ${
                          openDropdown === "theme"
                            ? "bg-[#120b09]/95 border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.05)]"
                            : "bg-[#120b09]/80 border-white/10"
                        }`}
                      >
                        <span>{selectedTheme}</span>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          className={`text-[#e6c6b2]/85 transition-transform duration-300 ${
                            openDropdown === "theme" ? "rotate-180" : ""
                          }`}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>

                      {openDropdown === "theme" && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-[180px] overflow-y-auto rounded-xl border border-white/10 bg-[#1e1713]/95 p-1 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.6)] animate-fadeIn">
                            {EDIT_THEME_OPTIONS.map((o) => (
                              <button
                                key={o}
                                type="button"
                                onClick={() => {
                                  handleDropdownChange("theme", o);
                                  setOpenDropdown(null);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] font-bold transition duration-200 cursor-pointer ${
                                  selectedTheme === o
                                    ? "bg-[#e6c6b2]/15 text-[#e6c6b2]"
                                    : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                                }`}
                              >
                                <span>{o}</span>
                                {selectedTheme === o && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-[#e6c6b2]">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                </aside>

                {/* Right Panel editor canvas area */}
                <section className="flex-1 rounded-[24px] border border-dashed border-white/15 bg-white/[0.01] p-2 flex flex-col relative items-center justify-center overflow-hidden min-h-0 shadow-inner">
                  <div className="relative w-full h-full rounded-[18px] overflow-hidden flex items-center justify-center bg-black/45 border border-white/5 shadow-inner">
                    
                    {generatedImages[editingIndex]?.url ? (
                      showCompare ? (
                        <div className="grid grid-cols-2 w-full h-full gap-2">
                          {/* Before Side */}
                          <div className="relative h-full w-full border-r border-white/10 overflow-hidden">
                            <img
                              src={generatedImages[editingIndex]?.url}
                              alt="Original generated"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute top-3 left-3 bg-black/70 px-2.5 py-1 rounded-md text-[9px] uppercase tracking-widest font-extrabold border border-white/5 text-white/90">
                              Before
                            </div>
                          </div>

                          {/* After Side */}
                          <div className="relative h-full w-full overflow-hidden">
                            <img
                              src={generatedImages[editingIndex]?.url}
                              alt="Refined generated image"
                              className="h-full w-full object-cover"
                              style={{ filter: getFinalFilterStr() }}
                            />
                            <div className="absolute top-3 left-3 bg-[#e6c6b2] text-[#3D1B2D] px-2.5 py-1 rounded-md text-[9px] uppercase tracking-widest font-extrabold shadow-sm font-sans">
                              After
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="relative h-full w-full overflow-hidden cursor-crosshair select-none"
                          onMouseDown={handleDrawingMouseDown}
                          onMouseMove={handleDrawingMouseMove}
                          onMouseUp={handleDrawingMouseUp}
                          onMouseLeave={handleDrawingMouseUp}
                        >
                          <img
                            src={generatedImages[editingIndex]?.url}
                            alt="Editing generated screen"
                            className="h-full w-full object-cover transition duration-300 pointer-events-none"
                            style={{ filter: getFinalFilterStr() }}
                          />

                          {/* Interactive Drawing strokes Canvas layer */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            {strokes.map((stroke, i) => (
                              <path
                                key={i}
                                d={stroke.path}
                                fill="none"
                                stroke={stroke.tool === "add" ? "rgba(230, 198, 178, 0.65)" : "rgba(239, 68, 68, 0.65)"}
                                strokeWidth="16"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ filter: "drop-shadow(0 0 6px rgba(230,198,178,0.4))" }}
                              />
                            ))}
                            {currentPath && (
                              <path
                                d={currentPath}
                                fill="none"
                                stroke={activeEditTool === "add" ? "rgba(230, 198, 178, 0.65)" : "rgba(239, 68, 68, 0.65)"}
                                strokeWidth="16"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}
                          </svg>
                        </div>
                      )
                    ) : (
                      /* If NO generated image exists yet, render an premium design placeholder inside the editor canvas! */
                      <div className="flex flex-col items-center justify-center p-6 text-center h-full w-full bg-white/[0.01] backdrop-blur-sm">
                        <div className="rounded-full border border-white/[0.08] bg-white/[0.04] p-5 text-[#e6c6b2]/85 mb-4 animate-pulse shadow-[0_0_20px_rgba(230,198,178,0.1)]">
                          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                        <h4 className="font-['Cormorant_Garamond'] text-[22px] font-semibold tracking-wide text-white/95">
                          Configure Refinements
                        </h4>
                        <p className="text-[12px] text-white/40 max-w-xs mt-2 leading-relaxed font-sans font-medium">
                          No generated image exists yet. Adjust filters or prompts here to pre-configure visual parameters for the next generation!
                        </p>
                      </div>
                    )}

                    {/* AI Shimmer loading panel overlay */}
                    {refining && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn">
                        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#e6c6b2]/30 border-t-[#e6c6b2] mb-3.5 shadow-md"></div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#e6c6b2] animate-pulse">
                          🪄 Refining details with AI...
                        </p>
                        <span className="text-[10px] text-white/40 mt-1 font-sans">Structuring visual preservation layers</span>
                      </div>
                    )}
                    
                    {/* Centered Floating toolbar overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-[#0a0504]/90 border border-white/10 rounded-full p-1.5 shadow-[0_15px_45px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl">
                      
                      <button
                        type="button"
                        onClick={() => handleSelectTool("add")}
                        className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-[10px] uppercase tracking-wider transition-all duration-300 cursor-pointer transform active:scale-95 ${
                          activeEditTool === "add" && !showCompare
                            ? "bg-white text-black font-extrabold shadow-md scale-[1.04]"
                            : "text-white/70 hover:text-white hover:bg-white/[0.04] border border-transparent font-bold"
                        }`}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="stroke-current">
                          <path d="M12 5v14M5 12h14"></path>
                        </svg>
                        Add
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleSelectTool("remove")}
                        className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-[10px] uppercase tracking-wider transition-all duration-300 cursor-pointer transform active:scale-95 ${
                          activeEditTool === "remove" && !showCompare
                            ? "bg-white text-black font-extrabold shadow-md scale-[1.04]"
                            : "text-white/70 hover:text-white hover:bg-white/[0.04] border border-transparent font-bold"
                        }`}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="stroke-current">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Remove
                      </button>

                      <div className="h-5 w-[1px] bg-white/10 mx-0.5"></div>

                      <button
                        type="button"
                        onClick={handleResetEdits}
                        className="flex items-center gap-1.5 rounded-full px-5 py-2 text-[10px] uppercase font-bold tracking-wider text-white/70 hover:text-white hover:bg-white/[0.06] hover:shadow-inner transition-all duration-300 cursor-pointer transform active:scale-95"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="stroke-current">
                          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                        </svg>
                        Reset
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCompare(!showCompare)}
                        className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-[10px] uppercase tracking-wider transition-all duration-300 cursor-pointer transform active:scale-95 ${
                          showCompare
                            ? "bg-white/15 text-white border border-white/20 font-bold scale-[1.04]"
                            : "text-white/70 hover:text-white hover:bg-white/[0.04] border border-transparent font-bold"
                        }`}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="stroke-current">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="12" y1="3" x2="12" y2="21"></line>
                        </svg>
                        Compare
                      </button>

                    </div>

                  </div>
                </section>

              </div>

            </div>
          </div>
        )}
      </div>
    </main>
  );
}
