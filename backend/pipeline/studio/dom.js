// Small DOM + runtime helpers shared by the Venue Studio modules.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const SVG_TAGS = new Set(["svg", "g", "path", "ellipse", "circle", "line", "rect", "defs", "linearGradient", "radialGradient", "stop", "filter", "feGaussianBlur", "feMerge", "feMergeNode", "text", "polyline", "clipPath", "mask"]);
export const SVG_NS = "http://www.w3.org/2000/svg";

export function h(tag, props, ...kids) {
  const svg = SVG_TAGS.has(tag);
  const el = svg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [key, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (key === "class") svg ? el.setAttribute("class", v) : (el.className = v);
    else if (key === "style") el.style.cssText = v;
    else if (key === "value") el.value = v;
    else if (key === "dataset") Object.assign(el.dataset, v);
    else if (key.startsWith("on") && typeof v === "function") el.addEventListener(key.slice(2).toLowerCase(), v);
    else el.setAttribute(key, v === true ? "" : String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  return el;
}

export function uuid() {
  if (globalThis.crypto?.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      /* insecure context */
    }
  }
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function rnd() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
}
export const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: memory only */
    }
  },
  del(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const reducedMotion = () => {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

export function fmtElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function toast(message, { type = "info", title, timeout } = {}) {
  const box = document.getElementById("toasts");
  if (!box) return;
  const close = () => el.remove();
  const el = h(
    "div",
    { class: `toast toast-${type}`, role: type === "error" ? "alert" : "status" },
    h("div", { class: "toast-text" }, title ? h("strong", null, title) : null, h("span", null, message)),
    h("button", { type: "button", class: "toast-x", "aria-label": "Dismiss", onclick: close }, "×"),
  );
  box.append(el);
  setTimeout(close, timeout ?? (type === "error" ? 10000 : 4500));
}
export const toastErr = (e, title = "Something went wrong") => toast(e?.message || String(e), { type: "error", title });

// Icons: simple stroked SVG glyphs drawn for this UI (no logo or stock icon sets).
const ICONS = {
  highlight: "M4 17c3-6 9-11 14-11 2 0 3 1 3 3 0 5-6 9-12 9-3 0-5-1-5-1z",
  move: "M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3",
  erase: "M7 20h10M5 15l8-9 6 6-6 7H9z",
  undo: "M9 7H4V2M4 7a9 9 0 1 1-1 7",
  redo: "M15 7h5V2M20 7a9 9 0 1 0 1 7",
  compare: "M12 3v18M5 6h4v12H5zM15 6h4v12h-4z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  phone: "M8 2h8v20H8zM11 18h2",
  library: "M4 4h6v16H4zM14 4l6 2-4 14-6-2z",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  history: "M12 7v5l3 2M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  close: "M6 6l12 12M18 6L6 18",
  check: "M5 12l5 5 9-10",
  orbit: "M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M2 12c0-3 4.5-5 10-5s10 2 10 5-4.5 5-10 5S2 15 2 12z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  spark: "M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z",
  panel: "M3 4h18v16H3zM15 4v16",
  chevron: "M9 6l6 6-6 6",
};
export function icon(name, size = 18) {
  return h(
    "svg",
    { class: "ico", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false" },
    h("path", { d: ICONS[name] || "" }),
  );
}
