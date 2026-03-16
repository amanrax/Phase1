// src/hooks/useOrientationClass.ts — Keep document root tagged with current orientation for global responsive behavior
import { useEffect } from "react";

function getOrientationClass(): "orientation-portrait" | "orientation-landscape" {
  if (window.matchMedia("(orientation: landscape)").matches) return "orientation-landscape";
  return "orientation-portrait";
}

export function useOrientationClass() {
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");

    const applyClass = () => {
      const html = document.documentElement;
      html.classList.remove("orientation-portrait", "orientation-landscape");
      html.classList.add(getOrientationClass());
    };

    applyClass();
    mq.addEventListener("change", applyClass);

    return () => {
      mq.removeEventListener("change", applyClass);
    };
  }, []);
}
