/**
 * Ersatz für next/navigation in Komponententests: liest Pfad und Suchparameter
 * aus der jsdom-Adresse; Navigation ändert nur diese Adresse.
 */
export function usePathname() {
  return window.location.pathname;
}

export function useSearchParams() {
  return new URLSearchParams(window.location.search);
}

export function useRouter() {
  const go = (href: string) => window.history.pushState(null, "", href);
  return {
    push: go,
    replace: (href: string) => window.history.replaceState(null, "", href),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => {},
    prefetch: () => Promise.resolve(),
  };
}
