"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { buttonStyles } from "@/components/ui/primitives";

export function Modal({ trigger, title, children, closeLabel }: { trigger: React.ReactNode; title: string; children: React.ReactNode; closeLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <span onClick={() => ref.current?.showModal()}>{trigger}</span>
      <dialog ref={ref} className="modal-panel" onClick={(event) => { if (event.target === ref.current) ref.current?.close(); }}>
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button type="button" onClick={() => ref.current?.close()} className="icon-button" aria-label={closeLabel}><X /></button>
        </div>
        <div className="p-5">{children}</div>
      </dialog>
    </>
  );
}

export function ConfirmDialog({ triggerLabel, title, text, confirmLabel, cancelLabel, onConfirm, danger = false }: { triggerLabel: string; title: string; text: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; danger?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={buttonStyles(danger ? "danger" : "secondary")} onClick={() => ref.current?.showModal()}>{triggerLabel}</button>
      <dialog ref={ref} className="modal-panel max-w-lg">
        <div className="p-6">
          <h2 className="text-2xl font-extrabold">{title}</h2>
          <p className="mt-3 text-[var(--muted)]">{text}</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" className={buttonStyles("ghost")} onClick={() => ref.current?.close()}>{cancelLabel}</button>
            <button type="button" className={buttonStyles(danger ? "danger" : "primary")} onClick={() => { onConfirm(); ref.current?.close(); }}>{confirmLabel}</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
