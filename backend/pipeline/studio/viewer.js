// Self-contained 2D-canvas "look around" viewer for wide panoramas (no WebGL, no CDN).
// Asset loading is injected so the viewer has no API knowledge.
import { h, clamp, reducedMotion } from "./dom.js";

const VIEW_STATE = new Map(); // key -> { yaw, py, zoom } kept across re-renders
const AUTO_SPEED = 1 / 90; // auto-rotate: one full turn in 90 s
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

export function clearViewerState() {
  VIEW_STATE.clear();
}

// opts: { key, getSource: () => Promise<{img,w,h}>, wrap = true, label, onFlat }
export function createViewer({ key, getSource, wrap = true, label = "360 view", onFlat }) {
  const wrapX = wrap;
  const box = h("div", { class: "viewer", role: "region", tabindex: "0", "aria-label": `${label}. Drag, use the arrow keys, or the zoom buttons to look around.` });
  const canvas = h("canvas", { class: "viewer-canvas", "aria-hidden": "true" });
  const msg = h("div", { class: "viewer-msg" });
  const zIn = h("button", { type: "button", class: "viewer-btn", "aria-label": "Zoom in", title: "Zoom in" }, "+");
  const zOut = h("button", { type: "button", class: "viewer-btn", "aria-label": "Zoom out", title: "Zoom out" }, "−");
  const fsBtn = h("button", { type: "button", class: "viewer-btn viewer-btn-text", "aria-label": "Fullscreen" }, "Fullscreen");
  const hint = h("div", { class: "viewer-hint", "aria-hidden": "true" }, "Drag to look around");
  box.append(canvas, h("div", { class: "viewer-ctrls" }, zOut, zIn, fsBtn), hint, msg);
  canvas.style.touchAction = "pan-y";

  const saved = VIEW_STATE.get(key);
  const v = {
    src: null, yaw: saved?.yaw ?? 0, py: saved?.py ?? 0.5, zoom: saved?.zoom ?? 1,
    W: 0, H: 0, dpr: 1, dir: 1, idleUntil: 0, last: 0, raf: 0, dead: false, attached: false,
    dirty: true, needSize: true, pointers: new Map(), pinch: null,
  };
  const ctx = canvas.getContext("2d");
  const reduce = reducedMotion();

  const geom = () => {
    const s = Math.max(v.H / v.src.h, v.W / v.src.w) * v.zoom;
    return { dw: v.src.w * s, dh: v.src.h * s };
  };
  const maxYaw = () => {
    const { dw } = geom();
    return Math.max(0, (dw - v.W) / dw);
  };
  const normalize = () => {
    v.zoom = clamp(v.zoom, 1, 2.5);
    v.py = clamp(v.py, 0, 1);
    if (wrapX) v.yaw = ((v.yaw % 1) + 1) % 1;
    else v.yaw = clamp(v.yaw, 0, maxYaw());
  };
  const kick = () => {
    if (!v.dead && !v.raf) v.raf = requestAnimationFrame(frame);
  };
  const poke = () => {
    v.idleUntil = performance.now() + 4000;
    v.dirty = true;
    hint.classList.add("gone");
    kick();
  };
  const resize = () => {
    const W = box.clientWidth;
    const H = box.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (W === v.W && H === v.H && dpr === v.dpr) return;
    Object.assign(v, { W, H, dpr });
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    v.dirty = true;
  };
  const paint = () => {
    if (!v.src || !ctx || !v.W || !v.H) return;
    normalize();
    const { dw, dh } = geom();
    const d = v.dpr;
    const oy = v.py * Math.max(0, dh - v.H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (wrapX) {
      for (let x = -((v.yaw * dw) % dw); x < v.W; x += dw)
        ctx.drawImage(v.src.img, Math.floor(x * d), Math.round(-oy * d), Math.ceil(dw * d) + 1, Math.round(dh * d));
    } else {
      ctx.drawImage(v.src.img, Math.round(-v.yaw * dw * d), Math.round(-oy * d), Math.round(dw * d), Math.round(dh * d));
    }
  };
  function frame(now) {
    v.raf = 0;
    if (v.dead) return;
    if (!box.isConnected) {
      if (v.attached) return destroy();
      return kick();
    }
    v.attached = true;
    if (v.needSize) {
      v.needSize = false;
      resize();
    }
    const dt = v.last ? Math.min(0.1, (now - v.last) / 1000) : 0;
    v.last = now;
    let moving = false;
    if (v.src && !reduce && !v.pointers.size && now > v.idleUntil && !document.hidden) {
      if (wrapX) v.yaw += dt * AUTO_SPEED;
      else {
        const max = maxYaw();
        if (max > 0) {
          v.yaw += dt * AUTO_SPEED * 2 * v.dir;
          if (v.yaw >= max) v.dir = -1;
          if (v.yaw <= 0) v.dir = 1;
        }
      }
      v.dirty = true;
      moving = true;
    }
    if (v.dirty && v.src) {
      paint();
      v.dirty = false;
      VIEW_STATE.set(key, { yaw: v.yaw, py: v.py, zoom: v.zoom });
    }
    if (moving || !v.src || !reduce || v.dirty) kick();
  }
  const zoomAt = (z, cx = v.W / 2, cy = v.H / 2) => {
    if (!v.src || !v.W) return;
    const b = geom();
    const oy = v.py * Math.max(0, b.dh - v.H);
    const u = (v.yaw * b.dw + cx) / b.dw;
    const w = (oy + cy) / b.dh;
    v.zoom = clamp(z, 1, 2.5);
    const a = geom();
    v.yaw = (u * a.dw - cx) / a.dw;
    const slack = a.dh - v.H;
    v.py = slack > 0 ? (w * a.dh - cy) / slack : 0.5;
    canvas.style.touchAction = v.zoom > 1.01 ? "none" : "pan-y";
    poke();
  };
  const local = (x, y) => {
    const r = canvas.getBoundingClientRect();
    return [x - r.left, y - r.top];
  };
  const onDown = (e) => {
    if (!v.src) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch {
      /* unsupported */
    }
    v.pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (v.pointers.size === 2) {
      const [a, b] = [...v.pointers.values()];
      v.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, zoom: v.zoom };
    }
    box.classList.add("grabbing");
    poke();
  };
  const onMove = (e) => {
    const p = v.pointers.get(e.pointerId);
    if (!p || !v.src) return;
    const nx = e.clientX;
    const ny = e.clientY;
    v.pointers.set(e.pointerId, [nx, ny]);
    if (v.pointers.size >= 2 && v.pinch) {
      const [a, b] = [...v.pointers.values()];
      const [cx, cy] = local((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      zoomAt((v.pinch.zoom * Math.hypot(a[0] - b[0], a[1] - b[1])) / v.pinch.d, cx, cy);
      return;
    }
    const { dw, dh } = geom();
    v.yaw -= (nx - p[0]) / dw;
    const slack = dh - v.H;
    if (slack > 0) v.py -= (ny - p[1]) / slack;
    poke();
  };
  const onUp = (e) => {
    v.pointers.delete(e.pointerId);
    if (v.pointers.size < 2) v.pinch = null;
    if (!v.pointers.size) box.classList.remove("grabbing");
    poke();
  };
  const onWheel = (e) => {
    if (!v.src) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 33 : 1);
    if ((dy > 0 && v.zoom <= 1.001) || (dy < 0 && v.zoom >= 2.499)) return;
    e.preventDefault();
    const [cx, cy] = local(e.clientX, e.clientY);
    zoomAt(v.zoom * Math.exp(-dy * 0.0015), cx, cy);
  };
  const onKey = (e) => {
    if (!v.src) return;
    const step = { ArrowLeft: [-0.025, 0], ArrowRight: [0.025, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12] }[e.key];
    if (step) {
      e.preventDefault();
      e.stopPropagation();
      v.yaw += step[0] / v.zoom;
      v.py += step[1];
      poke();
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomAt(v.zoom * 1.25);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomAt(v.zoom / 1.25);
    } else if (e.key === "Escape" && box.classList.contains("viewer-max")) {
      e.stopPropagation();
      toggleFs();
    }
  };
  const setFsLabel = () => {
    const on = fsElement() === box || box.classList.contains("viewer-max");
    fsBtn.textContent = on ? "Exit fullscreen" : "Fullscreen";
    fsBtn.setAttribute("aria-label", on ? "Exit fullscreen" : "Fullscreen");
    v.needSize = true;
    v.dirty = true;
    kick();
  };
  const pseudoFs = (on) => {
    box.classList.toggle("viewer-max", on);
    document.body.classList.toggle("no-scroll", on);
    setFsLabel();
  };
  function toggleFs() {
    poke();
    if (box.classList.contains("viewer-max")) return pseudoFs(false);
    if (fsElement() === box) {
      try {
        const r = (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        r?.catch?.(() => {});
      } catch {
        /* ignore */
      }
      return;
    }
    const req = box.requestFullscreen || box.webkitRequestFullscreen;
    if (!req) return pseudoFs(true);
    try {
      const r = req.call(box);
      r?.catch?.(() => pseudoFs(true));
    } catch {
      pseudoFs(true);
    }
  }
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  box.addEventListener("wheel", onWheel, { passive: false });
  box.addEventListener("keydown", onKey);
  zIn.addEventListener("click", () => zoomAt(v.zoom * 1.25));
  zOut.addEventListener("click", () => zoomAt(v.zoom / 1.25));
  fsBtn.addEventListener("click", toggleFs);
  document.addEventListener("fullscreenchange", setFsLabel);
  document.addEventListener("webkitfullscreenchange", setFsLabel);
  const onResize = () => {
    v.needSize = true;
    kick();
  };
  let ro = null;
  if (typeof ResizeObserver === "function") {
    ro = new ResizeObserver(onResize);
    ro.observe(box);
  }
  window.addEventListener("resize", onResize);

  function destroy() {
    if (v.dead) return;
    v.dead = true;
    if (v.raf) cancelAnimationFrame(v.raf);
    ro?.disconnect();
    window.removeEventListener("resize", onResize);
    document.removeEventListener("fullscreenchange", setFsLabel);
    document.removeEventListener("webkitfullscreenchange", setFsLabel);
    if (box.classList.contains("viewer-max")) document.body.classList.remove("no-scroll");
  }
  const load = () => {
    msg.hidden = false;
    msg.className = "viewer-msg";
    msg.replaceChildren(h("span", { class: "spinner", "aria-hidden": "true" }), h("span", null, "Loading 360 view"));
    getSource()
      .then((src) => {
        if (v.dead) return;
        v.src = src;
        msg.hidden = true;
        v.needSize = true;
        v.dirty = true;
        kick();
      })
      .catch((e) => {
        if (v.dead) return;
        msg.className = "viewer-msg viewer-err";
        msg.replaceChildren(
          h(
            "div",
            { class: "viewer-err-box", role: "alert" },
            h("strong", null, "The 360 view could not be shown"),
            h("span", { class: "small" }, e?.message || String(e)),
            h(
              "div",
              { class: "row" },
              h("button", { type: "button", class: "btn btn-sm", onclick: load }, "Try again"),
              onFlat ? h("button", { type: "button", class: "btn btn-sm btn-ghost", onclick: onFlat }, "Open flat image") : null,
            ),
          ),
        );
      });
  };
  load();
  kick();
  return { el: box, destroy, get dead() { return v.dead; } };
}
