import { Platform, NativeModules } from "react-native";
const metroHost = NativeModules.SourceCode?.scriptURL?.match(/^https?:\/\/([^:/]+)/)?.[1];
const localHost = metroHost && !["localhost", "127.0.0.1", "0.0.0.0"].includes(metroHost)
  ? metroHost
  : "localhost";
const configuredApi = "http://localhost:8002/api/v1";
export let API_URL = configuredApi.replace(/\/\/(localhost|127\.0\.0\.1)(?=:)/, `//${localHost}`);
export let SERVER_URL = API_URL.replace(/\/api\/v1\/?$/, "");
export function configureApiUrl(value: string) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('Enter a valid server URL.');
  API_URL = `${url.protocol}//${url.host}/api/v1`;
  SERVER_URL = API_URL.replace(/\/api\/v1$/, '');
}
let token: string | null = null;
let unauthorized: (() => void) | null = null;
export function configureSession(
  value: string | null,
  onUnauthorized?: () => void,
) {
  token = value;
  if (onUnauthorized) unauthorized = onUnauthorized;
}
export function authHeaders(): Record<string, string> {
  return token ? { Authorization: "Bearer " + token } : {};
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50000);
  try {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const response = await fetch(API_URL + path, {
      method,
      headers: {
        Accept: "application/json",
        ...authHeaders(),
        ...(!isForm ? { "Content-Type": "application/json" } : {}),
      },
      body: body
        ? isForm
          ? (body as FormData)
          : JSON.stringify(body)
        : undefined,
      signal: controller.signal,
    });
    const data =
      response.status === 204
        ? null
        : await response
            .json()
            .catch(() => ({
              message: "Server returned an unreadable response.",
            }));
    if (!response.ok) {
      if (response.status === 401) unauthorized?.();
      throw new Error(
        data?.errors
          ? Object.values(data.errors).flat().join("\n")
          : data?.message || "Request failed.",
      );
    }
    return data as T;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError")
      throw new Error("Request timed out. Please retry.");
    if (e instanceof TypeError)
      throw new Error(`Cannot reach the supplier API at ${API_URL}. Check that your phone and computer use the same network.`);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

