import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, coupleMoodboardAPI, uploadAPI } from "../../api/api";

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
      // Log storage failure but don't let it crash the app
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

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedTheme.key]);

  const persistBoards = (nextBoards) => {
    setBoardsState(nextBoards);
    writeBoards(nextBoards);
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

  const handleImageRemove = (imageId) => {
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
    persistBoards(nextBoards);
    if (editTarget?.id === imageId) {
      setEditTarget(null);
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

      // Obtain the latest boards from storage to avoid overwriting concurrent edits
      const latestBoards = readBoards();
      // Determine target board id: prefer activeBoard.id, otherwise search for the board containing the image
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
      className={`group relative overflow-hidden bg-[#c3c3c3] ${extraClass}`}
    >
      <img
        src={img.url}
        alt={img.label || "Moodboard image"}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
        <span className="truncate text-[10px] font-semibold text-white/80">
          {img.label || "Photo"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setEditTarget(img);
              setEditPrompt(img.editMeta?.editPrompt || "");
              setColorTone(img.editMeta?.colorTone || COLOR_TONES[0]);
              setLighting(img.editMeta?.lighting || LIGHTING_OPTIONS[0]);
            }}
            className="rounded bg-[#f4f0ea] px-2 py-1 text-[10px] font-semibold text-[#1d1714]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleImageRemove(img.id)}
            className="rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#171311] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1220px]">
        <div className="mb-4 flex items-center justify-between text-sm text-white/75">
          <button
            type="button"
            onClick={() => navigate("/love-story")}
            className="rounded border border-white/10 px-3 py-1.5 transition hover:bg-white/5"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => navigate("/couple/cart")}
            className="rounded border border-white/10 px-3 py-1.5 transition hover:bg-white/5"
          >
            Cart
          </button>
        </div>

        <section className="rounded-[10px] border border-[#5d4421] bg-[#1b1512] p-3 shadow-[0_0_0_1px_rgba(199,155,45,0.06)]">
          <div className="border border-[#4e3920] bg-[#181310] px-4 py-4">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#b89f79]">
                  Moodboard
                </p>
                <h1 className="font-['Cormorant_Garamond'] text-[30px] font-semibold text-[#f7e7c7]">
                  Your Dream Moodboard
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => uploadRef.current?.click()}
                  disabled={uploading}
                  className="rounded border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Add Photos"}
                </button>
                <button
                  type="button"
                  onClick={handleAddOccasionToCart}
                  className="rounded bg-[#f4f0ea] px-3 py-1.5 text-xs font-semibold text-[#1d1714] transition hover:bg-white"
                >
                  Add Occasion To Cart
                </button>
              </div>
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUploadPhotos(e.target.files)}
              />
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-4">
              {THEMES.map((item) => {
                const isActive = item.key === selectedTheme.key;
                const count = (boardsState[item.key] || []).length;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => openTheme(item.key)}
                    className={`rounded-[8px] border px-3 py-3 text-left transition ${isActive ? "border-[#c79b2d] bg-[#2b2118]" : "border-white/10 bg-[#211914] hover:border-white/25"}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-['Cormorant_Garamond'] text-[22px] font-semibold text-white">
                        {item.name}
                      </p>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/70">
                        {count}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-white/45">
                      {item.tone}
                    </p>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="mb-4 rounded-[6px] border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            {!activeBoard ? (
              <div className="rounded-[8px] border border-dashed border-white/14 bg-[#211914] px-5 py-16 text-center">
                <h2 className="font-['Cormorant_Garamond'] text-[32px] font-semibold text-[#f3ead7]">
                  No {selectedTheme.name} board yet
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/48">
                  Generate a function vision first, or add photos directly into
                  this event moodboard.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/love-story")}
                    className="rounded-[6px] bg-[#f4f0ea] px-5 py-2.5 text-sm font-semibold text-[#1d1714] transition hover:bg-white"
                  >
                    Create Vision
                  </button>
                  <button
                    type="button"
                    onClick={() => uploadRef.current?.click()}
                    disabled={uploading}
                    className="rounded-[6px] border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploading ? "Uploading..." : "Add Photos"}
                  </button>
                </div>
              </div>
            ) : (
              <article className="mx-auto max-w-[860px] rounded-[8px] border border-[#7b6140] bg-[#211914] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="rounded-[4px] bg-[#f1ede7] px-2 py-1 text-[11px] font-semibold text-[#1d1714]">
                      {activeBoard.functionType || selectedTheme.name} Decor
                    </p>
                    <p className="mt-2 text-[11px] text-white/45">
                      {activeBoard.style} / {activeBoard.functionType}
                    </p>
                  </div>
                  <p className="text-[11px] text-white/45">
                    {activeIndex + 1} / {selectedBoards.length}
                  </p>
                </div>

                <div className="grid min-h-[430px] grid-cols-1 gap-1.5 md:grid-cols-[1fr_1.2fr]">
                  {groupedImages[0] ? (
                    renderImageCard(groupedImages[0], "md:min-h-[430px]")
                  ) : (
                    <div className="bg-[#c3c3c3]" />
                  )}
                  <div className="grid gap-1.5">
                    {groupedImages[1] ? (
                      renderImageCard(groupedImages[1], "min-h-[210px]")
                    ) : (
                      <div className="min-h-[210px] bg-[#c3c3c3]" />
                    )}
                    {groupedImages[2] ? (
                      renderImageCard(groupedImages[2], "min-h-[210px]")
                    ) : (
                      <div className="min-h-[210px] bg-[#c3c3c3]" />
                    )}
                  </div>
                </div>

                <div className="mt-1.5 grid min-h-[220px] grid-cols-1 gap-1.5 md:grid-cols-[1.3fr_0.7fr]">
                  {groupedImages[3] ? (
                    renderImageCard(groupedImages[3], "min-h-[220px]")
                  ) : (
                    <div className="min-h-[220px] bg-[#c3c3c3]" />
                  )}
                  <div className="relative min-h-[220px] overflow-hidden bg-[#c3c3c3]">
                    {groupedImages[4] &&
                      renderImageCard(groupedImages[4], "h-full")}
                    <button
                      type="button"
                      className="absolute bottom-3 right-3 rounded-[4px] bg-[#1d1714] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
                    >
                      Create Video
                    </button>
                  </div>
                </div>

                {groupedImages.length > 5 && (
                  <div className="mt-3 grid gap-1.5 sm:grid-cols-3">
                    {groupedImages
                      .slice(5)
                      .map((img) => renderImageCard(img, "min-h-[170px]"))}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-[11px] text-white/45">
                  <p>{new Date(activeBoard.createdAt).toLocaleDateString()}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveIndex((prev) => Math.max(0, prev - 1))
                      }
                      disabled={activeIndex === 0}
                      className="rounded bg-black/55 px-2 py-1 text-white/80 transition hover:bg-black/70 disabled:opacity-35"
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
                      className="rounded bg-black/55 px-2 py-1 text-white/80 transition hover:bg-black/70 disabled:opacity-35"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </article>
            )}
          </div>
        </section>
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[780px] rounded-[10px] border border-[#5d4421] bg-[#1b1512] p-3">
            <div className="border border-[#4e3920] bg-[#181310] px-4 py-4">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#b89f79]">
                    Edit
                  </p>
                  <h2 className="font-['Cormorant_Garamond'] text-[28px] font-semibold text-[#f7e7c7]">
                    Love lies in the details, Let's Edit them
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="rounded border border-white/10 px-3 py-1 text-xs text-white/70"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[180px_1fr]">
                <div className="space-y-2">
                  <select
                    value={colorTone}
                    onChange={(e) => setColorTone(e.target.value)}
                    className="w-full rounded-[6px] border border-white/10 bg-[#201913] px-2 py-2 text-[11px] text-white outline-none"
                  >
                    {COLOR_TONES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={lighting}
                    onChange={(e) => setLighting(e.target.value)}
                    className="w-full rounded-[6px] border border-white/10 bg-[#201913] px-2 py-2 text-[11px] text-white outline-none"
                  >
                    {LIGHTING_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedTheme.name}
                    disabled
                    className="w-full rounded-[6px] border border-white/10 bg-[#201913] px-2 py-2 text-[11px] text-white/70 outline-none"
                  >
                    <option>{selectedTheme.name}</option>
                  </select>
                </div>

                <div>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Refine every detail..."
                    className="mb-3 min-h-[90px] w-full rounded-[8px] border border-[#7b6140] bg-[#221b16] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30"
                  />
                  <div className="overflow-hidden rounded-[8px] border border-[#7b6140] bg-[#2f2f2f]">
                    <img
                      src={editTarget.url}
                      alt={editTarget.label || "Editable moodboard image"}
                      className="h-[320px] w-full object-cover"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleEditImage}
                      disabled={editing}
                      className="rounded-[6px] bg-[#f4f0ea] px-4 py-2 text-sm font-semibold text-[#1d1714] disabled:opacity-60"
                    >
                      {editing ? "Editing..." : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImageRemove(editTarget.id)}
                      className="rounded-[6px] border border-white/10 px-4 py-2 text-sm font-semibold text-white/80"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditPrompt("");
                        setColorTone(COLOR_TONES[0]);
                        setLighting(LIGHTING_OPTIONS[0]);
                      }}
                      className="rounded-[6px] border border-white/10 px-4 py-2 text-sm font-semibold text-white/80"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(editTarget.url, "_blank")}
                      className="rounded-[6px] border border-white/10 px-4 py-2 text-sm font-semibold text-white/80"
                    >
                      Compare
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
