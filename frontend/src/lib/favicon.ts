const FAVICON_RELS = ["icon", "shortcut icon", "apple-touch-icon"] as const;

function resolveFaviconHref(rawUrl: string, cacheBust: boolean): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (!cacheBust) return trimmed;

  const separator = trimmed.includes("?") ? "&" : "?";
  return `${trimmed}${separator}v=${Date.now()}`;
}

export function applyFavicon(url: string, options?: { cacheBust?: boolean }) {
  const href = resolveFaviconHref(url, options?.cacheBust ?? false);
  if (!href) return;

  FAVICON_RELS.forEach((rel) => {
    let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = href;
  });
}
