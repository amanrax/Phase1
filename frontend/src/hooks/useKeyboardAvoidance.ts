// src/hooks/useKeyboardAvoidance.ts — Keep focused form fields visible above the mobile keyboard
import { useEffect } from "react";

const SAFE_MARGIN = 16;

function isKeyboardInput(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement) return !["checkbox", "radio", "button", "submit", "file"].includes(el.type);
  return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el.isContentEditable;
}

export function useKeyboardAvoidance() {
  useEffect(() => {
    let activeEl: HTMLElement | null = null;

    const ensureVisible = (el: HTMLElement, smooth: boolean) => {
      const vv = window.visualViewport;
      if (!vv) return;

      const rect = el.getBoundingClientRect();
      const visibleTop = SAFE_MARGIN;
      const visibleBottom = vv.height - SAFE_MARGIN;

      if (rect.bottom > visibleBottom || rect.top < visibleTop) {
        el.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: "center",
          inline: "nearest",
        });
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !isKeyboardInput(target)) return;
      activeEl = target;

      // Delay slightly so keyboard animation starts before we compute viewport
      window.setTimeout(() => ensureVisible(target, true), 80);
    };

    const onFocusOut = () => {
      activeEl = null;
    };

    const onViewportChange = () => {
      if (activeEl) ensureVisible(activeEl, false);
    };

    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);

    return () => {
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
    };
  }, []);
}
