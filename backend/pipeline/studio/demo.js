// Demo mode: a preset venue runs through the three steps automatically: photos, the overview, then
// three comment pins placed and applied one after another in real time, a look around and the
// presentation. Visible timeline, stop/resume, and a fresh theme and wording on every run.
// Quality-check rejections never stop the demo: results are accepted with the QA override.
import {
  S, hooks, pid, store, PROJECT_KEY, PREV_KEY, DEMO_IDS_KEY, LAST_DEMO_KEY, DEMO_BASE, SLOTS, GROUND, api, write, projPath, ensureProject, normalizeFile,
  approvable, approvedOf, approveAsset, acceptGenerated, screenPending, loadLibrary, refreshProject, h, sleep, toast, toastErr, fmtElapsed, btn, modal,
} from "./core.js";
import { pick, shuffle, rnd } from "./dom.js";
import { currentBase, latestShown, versionNo, lookAround, placePin, setDraftText, attachLib, sendPin, retryPin, pinById } from "./design.js";
import { setSlotBlob, uploadSlots, slotAsset, approvedGroundIds, startOverviewJob, isoLatest, base360Approved, base360Latest, resetLocal, syncSlots } from "./flows.js";

const PIN_TYPES = ["entry", "stage", "lounge"];
const DEMO_STEPS = [
  { key: "photos", label: "Upload preset photos" },
  { key: "screen", label: "Check the photos" },
  { key: "overview", label: "Isometric and 360" },
  // The demo stops here: placing decor on the venue is done by hand (circle, sketch, decor angles).
  { key: "doodle", label: "Open the venue for doodling" },
];
// Pin positions (normalized) and radius (fraction of the shorter image side).
const SPOTS = { entry: { cx: 0.5, cy: 0.82, r: 0.08 }, stage: { cx: 0.5, cy: 0.3, r: 0.12 }, lounge: { cx: 0.2, cy: 0.56, r: 0.09 } };
const LEADS = {
  entry: ["Entrance here", "Make this the entrance", "Welcome arch here", "Turn this into the entry"],
  stage: ["Stage here", "Put the main stage here", "Turn this into the stage", "Couple's stage here"],
  lounge: ["Lounge here", "Make this a guest lounge", "Seating lounge here", "Turn this corner into a lounge"],
};
const STOP = new Error("Demo stopped");
const ABORT = new Error("Demo left");

