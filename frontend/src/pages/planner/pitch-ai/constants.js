export const STORAGE_KEY = "pitchAi.projectId";

export const COSTS = {
  venue_isometric: 3,
  component_sheet: 1,
  component_board: 3,
  placement: 2,
};

export const VENUE_SLOTS = [
  { view: "front", label: "Front" },
  { view: "right", label: "Right" },
  { view: "back", label: "Back" },
  { view: "left", label: "Left" },
  { view: "satellite", label: "Satellite", optional: true },
];
export const GROUND_VIEWS = ["front", "right", "back", "left"];

// Element key == component id; category matches backend CATEGORIES.
export const ELEMENTS = [
  { id: "entry", category: "entry", label: "Entry" },
  { id: "mandap", category: "mandap", label: "Mandap" },
  { id: "stage", category: "stage", label: "Stage" },
  { id: "dance_floor", category: "dance_floor", label: "Dance floor" },
  { id: "lounge", category: "lounge", label: "Lounge" },
  { id: "dining", category: "dining", label: "Dining" },
  { id: "bar", category: "bar", label: "Bar" },
  { id: "photo_booth", category: "photo_booth", label: "Photo booth" },
];

export const SHEET_VIEWS = [
  { viewType: "front", label: "Front" },
  { viewType: "top", label: "Top" },
  { viewType: "full_sheet", label: "Full sheet" },
];

// Documentation drawings: never component masters.
export const DRAWING_VIEWS = ["spec", "board"];

export const STEPS = [
  { id: "venue", label: "Venue" },
  { id: "isometric", label: "Isometric" },
  { id: "decor", label: "Decor" },
  { id: "placement", label: "Placement" },
  { id: "gallery", label: "Gallery" },
];

export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];

export const byNewest = (a, b) =>
  String(b.createdAt || "").localeCompare(String(a.createdAt || ""));

export const elementLabel = (id) => ELEMENTS.find((e) => e.id === id)?.label || id;

// Current base for placement: latest approved placement, else latest approved isometric.
export const currentBase = (project) => {
  const assets = project?.assets || [];
  const at = (a) => String(a.approval?.at || a.createdAt || "");
  const approved = (kind) =>
    assets
      .filter((a) => a.kind === kind && a.status === "approved")
      .sort((a, b) => at(b).localeCompare(at(a)))[0];
  return approved("placement") || approved("venue_isometric") || null;
};
