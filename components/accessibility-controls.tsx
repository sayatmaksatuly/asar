"use client";

import { useEffect, useState } from "react";
import { Accessibility, Contrast, Minus, Plus, RotateCcw } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

export function AccessibilityControls({ dictionary }: { dictionary: Dictionary }) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(() => typeof window === "undefined" ? 1 : Number(localStorage.getItem("asar-font-scale") ?? 1));
  const [contrast, setContrast] = useState(() => typeof window !== "undefined" && localStorage.getItem("asar-contrast") === "high");

  useEffect(() => {
    localStorage.setItem("asar-font-scale", String(scale));
    localStorage.setItem("asar-contrast", contrast ? "high" : "normal");
    document.documentElement.style.setProperty("--font-scale", String(scale));
    document.documentElement.dataset.contrast = contrast ? "high" : "normal";
  }, [contrast, scale]);

  function apply(nextScale: number, nextContrast = contrast) {
    const safeScale = Math.min(1.25, Math.max(0.9, nextScale));
    setScale(safeScale);
    setContrast(nextContrast);
  }

  return (
    <div className="relative">
      <button className="icon-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={dictionary.accessibility.title}><Accessibility /></button>
      {open ? (
        <div className="absolute right-0 top-14 z-50 w-72 rounded-3xl border border-[var(--line)] bg-white p-4 shadow-xl">
          <strong className="block text-sm">{dictionary.accessibility.title}</strong>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="control-button" type="button" onClick={() => apply(scale - 0.1)} aria-label={dictionary.accessibility.decrease}><Minus size={18} /> A</button>
            <button className="control-button" type="button" onClick={() => apply(scale + 0.1)} aria-label={dictionary.accessibility.increase}><Plus size={18} /> A</button>
            <button className="control-button col-span-2" type="button" onClick={() => apply(scale, !contrast)} aria-pressed={contrast}><Contrast size={18} /> {dictionary.accessibility.contrast}</button>
            <button className="control-button col-span-2" type="button" onClick={() => apply(1, false)}><RotateCcw size={18} /> {dictionary.accessibility.reset}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