// Theme pool reused from the classic studio (entry = Entrance).
export const THEMES = [
  {
    id: "royal_rajasthani", name: "Royal Rajasthani gold & marigold", style: "Royal Rajasthani heritage", words: ["royal", "marigold", "gold", "jaipur", "heritage", "regal", "red", "jharokha"],
    palette: [["gold", "#C9A227"], ["marigold", "#F2A007"], ["deep red", "#8E1B1B"], ["ivory", "#F6F0E1"]],
    description: "A regal celebration inspired by Rajasthani palaces, with carved gold details, cascades of marigold and rich jewel-toned textiles.",
    el: {
      entry: "Carved gold archway framed by marigold garlands and brass lanterns",
      mandap: "Four-pillar gold mandap with a jharokha-style canopy and marigold strands",
      stage: "Raised reception stage with a carved gold backdrop and red velvet thrones",
      dance_floor: "Mirror-inlaid dance floor bordered with brass diyas",
      lounge: "Majlis-style lounge with low gaddi seating, bolsters and block-print cushions",
      dining: "Long banquet tables with red runners, brass thalis and marigold centrepieces",
      bar: "Carved wooden bar with brass fittings under a marigold-draped canopy",
      photo_booth: "Palace jharokha window frame with marigold curtains",
    },
  },
  {
    id: "modern_white_greenery", name: "Modern white & greenery", style: "Modern minimal with lush greenery", words: ["white", "greenery", "modern", "floral", "minimal", "green"],
    palette: [["white", "#FFFFFF"], ["eucalyptus", "#8FA98B"], ["olive", "#556B2F"], ["soft grey", "#D9D9D6"]],
    description: "A clean, modern celebration with crisp white structures, trailing greenery and soft natural light.",
    el: {
      entry: "Minimal white arch wrapped in trailing eucalyptus and smilax",
      mandap: "Open white-frame mandap with floating greenery panels and white orchids",
      stage: "Low white stage with a living green wall backdrop",
      dance_floor: "Gloss white dance floor ringed with potted olive trees",
      lounge: "White boucle sofas with olive-wood side tables and ferns",
      dining: "Long white tables with eucalyptus runners and clear glass candles",
      bar: "White fluted bar with a greenery-topped counter",
      photo_booth: "Moss wall with a simple white neon script",
    },
  },
  {
    id: "boho_desert", name: "Boho desert terracotta", style: "Boho desert", words: ["boho", "desert", "terracotta", "pastel", "rattan", "pampas"],
    palette: [["terracotta", "#C3623B"], ["sand", "#DCC7A1"], ["rust", "#9A3E1E"], ["cream", "#F3E9D7"]],
    description: "A relaxed desert-boho celebration with terracotta tones, macrame, dried florals and warm low lighting.",
    el: {
      entry: "Hexagon timber arch with macrame and dried pampas",
      mandap: "Wooden mandap draped in cream macrame with terracotta and dried florals",
      stage: "Rattan-backed stage with layered kilim rugs and dried palm fans",
      dance_floor: "Natural timber dance floor framed by woven lanterns",
      lounge: "Floor-cushion lounge on layered rugs with low wooden tables",
      dining: "Rustic wooden tables with terracotta runners and bud vases",
      bar: "Rattan bar with a dried-floral canopy and clay vessels",
      photo_booth: "Rattan peacock chair under a pampas cloud",
    },
  },
  {
    id: "midnight_silver", name: "Midnight blue & silver crystal", style: "Midnight glamour", words: ["midnight", "crystal", "silver", "blue", "glamour", "night"],
    palette: [["midnight blue", "#191970"], ["silver", "#C0C0C0"], ["crystal white", "#F4F7FB"], ["charcoal", "#2B2B2B"]],
    description: "A starlit evening of deep midnight blue, silver accents and crystal sparkle for a glamorous night celebration.",
    el: {
      entry: "Midnight-blue tunnel entrance with silver star lights",
      mandap: "Silver-frame mandap hung with crystal strands and white blooms",
      stage: "Midnight-blue velvet stage with a crystal curtain backdrop",
      dance_floor: "Starlit black dance floor with a silver monogram",
      lounge: "Navy velvet lounge with mirrored silver tables",
      dining: "Navy-linen tables with silver chargers and crystal candelabras",
      bar: "Mirrored silver bar with blue backlighting",
      photo_booth: "Silver sequin wall with a crescent-moon prop",
    },
  },
  {
    id: "pastel_garden", name: "Pastel garden romance", style: "Pastel garden romance", words: ["pastel", "garden", "blush", "floral", "boho", "rose"],
    palette: [["blush", "#F4C2C2"], ["lavender", "#C8B6E2"], ["mint", "#BFE3D0"], ["ivory", "#FFF8EE"]],
    description: "A soft, romantic garden celebration in blush, lavender and mint, overflowing with fresh blooms.",
    el: {
      entry: "Blush rose arch with lavender and trailing jasmine",
      mandap: "White gazebo mandap covered in pastel roses and hydrangeas",
      stage: "Pastel floral stage with a blooming hedge backdrop",
      dance_floor: "Ivory dance floor bordered by pastel flower boxes",
      lounge: "Garden lounge of rattan sofas with pastel cushions",
      dining: "Garden tables with layered pastel linens and low floral runners",
      bar: "Ivory garden bar wrapped in climbing roses",
      photo_booth: "Floral swing framed by a hydrangea wall",
    },
  },
  {
    id: "tropical_sunset", name: "Tropical sunset", style: "Tropical sunset", words: ["tropical", "sunset", "coral", "palm", "marigold"],
    palette: [["coral", "#FF6F59"], ["mango", "#FFA62B"], ["fuchsia", "#D63384"], ["palm green", "#2E8B57"]],
    description: "A vibrant tropical celebration glowing with sunset coral, mango and fuchsia against lush palm greens.",
    el: {
      entry: "Palm-leaf archway with coral and fuchsia orchids",
      mandap: "Bamboo mandap with monstera leaves and sunset-toned blooms",
      stage: "Sunset-gradient stage with palm fronds and tropical florals",
      dance_floor: "Sunburst-patterned dance floor with lanterns at the corners",
      lounge: "Rattan lounge with coral cushions under palm canopies",
      dining: "Tables with banana-leaf runners and mango-coloured florals",
      bar: "Thatched tiki bar with fuchsia bougainvillea",
      photo_booth: "Giant monstera wall with a sunset neon sign",
    },
  },
  {
    id: "vintage_burgundy", name: "Vintage ivory & burgundy", style: "Vintage romance", words: ["ivory", "burgundy", "gold", "luxe", "vintage", "regal"],
    palette: [["ivory", "#FFFFF0"], ["burgundy", "#800020"], ["antique gold", "#B08D57"], ["dusty rose", "#C9A9A6"]],
    description: "A timeless vintage celebration with ivory lace, deep burgundy blooms and antique gold detailing.",
    el: {
      entry: "Antique gold frame entrance with burgundy and ivory roses",
      mandap: "Ivory lace mandap with antique gold pillars and burgundy dahlias",
      stage: "Ivory stage with burgundy velvet drapes and vintage chandeliers",
      dance_floor: "Parquet dance floor under an antique crystal chandelier",
      lounge: "Chesterfield lounge in burgundy leather with lace side tables",
      dining: "Long tables with ivory lace, antique gold cutlery and burgundy blooms",
      bar: "Antique wooden bar with gold mirrors and dusty-rose florals",
      photo_booth: "Vintage gilded frame with a burgundy velvet backdrop",
    },
  },
  {
    id: "monochrome_luxe", name: "Monochrome luxe black & white florals", style: "Monochrome luxe", words: ["white", "black", "luxe", "modern", "monochrome", "crystal"],
    palette: [["black", "#000000"], ["white", "#FFFFFF"], ["graphite", "#3A3A3A"], ["pearl", "#EAE6DF"]],
    description: "A bold, high-contrast black and white celebration with sculptural white florals and sleek black finishes.",
    el: {
      entry: "Black steel arch with sculptural white orchids",
      mandap: "Black-frame mandap with cascading white florals and pearl strands",
      stage: "Gloss black stage with a white floral wall and graphite drapes",
      dance_floor: "Black and white checkerboard dance floor",
      lounge: "Black velvet sofas with white marble tables",
      dining: "Black-linen tables with white florals and tall taper candles",
      bar: "Black marble bar with a white floral cascade",
      photo_booth: "White floral frame on a matte black wall",
    },
  },
];
const DETAIL_MODIFIERS = [
  "with hanging floral chandeliers", "with mirrored acrylic accents", "with warm festoon lighting", "with cascading fairy-light curtains",
  "with sculptural pampas installations", "with candle clusters in glass hurricanes", "with layered sheer drapery", "with geometric brass frames",
  "with soft pin-spot lighting", "with suspended greenery hoops", "with scattered rose petals", "with gilded mirror panels",
  "with woven rattan details", "with crystal bead strands", "with tall floral pillars", "with low-level warm uplighting",
];
const OCCASIONS = ["An evening wedding ceremony and reception", "A sunset wedding celebration", "A grand wedding reception", "An intimate ceremony followed by a dinner party"];

