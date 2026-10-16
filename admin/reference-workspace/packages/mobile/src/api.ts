import { Platform } from "react-native";
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:8000/api/v1"
    : "http://localhost:8000/api/v1");
export const SERVER_URL = API_URL.replace(/\/api\/v1\/?$/, "");
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
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
