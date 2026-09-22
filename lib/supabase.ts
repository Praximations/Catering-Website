/**
 * Minimal server-only Supabase REST client.
 *
 * The service-role key never reaches the browser. Keeping this tiny also
 * avoids shipping a database SDK for the two operations this app needs.
 */

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(url && serviceRoleKey);
export const isSupabasePartiallyConfigured = Boolean(url) !== Boolean(serviceRoleKey);

function headers(prefer?: string): HeadersInit {
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  if (!url) throw new Error("SUPABASE_URL is not configured.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
    cache: "no-store",
  });
  return response;
}

export interface SupabaseStateRow<T> {
  data: T;
  version: number;
}

export async function readSupabaseState<T>(): Promise<SupabaseStateRow<T> | null> {
  const response = await request("app_state?id=eq.primary&select=data,version&limit=1");
  if (!response.ok) throw new Error(`Supabase read failed with status ${response.status}.`);
  const rows = (await response.json()) as SupabaseStateRow<T>[];
  return rows[0] ?? null;
}

export async function createSupabaseState<T>(data: T): Promise<void> {
  const response = await request("app_state", {
    method: "POST",
    headers: headers("return=minimal"),
    body: JSON.stringify({ id: "primary", data, version: 1 }),
  });
  // A parallel first request may have created the singleton already.
  if (!response.ok && response.status !== 409) {
    throw new Error(`Supabase initialization failed with status ${response.status}.`);
  }
}

export async function replaceSupabaseState<T>(
  data: T,
  expectedVersion: number
): Promise<boolean> {
  const response = await request(
    `app_state?id=eq.primary&version=eq.${expectedVersion}&select=version`,
    {
      method: "PATCH",
      headers: headers("return=representation"),
      body: JSON.stringify({ data, version: expectedVersion + 1 }),
    }
  );
  if (!response.ok) throw new Error(`Supabase update failed with status ${response.status}.`);
  const rows = (await response.json()) as { version: number }[];
  return rows.length === 1;
}