const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
function makeTheme() {
  const last = store.get(LAST_DEMO_KEY, null);
  const pool = THEMES.filter((t) => t.id !== last?.themeId);
  const theme = pick(pool.length ? pool : THEMES);
  const mods = shuffle(DETAIL_MODIFIERS);
  const comments = Object.fromEntries(PIN_TYPES.map((t, i) => [t, `${pick(LEADS[t])}: ${lowerFirst(theme.el[t])}, ${mods[i]}.`.slice(0, 500)]));
  const guests = 150 + Math.floor(rnd() * 26) * 10;
  return {
    ...theme,
    comments,
    loungeSide: rnd() < 0.5 ? -1 : 1,
    jitter: Object.fromEntries(PIN_TYPES.map((t) => [t, [(rnd() * 2 - 1) * 0.025, (rnd() * 2 - 1) * 0.02]])),
    brief: {
      description: `${theme.description} ${pick(OCCASIONS)} for about ${guests} guests.`,
      ceremony: "",
      style: theme.style,
      palette: theme.palette.map(([n]) => n),
      constraints: ["Keep fire exits and walkways clear"],
    },
  };
}

let presetsPromise = null;
function loadPresets() {
  if (!presetsPromise) {
    presetsPromise = (async () => {
      let res;
      try {
        res = await fetch(`${DEMO_BASE}/presets.json`, { cache: "no-store" });
      } catch {
        throw new Error("Cannot reach the demo presets. Is the pipeline dev server running?");
      }
      if (!res.ok) throw new Error(res.status === 404 ? "Demo presets are not installed on this server (404)." : `Could not load demo presets (HTTP ${res.status}).`);
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("The demo presets file is not valid JSON.");
      }
      const venues = (Array.isArray(data?.venues) ? data.venues : [])
        .filter((v) => v && typeof v.id === "string" && Array.isArray(v.photos))
        .map((v) => ({ ...v, photos: v.photos.filter((p) => p && typeof p.file === "string") }))
        .filter((v) => v.photos.length);
      if (!venues.length) throw new Error("The demo presets contain no usable venues.");
      return { venues };
    })();
    presetsPromise.catch(() => (presetsPromise = null));
  }
  return presetsPromise;
}
const demoPath = (...parts) => `${DEMO_BASE}/${parts.flatMap((p) => String(p).split("/")).filter(Boolean).map(encodeURIComponent).join("/")}`;
async function fetchDemoImage(url) {
  let res;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new Error(`Could not download demo image ${url}`);
  }
  if (!res.ok) throw new Error(`Demo image missing (HTTP ${res.status}): ${url}`);
  const blob = await res.blob();
  if (!blob.size) throw new Error(`Demo image is empty: ${url}`);
  return normalizeFile(blob);
}

