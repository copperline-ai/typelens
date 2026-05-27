import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/client";
import { oauthClients, oauthCodes, oauthGrants, oauthRefreshTokens } from "@/lib/db/schema";

function seedClient(db: ReturnType<typeof createTestDb>["db"], clientId = "tl_test_client") {
  db.insert(oauthClients)
    .values({
      clientId,
      clientName: "Test Client",
      redirectUris: ["http://localhost:9999/cb"],
      grantTypes: ["authorization_code", "refresh_token"],
      responseTypes: ["code"],
    })
    .run();
  return clientId;
}

function seedGrant(db: ReturnType<typeof createTestDb>["db"], clientId: string, id = "grant_1") {
  db.insert(oauthGrants)
    .values({
      id,
      clientId,
      userId: "admin",
      profileId: "profile-uuid",
      profileName: "Production",
      profileHost: "ts.example.com",
      profilePort: 443,
      profileProtocol: "https",
      profileApiKeyEnc: "v1.aaa.bbb.ccc",
    })
    .run();
  return id;
}

describe("schema migrations", () => {
  it("creates all four oauth tables", () => {
    const { sqlite, close } = createTestDb();
    try {
      const tables = sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'oauth_%' ORDER BY name",
        )
        .all() as { name: string }[];
      expect(tables.map((t) => t.name)).toEqual([
        "oauth_clients",
        "oauth_codes",
        "oauth_grants",
        "oauth_refresh_tokens",
      ]);
    } finally {
      close();
    }
  });
});

describe("oauth_clients", () => {
  it("inserts + selects a client with JSON columns", () => {
    const { db, close } = createTestDb();
    try {
      seedClient(db, "tl_x");
      const [row] = db.select().from(oauthClients).where(eq(oauthClients.clientId, "tl_x")).all();
      expect(row?.clientName).toBe("Test Client");
      expect(row?.redirectUris).toEqual(["http://localhost:9999/cb"]);
      expect(row?.grantTypes).toEqual(["authorization_code", "refresh_token"]);
      expect(row?.tokenEndpointAuthMethod).toBe("none");
    } finally {
      close();
    }
  });
});

describe("foreign key cascades", () => {
  it("deletes codes when the grant is removed", () => {
    const { db, sqlite, close } = createTestDb();
    try {
      const clientId = seedClient(db);
      const grantId = seedGrant(db, clientId);
      db.insert(oauthCodes)
        .values({
          code: "code_1",
          grantId,
          clientId,
          redirectUri: "http://localhost:9999/cb",
          codeChallenge: "abc",
          codeChallengeMethod: "S256",
          scope: "mcp",
          expiresAt: new Date(Date.now() + 60_000),
        })
        .run();

      expect(db.select().from(oauthCodes).all().length).toBe(1);

      // Delete the parent grant — code should cascade
      sqlite.prepare("DELETE FROM oauth_grants WHERE id = ?").run(grantId);
      expect(db.select().from(oauthCodes).all().length).toBe(0);
    } finally {
      close();
    }
  });

  it("deletes refresh tokens when the grant is removed", () => {
    const { db, sqlite, close } = createTestDb();
    try {
      const clientId = seedClient(db);
      const grantId = seedGrant(db, clientId);
      db.insert(oauthRefreshTokens)
        .values({
          tokenHash: "sha-hash-1",
          grantId,
          clientId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .run();

      expect(db.select().from(oauthRefreshTokens).all().length).toBe(1);
      sqlite.prepare("DELETE FROM oauth_grants WHERE id = ?").run(grantId);
      expect(db.select().from(oauthRefreshTokens).all().length).toBe(0);
    } finally {
      close();
    }
  });

  it("deletes grants when the client is removed", () => {
    const { db, sqlite, close } = createTestDb();
    try {
      const clientId = seedClient(db);
      seedGrant(db, clientId);
      expect(db.select().from(oauthGrants).all().length).toBe(1);
      sqlite.prepare("DELETE FROM oauth_clients WHERE client_id = ?").run(clientId);
      expect(db.select().from(oauthGrants).all().length).toBe(0);
    } finally {
      close();
    }
  });
});
