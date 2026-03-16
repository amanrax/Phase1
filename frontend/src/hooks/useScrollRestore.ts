// src/hooks/useScrollRestore.ts — Persist and restore window scroll position for a given key
import { useEffect } from "react";

const PREFIX = "scroll:";

/**
 * Saves the window scroll position to sessionStorage while the component is
 * mounted, and restores it when the component re-mounts (e.g. pressing Back).
 *
 * @param key  A stable string that uniquely identifies the scrollable page.
 */
export function useScrollRestore(key: string) {
  useEffect(() => {
    const storageKey = `${PREFIX}${key}`;

    // Restore saved position after the first paint
    const saved = sessionStorage.getItem(storageKey);
    if (saved !== null) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: parseInt(saved, 10), behavior: "instant" as ScrollBehavior });
      });
    }

    // Debounced save on scroll
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      }, 150);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      // Persist final position synchronously on unmount
      sessionStorage.setItem(storageKey, String(window.scrollY));
    };
  }, [key]);
}