const alive = (d) => S.demo === d && (!d.projectId || d.projectId === pid());
// Before a sub-task: honour Stop. After one: only abort if the demo was left.
const check = (d) => {
  if (!alive(d)) throw ABORT;
  if (d.stop) throw STOP;
};
const gone = (d) => {
  if (!alive(d)) throw ABORT;
};
const show = (stage) => {
  S.presenting = false;
  S.stage = stage;
  hooks.render();
};

function pickItem(type, theme) {
  const g = (S.library.data?.elements || []).find((x) => x.type === type);
  if (!g) return null;
  const words = new Set([...theme.words, ...`${theme.name} ${theme.style}`.toLowerCase().split(/[^a-z]+/)].filter((w) => w.length > 3));
  const score = (it) => `${it.style} ${it.label} ${it.description} ${it.path}`.toLowerCase().split(/[^a-z]+/).filter((w) => words.has(w)).length + rnd() * 0.9;
  return g.items.map((it) => [it, score(it)]).sort((a, b) => b[1] - a[1])[0][0];
}

/* ---------------- Steps ---------------- */

async function stepPhotos(d, st) {
  await ensureProject();
  d.projectId = pid();
  const ids = store.get(DEMO_IDS_KEY, []);
  if (!ids.includes(d.projectId)) store.set(DEMO_IDS_KEY, [...ids, d.projectId].slice(-30));
  show(0);
  if (!d.briefSaved) {
    try {
      await write((revision) => api("PATCH", projPath(), { revision, changes: { brief: d.theme.brief } }));
      d.briefSaved = true;
    } catch (e) {
      st.warn = true;
      st.note = `The theme brief was not saved: ${e.message}`;
    }
  }
  if (!d.blobs) {
    st.note = "Downloading preset photos";
    hooks.render();
    d.blobs = await Promise.all(d.venue.photos.map(async (p) => ({ view: p.view, blob: await fetchDemoImage(demoPath(d.venue.id, p.file)) })));
  }
  check(d);
  if (!GROUND.some((v) => slotAsset(v))) {
    const used = new Set();
    for (const p of d.blobs) {
      const v = GROUND.includes(p.view) && !used.has(p.view) ? p.view : GROUND.find((g) => !used.has(g));
      if (!v) continue;
      used.add(v);
      setSlotBlob(v, p.blob);
    }
    st.note = `Uploading ${used.size} photo(s)`;
    hooks.render();
    await uploadSlots();
  }
  for (const s of SLOTS) {
    const slot = S.slots[s.view];
    if (slot?.blob) {
      if (slot.url) URL.revokeObjectURL(slot.url);
      Object.assign(slot, { blob: null, url: null });
    }
  }
  const uploaded = GROUND.filter((v) => slotAsset(v)).length;
  if (!uploaded) throw new Error("No venue photo was accepted by the server.");
  st.note = `${uploaded} photo(s) uploaded`;
}

