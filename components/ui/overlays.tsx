"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/primitives";

export function Drawer({ open, onClose, title, closeLabel, children, side = "right" }: { open: boolean; onClose: () => void; title: string; closeLabel: string; children: React.ReactNode; side?: "left" | "right" }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) panel.current?.focus(); }, [open]);
  if (!open) return null;
  return <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={panel} className={`drawer drawer-${side}`} role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1}><header><h2 id="drawer-title">{title}</h2><IconButton label={closeLabel} onClick={onClose}><X /></IconButton></header>{children}</div></div>;
}

export function BottomSheet(props: Omit<React.ComponentProps<typeof Drawer>, "side">) { return <Drawer {...props} side="right" />; }
export function Toast({ message, tone = "success" }: { message: string; tone?: "success" | "danger" | "info" }) { return <div className={`toast alert alert-${tone}`} role={tone === "danger" ? "alert" : "status"}>{message}</div>; }
export function Skeleton({ className = "" }: { className?: string }) { return <span className={`skeleton ${className}`} aria-hidden="true" />; }
