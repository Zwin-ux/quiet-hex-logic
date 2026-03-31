function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getAppApiUrl(path: string): string {
  const normalizedPath = normalizePath(path);
  const configuredBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();

  if (!configuredBase) {
    return normalizedPath;
  }

  try {
    const base = configuredBase.endsWith("/") ? configuredBase : `${configuredBase}/`;
    return new URL(normalizedPath, base).toString();
  } catch {
    return normalizedPath;
  }
}