async function stepScreen(d, st) {
  const entry = await screenPending();
  gone(d);
  await refreshProject();
  if ((S.project.assets || []).some((a) => a.status === "pending_screen")) throw new Error(`The photo check did not finish: ${entry?.error || "photos are still waiting"}`);
  for (const v of GROUND) {
    const a = slotAsset(v);
    if (a && a.status === "review" && approvable(a)) await approveAsset(a.id, "", { quiet: true });
  }
  const n = approvedGroundIds().length;
  if (!n) throw new Error("No venue photo passed the check.");
  st.note = `${n} photo(s) accepted`;
}

async function overviewOne(d, w) {
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    check(d);
    try {
      return await startOverviewJob(w, { alive: () => alive(d), override: true });
    } catch (e) {
      if (e === STOP || e === ABORT) throw e;
      lastErr = e;
    }
  }
  throw lastErr;
}

async function stepOverview(d, st) {
  S.overviewStarted = true; // the demo drives the overview itself
  show(1);
  const needIso = !approvedOf("venue_isometric");
  const need360 = !base360Approved();
  const [iso, pano] = await Promise.allSettled([needIso ? overviewOne(d, "iso") : Promise.resolve(null), need360 ? overviewOne(d, "v360") : Promise.resolve(null)]);
  gone(d);
  // A flagged image that was not approved yet: accept it with the override.
  for (const a of [isoLatest(), base360Latest()]) if (a && a.status !== "approved") await acceptGenerated(a).catch(() => {});
  if (!approvedOf("venue_isometric")) throw new Error(`Isometric overview: ${iso.reason?.message || "not approved"}`);
  const notes = [];
  if (pano.status === "rejected" || !base360Approved()) {
    st.warn = true;
    notes.push(`360 view skipped (${pano.reason?.message || "not approved"})`);
  }
  st.note = notes.length ? `Isometric ready; ${notes.join("; ")}` : "Isometric and 360 approved";
  await sleep(900);
}

