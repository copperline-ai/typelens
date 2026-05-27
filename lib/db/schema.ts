import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const oauthClients = sqliteTable("oauth_clients", {
  clientId: text("client_id").primaryKey(),
  clientName: text("client_name").notNull(),
  redirectUris: text("redirect_uris", { mode: "json" }).$type<string[]>().notNull(),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull().default("none"),
  grantTypes: text("grant_types", { mode: "json" }).$type<string[]>().notNull(),
  responseTypes: text("response_types", { mode: "json" }).$type<string[]>().notNull(),
  scope: text("scope").notNull().default("mcp"),
  softwareId: text("software_id"),
  softwareVersion: text("software_version"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
});

export const oauthGrants = sqliteTable(
  "oauth_grants",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    profileId: text("profile_id").notNull(),
    profileName: text("profile_name").notNull(),
    profileHost: text("profile_host").notNull(),
    profilePort: integer("profile_port").notNull(),
    profileProtocol: text("profile_protocol", { enum: ["http", "https"] }).notNull(),
    profileApiKeyEnc: text("profile_api_key_enc").notNull(),
    scope: text("scope").notNull().default("mcp"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
  },
  (t) => [index("grants_by_client").on(t.clientId), index("grants_by_profile").on(t.profileId)],
);

export const oauthCodes = sqliteTable("oauth_codes", {
  code: text("code").primaryKey(),
  grantId: text("grant_id")
    .notNull()
    .references(() => oauthGrants.id, { onDelete: "cascade" }),
  clientId: text("client_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  codeChallengeMethod: text("code_challenge_method").notNull(),
  scope: text("scope").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp" }),
});

export const oauthRefreshTokens = sqliteTable(
  "oauth_refresh_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    grantId: text("grant_id")
      .notNull()
      .references(() => oauthGrants.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
    replacedByHash: text("replaced_by_hash"),
  },
  (t) => [index("refresh_by_grant").on(t.grantId)],
);

export type OauthClient = typeof oauthClients.$inferSelect;
export type OauthGrant = typeof oauthGrants.$inferSelect;
export type OauthCode = typeof oauthCodes.$inferSelect;
export type OauthRefreshToken = typeof oauthRefreshTokens.$inferSelect;
