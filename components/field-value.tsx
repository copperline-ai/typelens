"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";

export function isUrl(s: string): boolean {
  try {
    const url = new URL(s);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isImageUrl(s: string): boolean {
  try {
    const { pathname } = new URL(s);
    return /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(pathname);
  } catch {
    return false;
  }
}

export function parseDate(s: string): Date | null {
  if (/^\d{10}$/.test(s)) return new Date(parseInt(s, 10) * 1000);
  if (/^\d{13}$/.test(s)) return new Date(parseInt(s, 10));
  if (/^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function parseNumericDate(n: number): Date | null {
  if (!Number.isInteger(n) || n <= 0) return null;
  const s = String(n);
  if (s.length === 10) {
    const d = new Date(n * 1000);
    const y = d.getFullYear();
    return y >= 2001 && y <= 2100 ? d : null;
  }
  if (s.length === 13) {
    const d = new Date(n);
    const y = d.getFullYear();
    return y >= 2001 && y <= 2100 ? d : null;
  }
  return null;
}

export function isMarkdown(s: string): boolean {
  if (s.length < 20) return false;
  const patterns = [
    /^#{1,6}\s/m,
    /\*\*[^*]+\*\*/,
    /^[-*]\s.+/m,
    /^>\s.+/m,
    /`[^`]+`/,
    /\[.+\]\(.+\)/,
    /^```/m,
  ];
  return patterns.filter((p) => p.test(s)).length >= 1;
}

export function isEmbedding(arr: unknown[]): boolean {
  return arr.length > 50 && arr.every((v) => typeof v === "number");
}

function tryParseJsonObject(s: string): object | null {
  const trimmed = s.trimStart();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    const parsed: unknown = JSON.parse(s);
    if (typeof parsed === "object" && parsed !== null) return parsed as object;
  } catch {
    /* not JSON */
  }
  return null;
}

function getCaption(fieldName?: string, document?: Record<string, unknown>): string | undefined {
  const CAPTION_FIELDS = ["name", "title", "label", "caption", "description"];
  if (document) {
    for (const f of CAPTION_FIELDS) {
      if (typeof document[f] === "string" && document[f]) return document[f] as string;
    }
  }
  return fieldName || undefined;
}

function LightboxCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button onClick={copy} className="yarl__button" title={copied ? "Copied!" : "Copy URL"}>
      {copied ? (
        <Check style={{ width: 16, height: 16, color: "#22c55e" }} />
      ) : (
        <Copy style={{ width: 16, height: 16 }} />
      )}
    </button>
  );
}

function OpenInNewTabButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => window.open(url, "_blank", "noreferrer")}
      className="yarl__button"
      title="Open in new tab"
    >
      <ExternalLink style={{ width: 16, height: 16 }} />
    </button>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
      title={label}
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function FieldValue({
  value,
  fieldName,
  document,
}: {
  value: unknown;
  fieldName?: string;
  document?: Record<string, unknown>;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (value === null || value === undefined) {
    return <span className="text-xs text-muted-foreground italic">null</span>;
  }
  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "outline"} className="text-xs">
        {String(value)}
      </Badge>
    );
  }
  if (typeof value === "number") {
    const parsed = parseNumericDate(value);
    if (parsed) {
      return (
        <button
          type="button"
          onClick={() => setShowRaw((r) => !r)}
          className="text-xs font-mono text-violet-600 dark:text-violet-400 hover:opacity-70 transition-opacity cursor-pointer text-left"
          title={showRaw ? "Click to show parsed date" : "Click to show raw value"}
        >
          {showRaw ? String(value) : parsed.toLocaleString()}
        </button>
      );
    }
    return <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{value}</span>;
  }
  if (typeof value === "string") {
    if (isImageUrl(value)) {
      return (
        <>
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block rounded overflow-hidden hover:opacity-80 transition-opacity"
            title="Click to enlarge"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="h-16 w-auto max-w-[12rem] rounded object-cover"
              loading="lazy"
            />
          </button>
          <Lightbox
            open={lightboxOpen}
            close={() => setLightboxOpen(false)}
            slides={[{ src: value, title: getCaption(fieldName, document) }]}
            plugins={[Zoom, Captions]}
            zoom={{
              maxZoomPixelRatio: 4,
              zoomInMultiplier: 2,
              doubleTapDelay: 300,
              doubleClickDelay: 300,
              doubleClickMaxStops: 2,
              scrollToZoom: true,
            }}
            toolbar={{
              buttons: [
                <LightboxCopyButton key="copy" url={value} />,
                <OpenInNewTabButton key="open" url={value} />,
                "close",
              ],
            }}
            controller={{ closeOnPullDown: true, closeOnBackdropClick: true }}
          />
        </>
      );
    }
    if (isUrl(value)) {
      const display = value.length > 80 ? value.slice(0, 80) + "…" : value;
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-blue-600 dark:text-blue-400 underline underline-offset-2 break-all hover:opacity-80"
          title={value}
        >
          {display}
        </a>
      );
    }
    const parsedDate = parseDate(value);
    if (parsedDate) {
      return (
        <button
          type="button"
          onClick={() => setShowRaw((r) => !r)}
          className="text-xs font-mono text-violet-600 dark:text-violet-400 hover:opacity-70 transition-opacity cursor-pointer text-left"
          title={showRaw ? "Click to show parsed date" : "Click to show raw value"}
        >
          {showRaw ? value : parsedDate.toLocaleString()}
        </button>
      );
    }
    const jsonObj = tryParseJsonObject(value);
    if (jsonObj !== null) {
      if (Array.isArray(jsonObj) && isEmbedding(jsonObj as unknown[])) {
        return (
          <span className="text-xs text-muted-foreground italic">
            [vector: {jsonObj.length} dims]
          </span>
        );
      }
      const label = Array.isArray(jsonObj) ? `[${jsonObj.length} items]` : "{ … }";
      const jsonText = JSON.stringify(jsonObj, null, 2);
      return (
        <div className="space-y-1 w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-xs text-muted-foreground italic hover:text-foreground transition-colors"
            >
              {label} {expanded ? "▲" : "▼"}
            </button>
            <CopyButton text={jsonText} label="Copy JSON" />
          </div>
          {expanded && (
            <pre className="text-xs font-mono whitespace-pre-wrap break-all bg-muted/30 rounded p-2 max-h-48 overflow-y-auto">
              {jsonText}
            </pre>
          )}
        </div>
      );
    }
    if (isMarkdown(value)) {
      return (
        <div className="space-y-1.5 w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-xs text-muted-foreground/70 italic hover:text-muted-foreground transition-colors"
            >
              markdown {expanded ? "▲" : "▼"}
            </button>
            <CopyButton text={value} label="Copy text" />
          </div>
          {expanded ? (
            <div className="max-h-72 overflow-y-auto rounded bg-muted/30 p-3 text-xs [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1 [&_h3]:font-semibold [&_h3]:mb-0.5 [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_hr]:border-border [&_hr]:my-2">
              <ReactMarkdown>{value}</ReactMarkdown>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground line-clamp-3 block leading-relaxed">
              {value.length > 200 ? value.slice(0, 200) + "…" : value}
            </span>
          )}
        </div>
      );
    }
    if (value.length > 120) {
      return (
        <div className="space-y-0.5 w-full">
          <span className="text-xs font-mono break-all">
            {expanded ? value : value.slice(0, 120) + "…"}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="block text-xs text-muted-foreground/70 italic hover:text-muted-foreground transition-colors"
          >
            {expanded ? "show less ▲" : "show more ▼"}
          </button>
        </div>
      );
    }
    return <span className="text-xs font-mono break-all">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-xs text-muted-foreground italic">[ ]</span>;
    if (isEmbedding(value)) {
      return (
        <span className="text-xs text-muted-foreground italic">[vector: {value.length} dims]</span>
      );
    }
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return (
        <div className="flex flex-wrap gap-1">
          {(value as (string | number)[]).slice(0, 8).map((v, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-mono">
              {String(v)}
            </Badge>
          ))}
          {value.length > 8 && (
            <span className="text-xs text-muted-foreground">+{value.length - 8} more</span>
          )}
        </div>
      );
    }
    return (
      <div className="space-y-1 w-full">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-muted-foreground italic hover:text-foreground transition-colors"
        >
          [{value.length} items] {expanded ? "▲" : "▼"}
        </button>
        {expanded && (
          <pre className="text-xs font-mono whitespace-pre-wrap break-all bg-muted/30 rounded p-2 max-h-48 overflow-y-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        )}
      </div>
    );
  }
  if (typeof value === "object") {
    return (
      <div className="space-y-1 w-full">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-muted-foreground italic hover:text-foreground transition-colors"
        >
          {"{ … }"} {expanded ? "▲" : "▼"}
        </button>
        {expanded && (
          <pre className="text-xs font-mono whitespace-pre-wrap break-all bg-muted/30 rounded p-2 max-h-48 overflow-y-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        )}
      </div>
    );
  }
  return <span className="text-xs font-mono">{String(value)}</span>;
}
