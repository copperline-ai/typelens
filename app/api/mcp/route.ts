import { NextRequest, NextResponse } from "next/server";
import { mcpEnabled, verifyMcpToken } from "@/lib/api/mcp-auth";
import { buildTypesenseUrl, type TypesenseProxyProfile } from "@/lib/api/proxy-typesense";

// ── MCP JSON-RPC types ────────────────────────────────────────────────────────

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

function ok(id: JsonRpcId, result: unknown): NextResponse {
  return NextResponse.json({ jsonrpc: "2.0", id, result } as JsonRpcResponse);
}

function err(id: JsonRpcId, code: number, message: string, status = 200): NextResponse {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } } as JsonRpcResponse, {
    status,
  });
}

// ── Typesense helper ──────────────────────────────────────────────────────────

async function callTypesense(
  profile: TypesenseProxyProfile,
  path: string,
  opts?: {
    method?: string;
    body?: unknown;
    searchParams?: Record<string, string | number | boolean>;
  },
): Promise<unknown> {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(opts?.searchParams ?? {})) {
    sp.set(k, String(v));
  }
  const qs = sp.size ? `?${sp.toString()}` : "";
  const url = buildTypesenseUrl(profile, `${path}${qs}`);
  const headers: Record<string, string> = { "X-TYPESENSE-API-KEY": profile.apiKey };
  const bodyStr = opts?.body !== undefined ? JSON.stringify(opts.body) : undefined;
  if (bodyStr) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method: opts?.method ?? "GET",
    headers,
    body: bodyStr,
    signal: AbortSignal.timeout(10_000),
  });

  const text = await res.text();
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = JSON.parse(text);
    } catch {
      detail = text;
    }
    throw Object.assign(new Error(`Typesense error ${res.status}`), { detail, status: res.status });
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ── MCP Tool definitions ──────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "list_collections",
    description: "List all Typesense collections",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_collection",
    description: "Retrieve the schema of a Typesense collection",
    inputSchema: {
      type: "object",
      properties: { collection_name: { type: "string", description: "Name of the collection" } },
      required: ["collection_name"],
    },
  },
  {
    name: "create_collection",
    description: "Create a new Typesense collection with a schema",
    inputSchema: {
      type: "object",
      properties: {
        schema: {
          type: "object",
          description:
            'Collection schema object with "name", "fields" array, and optional "default_sorting_field"',
        },
      },
      required: ["schema"],
    },
  },
  {
    name: "delete_collection",
    description: "Permanently delete a Typesense collection and all its documents",
    inputSchema: {
      type: "object",
      properties: { collection_name: { type: "string" } },
      required: ["collection_name"],
    },
  },
  {
    name: "update_collection",
    description: "Update the schema of an existing Typesense collection",
    inputSchema: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        updates: { type: "object", description: "Schema update object (e.g. add/drop fields)" },
      },
      required: ["collection_name", "updates"],
    },
  },
  {
    name: "search_documents",
    description: "Search for documents in a Typesense collection",
    inputSchema: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        q: { type: "string", description: "Search query (use * for wildcard)" },
        query_by: { type: "string", description: "Comma-separated fields to search" },
        filter_by: { type: "string", description: "Filter expression" },
        sort_by: { type: "string", description: "Sort expression (e.g. field:desc)" },
        facet_by: { type: "string", description: "Comma-separated fields to facet" },
        page: { type: "number", description: "Page number (default 1)" },
        per_page: { type: "number", description: "Results per page (default 10, max 250)" },
        prefix: { type: "boolean", description: "Enable prefix search" },
        num_typos: { type: "number", description: "Typo tolerance (0-2)" },
      },
      required: ["collection_name", "q", "query_by"],
    },
  },
  {
    name: "retrieve_document",
    description: "Retrieve a single document from a Typesense collection by its ID",
    inputSchema: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        document_id: { type: "string" },
      },
      required: ["collection_name", "document_id"],
    },
  },
  {
    name: "create_document",
    description: "Index a new document in a Typesense collection",
    inputSchema: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        document: { type: "object", description: "Document to index (must include id field)" },
      },
      required: ["collection_name", "document"],
    },
  },
  {
    name: "upsert_document",
    description: "Create or update a document in a Typesense collection",
    inputSchema: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        document: { type: "object" },
      },
      required: ["collection_name", "document"],
    },
  },
  {
    name: "update_document",
    description: "Update specific fields of a document in a Typesense collection",
    inputSchema: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        document_id: { type: "string" },
        updates: { type: "object", description: "Fields to update" },
      },
      required: ["collection_name", "document_id", "updates"],
    },
  },
  {
    name: "delete_document",
    description: "Delete a document from a Typesense collection by its ID",
    inputSchema: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        document_id: { type: "string" },
      },
      required: ["collection_name", "document_id"],
    },
  },
  {
    name: "delete_documents_by_query",
    description: "Delete multiple documents matching a filter expression",
    inputSchema: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        filter_by: { type: "string", description: "Filter expression to match documents" },
        batch_size: { type: "number", description: "Deletion batch size (default 40)" },
      },
      required: ["collection_name", "filter_by"],
    },
  },
  {
    name: "export_documents",
    description: "Export all documents from a Typesense collection as JSONL",
    inputSchema: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        filter_by: { type: "string", description: "Optional filter to export a subset" },
        include_fields: { type: "string", description: "Comma-separated fields to include" },
        exclude_fields: { type: "string", description: "Comma-separated fields to exclude" },
      },
      required: ["collection_name"],
    },
  },
  {
    name: "list_api_keys",
    description: "List all Typesense API keys",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "create_api_key",
    description: "Create a new Typesense API key with specified permissions",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string" },
        actions: {
          type: "array",
          items: { type: "string" },
          description: 'API actions (e.g. ["documents:search", "collections:list"])',
        },
        collections: {
          type: "array",
          items: { type: "string" },
          description: 'Collections to allow (e.g. ["*"] for all)',
        },
        expires_at: { type: "number", description: "Unix timestamp when the key expires" },
      },
      required: ["actions", "collections"],
    },
  },
  {
    name: "health",
    description: "Check the health status of the Typesense server",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────────

type Args = Record<string, unknown>;

async function executeTool(
  name: string,
  args: Args,
  profile: TypesenseProxyProfile,
): Promise<unknown> {
  switch (name) {
    case "list_collections":
      return callTypesense(profile, "/collections");

    case "get_collection":
      return callTypesense(profile, `/collections/${args.collection_name}`);

    case "create_collection":
      return callTypesense(profile, "/collections", { method: "POST", body: args.schema });

    case "delete_collection":
      return callTypesense(profile, `/collections/${args.collection_name}`, { method: "DELETE" });

    case "update_collection":
      return callTypesense(profile, `/collections/${args.collection_name}`, {
        method: "PATCH",
        body: args.updates,
      });

    case "search_documents": {
      const {
        collection_name,
        q,
        query_by,
        filter_by,
        sort_by,
        facet_by,
        page,
        per_page,
        prefix,
        num_typos,
      } = args as Record<string, string | number | boolean | undefined>;
      const sp: Record<string, string | number | boolean> = {
        q: String(q),
        query_by: String(query_by),
      };
      if (filter_by) sp.filter_by = String(filter_by);
      if (sort_by) sp.sort_by = String(sort_by);
      if (facet_by) sp.facet_by = String(facet_by);
      if (page !== undefined) sp.page = Number(page);
      if (per_page !== undefined) sp.per_page = Number(per_page);
      if (prefix !== undefined) sp.prefix = Boolean(prefix);
      if (num_typos !== undefined) sp.num_typos = Number(num_typos);
      return callTypesense(profile, `/collections/${collection_name}/documents/search`, {
        searchParams: sp,
      });
    }

    case "retrieve_document":
      return callTypesense(
        profile,
        `/collections/${args.collection_name}/documents/${args.document_id}`,
      );

    case "create_document":
      return callTypesense(profile, `/collections/${args.collection_name}/documents`, {
        method: "POST",
        body: args.document,
      });

    case "upsert_document":
      return callTypesense(profile, `/collections/${args.collection_name}/documents`, {
        method: "POST",
        body: args.document,
        searchParams: { action: "upsert" },
      });

    case "update_document":
      return callTypesense(
        profile,
        `/collections/${args.collection_name}/documents/${args.document_id}`,
        { method: "PATCH", body: args.updates },
      );

    case "delete_document":
      return callTypesense(
        profile,
        `/collections/${args.collection_name}/documents/${args.document_id}`,
        { method: "DELETE" },
      );

    case "delete_documents_by_query": {
      const sp: Record<string, string | number | boolean> = {
        filter_by: String(args.filter_by),
      };
      if (args.batch_size !== undefined) sp.batch_size = Number(args.batch_size);
      return callTypesense(profile, `/collections/${args.collection_name}/documents`, {
        method: "DELETE",
        searchParams: sp,
      });
    }

    case "export_documents": {
      const sp: Record<string, string | number | boolean> = {};
      if (args.filter_by) sp.filter_by = String(args.filter_by);
      if (args.include_fields) sp.include_fields = String(args.include_fields);
      if (args.exclude_fields) sp.exclude_fields = String(args.exclude_fields);
      return callTypesense(profile, `/collections/${args.collection_name}/documents/export`, {
        searchParams: sp,
      });
    }

    case "list_api_keys":
      return callTypesense(profile, "/keys");

    case "create_api_key":
      return callTypesense(profile, "/keys", {
        method: "POST",
        body: {
          description: args.description,
          actions: args.actions,
          collections: args.collections,
          ...(args.expires_at !== undefined ? { expires_at: args.expires_at } : {}),
        },
      });

    case "health":
      return callTypesense(profile, "/health");

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── CORS headers ──────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── GET — endpoint discovery ──────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json(
    {
      name: "TypeLens MCP Server",
      version: "1.0.0",
      protocolVersion: "2024-11-05",
      transport: "streamable-http",
    },
    { headers: CORS },
  );
}

// ── POST — JSON-RPC handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!mcpEnabled()) {
    return err(null, -32002, "MCP server not configured", 503);
  }

  // Extract Bearer token
  const auth = request.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Authentication required" } },
      { status: 401, headers: CORS },
    );
  }

  const credentials = await verifyMcpToken(token);
  if (!credentials) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Invalid or expired token" } },
      { status: 401, headers: CORS },
    );
  }

  const profile: TypesenseProxyProfile = {
    host: credentials.host,
    port: credentials.port,
    protocol: credentials.protocol,
    apiKey: credentials.apiKey,
  };

  // Parse JSON-RPC body
  let rpc: JsonRpcRequest;
  try {
    rpc = (await request.json()) as JsonRpcRequest;
  } catch {
    const res = err(null, -32700, "Parse error");
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  }

  const id = rpc.id ?? null;

  const respond = (r: NextResponse): NextResponse => {
    for (const [k, v] of Object.entries(CORS)) r.headers.set(k, v);
    return r;
  };

  switch (rpc.method) {
    case "initialize":
      return respond(
        ok(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "TypeLens MCP Server", version: "1.0.0" },
        }),
      );

    case "notifications/initialized":
      // Client acknowledgement — no response needed (use HTTP 204)
      return new NextResponse(null, { status: 204, headers: CORS });

    case "tools/list":
      return respond(ok(id, { tools: TOOLS }));

    case "tools/call": {
      const params = rpc.params as { name?: string; arguments?: Args } | undefined;
      const toolName = params?.name;
      const toolArgs = params?.arguments ?? {};

      if (!toolName) {
        return respond(err(id, -32602, "Invalid params: missing tool name"));
      }

      const toolExists = TOOLS.some((t) => t.name === toolName);
      if (!toolExists) {
        return respond(err(id, -32602, `Unknown tool: ${toolName}`));
      }

      try {
        const result = await executeTool(toolName, toolArgs, profile);
        const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
        return respond(
          ok(id, {
            content: [{ type: "text", text }],
            isError: false,
          }),
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : "Tool execution failed";
        const detail = (e as { detail?: unknown }).detail;
        const text = detail ? JSON.stringify(detail, null, 2) : message;
        return respond(
          ok(id, {
            content: [{ type: "text", text }],
            isError: true,
          }),
        );
      }
    }

    default:
      return respond(err(id, -32601, `Method not found: ${rpc.method}`));
  }
}