async function canvasReady(d) {
  show(3);
  const t0 = Date.now();
  while (!(S.design && S.design.dc.size.W > 0 && S.design.shownId === latestShown())) {
    if (Date.now() - t0 > 20000) throw new Error("The design canvas did not load the venue image.");
    await sleep(150);
    gone(d);
  }
}

async function waitPin(d, id) {
  for (;;) {
    const p = pinById(id);
    if (!p) throw new Error("The comment was removed.");
    if (p.status === "applied" || p.status === "failed" || p.status === "undone") return p;
    await sleep(150);
    gone(d);
  }
}

async function stepPin(type, d, st) {
  await canvasReady(d);
  check(d);
  let pin = d.pins[type] ? pinById(d.pins[type]) : null;
  if (pin?.status === "applied") {
    st.note = `Applied as v${versionNo(pin.resultId) ?? "?"}`;
    return;
  }
  if (!pin || pin.status === "undone") {
    const s = SPOTS[type];
    const [jx, jy] = d.theme.jitter[type];
    const cx = type === "lounge" ? 0.5 + d.theme.loungeSide * (0.5 - s.cx) + jx : s.cx + jx;
    pin = placePin(cx, s.cy + jy, { r: s.r });
    d.pins[type] = pin.id;
    await sleep(350);
    const text = d.theme.comments[type];
    const chunk = Math.max(2, Math.ceil(text.length / 28));
    for (let i = chunk; i < text.length; i += chunk) {
      gone(d);
      setDraftText(pin, text.slice(0, i));
      await sleep(35);
    }
    setDraftText(pin, text);
    const item = S.library.status === "done" ? pickItem(type, d.theme) : null;
    if (item) {
      attachLib(pin, item);
      await sleep(500);
    }
    st.note = item ? `“${text.slice(0, 48)}…” with ${item.label}` : `“${text.slice(0, 60)}…”`;
    sendPin(pin);
  } else if (pin.status === "failed") retryPin(pin.id);
  else if (pin.status === "draft") sendPin(pin);
  hooks.render();
  let p = await waitPin(d, pin.id);
  if (p.status === "failed") {
    st.note = `Retrying after: ${p.error}`;
    hooks.render();
    retryPin(p.id);
    p = await waitPin(d, pin.id);
  }
  if (p.status !== "applied") {
    st.warn = true;
    st.note = `Not applied: ${p.error || p.status}`;
    return;
  }
  const v = versionNo(p.resultId);
  if (p.qa) {
    st.warn = true;
    st.note = `v${v} shown; QA override: ${p.qa}`;
  } else st.note = `Applied as v${v}`;
  await sleep(600);
}

async function stepLook(d, st) {
  await canvasReady(d);
  const base = currentBase();
  if (!base) throw new Error("No approved design to look around.");
  await lookAround(base, { alive: () => alive(d) });
  st.note = `360 view of v${versionNo(base) ?? 0}`;
  await sleep(2500);
}

async function stepPresent(d, st) {
  document.querySelectorAll(".modal .modal-head button").forEach((b) => b.click());
  hooks.present?.();
  st.note = "Presentation open";
}

const RUNNERS = {
  photos: stepPhotos, screen: stepScreen, overview: stepOverview, look: stepLook, present: stepPresent,
  doodle: async (d, st) => {
    await canvasReady(d);
    st.note = "Venue ready: circle or sketch on it and attach your decor";
  },
  "pin:entry": (d, st) => stepPin("entry", d, st), "pin:stage": (d, st) => stepPin("stage", d, st), "pin:lounge": (d, st) => stepPin("lounge", d, st),
};

