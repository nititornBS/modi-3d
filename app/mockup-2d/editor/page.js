"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { TEMPLATES } from "../templates";

// ─── Constants ────────────────────────────────────────────────────────────────

const BLEND_MODES = [
  { id: "normal",   label: "Normal",   canvas: "source-over" },
  { id: "multiply", label: "Multiply", canvas: "multiply"    },
  { id: "screen",   label: "Screen",   canvas: "screen"      },
  { id: "overlay",  label: "Overlay",  canvas: "overlay"     },
];

const HANDLES = [
  { id: "nw", x: 0,   y: 0,   cur: "nw-resize" },
  { id: "n",  x: 0.5, y: 0,   cur: "n-resize"  },
  { id: "ne", x: 1,   y: 0,   cur: "ne-resize" },
  { id: "e",  x: 1,   y: 0.5, cur: "e-resize"  },
  { id: "se", x: 1,   y: 1,   cur: "se-resize" },
  { id: "s",  x: 0.5, y: 1,   cur: "s-resize"  },
  { id: "sw", x: 0,   y: 1,   cur: "sw-resize" },
  { id: "w",  x: 0,   y: 0.5, cur: "w-resize"  },
];

// corner order: TL, TR, BR, BL
const CORNER_COLORS = ["#f472b6", "#818cf8", "#34d399", "#fb923c"];

function defaultBlend(category) {
  if (category === "banner") return { opacity: 0.97, blendMode: "normal" };
  return { opacity: 0.88, blendMode: "multiply" };
}

// ─── Perspective math ─────────────────────────────────────────────────────────
// Computes CSS matrix3d from 4 source → 4 destination point pairs (px coords).
// Uses the adjugate / basis-of-points homography approach.

function _adj3(m) {
  return [
    m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4],
    m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5],
    m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3],
  ];
}
function _mul3(a, b) {
  const c = Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) c[3*i+j] += a[3*i+k] * b[3*k+j];
  return c;
}
function _mulv3(m, v) {
  return [
    m[0]*v[0]+m[1]*v[1]+m[2]*v[2],
    m[3]*v[0]+m[4]*v[1]+m[5]*v[2],
    m[6]*v[0]+m[7]*v[1]+m[8]*v[2],
  ];
}
function _basisToPoints(pts) {
  const m = [pts[0].x,pts[1].x,pts[2].x, pts[0].y,pts[1].y,pts[2].y, 1,1,1];
  const v = _mulv3(_adj3(m), [pts[3].x, pts[3].y, 1]);
  return _mul3(m, [v[0],0,0, 0,v[1],0, 0,0,v[2]]);
}
function _homography(src, dst) {
  const H = _mul3(_basisToPoints(dst), _adj3(_basisToPoints(src)));
  const s = H[8] || 1;
  return H.map(v => v / s);
}
// H is row-major; CSS matrix3d is column-major 4×4 with perspective in last row
function _toCSSMatrix3d(H) {
  return `matrix3d(${H[0]},${H[3]},0,${H[6]},${H[1]},${H[4]},0,${H[7]},0,0,1,0,${H[2]},${H[5]},0,${H[8]})`;
}

// design.corners = [{dx,dy} × 4] offsets (in container-fraction units) from natural corners.
// Returns a CSS transform string for the img element inside the wrapper div.
function computePerspectiveCSS(design, cW, cH) {
  const W = design.w * cW, H = design.h * cH;
  const c = design.corners;
  const src = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
  const dst = [
    { x: c[0].dx * cW,         y: c[0].dy * cH       },
    { x: W + c[1].dx * cW,     y: c[1].dy * cH       },
    { x: W + c[2].dx * cW,     y: H + c[2].dy * cH   },
    { x: c[3].dx * cW,         y: H + c[3].dy * cH   },
  ];
  return _toCSSMatrix3d(_homography(src, dst));
}

// Returns the 4 actual corner positions in wrapper-relative fractions.
// Used to position handles on screen.
function cornerHandlePositions(design) {
  const c = design.corners;
  return [
    { x: c[0].dx / design.w,         y: c[0].dy / design.h         },
    { x: 1 + c[1].dx / design.w,     y: c[1].dy / design.h         },
    { x: 1 + c[2].dx / design.w,     y: 1 + c[2].dy / design.h     },
    { x: c[3].dx / design.w,         y: 1 + c[3].dy / design.h     },
  ];
}

