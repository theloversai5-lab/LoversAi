import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const STORAGE_KEY = "loversai_theme_moodboards";

const THEMES = [
  {
    key: "haldi",
    name: "Haldi",
    tone: "Turmeric yellows, marigold florals, warm daylight",
    image: "/images/golden.png",
  },
  {
    key: "mehendi",
    name: "Mehendi",
    tone: "Henna greens, intimate lounges, floral detailing",
    image: "/images/gallery_left.jpeg",
  },
  {
    key: "sangeet",
    name: "Sangeet",
    tone: "Stage lighting, jewel tones, dance-floor energy",
    image: "/images/mandap-image.png",
  },
  {
    key: "wedding",
    name: "Wedding",
    tone: "Sacred ceremony, mandap styling, regal celebration",
    image: "/images/couple_wedding.jpeg",
  },
];

const normalizeTheme = (value = "") => {
  const text = value.toLowerCase();
  if (text.includes("haldi")) return "haldi";
  if (text.includes("mehendi") || text.includes("mehandi")) return "mehendi";
  if (text.includes("sangeet")) return "sangeet";
  return "wedding";
};

const readBoards = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
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
  };

  boards[theme] = [nextEntry, ...(boards[theme] || [])].slice(0, 12);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  return theme;
}

function groupImages(board) {
  const images = board?.images || [];
  return {
    lead: images[0],
    top: images.slice(1, 3),
    bottom: images.slice(3),
  };
}

export default function CoupleThemeMoodboard() {
  const navigate = useNavigate();
  const { theme } = useParams();
  const activeTheme = normalizeTheme(theme || "");
  const boards = useMemo(readBoards, []);
  const selectedTheme = THEMES.find((item) => item.key === activeTheme) || THEMES[0];
  const selectedBoards = boards[selectedTheme.key] || [];
  const [activeIndex, setActiveIndex] = useState(0);

  const activeBoard = selectedBoards[activeIndex] || null;
  const groupedImages = groupImages(activeBoard);

  const openTheme = (nextTheme) => navigate(`/couple/moodboard/${nextTheme}`);
  const goPrev = () => setActiveIndex((prev) => Math.max(0, prev - 1));
  const goNext = () => setActiveIndex((prev) => Math.min(selectedBoards.length - 1, prev + 1));

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
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#b89f79]">Moodboard</p>
                <h1 className="font-['Cormorant_Garamond'] text-[30px] font-semibold text-[#f7e7c7]">
                  Your Dream Moodboard
                </h1>
              </div>
              <button
                type="button"
                onClick={() => navigate("/couple/profile")}
                className="rounded border border-white/10 px-2 py-1 text-xs text-white/65 transition hover:bg-white/5"
              >
                Profile
              </button>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-4">
              {THEMES.map((item) => {
                const isActive = item.key === selectedTheme.key;
                const count = (boards[item.key] || []).length;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => openTheme(item.key)}
                    className={`rounded-[8px] border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-[#c79b2d] bg-[#2b2118]"
                        : "border-white/10 bg-[#211914] hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-['Cormorant_Garamond'] text-[22px] font-semibold text-white">{item.name}</p>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/70">
                        {count}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-white/45">{item.tone}</p>
                  </button>
                );
              })}
            </div>

            {!activeBoard ? (
              <div className="rounded-[8px] border border-dashed border-white/14 bg-[#211914] px-5 py-16 text-center">
                <h2 className="font-['Cormorant_Garamond'] text-[32px] font-semibold text-[#f3ead7]">
                  No {selectedTheme.name} board yet
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/48">
                  Generate a function vision first. Once you add it, it will appear here in the themed moodboard flow.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/love-story")}
                  className="mt-6 rounded-[6px] bg-[#f4f0ea] px-5 py-2.5 text-sm font-semibold text-[#1d1714] transition hover:bg-white"
                >
                  Create Vision
                </button>
              </div>
            ) : (
              <article className="mx-auto max-w-[760px] rounded-[8px] border border-[#7b6140] bg-[#211914] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="rounded-[4px] bg-[#f1ede7] px-2 py-1 text-[11px] font-semibold text-[#1d1714]">
                      {activeBoard.functionType || selectedTheme.name} Decor
                    </p>
                  </div>
                  <p className="text-[11px] text-white/45">
                    {activeIndex + 1} / {selectedBoards.length}
                  </p>
                </div>

                <div className="grid min-h-[430px] grid-cols-[1fr_1.2fr] gap-1.5">
                  <div className="relative overflow-hidden bg-[#c3c3c3]">
                    {groupedImages.lead && (
                      <img src={groupedImages.lead.url} alt={groupedImages.lead.label || "Moodboard image"} className="h-full w-full object-cover" />
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    {groupedImages.top.map((img, index) => (
                      <div key={`${img.url}-${index}`} className="relative overflow-hidden bg-[#c3c3c3]">
                        <img src={img.url} alt={img.label || "Moodboard image"} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative mt-1.5 grid min-h-[220px] grid-cols-[1.3fr_0.7fr] gap-1.5">
                  <div className="relative overflow-hidden bg-[#c3c3c3]">
                    {groupedImages.bottom[0] && (
                      <img src={groupedImages.bottom[0].url} alt={groupedImages.bottom[0].label || "Moodboard image"} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="relative overflow-hidden bg-[#c3c3c3]">
                    {groupedImages.bottom[1] && (
                      <img src={groupedImages.bottom[1].url} alt={groupedImages.bottom[1].label || "Moodboard image"} className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      className="absolute bottom-3 right-3 rounded-[4px] bg-[#1d1714] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
                    >
                      Create Video
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={activeIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded bg-black/55 px-2 py-1 text-white/80 transition hover:bg-black/70 disabled:opacity-35"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={activeIndex >= selectedBoards.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-black/55 px-2 py-1 text-white/80 transition hover:bg-black/70 disabled:opacity-35"
                  >
                    ›
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-white/45">
                  <p>{activeBoard.style} / {activeBoard.functionType}</p>
                  <p>{new Date(activeBoard.createdAt).toLocaleDateString()}</p>
                </div>
              </article>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