function runDemo(d) {
  if (d.runner) return d.runner;
  d.state = "running";
  d.stop = false;
  d.error = null;
  d.dockOpen = true;
  hooks.render();
  d.runner = (async () => {
    try {
      loadLibrary().catch(() => {});
      for (const st of d.steps) {
        if (!alive(d)) throw ABORT;
        if (st.status === "done") continue;
        if (d.stop) throw STOP;
        Object.assign(st, { status: "running", start: Date.now(), end: null, error: null, note: null, warn: false });
        hooks.render();
        try {
          if (st.key.startsWith("pin:") && S.library.status !== "done") await loadLibrary().catch(() => {});
          await RUNNERS[st.key](d, st);
          st.status = "done";
        } catch (e) {
          st.status = e === STOP ? "stopped" : e === ABORT ? "pending" : "failed";
          if (st.status === "failed") st.error = e?.message || String(e);
          throw e;
        } finally {
          st.end = Date.now();
          hooks.render();
        }
      }
      d.state = "done";
      toast("The venue is ready. Circle or sketch where decor should go and pick a decor angle.", { type: "success", title: "Demo complete" });
    } catch (e) {
      if (e === ABORT || !alive(d)) return;
      if (e === STOP) {
        d.state = "stopped";
        toast("Demo stopped. Resume it any time, or carry on by hand.", { title: "Demo" });
      } else {
        d.state = "failed";
        d.error = e?.message || String(e);
        toastErr(e, "Demo stopped");
      }
    } finally {
      d.runner = null;
      hooks.render();
    }
  })();
  return d.runner;
}

async function startDemo(choice) {
  if (S.demo?.runner) {
    S.demo.dockOpen = true;
    return hooks.render();
  }
  let presets;
  try {
    presets = await loadPresets();
  } catch (e) {
    return toastErr(e, "Demo unavailable");
  }
  const last = store.get(LAST_DEMO_KEY, null);
  let venue = presets.venues.find((v) => v.id === choice);
  if (!venue) {
    const others = presets.venues.filter((v) => v.id !== last?.venueId);
    venue = pick(others.length ? others : presets.venues);
  }
  const theme = makeTheme();
  store.set(LAST_DEMO_KEY, { venueId: venue.id, themeId: theme.id });
  const cur = pid();
  if (cur && !store.get(DEMO_IDS_KEY, []).includes(cur)) store.set(PREV_KEY, cur);
  store.del(PROJECT_KEY);
  resetLocal();
  syncSlots();
  S.demo = {
    venue,
    venueName: venue.name || venue.id,
    theme,
    steps: DEMO_STEPS.map((s) => ({ ...s, status: "pending" })),
    state: "idle",
    stop: false,
    runner: null,
    projectId: null,
    blobs: null,
    pins: {},
    dockOpen: true,
  };
  runDemo(S.demo);
}

export function stopDemo() {
  const d = S.demo;
  if (!d || !d.runner || d.stop) return;
  d.stop = true;
  toast("Stopping after the current step finishes.", { title: "Demo" });
  hooks.render();
}
export function resumeDemo() {
  const d = S.demo;
  if (!d || d.runner || !d.projectId || d.projectId !== pid()) return;
  for (const st of d.steps) if (st.status !== "done") Object.assign(st, { status: "pending", error: null });
  runDemo(d);
}
export const demoRunning = () => !!S.demo?.runner;

