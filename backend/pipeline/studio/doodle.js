// Design canvas viewport: the venue image with pan/zoom (wheel, buttons, pinch), a tap callback in
// normalized image coordinates, drag-and-drop, and a left-to-right wipe reveal for new versions.
// Pins and the comment pill are drawn by design.js into `overlay` (screen space) on every layout.
import { h, clamp, reducedMotion } from "./dom.js";

export const PIN_AREA = 0.09; // default radius of influence, as a fraction of the image's shorter side
const TAP_SLOP = 4;

export function createDesignCanvas(opts = {}) {
  // userMoved: the planner zoomed or panned, so resizes keep their view instead of refitting.
  const st = { W: 0, H: 0, s: 1, tx: 0, ty: 0, fitS: 1, tool: "comment", readonly: false, url: null, pointers: new Map(), pinch: null, drag: null, space: false, dead: false, userMoved: false };

  const base = h("img", { class: "dc-base", alt: "", draggable: "false", decoding: "async" });
  const reveal = h("img", { class: "dc-reveal", alt: "", draggable: "false", hidden: true });
  const wipeEdge = h("div", { class: "dc-wipe-edge", hidden: true });
  const world = h("div", { class: "dc-world" }, base, reveal, wipeEdge);
  const overlay = h("div", { class: "dc-overlay" });
  const empty = h("div", { class: "dc-empty" }, h("div", { class: "skeleton dc-empty-sk" }), h("span", null, "Loading the venue"));
  const viewport = h("div", { class: "dc-viewport", "data-tool": st.tool }, world, overlay, empty);
  const root = h("div", { class: "dc", role: "region", "aria-label": "Design canvas", tabindex: "-1" }, viewport);

  const vrect = () => viewport.getBoundingClientRect();
  const toWorld = (clientX, clientY) => {
    const r = vrect();
    return [(clientX - r.left - st.tx) / st.s, (clientY - r.top - st.ty) / st.s];
  };
  const toScreen = (nx, ny) => [nx * st.W * st.s + st.tx, ny * st.H * st.s + st.ty];
  const inImage = (wx, wy) => wx >= 0 && wy >= 0 && wx <= st.W && wy <= st.H;

  function layout() {
    if (st.W) opts.onLayout?.();
  }
  const applyTransform = () => {
    world.style.transform = `translate(${st.tx}px, ${st.ty}px) scale(${st.s})`;
    layout();
  };
  function fit() {
    if (!st.W) return;
    const r = vrect();
    // Not laid out yet (hidden or detached): wait for the ResizeObserver instead of fitting to a guess.
    if (!r.width || !r.height) return;
    const wide = r.width > 700;
    const padX = wide ? 72 : 12;
    // Room at the bottom for the floating sketch bar.
    const padTop = wide ? 20 : 56;
    const padBottom = wide ? 76 : 72;
    st.fitS = Math.max(0.01, Math.min((r.width - padX * 2) / st.W, (r.height - padTop - padBottom) / st.H));
    st.s = st.fitS;
    st.tx = (r.width - st.W * st.s) / 2;
    st.ty = padTop + (r.height - padTop - padBottom - st.H * st.s) / 2;
    st.userMoved = false;
    applyTransform();
  }
  function zoomAt(ns, cx, cy) {
    if (!st.W) return;
    const r = vrect();
    if (cx == null) {
      cx = (r.width || 800) / 2;
      cy = (r.height || 500) / 2;
    }
    const wx = (cx - st.tx) / st.s;
    const wy = (cy - st.ty) / st.s;
    st.s = clamp(ns, st.fitS * 0.5, st.fitS * 8);
    st.userMoved = true;
    st.tx = cx - wx * st.s;
    st.ty = cy - wy * st.s;
    applyTransform();
  }

  /* ---------- pointers: tap = comment, drag = pan, two fingers = pinch ---------- */
  const onDown = (e) => {
    if (!st.W) return;
    if (e.target.closest?.("[data-ui]")) return;
    if (e.pointerType === "mouse" && e.button === 2) return;
    try {
      viewport.setPointerCapture?.(e.pointerId);
    } catch {
      /* unsupported */
    }
    st.pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (st.pointers.size === 2) {
      st.drag = null;
      const [a, b] = [...st.pointers.values()];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      st.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, s: st.s, w: toWorld(mid[0], mid[1]) };
      return;
    }
    if (st.pointers.size > 2) return;
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    const pan = e.button === 1 || st.space || st.tool === "pan";
    if (!pan && st.tool === "sketch") {
      if (st.readonly) return opts.onTap?.(wx / st.W, wy / st.H, { readonly: true });
      if (!inImage(wx, wy)) return opts.onTapOutside?.();
      st.drag = { kind: "sketch", pts: [[wx / st.W, wy / st.H]], last: [e.clientX, e.clientY] };
      return;
    }
    st.drag = { kind: pan ? "pan" : "tap", x: e.clientX, y: e.clientY, tx: st.tx, ty: st.ty, wx, wy, moved: false };
    if (pan) viewport.classList.add("panning");
  };
  const onMove = (e) => {
    if (!st.pointers.has(e.pointerId)) return;
    st.pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (st.pinch && st.pointers.size >= 2) {
      const [a, b] = [...st.pointers.values()];
      const r = vrect();
      const mid = [(a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top];
      st.s = clamp((st.pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1])) / st.pinch.d, st.fitS * 0.5, st.fitS * 8);
      st.userMoved = true;
      st.tx = mid[0] - st.pinch.w[0] * st.s;
      st.ty = mid[1] - st.pinch.w[1] * st.s;
      applyTransform();
      return;
    }
    const d = st.drag;
    if (!d) return;
    if (d.kind === "sketch") {
      if (Math.hypot(e.clientX - d.last[0], e.clientY - d.last[1]) < 2) return;
      d.last = [e.clientX, e.clientY];
      const [wx, wy] = toWorld(e.clientX, e.clientY);
      d.pts.push([clamp(wx / st.W, 0, 1), clamp(wy / st.H, 0, 1)]);
      opts.onSketchMove?.(d.pts);
      return;
    }
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < TAP_SLOP) return;
    d.moved = true;
    viewport.classList.add("panning");
    st.userMoved = true;
    st.tx = d.tx + e.clientX - d.x;
    st.ty = d.ty + e.clientY - d.y;
    applyTransform();
  };
  const onUp = (e) => {
    st.pointers.delete(e.pointerId);
    if (st.pointers.size < 2) st.pinch = null;
    if (st.pointers.size) return;
    viewport.classList.remove("panning");
    const d = st.drag;
    st.drag = null;
    if (d?.kind === "sketch") {
      opts.onSketchMove?.(null);
      if (d.pts.length >= 2 && e.type !== "pointercancel") opts.onSketch?.(d.pts);
      return;
    }
    if (d?.kind === "tap" && !d.moved && e.type !== "pointercancel") {
      if (inImage(d.wx, d.wy)) opts.onTap?.(d.wx / st.W, d.wy / st.H, { readonly: st.readonly });
      else opts.onTapOutside?.();
    }
  };
  const onWheel = (e) => {
    if (!st.W || e.target.closest?.("[data-ui]")) return;
    e.preventDefault();
    const r = vrect();
    const dy = e.deltaY * (e.deltaMode === 1 ? 33 : 1);
    zoomAt(st.s * Math.exp(-dy * 0.0015), e.clientX - r.left, e.clientY - r.top);
  };
  viewport.addEventListener("pointerdown", onDown);
  viewport.addEventListener("pointermove", onMove);
  viewport.addEventListener("pointerup", onUp);
  viewport.addEventListener("pointercancel", onUp);
  viewport.addEventListener("wheel", onWheel, { passive: false });
  viewport.addEventListener("contextmenu", (e) => e.preventDefault());

  /* ---------- drag and drop (library images, files) ---------- */
  viewport.addEventListener("dragover", (e) => {
    if (!st.W || st.readonly) return;
    e.preventDefault();
    viewport.classList.add("dropping");
  });
  viewport.addEventListener("dragleave", (e) => {
    if (!viewport.contains(e.relatedTarget)) viewport.classList.remove("dropping");
  });
  viewport.addEventListener("drop", (e) => {
    viewport.classList.remove("dropping");
    if (!st.W || st.readonly) return;
    e.preventDefault();
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    opts.onDrop?.(clamp(wx / st.W, 0, 1), clamp(wy / st.H, 0, 1), e.dataTransfer, e.target);
  });

  let ro = null;
  if (typeof ResizeObserver === "function") {
    ro = new ResizeObserver(() => (st.W ? (st.userMoved ? layout() : fit()) : null));
    ro.observe(viewport);
  }

  return {
    root,
    overlay,
    get tool() {
      return st.tool;
    },
    get size() {
      return { W: st.W, H: st.H };
    },
    get scale() {
      return st.s;
    },
    get url() {
      return st.url;
    },
    toScreen,
    setImage(url, W, H) {
      const resized = W !== st.W || H !== st.H;
      st.url = url;
      st.W = W;
      st.H = H;
      base.src = url;
      world.style.width = `${W}px`;
      world.style.height = `${H}px`;
      empty.hidden = true;
      if (resized) fit();
      else layout();
    },
    setEmpty(text) {
      empty.hidden = false;
      empty.lastChild.textContent = text;
    },
    setTool(tool) {
      st.tool = tool;
      viewport.dataset.tool = tool;
    },
    setSpace(on) {
      st.space = on;
      viewport.classList.toggle("space", on);
    },
    setReadonly(on) {
      st.readonly = !!on;
      root.classList.toggle("dc-readonly", st.readonly);
    },
    // Wipes the new image in over the current one (left to right). Resolves when finished.
    reveal(url, W, H) {
      return new Promise((resolve) => {
        if (W !== st.W || H !== st.H || reducedMotion() || !st.url) {
          this.setImage(url, W, H);
          return resolve();
        }
        reveal.src = url;
        reveal.hidden = false;
        wipeEdge.hidden = false;
        const t0 = performance.now();
        const dur = 700;
        const step = (now) => {
          if (st.dead) return resolve();
          const t = clamp((now - t0) / dur, 0, 1);
          const k = 1 - (1 - t) ** 2;
          reveal.style.clipPath = `inset(0 ${((1 - k) * 100).toFixed(2)}% 0 0)`;
          wipeEdge.style.left = `${(k * 100).toFixed(2)}%`;
          if (t < 1) requestAnimationFrame(step);
          else {
            this.setImage(url, W, H);
            reveal.hidden = true;
            wipeEdge.hidden = true;
            reveal.style.clipPath = "";
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    },
    zoomBy: (f) => zoomAt(st.s * f),
    fit,
    // Fit again unless the planner has zoomed or panned.
    refit: () => (st.userMoved ? layout() : fit()),
    layout,
    destroy() {
      st.dead = true;
      ro?.disconnect();
    },
  };
}