// ─── Canvas perspective warp (scanline) ──────────────────────────────────────
// Draws img warped to the dst quadrilateral [TL, TR, BR, BL] (canvas px coords).

function _drawPerspectiveWarp(ctx, img, dst, opacity, blendMode) {
  const [TL, TR, BR, BL] = dst;
  const sW = img.naturalWidth, sH = img.naturalHeight;
  const N = Math.min(sH, 400);
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = blendMode;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N;
    const sy0 = t0 * sH, sH1 = (t1 - t0) * sH;
    const lx0=TL.x+(BL.x-TL.x)*t0, ly0=TL.y+(BL.y-TL.y)*t0;
    const rx0=TR.x+(BR.x-TR.x)*t0, ry0=TR.y+(BR.y-TR.y)*t0;
    const lx1=TL.x+(BL.x-TL.x)*t1, ly1=TL.y+(BL.y-TL.y)*t1;
    const rx1=TR.x+(BR.x-TR.x)*t1, ry1=TR.y+(BR.y-TR.y)*t1;
    const lxM=(lx0+lx1)/2, lyM=(ly0+ly1)/2;
    const rxM=(rx0+rx1)/2, ryM=(ry0+ry1)/2;
    const dW=Math.hypot(rxM-lxM,ryM-lyM);
    const dH=Math.hypot((lx1-lx0+rx1-rx0)/2,(ly1-ly0+ry1-ry0)/2);
    if (dW < 0.5 || dH < 0.5) continue;
    const ang=Math.atan2(ryM-lyM,rxM-lxM);
    const cos=Math.cos(ang), sin=Math.sin(ang);
    const sx=dW/sW, sy=dH/sH1;
    const syM=sy0+sH1/2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lx0,ly0); ctx.lineTo(rx0,ry0); ctx.lineTo(rx1,ry1); ctx.lineTo(lx1,ly1);
    ctx.closePath(); ctx.clip();
    ctx.setTransform(sx*cos,sx*sin,-sy*sin,sy*cos, lxM+sy*sin*syM, lyM-sy*cos*syM);
    ctx.drawImage(img, 0, sy0, sW, sH1, 0, sy0, sW, sH1);
    ctx.restore();
  }
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

function filterGrayscale(src, cb) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const g = d.data[i]*0.299 + d.data[i+1]*0.587 + d.data[i+2]*0.114;
      d.data[i] = d.data[i+1] = d.data[i+2] = g;
    }
    ctx.putImageData(d, 0, 0);
    cb(c.toDataURL());
  };
  img.src = src;
}

function filterDuotone(src, c1, c2, cb) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const t = (d.data[i]*0.299 + d.data[i+1]*0.587 + d.data[i+2]*0.114) / 255;
      d.data[i]   = c1[0]*(1-t) + c2[0]*t;
      d.data[i+1] = c1[1]*(1-t) + c2[1]*t;
      d.data[i+2] = c1[2]*(1-t) + c2[2]*t;
    }
    ctx.putImageData(d, 0, 0);
    cb(c.toDataURL());
  };
  img.src = src;
}

// ─── DesignElement ────────────────────────────────────────────────────────────

