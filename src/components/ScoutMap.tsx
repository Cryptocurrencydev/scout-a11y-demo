"use client";
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ScoutCard } from "@/lib/queries";

// MapLibre 6 runs its tile worker as an ES module; serve it from /public (copied at install).
maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const CLUSTER_PX = 56; // pins closer than this would overlap (44px targets + spacing)

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type PinRef = { marker: maplibregl.Marker; el: HTMLButtonElement; scout: ScoutCard; shown: boolean };

/**
 * Supplementary map. Pins are real <button>s with accessible names; activating one hands
 * focus to the matching card in the list, which is the primary interface. Pins that would
 * overlap merge into a cluster button ("3 scouts: … Zoom in") so every target stays 44px
 * and nothing is obscured. Nothing here captures Tab.
 */
export default function ScoutMap({
  scouts,
  selected,
  onSelect,
}: {
  scouts: ScoutCard[];
  selected: string | null;
  onSelect: (slug: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const pins = useRef(new Map<string, PinRef>());
  const clusters = useRef<maplibregl.Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  function animate(): boolean {
    return !reducedMotion();
  }

  function recluster() {
    const m = map.current;
    if (!m) return;
    clusters.current.forEach((c) => c.remove());
    clusters.current = [];
    const items = [...pins.current.values()].map((p) => ({ p, pt: m.project([p.scout.lng, p.scout.lat]) }));
    const used = new Set<string>();
    for (const a of items) {
      if (used.has(a.p.scout.slug)) continue;
      const group = items.filter(
        (b) => !used.has(b.p.scout.slug) && Math.hypot(a.pt.x - b.pt.x, a.pt.y - b.pt.y) < CLUSTER_PX,
      );
      group.forEach((g) => used.add(g.p.scout.slug));
      if (group.length === 1) {
        if (!a.p.shown) {
          a.p.marker.addTo(m);
          a.p.shown = true;
        }
        continue;
      }
      group.forEach((g) => {
        if (g.p.shown) {
          g.p.marker.remove();
          g.p.shown = false;
        }
      });
      const names = group.map((g) => g.p.scout.name);
      const el = document.createElement("button");
      el.type = "button";
      el.className = "pin pin-cluster";
      el.setAttribute("aria-label", `${group.length} scouts in this area: ${names.join(", ")}. Zoom in`);
      const span = document.createElement("span");
      span.textContent = String(group.length);
      el.appendChild(span);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const b = new maplibregl.LngLatBounds();
        group.forEach((g) => b.extend([g.p.scout.lng, g.p.scout.lat]));
        m.fitBounds(b, { padding: 80, maxZoom: 16, animate: animate() });
      });
      const lng = group.reduce((s, g) => s + g.p.scout.lng, 0) / group.length;
      const lat = group.reduce((s, g) => s + g.p.scout.lat, 0) / group.length;
      clusters.current.push(new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([lng, lat]).addTo(m));
    }
  }

  useEffect(() => {
    if (!container.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: STYLE,
      center: [10, 30],
      zoom: 1,
      attributionControl: { compact: false },
      locale: {
        "Map.Title": "Map of scouts (supplementary; the list has the same scouts)",
        "NavigationControl.ZoomIn": "Zoom in",
        "NavigationControl.ZoomOut": "Zoom out",
        "NavigationControl.ResetBearing": "Reset map rotation",
      },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("moveend", recluster);
    map.current = m;
    const current = pins.current;
    return () => {
      current.forEach(({ marker }) => marker.remove());
      current.clear();
      clusters.current.forEach((c) => c.remove());
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync pins with results.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const current = pins.current;
    const keep = new Set(scouts.map((s) => s.slug));
    current.forEach((v, slug) => {
      if (!keep.has(slug)) {
        v.marker.remove();
        current.delete(slug);
      }
    });
    scouts.forEach((s) => {
      if (current.has(s.slug)) return;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "pin";
      el.setAttribute("aria-label", `${s.name}, ${s.city}. Go to ${s.name} in the list`);
      el.innerHTML = '<span aria-hidden="true"><svg viewBox="0 0 16 16" width="16" height="16" focusable="false"><circle cx="8" cy="8" r="5" fill="currentColor"/></svg></span>';
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(s.slug);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([s.lng, s.lat]);
      current.set(s.slug, { marker, el, scout: s, shown: false });
    });
    if (scouts.length) {
      const bounds = new maplibregl.LngLatBounds();
      scouts.forEach((s) => bounds.extend([s.lng, s.lat]));
      m.fitBounds(bounds, { padding: 60, maxZoom: 14, animate: animate() });
    }
    recluster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scouts]);

  // Reflect selection from the list.
  useEffect(() => {
    const m = map.current;
    pins.current.forEach(({ el }, slug) => {
      if (slug === selected) el.setAttribute("aria-current", "true");
      else el.removeAttribute("aria-current");
    });
    if (!m || !selected) return;
    const hit = scouts.find((s) => s.slug === selected);
    if (!hit) return;
    const opts = { center: [hit.lng, hit.lat] as [number, number], zoom: Math.max(m.getZoom(), 15) };
    if (animate()) m.flyTo({ ...opts, duration: 800 });
    else m.jumpTo(opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, scouts]);

  return <div ref={container} className="map-frame" />;
}
