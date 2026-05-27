"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, RefreshCw, ServerCog, TriangleAlert } from "lucide-react";
import { selectActiveProfile, useConnectionStore } from "@/lib/stores/connection";
import { Button } from "@/components/ui/button";

type TokenState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; token: string; expiresAt: string }
  | { status: "error"; message: string };

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export default function McpSettingsPage() {
  const activeProfile = useConnectionStore(selectActiveProfile);
  const { hydrateFromStorage } = useConnectionStore((s) => s.actions);

  const [mcpEnabled, setMcpEnabled] = useState<boolean | null>(null);
  const [tokenState, setTokenState] = useState<TokenState>({ status: "idle" });

  useEffect(() => {
    hydrateFromStorage();
    fetch("/api/mcp/token")
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => setMcpEnabled(d.enabled ?? false))
      .catch(() => setMcpEnabled(false));
  }, [hydrateFromStorage]);

  async function generateToken() {
    if (!activeProfile) return;
    setTokenState({ status: "loading" });
    try {
      const res = await fetch("/api/mcp/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: activeProfile.host,
          port: activeProfile.port,
          protocol: activeProfile.protocol,
          apiKey: activeProfile.apiKey,
        }),
      });
      const data = (await res.json()) as { token?: string; expiresAt?: string; error?: string };
      if (!res.ok || !data.token) {
        setTokenState({ status: "error", message: data.error ?? `HTTP ${res.status}` });
      } else {
        setTokenState({ status: "success", token: data.token, expiresAt: data.expiresAt! });
      }
    } catch (e) {
      setTokenState({
        status: "error",
        message: e instanceof Error ? e.message : "Request failed",
      });
    }
  }

  const appUrl =
    (typeof window !== "undefined" ? window.location.origin : null) ?? "https://your-typelens-url";

  const claudeDesktopConfig =
    tokenState.status === "success"
      ? JSON.stringify(
          {
            mcpServers: {
              typelens: {
                url: `${appUrl}/api/mcp`,
                headers: {
                  Authorization: `Bearer ${tokenState.token}`,
                },
              },
            },
          },
          null,
          2,
        )
      : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">MCP Server</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Expose your Typesense instance as an MCP server so AI agents can interact with it
          directly.
        </p>
      </div>

      {mcpEnabled === null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking configuration…
        </div>
      )}

      {mcpEnabled === false && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950 p-4">
          <div className="flex items-start gap-3">
            <TriangleAlert className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                MCP server not configured
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Add{" "}
                <code className="font-mono bg-yellow-100 dark:bg-yellow-900 px-1 rounded">
                  TYPELENS_MCP_SECRET
                </code>{" "}
                to your environment to enable the MCP server. Use a long random string (at least 32
                characters).
              </p>
            </div>
          </div>
        </div>
      )}

      {mcpEnabled && (
        <>
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ServerCog className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Server endpoint</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-sm">
              <span className="flex-1 truncate">{appUrl}/api/mcp</span>
              <CopyButton text={`${appUrl}/api/mcp`} />
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Generate access token</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeProfile
                  ? `Using connection: ${activeProfile.name}`
                  : "No active connection — select a connection first."}
              </p>
            </div>

            <Button
              onClick={generateToken}
              disabled={!activeProfile || tokenState.status === "loading"}
              size="sm"
              variant={tokenState.status === "success" ? "outline" : "default"}
            >
              {tokenState.status === "loading" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tokenState.status === "success" && <RefreshCw className="h-4 w-4 mr-2" />}
              {tokenState.status === "success" ? "Regenerate token" : "Generate token"}
            </Button>

            {tokenState.status === "error" && (
              <p className="text-sm text-destructive">{tokenState.message}</p>
            )}

            {tokenState.status === "success" && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Access token — expires {new Date(tokenState.expiresAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-xs">
                    <span className="flex-1 truncate">{tokenState.token}</span>
                    <CopyButton text={tokenState.token} />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Claude Desktop config</p>
                  <div className="relative rounded-md bg-muted p-3 font-mono text-xs">
                    <div className="absolute top-2 right-2">
                      <CopyButton text={claudeDesktopConfig!} />
                    </div>
                    <pre className="whitespace-pre-wrap pr-6 overflow-auto max-h-56">
                      {claudeDesktopConfig}
                    </pre>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add this to your{" "}
                    <code className="font-mono bg-muted px-1 rounded">
                      claude_desktop_config.json
                    </code>{" "}
                    under <code className="font-mono bg-muted px-1 rounded">mcpServers</code>.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ServerCog className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Claude Team / MCP connector</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this SSE URL to add TypeLens as a connector in your Claude Team workspace (
              <span className="font-medium">Settings → Integrations → Add MCP server</span>
              ). Generate a token above first.
            </p>
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-sm">
              <span className="flex-1 truncate">
                {tokenState.status === "success"
                  ? `${appUrl}/api/mcp/sse?token=${tokenState.token}`
                  : `${appUrl}/api/mcp/sse?token=<your-token>`}
              </span>
              {tokenState.status === "success" && (
                <CopyButton text={`${appUrl}/api/mcp/sse?token=${tokenState.token}`} />
              )}
            </div>
            {tokenState.status !== "success" && (
              <p className="text-xs text-muted-foreground">
                Generate a token above to get a ready-to-use connector URL.
              </p>
            )}
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium">Available tools ({16})</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
              {[
                "list_collections",
                "get_collection",
                "create_collection",
                "delete_collection",
                "update_collection",
                "search_documents",
                "retrieve_document",
                "create_document",
                "upsert_document",
                "update_document",
                "delete_document",
                "delete_documents_by_query",
                "export_documents",
                "list_api_keys",
                "create_api_key",
                "health",
              ].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
