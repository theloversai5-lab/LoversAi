// Orbit control: a small pseudo-3D dial for choosing a camera angle around an element.
// Drag horizontally for azimuth (45 degree steps), vertically for elevation (-30/0/30/60/90).
import { h, clamp } from "./dom.js";
import { snapAzimuth, snapElevation, angleLabel, ZOOMS, ELEVATIONS, AZIMUTHS } from "./geom.js";

const CX = 100;
const CY = 96;
const ORB_R = 62;
const TILT = 0.34;

function orbitProject(az, el, r = ORB_R) {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  const X = Math.sin(a) * Math.cos(e);
  const Z = Math.cos(a) * Math.cos(e); // toward the viewer = front
  const Y = Math.sin(e);
  return { x: CX + r * X, y: CY - r * 0.82 * Y + r * TILT * Z, front: Z };
}

export function createOrbit({ value, onChange }) {
  let cur = { azimuth: snapAzimuth(value?.azimuth ?? 315), elevation: snapElevation(value?.elevation ?? 30), zoom: value?.zoom ?? 5 };
  const labelEl = h("div", { class: "orbit-label", "aria-live": "polite" });
  const ring = h("ellipse", { cx: CX, cy: CY, rx: ORB_R, ry: ORB_R * TILT, class: "orbit-ring" });
  const meridian = h("path", { class: "orbit-meridian" });
  const beam = h("line", { class: "orbit-beam" });
  const cam = h("circle", { r: 7, class: "orbit-cam" });
  const camHalo = h("circle", { r: 13, class: "orbit-cam-halo" });
  const subject = h(
    "g",
    { class: "orbit-subject" },
    h("path", { d: `M${CX - 14} ${CY - 2} L${CX} ${CY - 9} L${CX + 14} ${CY - 2} L${CX} ${CY + 5} Z`, class: "orbit-top" }),
    h("path", { d: `M${CX - 14} ${CY - 2} L${CX} ${CY + 5} L${CX} ${CY + 19} L${CX - 14} ${CY + 12} Z`, class: "orbit-left" }),
    h("path", { d: `M${CX + 14} ${CY - 2} L${CX} ${CY + 5} L${CX} ${CY + 19} L${CX + 14} ${CY + 12} Z`, class: "orbit-right" }),
  );
  const ticks = AZIMUTHS.map((az) => {
    const p = orbitProject(az, 0);
    const t = h("circle", { cx: p.x, cy: p.y, r: 3.2, class: "orbit-tick", dataset: { az: String(az) } });
    return t;
  });
  const frontMark = h("text", { x: CX, y: CY + ORB_R * TILT + 16, class: "orbit-front", "text-anchor": "middle" }, "FRONT");
  const svg = h(
    "svg",
    { viewBox: "0 0 200 176", class: "orbit-svg", "aria-hidden": "true" },
    h("defs", null, h("linearGradient", { id: "orbitGrad", x1: "0", y1: "0", x2: "1", y2: "1" }, h("stop", { offset: "0", "stop-color": "#D9A36F" }), h("stop", { offset: "1", "stop-color": "#EC6FC4" }))),
    ring,
    ...ticks,
    meridian,
    subject,
    beam,
    camHalo,
    cam,
    frontMark,
  );
  const pad = h(
    "div",
    {
      class: "orbit-pad",
      tabindex: "0",
      role: "group",
      "aria-label": "Camera angle. Drag left or right to orbit, up or down to change height. Arrow keys also work.",
    },
    svg,
  );
  const zoomInput = h("input", { type: "range", min: "0", max: "2", step: "1", class: "orbit-zoom", "aria-label": "Framing: wide, medium or close-up" });
  const zoomRow = h(
    "div",
    { class: "orbit-zoom-row" },
    zoomInput,
    h("div", { class: "orbit-zoom-ticks", "aria-hidden": "true" }, ZOOMS.map((z) => h("span", null, z.label))),
  );
  const el = h("div", { class: "orbit" }, pad, zoomRow, labelEl);

  const paint = () => {
    const p = orbitProject(cur.azimuth, cur.elevation);
    cam.setAttribute("cx", p.x);
    cam.setAttribute("cy", p.y);
    camHalo.setAttribute("cx", p.x);
    camHalo.setAttribute("cy", p.y);
    beam.setAttribute("x1", p.x);
    beam.setAttribute("y1", p.y);
    beam.setAttribute("x2", CX);
    beam.setAttribute("y2", CY + 4);
    el.classList.toggle("behind", p.front < -0.05);
    const pts = [];
    for (let e = -30; e <= 90; e += 10) {
      const q = orbitProject(cur.azimuth, e);
      pts.push(`${pts.length ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`);
    }
    meridian.setAttribute("d", pts.join(" "));
    ticks.forEach((t) => t.classList.toggle("on", Number(t.dataset.az) === cur.azimuth && cur.elevation !== 90));
    const zi = ZOOMS.reduce((best, z, i) => (Math.abs(z.value - cur.zoom) < Math.abs(ZOOMS[best].value - cur.zoom) ? i : best), 0);
    zoomInput.value = String(zi);
    labelEl.textContent = angleLabel(cur.azimuth, cur.elevation, cur.zoom);
  };
  const set = (next, emit = true) => {
    const n = {
      azimuth: snapAzimuth(next.azimuth ?? cur.azimuth),
      elevation: snapElevation(next.elevation ?? cur.elevation),
      zoom: clamp(Number(next.zoom ?? cur.zoom), 0, 10),
    };
    const changed = n.azimuth !== cur.azimuth || n.elevation !== cur.elevation || n.zoom !== cur.zoom;
    cur = n;
    paint();
    if (changed && emit) onChange?.({ ...cur });
  };

  let drag = null;
  pad.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const tick = e.target.closest?.(".orbit-tick");
    if (tick) {
      set({ azimuth: Number(tick.dataset.az), elevation: cur.elevation === 90 ? 30 : cur.elevation });
      return;
    }
    try {
      pad.setPointerCapture?.(e.pointerId);
    } catch {
      /* unsupported */
    }
    drag = { x: e.clientX, y: e.clientY, az: cur.azimuth, ei: ELEVATIONS.indexOf(cur.elevation) };
    pad.classList.add("dragging");
    e.preventDefault();
  });
  pad.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const steps = Math.round((e.clientX - drag.x) / 26);
    const esteps = Math.round((drag.y - e.clientY) / 24);
    set({ azimuth: drag.az + steps * 45, elevation: ELEVATIONS[clamp(drag.ei + esteps, 0, ELEVATIONS.length - 1)] });
  });
  const end = () => {
    drag = null;
    pad.classList.remove("dragging");
  };
  pad.addEventListener("pointerup", end);
  pad.addEventListener("pointercancel", end);
  pad.addEventListener("keydown", (e) => {
    const ei = ELEVATIONS.indexOf(cur.elevation);
    if (e.key === "ArrowLeft") set({ azimuth: cur.azimuth - 45 });
    else if (e.key === "ArrowRight") set({ azimuth: cur.azimuth + 45 });
    else if (e.key === "ArrowUp") set({ elevation: ELEVATIONS[Math.min(ELEVATIONS.length - 1, ei + 1)] });
    else if (e.key === "ArrowDown") set({ elevation: ELEVATIONS[Math.max(0, ei - 1)] });
    else return;
    e.preventDefault();
    e.stopPropagation();
  });
  zoomInput.addEventListener("input", () => set({ zoom: ZOOMS[Number(zoomInput.value)]?.value ?? 5 }));
  paint();
  return { el, set, get: () => ({ ...cur }) };
}