export function openDemoPanel() {
  if (S.demo?.runner) {
    S.demo.dockOpen = true;
    return hooks.render();
  }
  const select = h("select", { id: "demo-venue", class: "select", disabled: true }, h("option", { value: "surprise" }, "Loading venues"));
  const status = h("div", { class: "progress", role: "status" });
  let m;
  const run = btn("Run the demo", () => {
    const choice = select.value;
    m.close();
    startDemo(choice);
  }, { primary: true, disabled: true, id: "demo-run" });
  const load = () => {
    status.hidden = false;
    status.className = "progress";
    status.replaceChildren(h("span", { class: "live-dot", "aria-hidden": "true" }), "Loading demo venues");
    loadPresets()
      .then((p) => {
        select.replaceChildren(h("option", { value: "surprise" }, "Surprise me"), ...p.venues.map((v) => h("option", { value: v.id }, `${v.name || v.id} (${v.photos.length} photo${v.photos.length === 1 ? "" : "s"})`)));
        select.disabled = false;
        run.disabled = false;
        status.hidden = true;
      })
      .catch((e) => {
        status.className = "alert";
        status.replaceChildren(h("strong", null, "Demo unavailable. "), e.message, " ", h("button", { type: "button", class: "link-btn", onclick: load }, "Try again"));
      });
  };
  const body = h(
    "div",
    { class: "stack" },
    h("p", { class: "muted" }, "Creates a new project from a preset venue: uploads the photos, builds the isometric and 360 view, then places three comments one after another (entrance, stage, lounge), each with a library reference and applied in real time, and ends with a look around and the presentation. Each run draws a new theme; your current project is kept."),
    h("label", { class: "field" }, h("span", null, "Venue"), select),
    status,
    h("div", { class: "row" }, run),
    h("p", { class: "hint" }, "You can stop the demo at any time and resume it, or carry on by hand."),
  );
  m = modal("Demo", body);
  load();
}

const STATUS_TEXT = { pending: "Waiting", running: "Running", done: "Done", failed: "Failed", stopped: "Stopped" };
export function renderDemoDock() {
  let dock = document.getElementById("demo-dock");
  const d = S.demo;
  if (!d || !d.dockOpen || (d.projectId && d.projectId !== pid()) || S.presenting) {
    dock?.remove();
    return;
  }
  if (!dock) {
    dock = h("aside", { id: "demo-dock", class: "dock", "aria-label": "Demo timeline" });
    document.body.append(dock);
  }
  const stateText = { running: d.stop ? "Stopping" : "Running", stopped: "Stopped", failed: "Stopped with an error", done: "Complete", idle: "Starting" }[d.state] || d.state;
  dock.replaceChildren(
    h(
      "div",
      { class: "dock-head" },
      h("div", null, h("p", { class: "eyebrow" }, `Demo · ${stateText}`), h("h2", { class: "dock-title" }, d.theme.name), h("p", { class: "muted small" }, d.venueName)),
      h("button", { type: "button", class: "btn btn-ghost btn-sm", "aria-label": "Hide the demo timeline", onclick: () => {
        d.dockOpen = false;
        hooks.render();
      } }, "Hide"),
    ),
    h("div", { class: "swatches", "aria-label": "Theme palette" }, d.theme.palette.map(([name, hex]) => h("span", { class: "swatch", title: name, style: `background:${hex}` }))),
    h(
      "ol",
      { class: "timeline" },
      d.steps.map((s) =>
        h(
          "li",
          { class: `tl tl-${s.status}${s.warn ? " tl-warn" : ""}` },
          h("span", { class: "tl-dot", "aria-hidden": "true" }),
          h(
            "div",
            { class: "tl-body" },
            h("div", { class: "tl-row" }, h("span", { class: "tl-label" }, s.label), h("span", { class: "tl-state" }, s.status === "running" ? h("span", { class: "tl-time", dataset: { since: String(s.start) } }, fmtElapsed(Date.now() - s.start)) : s.status === "done" && s.end ? fmtElapsed(s.end - s.start) : STATUS_TEXT[s.status])),
            s.error ? h("p", { class: "tl-error", role: "alert" }, s.error) : s.note ? h("p", { class: "tl-note" }, s.note) : null,
          ),
        ),
      ),
    ),
    h(
      "div",
      { class: "row" },
      d.runner ? btn(d.stop ? "Stopping" : "Stop", stopDemo, { small: true, disabled: d.stop, id: "demo-stop" }) : null,
      !d.runner && d.state !== "done" && d.projectId === pid() ? btn("Resume", resumeDemo, { small: true, primary: true, id: "demo-resume" }) : null,
      !d.runner && store.get(PREV_KEY, null) ? btn("Back to my project", () => hooks.backToProject?.(), { small: true, quiet: true }) : null,
    ),
  );
}