function DesignElement({
  design, isSelected, cDims,
  onPointerDownBody, onPointerDownHandle, onPointerDownRotate, onPointerDownCorner, onSelect,
}) {
  const hasPerspective = !!design.corners;

  // CSS matrix3d for warp mode
  const perspectiveTransform = hasPerspective && cDims.w > 1
    ? computePerspectiveCSS(design, cDims.w, cDims.h)
    : null;

  // Handle positions in wrapper-relative fractions
  const hPos = hasPerspective ? cornerHandlePositions(design) : null;

  return (
    <div
      style={{
        position: "absolute",
        left:   `${design.x * 100}%`,
        top:    `${design.y * 100}%`,
        width:  `${design.w * 100}%`,
        height: `${design.h * 100}%`,
        // In warp mode the img carries the transform, wrapper stays flat
        transform: hasPerspective
          ? "none"
          : `rotate(${design.rotation}deg) skewX(${design.skewX || 0}deg) skewY(${design.skewY || 0}deg)`,
        transformOrigin: "center center",
        opacity: design.opacity,
        mixBlendMode: design.blendMode,
        cursor: "move",
        zIndex: isSelected ? 20 : 10,
        userSelect: "none",
        overflow: "visible",
      }}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        onSelect();
        onPointerDownBody(e);
      }}
    >
      {/* Image – carries the perspective transform in warp mode */}
      <img
        src={design.displaySrc}
        alt=""
        draggable={false}
        style={{
          width: "100%", height: "100%",
          objectFit: "contain", display: "block", pointerEvents: "none",
          transform: perspectiveTransform || "none",
          transformOrigin: "0 0",
        }}
      />

      {isSelected && !hasPerspective && (
        <>
          <div style={{ position: "absolute", inset: -1, border: "2px dashed #a78bfa", borderRadius: 2, pointerEvents: "none" }} />

          {/* Rotation stem */}
          <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", width: 1, height: 20, background: "#a78bfa", opacity: 0.6, pointerEvents: "none" }} />

          {/* Rotation handle */}
          <div
            title="Rotate"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onPointerDownRotate(e); }}
            style={{
              position: "absolute", top: -36, left: "50%",
              transform: "translateX(-50%)",
              width: 20, height: 20,
              background: "linear-gradient(135deg,#7c3aed,#db2777)",
              border: "2px solid white", borderRadius: "50%", cursor: "grab",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 30, boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-4.21" />
            </svg>
          </div>

          {/* Resize handles */}
          {HANDLES.map((h) => (
            <div
              key={h.id}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onPointerDownHandle(e, h.id); }}
              style={{
                position: "absolute",
                left: `calc(${h.x * 100}% - 5px)`,
                top:  `calc(${h.y * 100}% - 5px)`,
                width: 10, height: 10,
                background: "white", border: "2px solid #7c3aed",
                borderRadius: 2, cursor: h.cur, zIndex: 30,
                boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
              }}
            />
          ))}
        </>
      )}

      {isSelected && hasPerspective && hPos && (
        <>
          {/* Quadrilateral outline via SVG */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", zIndex: 15 }}
          >
            <polygon
              points={hPos.map(p => `${p.x * 100},${p.y * 100}`).join(" ")}
              fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5 3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Corner drag handles */}
          {hPos.map((hp, i) => (
            <div
              key={i}
              title={["Top-Left", "Top-Right", "Bottom-Right", "Bottom-Left"][i]}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onPointerDownCorner(e, i); }}
              style={{
                position: "absolute",
                left: `calc(${hp.x * 100}% - 8px)`,
                top:  `calc(${hp.y * 100}% - 8px)`,
                width: 16, height: 16,
                background: CORNER_COLORS[i],
                border: "2px solid white",
                borderRadius: "50%",
                cursor: "crosshair",
                zIndex: 30,
                boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 7, color: "white", fontWeight: 700, lineHeight: 1 }}>
                {["↖","↗","↘","↙"][i]}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

function EditorContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const templateId   = searchParams.get("template");
  const tpl          = (templateId && TEMPLATES[templateId]) || TEMPLATES["billboard-street"];

  const [templateImg,   setTemplateImg]   = useState(null);
  const [designs,       setDesigns]       = useState([]);
  const [selectedId,    setSelectedId]    = useState(null);
  const [isProcessing,  setIsProcessing]  = useState(false);
  const [dtColor1,      setDtColor1]      = useState([139, 92, 246]);
  const [dtColor2,      setDtColor2]      = useState([236, 72, 153]);
  const [cDims,         setCDims]         = useState({ w: 1, h: 1 });

  const containerRef  = useRef(null);
  const fileInputRef  = useRef(null);
  const dragRef       = useRef(null);
  const origSrcRef    = useRef({});
  const exportImgRef  = useRef({});

  // ── Track container pixel dimensions ─────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setCDims({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [templateImg]); // re-attach once template is loaded and container exists

  // ── Load template image ──────────────────────────────────────────────────
  useEffect(() => {
    if (!tpl) { router.push("/mockup-2d"); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setTemplateImg(img);
    img.src = tpl.image;
  }, [tpl?.image]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (!selectedId || e.target.tagName === "INPUT") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        removeDesign(selectedId); return;
      }
      const step = e.shiftKey ? 0.01 : 0.002;
      const map  = { ArrowLeft: [-step,0], ArrowRight: [step,0], ArrowUp: [0,-step], ArrowDown: [0,step] };
      if (map[e.key]) {
        e.preventDefault();
        const [dx, dy] = map[e.key];
        setDesigns(p => p.map(d => d.id !== selectedId ? d : {
          ...d,
          x: Math.max(-d.w + 0.05, Math.min(0.95, d.x + dx)),
          y: Math.max(-d.h + 0.05, Math.min(0.95, d.y + dy)),
        }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  // ── Global mouse-move / mouse-up ─────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;
      const { type, handleId, designId, startMouse, startDesign, cRect } = dragRef.current;
      const dx = (e.clientX - startMouse.x) / cRect.width;
      const dy = (e.clientY - startMouse.y) / cRect.height;
      const MIN = 0.04;

      setDesigns(prev => prev.map(d => {
        if (d.id !== designId) return d;

        // ── Move ──────────────────────────────────────────────────────────
        if (type === "move") return {
          ...d,
          x: Math.max(-d.w + 0.05, Math.min(0.95, startDesign.x + dx)),
          y: Math.max(-d.h + 0.05, Math.min(0.95, startDesign.y + dy)),
        };

        // ── Resize ────────────────────────────────────────────────────────
        if (type === "resize") {
          let { x, y, w, h } = startDesign;
          const ar = w / h;
          if      (handleId==="se"){ w=Math.max(MIN,startDesign.w+dx); h=w/ar; }
          else if (handleId==="sw"){ w=Math.max(MIN,startDesign.w-dx); h=w/ar; x=startDesign.x+startDesign.w-w; }
          else if (handleId==="ne"){ w=Math.max(MIN,startDesign.w+dx); h=w/ar; y=startDesign.y+startDesign.h-h; }
          else if (handleId==="nw"){ w=Math.max(MIN,startDesign.w-dx); h=w/ar; x=startDesign.x+startDesign.w-w; y=startDesign.y+startDesign.h-h; }
          else if (handleId==="e" ){ w=Math.max(MIN,startDesign.w+dx); h=w/ar; }
          else if (handleId==="w" ){ w=Math.max(MIN,startDesign.w-dx); h=w/ar; x=startDesign.x+startDesign.w-w; }
          else if (handleId==="s" ){ h=Math.max(0.02,startDesign.h+dy); w=h*ar; }
          else if (handleId==="n" ){ h=Math.max(0.02,startDesign.h-dy); w=h*ar; y=startDesign.y+startDesign.h-h; }
          return { ...d, x, y, w, h };
        }

        // ── Rotate ────────────────────────────────────────────────────────
        if (type === "rotate") {
          const cx = (startDesign.x + startDesign.w/2) * cRect.width  + cRect.left;
          const cy = (startDesign.y + startDesign.h/2) * cRect.height + cRect.top;
          return { ...d, rotation: Math.atan2(e.clientY-cy, e.clientX-cx) * 180/Math.PI + 90 };
        }

        // ── Corner warp ───────────────────────────────────────────────────
        if (type === "corner") {
          const idx = handleId; // 0-3
          const sc  = dragRef.current.startCorners;
          if (!sc) return d;
          const newCorners = sc.map((c, i) =>
            i === idx ? { dx: c.dx + dx, dy: c.dy + dy } : { ...c }
          );
          return { ...d, corners: newCorners };
        }

        return d;
      }));
    };

    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const cRect = () => containerRef.current?.getBoundingClientRect();

  const startDrag = (e, type, designId, handleId = null) => {
    const rect = cRect();
    if (!rect) return;
    const d = designs.find(x => x.id === designId);
    if (!d) return;
    dragRef.current = {
      type, handleId, designId,
      startMouse: { x: e.clientX, y: e.clientY },
      startDesign: { ...d },
      startCorners: d.corners ? d.corners.map(c => ({ ...c })) : null,
      cRect: rect,
    };
  };

  const removeDesign = (id) => {
    setDesigns(p => p.filter(d => d.id !== id));
    delete origSrcRef.current[id];
    delete exportImgRef.current[id];
    if (selectedId === id) setSelectedId(null);
  };

  const updateSelected = (upd) =>
    setDesigns(p => p.map(d => d.id === selectedId ? { ...d, ...upd } : d));

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = (e) => {
    Array.from(e.target.files || []).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const img = new Image();
        img.onload = () => {
          const id = `d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const { opacity, blendMode } = defaultBlend(tpl?.category);
          const tAspect   = templateImg ? templateImg.naturalWidth / templateImg.naturalHeight : 1;
          const imgAspect = img.naturalWidth / img.naturalHeight;
          const w = tpl.areaWidth * 0.7;
          const h = w * tAspect / imgAspect;
          const x = tpl.areaX + (tpl.areaWidth  - w) / 2;
          const y = tpl.areaY + (tpl.areaHeight - h) / 2;
          origSrcRef.current[id]   = dataUrl;
          exportImgRef.current[id] = img;
          setDesigns(p => [...p, {
            id, src: dataUrl, displaySrc: dataUrl,
            x, y, w, h,
            rotation: 0, skewX: 0, skewY: 0,
            corners: null,
            opacity, blendMode,
          }]);
          setSelectedId(id);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  const applyEffect = (fn) => {
    const orig = origSrcRef.current[selectedId];
    if (!orig || isProcessing) return;
    setIsProcessing(true);
    fn(orig, (newSrc) => {
      const img = new Image();
      img.onload = () => { exportImgRef.current[selectedId] = img; };
      img.src = newSrc;
      updateSelected({ displaySrc: newSrc });
      setIsProcessing(false);
    });
  };

  const resetEffect = () => {
    const orig = origSrcRef.current[selectedId];
    if (!orig) return;
    const img = new Image();
    img.onload = () => { exportImgRef.current[selectedId] = img; };
    img.src = orig;
    updateSelected({ displaySrc: orig });
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!templateImg || designs.length === 0) return;
    const nW = templateImg.naturalWidth, nH = templateImg.naturalHeight;
    const cvs = document.createElement("canvas");
    cvs.width = nW; cvs.height = nH;
    const ctx = cvs.getContext("2d");
    ctx.drawImage(templateImg, 0, 0, nW, nH);

    designs.forEach(d => {
      const img = exportImgRef.current[d.id];
      if (!img) return;
      const x = d.x*nW, y = d.y*nH, w = d.w*nW, h = d.h*nH;
      const bm = BLEND_MODES.find(b => b.id === d.blendMode)?.canvas ?? "source-over";

      if (d.corners) {
        // Perspective warp export (scanline)
        const c = d.corners;
        const dst = [
          { x: x + c[0].dx*nW,     y: y + c[0].dy*nH     }, // TL
          { x: x+w + c[1].dx*nW,   y: y + c[1].dy*nH     }, // TR
          { x: x+w + c[2].dx*nW,   y: y+h + c[2].dy*nH   }, // BR
          { x: x + c[3].dx*nW,     y: y+h + c[3].dy*nH   }, // BL
        ];
        // Shadow pass
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 6;
        _drawPerspectiveWarp(ctx, img, dst, 0.18, "source-over");
        ctx.restore();
        // Main pass
        _drawPerspectiveWarp(ctx, img, dst, d.opacity, bm);
      } else {
        const cx = x+w/2, cy = y+h/2;
        const skewXRad = (d.skewX || 0) * Math.PI / 180;
        const skewYRad = (d.skewY || 0) * Math.PI / 180;
        // Shadow
        ctx.save();
        ctx.globalAlpha = 0.18; ctx.globalCompositeOperation = "source-over";
        ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 8;
        ctx.translate(cx, cy); ctx.rotate(d.rotation * Math.PI/180);
        if (d.skewX || d.skewY) ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0);
        ctx.drawImage(img, -w/2, -h/2, w, h);
        ctx.restore();
        // Main
        ctx.save();
        ctx.globalAlpha = d.opacity; ctx.globalCompositeOperation = bm;
        ctx.translate(cx, cy); ctx.rotate(d.rotation * Math.PI/180);
        if (d.skewX || d.skewY) ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0);
        ctx.drawImage(img, -w/2, -h/2, w, h);
        ctx.restore();
      }
    });

    cvs.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "mockup.png";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const sel = designs.find(d => d.id === selectedId);
  const containerAspect = templateImg
    ? `${templateImg.naturalWidth} / ${templateImg.naturalHeight}`
    : "16 / 9";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar subtitle={tpl?.name || "2D Editor"} backLink="/mockup-2d" backText="← Templates" />

      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>

        {/* ── Canvas area ─────────────────────────────────────────────────── */}
        <div
          className="flex-1 flex items-center justify-center p-6 overflow-hidden"
          style={{ background: "radial-gradient(circle at center, rgba(139,92,246,0.07) 0%, transparent 70%)" }}
        >
          {templateImg ? (
            <div
              ref={containerRef}
              className="relative shadow-2xl shadow-black/60 rounded-sm overflow-visible"
              style={{
                aspectRatio: containerAspect,
                maxWidth: `min(100%, calc((100vh - 110px) * ${templateImg.naturalWidth / templateImg.naturalHeight}))`,
                width: "100%",
              }}
              onMouseDown={(e) => { if (e.target === containerRef.current) setSelectedId(null); }}
            >
              <img
                src={tpl.image}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-sm select-none"
              />

              {designs.map(d => (
                <DesignElement
                  key={d.id}
                  design={d}
                  isSelected={d.id === selectedId}
                  cDims={cDims}
                  onSelect={() => setSelectedId(d.id)}
                  onPointerDownBody={(e) => startDrag(e, "move", d.id)}
                  onPointerDownHandle={(e, hId) => startDrag(e, "resize", d.id, hId)}
                  onPointerDownRotate={(e) => startDrag(e, "rotate", d.id)}
                  onPointerDownCorner={(e, i) => startDrag(e, "corner", d.id, i)}
                />
              ))}

              {designs.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-slate-950/65 backdrop-blur-sm rounded-xl px-6 py-4 border border-slate-700/40 text-center">
                    <p className="text-slate-200 text-sm font-semibold">Upload a design to get started</p>
                    <p className="text-slate-500 text-xs mt-1">Drag handles to resize · Rotate with the purple handle</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading template…</p>
            </div>
          )}
        </div>

        {/* ── Controls panel ──────────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 flex flex-col border-l border-slate-800/60 bg-slate-900/50 overflow-y-auto">
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />

          {/* Upload */}
          <div className="p-4 border-b border-slate-800/50">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/15 to-pink-500/10 border border-purple-500/30 hover:border-purple-400/60 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 text-sm font-semibold transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Image
            </button>
          </div>

          {/* Layers */}
          {designs.length > 0 && (
            <div className="p-3 border-b border-slate-800/50">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Layers</p>
              <div className="space-y-1">
                {[...designs].reverse().map((d, i) => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all group ${
                      selectedId === d.id
                        ? "bg-purple-500/15 border border-purple-500/40"
                        : "hover:bg-slate-800/50 border border-transparent"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                      <img src={d.src} alt="" className="w-full h-full object-contain" />
                    </div>
                    <span className={`text-xs flex-1 truncate font-medium ${selectedId === d.id ? "text-purple-200" : "text-slate-300"}`}>
                      Layer {designs.length - i}
                    </span>
                    {d.corners && (
                      <span className="text-[9px] text-pink-400 font-semibold border border-pink-500/30 rounded px-1">WARP</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeDesign(d.id); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transform controls */}
          {sel ? (
            <div className="p-4 space-y-4 flex-1">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Transform</p>

              {/* Size */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-slate-400">Size</span>
                  <span className="text-xs font-mono text-purple-400">{Math.round(sel.w * 100)}%</span>
                </div>
                <input
                  type="range" min="5" max="150" step="1"
                  value={Math.round(sel.w * 100)}
                  onChange={(e) => {
                    const w = parseInt(e.target.value) / 100;
                    updateSelected({ w, h: w * (sel.h / sel.w) });
                  }}
                  className="w-full h-1.5 appearance-none bg-slate-800 rounded-full cursor-pointer accent-purple-500"
                />
              </div>

              {/* ── Warp mode toggle ──────────────────────────────────────── */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Perspective Warp</p>
                <button
                  onClick={() => {
                    if (sel.corners) {
                      // disable warp
                      updateSelected({ corners: null });
                    } else {
                      // enable warp — all corners at zero offset
                      updateSelected({
                        corners: [
                          { dx: 0, dy: 0 },
                          { dx: 0, dy: 0 },
                          { dx: 0, dy: 0 },
                          { dx: 0, dy: 0 },
                        ],
                        rotation: 0, skewX: 0, skewY: 0,
                      });
                    }
                  }}
                  className={`w-full py-2 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    sel.corners
                      ? "border-pink-500/60 bg-pink-500/15 text-pink-300 hover:bg-pink-500/25"
                      : "border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="2 20 8 4 16 16 20 8 22 20" />
                  </svg>
                  {sel.corners ? "Disable Perspective Warp" : "Enable Perspective Warp"}
                </button>

                {sel.corners && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[10px] text-slate-500">Drag the colored corner handles on the canvas to warp.</p>
                    {/* Corner offset readouts + reset per corner */}
                    {sel.corners.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[8px] text-white font-bold"
                          style={{ background: CORNER_COLORS[i] }}
                        >
                          {["↖","↗","↘","↙"][i]}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 flex-1">
                          {(c.dx * 100).toFixed(1)}%, {(c.dy * 100).toFixed(1)}%
                        </span>
                        <button
                          onClick={() => {
                            const nc = sel.corners.map((cc, j) => j === i ? { dx: 0, dy: 0 } : { ...cc });
                            updateSelected({ corners: nc });
                          }}
                          className="text-[10px] text-slate-600 hover:text-slate-300 transition-colors"
                          title="Reset this corner"
                        >
                          ↺
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => updateSelected({ corners: [{ dx:0,dy:0 },{ dx:0,dy:0 },{ dx:0,dy:0 },{ dx:0,dy:0 }] })}
                      className="w-full py-1 rounded border border-slate-700 text-[10px] text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all"
                    >
                      Reset All Corners
                    </button>
                  </div>
                )}
              </div>

              {/* ── Normal transform controls (hidden in warp mode) ────────── */}
              {!sel.corners && (
                <>
                  {/* Rotation */}
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-slate-400">Rotation</span>
                      <input
                        type="number" min="-180" max="180" step="1"
                        value={Math.round(sel.rotation)}
                        onChange={(e) => updateSelected({ rotation: parseFloat(e.target.value) || 0 })}
                        className="w-14 text-right text-xs font-mono text-purple-400 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <input
                      type="range" min="-180" max="180" step="1"
                      value={sel.rotation}
                      onChange={(e) => updateSelected({ rotation: parseFloat(e.target.value) })}
                      className="w-full h-1.5 appearance-none bg-slate-800 rounded-full cursor-pointer accent-purple-500"
                    />
                  </div>

                  {/* Skew X */}
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-slate-400">Skew X</span>
                      <input
                        type="number" min="-45" max="45" step="0.5"
                        value={parseFloat((sel.skewX || 0).toFixed(1))}
                        onChange={(e) => updateSelected({ skewX: parseFloat(e.target.value) || 0 })}
                        className="w-14 text-right text-xs font-mono text-purple-400 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <input
                      type="range" min="-45" max="45" step="0.5"
                      value={sel.skewX || 0}
                      onChange={(e) => updateSelected({ skewX: parseFloat(e.target.value) })}
                      className="w-full h-1.5 appearance-none bg-slate-800 rounded-full cursor-pointer accent-purple-500"
                    />
                  </div>

                  {/* Skew Y */}
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-slate-400">Skew Y</span>
                      <input
                        type="number" min="-45" max="45" step="0.5"
                        value={parseFloat((sel.skewY || 0).toFixed(1))}
                        onChange={(e) => updateSelected({ skewY: parseFloat(e.target.value) || 0 })}
                        className="w-14 text-right text-xs font-mono text-purple-400 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <input
                      type="range" min="-45" max="45" step="0.5"
                      value={sel.skewY || 0}
                      onChange={(e) => updateSelected({ skewY: parseFloat(e.target.value) })}
                      className="w-full h-1.5 appearance-none bg-slate-800 rounded-full cursor-pointer accent-purple-500"
                    />
                  </div>

                  {/* Quick position */}
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Quick Position</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => updateSelected({
                          x: tpl.areaX + (tpl.areaWidth  - sel.w) / 2,
                          y: tpl.areaY + (tpl.areaHeight - sel.h) / 2,
                        })}
                        className="py-1.5 rounded-lg border border-slate-700 text-[10px] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
                      >
                        Center in Area
                      </button>
                      <button
                        onClick={() => updateSelected({ rotation: 0, skewX: 0, skewY: 0 })}
                        className="py-1.5 rounded-lg border border-slate-700 text-[10px] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
                      >
                        Reset Rotation
                      </button>
                      {tpl?.perspective && (
                        <button
                          onClick={() => updateSelected({
                            rotation: tpl.perspective.rotation,
                            skewX: tpl.perspective.skewX * 45,
                            skewY: tpl.perspective.skewY * 45,
                          })}
                          className="col-span-2 py-1.5 rounded-lg border border-purple-500/40 text-[10px] text-purple-400 hover:text-purple-200 hover:border-purple-400 hover:bg-purple-500/10 transition-all"
                        >
                          Match Background Angle
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Opacity */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-slate-400">Opacity</span>
                  <span className="text-xs font-mono text-purple-400">{Math.round(sel.opacity * 100)}%</span>
                </div>
                <input
                  type="range" min="10" max="100" step="1"
                  value={Math.round(sel.opacity * 100)}
                  onChange={(e) => updateSelected({ opacity: parseInt(e.target.value) / 100 })}
                  className="w-full h-1.5 appearance-none bg-slate-800 rounded-full cursor-pointer accent-purple-500"
                />
              </div>

              {/* Blend mode */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Blend Mode</p>
                <div className="grid grid-cols-4 gap-1">
                  {BLEND_MODES.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => updateSelected({ blendMode: id })}
                      className={`py-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
                        sel.blendMode === id
                          ? "border-purple-500 bg-purple-500/20 text-purple-300"
                          : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 mt-1">
                  {sel.blendMode === "multiply" && "Multiply — looks printed on surface"}
                  {sel.blendMode === "screen"   && "Screen — bright / glowing blend"}
                  {sel.blendMode === "overlay"  && "Overlay — high contrast blend"}
                  {sel.blendMode === "normal"   && "Normal — placed on top"}
                </p>
              </div>

              {/* Effects */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Image Effects</p>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <button
                    disabled={isProcessing}
                    onClick={() => applyEffect((src, cb) => filterGrayscale(src, cb))}
                    className="py-1.5 rounded-lg border border-slate-700 text-[10px] text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-40 transition-all"
                  >
                    B&W
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => applyEffect((src, cb) => filterDuotone(src, dtColor1, dtColor2, cb))}
                    className="py-1.5 rounded-lg border border-slate-700 text-[10px] text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-40 transition-all"
                  >
                    Duotone
                  </button>
                  <button
                    onClick={resetEffect}
                    className="py-1.5 rounded-lg border border-slate-700 text-[10px] text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all"
                  >
                    Reset
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {[[dtColor1, setDtColor1], [dtColor2, setDtColor2]].map(([col, setCol], i) => (
                    <input
                      key={i}
                      type="color"
                      title={i === 0 ? "Dark color" : "Light color"}
                      value={`#${col.map(v => v.toString(16).padStart(2,"0")).join("")}`}
                      onChange={(e) => {
                        const h = e.target.value;
                        setCol([parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]);
                      }}
                      className="w-7 h-7 rounded border border-slate-700 cursor-pointer"
                    />
                  ))}
                  <span className="text-[10px] text-slate-500">Duotone colors</span>
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => removeDesign(selectedId)}
                className="w-full py-2 rounded-lg border border-red-500/30 text-red-400/80 hover:bg-red-500/10 hover:text-red-300 text-xs transition-all"
              >
                Delete Layer
              </button>

              <p className="text-[10px] text-slate-600 text-center">
                {sel.corners
                  ? "Drag colored handles to set perspective · Scroll panel for corners"
                  : "Arrow keys to nudge · Shift+Arrow for larger steps · Delete to remove"}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center px-4">
              {designs.length > 0
                ? <p className="text-xs text-slate-500 text-center">Click a design on the canvas or select a layer above</p>
                : <p className="text-xs text-slate-600 text-center">Add an image to start</p>
              }
            </div>
          )}

          {/* Export */}
          <div className="p-4 border-t border-slate-800/50 mt-auto">
            <button
              onClick={handleExport}
              disabled={designs.length === 0 || !templateImg}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-sm shadow-lg shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export PNG
            </button>
            <p className="text-[10px] text-slate-600 text-center mt-2">Full-resolution export</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function Mockup2DEditorPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <EditorContent />
    </Suspense>
  );
}
