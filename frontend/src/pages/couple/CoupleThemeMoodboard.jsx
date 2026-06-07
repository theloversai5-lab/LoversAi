import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiFetch, coupleMoodboardAPI, uploadAPI, moodboardAPI } from "../../api/api";

const STORAGE_KEY = "loversai_theme_moodboards";

const THEMES = [
  {
    key: "haldi",
    name: "Haldi",
    tone: "Turmeric yellows, marigold florals, warm daylight",
  },
  {
    key: "mehendi",
    name: "Mehendi",
    tone: "Henna greens, intimate lounges, floral detailing",
  },
  {
    key: "sangeet",
    name: "Sangeet",
    tone: "Stage lighting, jewel tones, dance-floor energy",
  },
  {
    key: "wedding",
    name: "Wedding",
    tone: "Sacred ceremony, mandap styling, regal celebration",
  },
];

const COLOR_TONES = [
  "Warm Gold",
  "Ivory Soft",
  "Royal Jewel",
  "Pastel Bloom",
  "Candle Luxe",
];
const LIGHTING_OPTIONS = [
  "Daylight",
  "Golden Hour",
  "Warm Ambient",
  "Stage Glow",
  "Night Luxe",
];

const isRemoteImageUrl = (value = "") => /^https?:\/\//i.test(value);
const isDataUrl = (value = "") => /^data:/i.test(value);

const normalizeTheme = (value = "") => {
  const text = value.toLowerCase();
  if (text.includes("haldi")) return "haldi";
  if (text.includes("mehendi") || text.includes("mehandi")) return "mehendi";
  if (text.includes("sangeet")) return "sangeet";
  return "wedding";
};

const SparklesIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L14.5 9L21 11.5L14.5 14L12 20L9.5 14L3 11.5L9.5 9L12 3Z" fill="currentColor" />
    <path d="M5 3L6 5.5L9 6L6 6.5L5 9L4 6.5L1 6L4 5.5L5 3Z" fill="currentColor" className="opacity-70" />
    <path d="M19 15L19.75 17L22 17.5L19.75 18L19 20L18.25 18L16 17.5L18.25 17L19 15Z" fill="currentColor" className="opacity-70" />
  </svg>
);

const readBoards = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    Object.keys(parsed).forEach((themeKey) => {
      parsed[themeKey] = (parsed[themeKey] || []).map((board) => ({
        ...board,
        images: (board.images || [])
          .filter((img) => img?.url && !isDataUrl(img.url))
          .map((img, index) => ({
            id: img.id || `img_${themeKey}_${board.id || "board"}_${index}`,
            ...img,
          })),
      }));
    });
    return parsed;
  } catch {
    return {};
  }
};

const trimBoardsForStorage = (boards) =>
  Object.fromEntries(
    Object.entries(boards).map(([themeKey, themeBoards]) => [
      themeKey,
      (themeBoards || [])
        .slice(0, 12)
        .map((board) => ({
          ...board,
          images: (board.images || [])
            .filter((img) => img?.url && !isDataUrl(img.url))
            .map((img) => ({
              id: img.id,
              url: img.url,
              label: img.label,
              source: img.source,
              publicId: img.publicId,
              editMeta: img.editMeta,
            })),
        }))
        .filter(
          (board) =>
            (board.images || []).length > 0 || board.prompt || board.title,
        ),
    ]),
  );

const writeBoards = (boards) => {
  const trimmedBoards = trimBoardsForStorage(boards);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedBoards));
  } catch (error) {
    const compactBoards = Object.fromEntries(
      Object.entries(trimmedBoards).map(([themeKey, themeBoards]) => [
        themeKey,
        (themeBoards || []).slice(0, 4),
      ]),
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compactBoards));
    } catch (err) {
      console.error(
        `Failed to write compacted boards to localStorage key=${STORAGE_KEY}:`,
        err,
      );
    }
  }
};

