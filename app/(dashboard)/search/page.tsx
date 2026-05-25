"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Configure,
  InstantSearch,
  Pagination,
  RefinementList,
  SearchBox,
  Stats,
  useClearRefinements,
  useHits,
  useInstantSearch,
  usePagination,
  useSearchBox,
} from "react-instantsearch";
import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Code2,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useConnectionStore, selectActiveProfile, selectStatus } from "@/lib/stores/connection";
import { ConnectingState } from "@/components/connecting-state";
import { listCollections, type Collection, type CollectionField } from "@/lib/typesense-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { CopyButton, FieldValue } from "@/components/field-value";
import { useIsMobile } from "@/hooks/use-mobile";
import { TruncatedFieldName } from "@/components/ui/truncated-field-name";

function getQueryBy(fields: CollectionField[]): string {
  const stringFields = fields.filter((f) => f.type === "string" || f.type === "string[]");
  const candidates = stringFields.length > 0 ? stringFields.slice(0, 5) : fields.slice(0, 1);
  return candidates.map((f) => f.name).join(",") || "id";
}

type SearchMode = "auto" | "custom";

function SearchFieldsPopover({
  fields,
  searchMode,
  onSearchModeChange,
  customQueryFields,
  onCustomQueryFieldsChange,
  autoQueryFields,
}: {
  fields: CollectionField[];
  searchMode: SearchMode;
  onSearchModeChange: (m: SearchMode) => void;
  customQueryFields: string[];
  onCustomQueryFieldsChange: (f: string[]) => void;
  autoQueryFields: string[];
}) {
  const searchableFields = fields.filter(
    (f) => f.type === "string" || f.type === "string[]" || f.type === "auto",
  );
  const unselected = searchableFields.filter((f) => !customQueryFields.includes(f.name));

  function toggle(name: string) {
    if (customQueryFields.includes(name)) {
      onCustomQueryFieldsChange(customQueryFields.filter((f) => f !== name));
    } else {
      onCustomQueryFieldsChange([...customQueryFields, name]);
    }
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...customQueryFields];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap]!, next[idx]!];
    onCustomQueryFieldsChange(next);
  }

  function switchToCustom() {
    if (customQueryFields.length === 0) onCustomQueryFieldsChange(autoQueryFields);
    onSearchModeChange("custom");
  }

  const displayLabel =
    searchMode === "auto"
      ? "Auto"
      : customQueryFields.length === 0
        ? "No fields"
        : customQueryFields.slice(0, 2).join(", ") +
          (customQueryFields.length > 2 ? ` +${customQueryFields.length - 2}` : "");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
        >
          <SlidersHorizontal className="h-3 w-3 shrink-0" />
          <TruncatedFieldName name={displayLabel} className="max-w-[18rem] truncate" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {/* Header + mode toggle */}
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-medium">Search fields</p>
          <div className="flex items-center gap-0.5 rounded-md border p-0.5">
            {(["auto", "custom"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => (m === "auto" ? onSearchModeChange("auto") : switchToCustom())}
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium capitalize transition-colors",
                  searchMode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {searchMode === "auto" ? (
          <div className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              Automatically searching these string fields:
            </p>
            <div className="space-y-0.5">
              {autoQueryFields.map((name) => (
                <div key={name} className="flex items-center gap-2 py-0.5 text-xs">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span className="flex-1 font-mono">{name}</span>
                  <span className="text-muted-foreground/50">
                    {fields.find((f) => f.name === name)?.type}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={switchToCustom}
              className="mt-1 text-xs text-primary hover:underline"
            >
              Customize →
            </button>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto p-3 space-y-4">
            {/* Selected fields */}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selected · priority order
              </p>
              {customQueryFields.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1">
                  No fields selected — add some below.
                </p>
              ) : (
                customQueryFields.map((name, i) => (
                  <div key={name} className="flex items-center gap-1.5 rounded px-1 py-0.5">
                    <span className="w-4 shrink-0 text-right text-[10px] text-muted-foreground/40">
                      {i + 1}
                    </span>
                    <TruncatedFieldName name={name} className="flex-1 truncate text-xs font-mono" />
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-25"
                        title="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === customQueryFields.length - 1}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-25"
                        title="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(name)}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Available fields */}
            {unselected.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Available
                </p>
                {unselected.map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => toggle(f.name)}
                    className="flex w-full items-center gap-2 rounded px-1 py-1 text-xs transition-colors hover:bg-muted"
                  >
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-input" />
                    <span className="flex-1 text-left font-mono">{f.name}</span>
                    <span className="text-muted-foreground/50">{f.type}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="border-t pt-2">
              <button
                type="button"
                onClick={() => {
                  onCustomQueryFieldsChange(autoQueryFields);
                  onSearchModeChange("auto");
                }}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                ↩ Reset to auto
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function HitCard({
  hit,
  collectionName,
}: {
  hit: Record<string, unknown>;
  collectionName: string;
}) {
  const raw = Object.entries(hit).filter(([k]) => !k.startsWith("__") && k !== "objectID");
  const ordered: [string, unknown][] = [
    ...raw.filter(([k]) => k === "id"),
    ...raw.filter(([k]) => k !== "id" && !k.startsWith("_")).sort(([a], [b]) => a.localeCompare(b)),
    ...raw.filter(([k]) => k.startsWith("_")).sort(([a], [b]) => a.localeCompare(b)),
  ];
  return (
    <div className="rounded-md border bg-card divide-y hover:bg-muted/10 transition-colors min-w-0">
      {ordered.map(([key, value]) => (
        <div key={key} className="flex items-start gap-3 px-3 py-2 min-w-0">
          <span className="text-xs font-mono text-muted-foreground shrink-0 w-20 sm:w-36 truncate pt-px">
            {key}
          </span>
          <div className="flex-1 min-w-0 pt-px flex items-start gap-1.5">
            {key === "id" && typeof value === "string" && collectionName ? (
              <Link
                href={`/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(value)}`}
                className="text-xs font-mono break-all text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                {value}
              </Link>
            ) : (
              <FieldValue value={value} fieldName={key} document={hit} />
            )}
            {key === "id" && typeof value === "string" && (
              <CopyButton text={value} label="Copy ID" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClearFacets() {
  const { refine, canRefine } = useClearRefinements();
  if (!canRefine) return null;
  return (
    <button
      type="button"
      onClick={refine}
      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
    >
      Clear filters
    </button>
  );
}

function buildFilterBy(refinementList: Record<string, string[]> | undefined): string {
  if (!refinementList) return "";
  return Object.entries(refinementList)
    .filter(([, vals]) => vals.length > 0)
    .map(([attr, vals]) => `${attr}:=[${vals.join(",")}]`)
    .join(" && ");
}

function ExportButton({ collectionName, queryBy }: { collectionName: string; queryBy: string }) {
  const profile = useConnectionStore(selectActiveProfile);
  const { indexUiState } = useInstantSearch();
  const isMobile = useIsMobile();

  if (!profile) return null;

  const query = (indexUiState.query as string) || "*";
  const filterBy = buildFilterBy(indexUiState.refinementList as Record<string, string[]>);
  const page = (indexUiState.page as number) || 1;
  const baseUrl = `${profile.protocol}://${profile.host}:${profile.port}`;

  const searchParams = new URLSearchParams({ q: query, query_by: queryBy });
  if (filterBy) searchParams.set("filter_by", filterBy);
  if (page > 1) searchParams.set("page", String(page));

  const curlCmd = `curl -X GET \\
  '${baseUrl}/collections/${collectionName}/documents/search?${searchParams.toString()}' \\
  -H 'X-TYPESENSE-API-KEY: ${profile.apiKey}'`;

  const filterLine = filterBy ? `\n    filter_by: '${filterBy}',` : "";
  const pageLine = page > 1 ? `\n    page: ${page},` : "";
  const jsCode = `import Typesense from 'typesense';

const client = new Typesense.Client({
  nodes: [{ host: '${profile.host}', port: ${profile.port}, protocol: '${profile.protocol}' }],
  apiKey: '${profile.apiKey}',
  connectionTimeoutSeconds: 2,
});

const results = await client
  .collections('${collectionName}')
  .documents()
  .search({
    q: '${query}',
    query_by: '${queryBy}',${filterLine}${pageLine}
  });`;

  const trigger = (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
      title="Export search as cURL / SDK"
    >
      <Code2 className="h-3.5 w-3.5 shrink-0" />
      <span>Export</span>
    </button>
  );

  const exportContent = (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            cURL
          </p>
          <CopyButton text={curlCmd} label="Copy cURL" />
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted/50 p-3 text-xs font-mono">
          {curlCmd}
        </pre>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            JavaScript — Typesense SDK
          </p>
          <CopyButton text={jsCode} label="Copy JS" />
        </div>
        <pre className="overflow-x-auto whitespace-pre rounded-md bg-muted/50 p-3 text-xs font-mono">
          {jsCode}
        </pre>
      </div>
      <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Want to build your own InstantSearch UI?{" "}
        <a
          href="https://typesense.org/docs/guide/search-ui-components.html#with-a-package-manager"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          Learn more →
        </a>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Export search query</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">{exportContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export search query</DialogTitle>
        </DialogHeader>
        {exportContent}
      </DialogContent>
    </Dialog>
  );
}

type NavHandle = { prev: () => void; next: () => void };

function KeyboardShortcuts({
  searchWrapperRef,
  navRef,
  searchOptionsCollapsed,
  onToggleSearchOptionsCollapsed,
}: {
  searchWrapperRef: React.RefObject<HTMLDivElement | null>;
  navRef: React.RefObject<NavHandle>;
  searchOptionsCollapsed: boolean;
  onToggleSearchOptionsCollapsed: () => void;
}) {
  const { refine: refineQuery } = useSearchBox();
  const { currentRefinement, nbPages, refine: refinePage } = usePagination();
  const isMobile = useIsMobile();

  const queryRef = useRef(refineQuery);
  const pageRef = useRef({ current: currentRefinement, total: nbPages, refine: refinePage });
  const isMobileRef = useRef(isMobile);
  const collapsedRef = useRef(searchOptionsCollapsed);
  const toggleRef = useRef(onToggleSearchOptionsCollapsed);
  useEffect(() => {
    queryRef.current = refineQuery;
  }, [refineQuery]);
  useEffect(() => {
    pageRef.current = { current: currentRefinement, total: nbPages, refine: refinePage };
  }, [currentRefinement, nbPages, refinePage]);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);
  useEffect(() => {
    collapsedRef.current = searchOptionsCollapsed;
  }, [searchOptionsCollapsed]);
  useEffect(() => {
    toggleRef.current = onToggleSearchOptionsCollapsed;
  }, [onToggleSearchOptionsCollapsed]);

  useEffect(() => {
    function getInput() {
      return searchWrapperRef.current?.querySelector<HTMLInputElement>("input");
    }

    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;

      if (e.key === "s" && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        getInput()?.focus();
        return;
      }

      if (e.key === "Escape" && document.activeElement === getInput()) {
        queryRef.current("");
        getInput()?.blur();
        return;
      }

      if (isTyping) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          navRef.current?.next();
          break;
        case "ArrowUp":
          e.preventDefault();
          navRef.current?.prev();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (pageRef.current.current < pageRef.current.total - 1)
            pageRef.current.refine(pageRef.current.current + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (pageRef.current.current > 0) pageRef.current.refine(pageRef.current.current - 1);
          break;
      }
    }
    window.addEventListener("keydown", onKey);

    let touchStartX = 0;
    let touchStartY = 0;

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!isMobileRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) {
        if (isMobileRef.current && Math.abs(dy) > Math.abs(dx)) {
          if (dy < -80) {
            if (!collapsedRef.current) toggleRef.current();
          } else if (dy > 80) {
            if (collapsedRef.current) toggleRef.current();
          }
        }
        return;
      }
      if (dx < 0) {
        if (pageRef.current.current < pageRef.current.total - 1)
          pageRef.current.refine(pageRef.current.current + 1);
      } else {
        if (pageRef.current.current > 0) pageRef.current.refine(pageRef.current.current - 1);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function HitsWithNav({
  navRef,
  collectionName,
  onNavStateChange,
}: {
  navRef: React.RefObject<NavHandle>;
  collectionName: string;
  onNavStateChange?: (isFirst: boolean, isLast: boolean) => void;
}) {
  const { hits } = useHits<Record<string, unknown>>();
  const [currentIdx, setCurrentIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setCurrentIdx(0);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [hits]);

  function navigateTo(idx: number) {
    const el = itemRefs.current[idx];
    const container = scrollRef.current;
    if (!el || !container) return;
    container.scrollTo({ top: el.offsetTop, behavior: "smooth" });
    setCurrentIdx(idx);
  }

  // Expose prev/next to keyboard shortcut handler
  useEffect(() => {
    navRef.current = {
      prev: () => {
        if (currentIdx > 0) navigateTo(currentIdx - 1);
      },
      next: () => {
        if (currentIdx < hits.length - 1) navigateTo(currentIdx + 1);
      },
    };
  });

  const isFirst = currentIdx === 0;
  const isLast = hits.length === 0 || currentIdx >= hits.length - 1;

  useEffect(() => {
    onNavStateChange?.(isFirst, isLast);
  }, [isFirst, isLast]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={scrollRef}
      className="relative flex-1 min-w-0 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {hits.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No results</p>
      ) : (
        <div className="space-y-5">
          {hits.map((hit, i) => (
            <div
              key={String(hit.objectID)}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
            >
              <HitCard hit={hit} collectionName={collectionName} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SHORTCUTS = [
  { keys: ["S"], description: "Focus search" },
  { keys: ["Esc"], description: "Clear search" },
  { keys: ["↑", "↓"], description: "Prev / next document" },
  { keys: ["←", "→"], description: "Prev / next page" },
] as const;

function ShortcutsHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border border-transparent px-1.5 py-1 text-xs text-muted-foreground/60 transition-colors hover:border-border hover:bg-muted hover:text-muted-foreground"
          title="Keyboard shortcuts"
        >
          <Keyboard className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-56 p-3">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Keyboard shortcuts
        </p>
        <div className="space-y-2">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{description}</span>
              <div className="flex items-center gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SearchError() {
  const { error } = useInstantSearch();
  if (!error) return null;
  return (
    <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      Search error: {error.message}
    </div>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profile = useConnectionStore(selectActiveProfile);
  const status = useConnectionStore(selectStatus);

  const isMobile = useIsMobile();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  useEffect(() => {
    if (isMobile !== undefined) setPageSize(isMobile ? 20 : 50);
  }, [isMobile]);
  const [navIsFirst, setNavIsFirst] = useState(true);
  const [navIsLast, setNavIsLast] = useState(true);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<NavHandle>({ prev: () => {}, next: () => {} });

  const handleNavStateChange = useCallback((isFirst: boolean, isLast: boolean) => {
    setNavIsFirst(isFirst);
    setNavIsLast(isLast);
  }, []);

  const selectedCollection = searchParams.get("collection") ?? "";

  function setSelectedCollection(name: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("collection", name);
    router.replace(`/search?${params.toString()}`);
    if (profile) {
      localStorage.setItem(`typelens_collection_${profile.id}`, name);
    }
  }

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    listCollections(profile)
      .then((cols) => {
        setCollections(cols);
        const urlCollection = searchParams.get("collection");
        if (!urlCollection) {
          const saved = localStorage.getItem(`typelens_collection_${profile.id}`);
          if (saved && cols.some((c) => c.name === saved)) {
            setSelectedCollection(saved);
          } else if (cols.length === 1) {
            setSelectedCollection(cols[0].name);
          }
        }
      })
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, [profile]);

  const [searchMode, setSearchMode] = useState<SearchMode>("auto");
  const [customQueryFields, setCustomQueryFields] = useState<string[]>([]);
  const [filtersCollapsed, setFiltersCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("typelens-filters-collapsed") === "true";
  });

  const toggleFiltersCollapsed = () => {
    setFiltersCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("typelens-filters-collapsed", String(next));
      return next;
    });
  };

  const [searchOptionsCollapsed, setSearchOptionsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("typelens-search-options-collapsed") === "true";
  });

  const toggleSearchOptionsCollapsed = () => {
    setSearchOptionsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("typelens-search-options-collapsed", String(next));
      return next;
    });
  };

  const activeCollection = collections.find((c) => c.name === selectedCollection) ?? null;

  // Reset field config whenever the user switches to a different collection
  useEffect(() => {
    setSearchMode("auto");
    setCustomQueryFields([]);
  }, [selectedCollection]);

  const autoQueryFields = useMemo(
    () => (activeCollection ? getQueryBy(activeCollection.fields).split(",").filter(Boolean) : []),
    [activeCollection],
  );

  const queryBy = useMemo(() => {
    if (searchMode === "custom" && customQueryFields.length > 0) return customQueryFields.join(",");
    return autoQueryFields.join(",") || "";
  }, [searchMode, customQueryFields, autoQueryFields]);

  const facetFields = useMemo(
    () => (activeCollection ? activeCollection.fields.filter((f) => f.facet) : []),
    [activeCollection],
  );

  const adapter = useMemo(() => {
    if (!profile || !selectedCollection || !queryBy) return null;
    if (typeof window === "undefined") return null;

    const proxyPort =
      Number(window.location.port) || (window.location.protocol === "https:" ? 443 : 80);

    return new TypesenseInstantSearchAdapter({
      server: {
        apiKey: profile.apiKey,
        nodes: [
          {
            host: window.location.hostname,
            port: proxyPort,
            protocol: window.location.protocol.replace(":", "") as "http" | "https",
            path: "/api/typesense",
          },
        ],
        additionalHeaders: {
          "X-Ts-Host": profile.host,
          "X-Ts-Port": String(profile.port),
          "X-Ts-Protocol": profile.protocol,
          "X-Ts-Api-Key": profile.apiKey,
        },
      },
      additionalSearchParameters: { query_by: queryBy },
    });
  }, [
    profile?.apiKey,
    profile?.host,
    profile?.port,
    profile?.protocol,
    selectedCollection,
    queryBy,
  ]);

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No active connection. Configure one in Settings → Connections.
        </p>
      </div>
    );
  }

  if (status === "connecting" && collections.length === 0) {
    return <ConnectingState profile={profile} fullPage />;
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {searchOptionsCollapsed && (
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="shrink-0 text-2xl font-semibold">Search</h1>
          <span className="text-sm text-muted-foreground">
            {selectedCollection ?? "No collection"}
            {" · "}
            {pageSize} per page
          </span>
        </div>
      )}
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: searchOptionsCollapsed ? "0fr" : "1fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <h1 className="shrink-0 text-2xl font-semibold">Search</h1>
            {loading ? (
              <div className="h-10 w-48 animate-pulse rounded-md border bg-muted" />
            ) : (
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Select a collection…" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedCollection && activeCollection && (
              <div className="flex flex-wrap items-center gap-2">
                <SearchFieldsPopover
                  fields={activeCollection.fields}
                  searchMode={searchMode}
                  onSearchModeChange={setSearchMode}
                  customQueryFields={customQueryFields}
                  onCustomQueryFieldsChange={setCustomQueryFields}
                  autoQueryFields={autoQueryFields}
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Per page</span>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="h-6 w-16 px-2 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)} className="text-xs">
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!selectedCollection && !loading && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Select a collection above to start searching.
          </p>
        </div>
      )}

      {adapter && selectedCollection && (
        <InstantSearch indexName={selectedCollection} searchClient={adapter.searchClient}>
          <Configure hitsPerPage={pageSize} />
          <KeyboardShortcuts
            searchWrapperRef={searchWrapperRef}
            navRef={navRef}
            searchOptionsCollapsed={searchOptionsCollapsed}
            onToggleSearchOptionsCollapsed={toggleSearchOptionsCollapsed}
          />
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <SearchError />
            <div
              className="grid transition-all duration-300 ease-in-out"
              style={{ gridTemplateRows: searchOptionsCollapsed ? "0fr" : "1fr" }}
            >
              <div className="overflow-hidden">
                <div ref={searchWrapperRef}>
                  <SearchBox
                    classNames={{
                      root: "w-full",
                      form: "relative flex items-center",
                      input: cn(
                        "flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 py-2 text-sm",
                        "ring-offset-background placeholder:text-muted-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "[&::-webkit-search-cancel-button]:hidden",
                      ),
                      submit:
                        "absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/50",
                      reset:
                        "absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors",
                      submitIcon: "h-4 w-4 fill-current",
                      resetIcon: "h-3.5 w-3.5 fill-current",
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={toggleSearchOptionsCollapsed}
                className="flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                title={searchOptionsCollapsed ? "Expand search options" : "Collapse search options"}
              >
                {searchOptionsCollapsed ? (
                  <ChevronsDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronsUp className="h-3.5 w-3.5 shrink-0" />
                )}
              </button>
              {facetFields.length > 0 && (
                <button
                  type="button"
                  onClick={toggleFiltersCollapsed}
                  className="flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                  title={filtersCollapsed ? "Show filters" : "Hide filters"}
                >
                  {filtersCollapsed ? (
                    <PanelLeftOpen className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              )}
              <div className="flex-1" />
              <div className="hidden md:block">
                <ShortcutsHelp />
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={navIsFirst}
                  onClick={() => navRef.current?.prev()}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    navIsFirst
                      ? "text-muted-foreground/25 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  title="Previous document"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={navIsLast}
                  onClick={() => navRef.current?.next()}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    navIsLast
                      ? "text-muted-foreground/25 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  title="Next document"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <ExportButton collectionName={selectedCollection} queryBy={queryBy} />
              <Stats classNames={{ root: "text-xs text-muted-foreground" }} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col sm:flex-row gap-4 sm:gap-6 overflow-hidden">
              {facetFields.length > 0 && (
                <aside
                  className={cn(
                    "shrink-0 space-y-5",
                    filtersCollapsed
                      ? "hidden"
                      : "block sm:w-44 overflow-y-auto max-h-64 sm:max-h-none",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Filters
                    </span>
                    <ClearFacets />
                  </div>
                  {facetFields.map((f) => (
                    <div key={f.name}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {f.name}
                      </p>
                      <RefinementList
                        attribute={f.name}
                        classNames={{
                          root: "space-y-1",
                          list: "space-y-1",
                          item: "flex items-center",
                          checkbox:
                            "mr-2 h-4 w-4 rounded border-input accent-primary cursor-pointer",
                          label: "flex w-full cursor-pointer items-center gap-2 text-sm",
                          labelText: "flex-1 truncate text-foreground",
                          count: "tabular-nums text-xs text-muted-foreground",
                        }}
                      />
                    </div>
                  ))}
                </aside>
              )}
              <HitsWithNav
                navRef={navRef}
                collectionName={selectedCollection}
                onNavStateChange={handleNavStateChange}
              />
            </div>
            <Pagination
              classNames={{
                root: "flex justify-center",
                list: "flex items-center gap-1",
                item: "rounded-md",
                link: "flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-muted",
                selectedItem:
                  "[&_a]:bg-primary [&_a]:text-primary-foreground [&_a]:pointer-events-none",
                disabledItem: "pointer-events-none opacity-40",
              }}
            />
          </div>
        </InstantSearch>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  );
}
