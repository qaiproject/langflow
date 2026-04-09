import i18n from "@/i18n";
import { MCPServerType } from "@/types/mcp";

export enum AuthMethodId {
  NONE = "none",
  API_KEY = "apikey",
  OAUTH = "oauth",
}

export const AUTH_METHODS = {
  [AuthMethodId.NONE]: { id: AuthMethodId.NONE, label: i18n.t("mcp.none") },
  [AuthMethodId.API_KEY]: {
    id: AuthMethodId.API_KEY,
    label: i18n.t("mcp.apiKey"),
  },
  [AuthMethodId.OAUTH]: { id: AuthMethodId.OAUTH, label: i18n.t("mcp.oauth") },
} as const;

export const AUTH_METHODS_ARRAY = Object.values(AUTH_METHODS);

/**
 * Extracts all MCP servers from a JSON string or object.
 * Supports:
 * 1. { mcpServers: { ... } }
 * 2. { ... } (object with server keys)
 * 3. a single server object
 * Returns: Array<MCPServerType> or throws an error.
 */
export function extractMcpServersFromJson(
  json: string | object,
): MCPServerType[] {
  let parsed: unknown = json;
  if (typeof json === "string") {
    try {
      parsed = JSON.parse(json);
    } catch (_e) {
      try {
        parsed = JSON.parse(`{${json}}`);
      } catch (_e) {
        throw new Error(i18n.t("mcp.invalidJsonFormat"));
      }
    }
  }

  let serverEntries: [string, Record<string, unknown>][] = [];

  // Case 1: { mcpServers: { ... } }
  if (
    parsed &&
    typeof parsed === "object" &&
    "mcpServers" in parsed &&
    parsed.mcpServers &&
    typeof parsed.mcpServers === "object"
  ) {
    serverEntries = Object.entries(
      parsed.mcpServers as Record<string, unknown>,
    ).filter(
      (entry): entry is [string, Record<string, unknown>] =>
        !!entry[1] && typeof entry[1] === "object",
    );
  }
  // Case 2: { ... } (object with server keys)
  else if (
    parsed &&
    typeof parsed === "object" &&
    Object.values(parsed as Record<string, unknown>).some(
      (value) =>
        !!value &&
        typeof value === "object" &&
        ("command" in value || "url" in value),
    )
  ) {
    serverEntries = Object.entries(parsed as Record<string, unknown>).filter(
      (entry): entry is [string, Record<string, unknown>] =>
        !!entry[1] &&
        typeof entry[1] === "object" &&
        ("command" in entry[1] || "url" in entry[1]),
    );
  }
  // Case 3: single server object
  else if (
    parsed &&
    typeof parsed === "object" &&
    ("command" in parsed || "url" in parsed)
  ) {
    serverEntries = [["server", parsed]];
  }

  if (serverEntries.length === 0) {
    throw new Error(i18n.t("mcp.noValidServer"));
  }
  // Validate and map all servers
  const validServers = serverEntries.filter(
    ([, server]) => server["command"] || server["url"],
  );
  if (validServers.length === 0) {
    throw new Error(i18n.t("mcp.noValidServer"));
  }
  return validServers.map(([name, server]) => ({
    name: name.slice(0, 30),
    command:
      typeof server["command"] === "string" ? server["command"] : undefined,
    args: Array.isArray(server["args"]) ? server["args"] : [],
    env:
      server["env"] && typeof server["env"] === "object"
        ? (server["env"] as Record<string, string>)
        : {},
    url: typeof server["url"] === "string" ? server["url"] : undefined,
    headers:
      server["headers"] && typeof server["headers"] === "object"
        ? (server["headers"] as Record<string, string>)
        : {},
  }));
}
