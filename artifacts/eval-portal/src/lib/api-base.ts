const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "";

export const apiBaseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "") : "";

export function resolveApiUrl(path: string): string {
  if (!apiBaseUrl) return path;
  if (!path) return apiBaseUrl;
  if (!path.startsWith("/")) {
    return `${apiBaseUrl}/${path.replace(/^\/+/, "")}`;
  }
  return `${apiBaseUrl}${path}`;
}