export function saveThemeMoodboard(entry) {
  const theme = normalizeTheme(entry.functionType || entry.theme);
  const boards = readBoards();
  const nextEntry = {
    ...entry,
    theme,
    id: entry.id || `${theme}_${Date.now()}`,
    createdAt: entry.createdAt || new Date().toISOString(),
    images: (entry.images || []).map((img, index) => ({
      id: img.id || `img_${theme}_${Date.now()}_${index}`,
      ...img,
    })),
  };

  boards[theme] = [nextEntry, ...(boards[theme] || [])].slice(0, 12);
  writeBoards(boards);

  // Sync to database if available
  moodboardAPI.saveMoodboard({
    boardId: nextEntry.id,
    theme,
    title: nextEntry.title,
    style: nextEntry.style,
    functionType: nextEntry.functionType,
    prompt: nextEntry.prompt,
    images: nextEntry.images,
    details: nextEntry.details
  }).catch((err) => {
    console.error("Error syncing saveThemeMoodboard to backend:", err);
  });

  return theme;
}

function updateBoard(boards, theme, boardId, updater) {
  return {
    ...boards,
    [theme]: (boards[theme] || []).map((board) => {
      if (board.id !== boardId) return board;
      return updater(board);
    }),
  };
}

function createUploadedImageEntry(file, uploadResult) {
  return {
    id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    url: uploadResult.url,
    label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded photo",
    source: "upload",
    publicId: uploadResult.publicId,
  };
}

