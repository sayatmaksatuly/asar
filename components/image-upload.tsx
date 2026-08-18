"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSize = 5 * 1024 * 1024;

export function ImageUpload({ dictionary, bucket = "request-images", name = "image_url", initialUrl = "" }: { dictionary: Dictionary; bucket?: "avatars" | "request-images"; name?: string; initialUrl?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [uploadedThisSession, setUploadedThisSession] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function upload(file: File) {
    setError("");
    if (!allowedTypes.has(file.type) || file.size > maxSize || file.size <= 0) { setError(dictionary.createRequest.imageHint); return; }
    setLoading(true);
    const form = new FormData(); form.set("file", file); form.set("bucket", bucket);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    const result = await response.json().catch(() => ({})) as { url?: string };
    if (!response.ok || !result.url) { setError(dictionary.states.error); setLoading(false); return; }
    if (uploadedThisSession && uploadedThisSession !== initialUrl) void fetch("/api/uploads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bucket, url: uploadedThisSession }) });
    setUrl(result.url); setUploadedThisSession(result.url); setLoading(false);
  }

  async function remove() {
    if (uploadedThisSession && url === uploadedThisSession) await fetch("/api/uploads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bucket, url }) });
    setUrl(""); setUploadedThisSession(""); if (inputRef.current) inputRef.current.value = "";
  }

  return <div>
    <input type="hidden" name={name} value={url} />
    <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
    {url ? <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)]"><Image src={url} alt="" width={960} height={384} unoptimized className="h-48 w-full object-cover" /><button type="button" className="absolute right-3 top-3 rounded-full bg-white p-3 shadow-lg" onClick={() => void remove()} aria-label={dictionary.common.cancel}><Trash2 size={18} /></button></div> : <button type="button" className="upload-dropzone" onClick={() => inputRef.current?.click()} disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}<strong>{dictionary.createRequest.image}</strong><span>{dictionary.createRequest.imageHint}</span></button>}
    {error ? <p className="mt-2 text-sm font-semibold text-[var(--danger)]" role="alert">{error}</p> : null}
  </div>;
}