export default function CoupleThemeMoodboard() {
  const navigate = useNavigate();
  const { theme } = useParams();
  const { currentUser, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const activeTheme = normalizeTheme(theme || "");
  const [boardsState, setBoardsState] = useState(() => readBoards());
  const [activeIndex, setActiveIndex] = useState(0);
  const [editTarget, setEditTarget] = useState(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [colorTone, setColorTone] = useState(COLOR_TONES[0]);
  const [lighting, setLighting] = useState(LIGHTING_OPTIONS[0]);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const uploadRef = useRef(null);

  const selectedTheme =
    THEMES.find((item) => item.key === activeTheme) || THEMES[0];
  const selectedBoards = useMemo(
    () => boardsState[selectedTheme.key] || [],
    [boardsState, selectedTheme.key],
  );
  const activeBoard = selectedBoards[activeIndex] || null;
  const groupedImages = activeBoard?.images || [];

  // Fetch moodboards from backend when component mounts
  useEffect(() => {
    const fetchBackendMoodboards = async () => {
      try {
        const response = await moodboardAPI.getMoodboards();
        if (response?.success && response?.moodboards) {
          const grouped = {};
          THEMES.forEach((theme) => {
            grouped[theme.key] = [];
          });
          response.moodboards.forEach((board) => {
            const themeKey = board.theme;
            if (grouped[themeKey]) {
              grouped[themeKey].push({
                id: board.boardId,
                theme: board.theme,
                title: board.title,
                style: board.style,
                functionType: board.functionType,
                prompt: board.prompt,
                images: board.images || [],
                createdAt: board.createdAt || new Date().toISOString(),
                details: board.details,
              });
            }
          });

          // Sort each theme's boards by date (newest first)
          Object.keys(grouped).forEach((key) => {
            grouped[key].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          });

          setBoardsState(grouped);
          writeBoards(grouped);
        }
      } catch (err) {
        console.error("Failed to load moodboards from backend, using local storage:", err);
      }
    };

    if (currentUser) {
      fetchBackendMoodboards();
    }
  }, [currentUser]);

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedTheme.key]);

  const persistBoards = async (nextBoards) => {
    setBoardsState(nextBoards);
    writeBoards(nextBoards);

    // Sync to backend if logged in
    if (currentUser) {
      try {
        const currentThemeBoards = nextBoards[selectedTheme.key] || [];
        for (const board of currentThemeBoards) {
          await moodboardAPI.saveMoodboard({
            boardId: board.id,
            theme: selectedTheme.key,
            title: board.title,
            style: board.style,
            functionType: board.functionType,
            prompt: board.prompt,
            images: board.images,
            details: board.details
          });
        }
      } catch (err) {
        console.error("Failed to sync moodboard to backend:", err);
      }
    }
  };

  const openTheme = (nextTheme) => navigate(`/couple/moodboard/${nextTheme}`);

  const buildFreshBoard = () => ({
    id: `${selectedTheme.key}_${Date.now()}`,
    theme: selectedTheme.key,
    title: `${selectedTheme.name} Moodboard`,
    functionType: selectedTheme.name,
    style: "Moodboard",
    createdAt: new Date().toISOString(),
    images: [],
    prompt: "",
  });

  const ensureBoard = () => {
    if (activeBoard) return activeBoard;
    const freshBoard = buildFreshBoard();
    const nextBoards = {
      ...boardsState,
      [selectedTheme.key]: [
        freshBoard,
        ...(boardsState[selectedTheme.key] || []),
      ],
    };
    persistBoards(nextBoards);
    setActiveIndex(0);
    return freshBoard;
  };

  const createTopBoard = () => {
    const freshBoard = buildFreshBoard();
    const nextBoards = {
      ...boardsState,
      [selectedTheme.key]: [
        freshBoard,
        ...(boardsState[selectedTheme.key] || []),
      ],
    };
    persistBoards(nextBoards);
    setActiveIndex(0);
    return freshBoard;
  };

  const resolveUploadTargetBoard = () => {
    if (!activeBoard) return ensureBoard();
    if ((activeBoard.images || []).length > 0) {
      return createTopBoard();
    }
    return activeBoard;
  };

  const handleUploadPhotos = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    const targetBoard = resolveUploadTargetBoard();
    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          if (!file.type.startsWith("image/")) {
            throw new Error(`${file.name} is not an image.`);
          }
          const result = await uploadAPI.uploadImage(file, "moodboards");
          if (!result?.success || !isRemoteImageUrl(result.url)) {
            throw new Error(`Failed to upload ${file.name}.`);
          }
          return createUploadedImageEntry(file, result);
        }),
      );

      const latestBoards = readBoards();
      const nextBoards = updateBoard(
        latestBoards,
        selectedTheme.key,
        targetBoard.id,
        (board) => ({
          ...board,
          images: [...uploads, ...(board.images || [])],
        }),
      );
      persistBoards(nextBoards);
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || "Failed to upload photos.",
      );
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  const handleImageRemove = async (imageId) => {
    if (!activeBoard) return;
    const nextBoards = updateBoard(
      boardsState,
      selectedTheme.key,
      activeBoard.id,
      (board) => ({
        ...board,
        images: (board.images || []).filter((img) => img.id !== imageId),
      }),
    );
    await persistBoards(nextBoards);
    if (editTarget?.id === imageId) {
      setEditTarget(null);
    }
  };

  const handleDeleteBoard = async () => {
    if (!activeBoard) return;
    if (!window.confirm("Are you sure you want to delete this moodboard?")) return;

    const updatedThemeBoards = (boardsState[selectedTheme.key] || []).filter(
      (board) => board.id !== activeBoard.id
    );
    const nextBoards = {
      ...boardsState,
      [selectedTheme.key]: updatedThemeBoards,
    };

    setBoardsState(nextBoards);
    writeBoards(nextBoards);
    setActiveIndex(0);

    if (currentUser) {
      try {
        await moodboardAPI.deleteMoodboard(activeBoard.id);
      } catch (err) {
        console.error("Failed to delete moodboard on backend:", err);
      }
    }
  };

  const blobFromImage = async (imageUrl) => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${imageUrl}: ${response.status} ${response.statusText}`,
      );
    }
    return response.blob();
  };

  const handleEditImage = async () => {
    if (!activeBoard || !editTarget) return;
    setEditing(true);
    setError("");
    try {
      const blob = await blobFromImage(editTarget.url);
      const file = new File([blob], "moodboard-edit.png", {
        type: blob.type || "image/png",
      });
      const formData = new FormData();
      formData.append("image", file);
      formData.append("editPrompt", editPrompt);
      formData.append(
        "functionType",
        activeBoard.functionType || selectedTheme.name,
      );
      formData.append("style", activeBoard.style || "Modern");
      formData.append("theme", selectedTheme.name);
      formData.append("colorTone", colorTone);
      formData.append("lighting", lighting);

      const result = await coupleMoodboardAPI.editImage(formData);
      if (!result.success || !result.image?.url) {
        throw new Error(result.error || "Failed to edit image");
      }

      const latestBoards = readBoards();
      let targetBoardId = activeBoard?.id;
      if (!targetBoardId) {
        const themeBoards = latestBoards[selectedTheme.key] || [];
        for (const b of themeBoards) {
          if ((b.images || []).some((img) => img.id === editTarget.id)) {
            targetBoardId = b.id;
            break;
          }
        }
      }
      if (!targetBoardId) {
        throw new Error("Target board not found for edited image");
      }

      const nextBoards = updateBoard(
        latestBoards,
        selectedTheme.key,
        targetBoardId,
        (board) => ({
          ...board,
          images: (board.images || []).map((img) =>
            img.id === editTarget.id
              ? {
                  ...img,
                  url: result.image.url,
                  label: `${img.label || "Moodboard image"} (Edited)`,
                  editMeta: { editPrompt, colorTone, lighting },
                }
              : img,
          ),
        }),
      );
      persistBoards(nextBoards);
      setEditTarget(null);
      setEditPrompt("");
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || "Failed to edit image.",
      );
    } finally {
      setEditing(false);
    }
  };

  const handleAddOccasionToCart = async () => {
    if (!activeBoard || !activeBoard.images?.length) {
      setError("Add at least one photo to the moodboard first.");
      return;
    }

    try {
      await apiFetch("/cart/add", {
        method: "POST",
        data: {
          type: "vision",
          url: activeBoard.images[0].url,
          moodboard: activeBoard.images.map((img) => img.url),
          label: activeBoard.title || `${selectedTheme.name} Moodboard`,
          prompt: activeBoard.prompt || "",
          details: {
            theme: selectedTheme.name,
            functionType: activeBoard.functionType || selectedTheme.name,
            style: activeBoard.style || "Moodboard",
            source: "theme-moodboard",
            imageCount: activeBoard.images.length,
          },
        },
      });
      navigate("/couple/cart");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to add moodboard to cart.",
      );
    }
  };

  const renderImageCard = (img, extraClass = "") => (
    <div
      key={img.id || img.url}
      className={`group relative overflow-hidden bg-black/40 rounded-[14px] border border-white/10 transition-all duration-300 hover:border-white/20 hover:shadow-lg ${extraClass}`}
    >
      <img
        src={img.url}
        alt={img.label || "Moodboard image"}
        className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
      />
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-4">
        
        {/* Top actions */}
        <div className="flex justify-between items-start w-full">
          <span className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white/80">
            {img.source === "upload" ? "Uploaded" : "Generated"}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setEditTarget(img);
                setEditPrompt(img.editMeta?.editPrompt || "");
                setColorTone(img.editMeta?.colorTone || COLOR_TONES[0]);
                setLighting(img.editMeta?.lighting || LIGHTING_OPTIONS[0]);
              }}
              className="w-8 h-8 rounded-full bg-white text-[#201913] hover:bg-[#e6c6b2] flex items-center justify-center transition duration-200 hover:scale-110"
              title="Edit Image"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleImageRemove(img.id)}
              className="w-8 h-8 rounded-full bg-black/60 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white flex items-center justify-center transition duration-200 hover:scale-110"
              title="Remove Image"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom label */}
        <div className="w-full">
          <p className="truncate text-xs font-semibold text-white tracking-wide">
            {img.label || "Moodboard photo"}
          </p>
        </div>
      </div>
    </div>
  );

  const renderMoodboardCard = (title, description, imgIndex, heightClass) => {
    const img = groupedImages[imgIndex] || null;
    const hasImage = !!img?.url;

    return (
      <div className={`relative rounded-[14px] overflow-hidden group transition-all duration-300 ${heightClass} ${
        hasImage 
          ? 'border border-white/10 bg-black/40' 
          : 'border border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center text-center p-4'
      }`}>
        {hasImage ? (
          <>
            <img
              src={img.url}
              alt={title}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
            />
            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/45 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-4">
              
              {/* Top actions */}
              <div className="flex justify-between items-start w-full">
                <span className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white/80">
                  {img.source === "upload" ? "Uploaded" : "Generated"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditTarget(img);
                      setEditPrompt(img.editMeta?.editPrompt || "");
                      setColorTone(img.editMeta?.colorTone || COLOR_TONES[0]);
                      setLighting(img.editMeta?.lighting || LIGHTING_OPTIONS[0]);
                    }}
                    className="w-8 h-8 rounded-full bg-white text-[#201913] hover:bg-[#eed7c5] flex items-center justify-center transition duration-200 hover:scale-110"
                    title="Edit Image"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImageRemove(img.id)}
                    className="w-8 h-8 rounded-full bg-black/60 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white flex items-center justify-center transition duration-200 hover:scale-110"
                    title="Remove Image"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Bottom labels */}
              <div className="w-full text-left">
                <p className="font-['Cormorant_Garamond'] text-lg md:text-[20px] font-semibold text-[#f4e3c1] leading-tight truncate">
                  {title}
                </p>
                <p className="text-xs md:text-[13px] text-white/60 mt-0.5 truncate">
                  {description}
                </p>
              </div>

            </div>

            {/* Static labels visible when not hovered */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 flex flex-col justify-end transition-opacity duration-300 group-hover:opacity-0 text-left">
              <p className="font-['Cormorant_Garamond'] text-lg md:text-[20px] font-semibold text-[#f4e3c1] leading-tight truncate">
                {title}
              </p>
              <p className="text-xs md:text-[13px] text-white/60 mt-0.5 truncate">
                {description}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center bg-white/5 mb-3 text-white/50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="font-['Cormorant_Garamond'] text-base md:text-lg font-medium text-[#f4e3c1]">
              {title}
            </p>
            <p className="text-xs md:text-[12px] text-white/40 mt-1 max-w-[80%] mx-auto leading-normal">
              {description}
            </p>
          </div>
        )}
      </div>
    );
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

  const getThemeCount = (themeKey) => {
    const themeBoards = boardsState[themeKey] || [];
    if (themeKey === selectedTheme.key) {
      return activeBoard ? (activeBoard.images || []).length : 0;
    }
    return themeBoards[0] ? (themeBoards[0].images || []).length : 0;
  };

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  return (
    <main className="h-screen w-screen relative px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-5 text-white overflow-hidden flex flex-col">
      {/* Background Image Setup matching the Dashboard exactly */}
      <div
        className="absolute inset-0 bg-cover bg-center -z-20 animate-scaleIn"
        style={{
          backgroundImage: 'url("/images/signup.png")',
          filter: "brightness(0.75) contrast(1.05)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-[#0a0604] -z-10" />

      <div className="mx-auto w-full max-w-[1380px] relative z-10 flex flex-col flex-1 min-h-0">
        
        {/* Elegant Top Controls Row */}
        <div className="mb-4 flex items-center justify-between text-sm flex-shrink-0 relative">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white/10 hover:border-white/30 active:scale-95 duration-200"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => navigate("/love-story")}
              className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white/10 hover:border-white/30 active:scale-95 duration-200"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => navigate("/couple/cart")}
              className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white/10 hover:border-white/30 active:scale-95 duration-200"
            >
              Cart
            </button>
          </div>

          {/* Centered H1 Header Section (Inline with Back/Create/Cart and Hamburger dropdown) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none hidden md:block">
            <h1 className="font-['Cormorant_Garamond'] text-2xl lg:text-3xl font-semibold text-white tracking-wide leading-none">
              Your Dream Moodboard
            </h1>
            <p className="text-[8px] lg:text-[9px] uppercase tracking-[0.18em] text-[#b89f79] font-medium mt-1">
              CURATE AND ORGANIZE YOUR THEMED WEDDING VISIONS
            </p>
          </div>

          {/* Premium Hamburger Menu Dropdown Trigger */}
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

        {/* Mobile Header (only visible on small screen sizes) */}
        <div className="text-center mb-4 flex-shrink-0 block md:hidden">
          <h1 className="font-['Cormorant_Garamond'] text-2xl font-semibold text-white tracking-wide">
            Your Dream Moodboard
          </h1>
          <p className="text-[9px] uppercase tracking-[0.15em] text-[#b89f79] font-medium mt-0.5">
            CURATE AND ORGANIZE YOUR THEMED WEDDING VISIONS
          </p>
        </div>

        {/* Glassmorphic main panel layout */}
        <section className="flex-1 min-h-0 flex flex-col rounded-[24px] border border-white/15 bg-white/5 backdrop-blur-2xl p-4 md:p-5 shadow-[0_30px_70px_rgba(0,0,0,0.45)] overflow-y-auto">

          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleUploadPhotos(e.target.files)}
          />

          {/* Premium Theme Selection Tabs Grid */}
          <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4 flex-shrink-0">
            {THEMES.map((item) => {
              const isActive = item.key === selectedTheme.key;
              const count = getThemeCount(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => openTheme(item.key)}
                  className={`rounded-[16px] border p-4 text-left transition-all duration-300 flex flex-col justify-between backdrop-blur-md ${
                    isActive
                      ? "border-[#e6c6b2] bg-white/10 shadow-[0_0_20px_rgba(230,198,178,0.15)]"
                      : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <p className="font-['Cormorant_Garamond'] text-xl md:text-2xl font-semibold text-white">
                      {item.name}
                    </p>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/40 font-medium">
                    {item.tone}
                  </p>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200 flex-shrink-0">
              {error}
            </div>
          )}

          {/* Display State: Check if board exists and contains images */}
          {!activeBoard || groupedImages.length === 0 ? (
            /* High-End Glassmorphic Empty Placeholder State matching mockup exactly */
            <div className="flex-1 w-full rounded-[20px] border border-dashed border-white/15 bg-white/[0.02] p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-24 h-24 rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center mb-6 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h2 className="font-['Cormorant_Garamond'] text-[32px] md:text-[38px] font-semibold text-white tracking-wide leading-none">
                No {selectedTheme.name} board yet
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/50">
                Generate a function vision first. Once you add it, it will appear here in the themed moodboard flow.
              </p>
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/love-story")}
                  className="flex items-center justify-center rounded-xl bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] px-6 py-3 text-sm font-semibold text-[#3D1B2D] transition-all duration-300 hover:brightness-105 hover:scale-105 active:scale-95 shadow-[0_4px_25px_rgba(230,198,178,0.15)]"
                >
                  <SparklesIcon />
                  Create Vision
                </button>
              </div>
            </div>
          ) : (
            /* Collage Visual Layout */
            <article className="mx-auto w-full max-w-[1200px] flex-1 min-h-0 rounded-[20px] border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md flex flex-col">
              <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-3 flex-shrink-0">
                <div>
                  <span className="rounded-full bg-[#e6c6b2]/10 border border-[#e6c6b2]/20 px-3.5 py-1 text-[11px] font-bold text-[#e6c6b2] uppercase tracking-wider">
                    {activeBoard.functionType || selectedTheme.name} Decor
                  </span>
                  <p className="mt-1 text-[11px] text-white/40 font-medium">
                    {activeBoard.style} Style / {activeBoard.functionType}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleDeleteBoard}
                    className="rounded-xl border border-red-500/25 bg-red-500/10 hover:bg-red-500 hover:text-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-400 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    Delete Board
                  </button>
                  <button
                    type="button"
                    onClick={handleAddOccasionToCart}
                    className="rounded-xl bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#3D1B2D] transition-all duration-200 hover:brightness-105 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    Add To Cart
                  </button>
                  <span className="text-[11px] font-bold tracking-widest text-white/60 bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2">
                    {activeIndex + 1} OF {selectedBoards.length}
                  </span>
                </div>
              </div>

              {/* Scrollable area restricted inside bento wrapper */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-4 custom-scrollbar">
                
                {/* Bento Grid matching CoupleWeddingVision layout */}
                <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4 flex-1 min-h-0 flex-shrink-0">
                  {/* Column 1 (Wider) */}
                  <div className="flex flex-col gap-4 min-h-0 justify-between flex-1">
                    {renderMoodboardCard(
                      "Primary Wedding Scene",
                      "Key generated vision scene",
                      0,
                      "flex-[1.2] min-h-0"
                    )}
                    {renderMoodboardCard(
                      "Ceremony & Theme Detail",
                      "Specific ritual & ceremonial setup",
                      2,
                      "flex-[0.8] min-h-0"
                    )}
                  </div>
                  
                  {/* Column 2 */}
                  <div className="flex flex-col gap-4 min-h-0 justify-between flex-1">
                    {renderMoodboardCard(
                      "Decor & Detailing",
                      "Table settings & floral design",
                      1,
                      "flex-[0.75] min-h-0"
                    )}
                    {renderMoodboardCard(
                      "Venue Atmosphere",
                      "Atmospheric lighting & scale",
                      3,
                      "flex-[1.25] min-h-0"
                    )}
                  </div>
                </div>

                {/* Extra Uploaded/Generated Images */}
                {groupedImages.length > 4 && (
                  <div className="grid gap-4 sm:grid-cols-4 flex-shrink-0 mt-2">
                    {groupedImages
                      .slice(4)
                      .map((img) => renderImageCard(img, "min-h-[150px] aspect-[4/3]"))}
                  </div>
                )}
              </div>

              {/* Bottom Pagination Controls */}
              <div className="mt-4 flex items-center justify-between text-xs text-white/40 border-t border-white/5 pt-3 flex-shrink-0">
                <p>Created: {new Date(activeBoard.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((prev) => Math.max(0, prev - 1))
                    }
                    disabled={activeIndex === 0}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white transition hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((prev) =>
                        Math.min(selectedBoards.length - 1, prev + 1),
                      )
                    }
                    disabled={activeIndex >= selectedBoards.length - 1}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white transition hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                </div>
              </div>
            </article>
          )}
        </section>
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          {/* Square form popup modal with thick white border */}
          <div className="w-full max-w-[650px] aspect-square rounded-[32px] border-[6px] border-white bg-black/95 text-white shadow-2xl p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#b89f79] font-medium">
                  IMAGE CUSTOMIZATION
                </p>
                <h2 className="font-['Cormorant_Garamond'] text-3xl font-semibold text-white mt-1 leading-tight">
                  Refine Decor Details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition duration-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 flex-1 my-6 min-h-0">
              
              {/* Image Preview */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] flex items-center justify-center h-full min-h-[180px]">
                <img
                  src={editTarget.url}
                  alt={editTarget.label || "Editable moodboard image"}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Edit Controls */}
              <div className="flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/50 block mb-1">Color Tone</label>
                    <select
                      value={colorTone}
                      onChange={(e) => setColorTone(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none focus:border-[#e6c6b2] transition"
                    >
                      {COLOR_TONES.map((item) => (
                        <option key={item} value={item} className="bg-[#1c120e]">
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/50 block mb-1">Lighting</label>
                    <select
                      value={lighting}
                      onChange={(e) => setLighting(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none focus:border-[#e6c6b2] transition"
                    >
                      {LIGHTING_OPTIONS.map((item) => (
                        <option key={item} value={item} className="bg-[#1c120e]">
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/50 block mb-1">Prompts / Instructions</label>
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Add flowers, change colors, adjust styling details..."
                      className="w-full h-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none focus:border-[#e6c6b2] transition resize-none placeholder:text-white/20"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={handleEditImage}
                disabled={editing}
                className="flex-1 py-3 rounded-xl bg-[#e6c6b2] text-[#201913] text-xs font-semibold hover:bg-[#eed7c5] transition-all duration-300 disabled:opacity-50"
              >
                {editing ? "Regenerating..." : "Apply AI Changes"}
              </button>
              <button
                type="button"
                onClick={() => handleImageRemove(editTarget.id)}
                className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500 hover:text-white transition-all duration-300"
              >
                Delete
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
