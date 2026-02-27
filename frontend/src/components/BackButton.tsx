// src/components/BackButton.tsx — App-wide standard back button (iOS/Android–style)
import React from "react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  /** Where to go. Defaults to navigate(-1) — browser history back. */
  to?: string | -1;
  /** Label shown next to the chevron. Defaults to "Back". */
  label?: string;
  /** Extra Tailwind classes for positioning overrides. */
  className?: string;
  /** Called before navigation (e.g. to close a modal). */
  onBeforeNavigate?: () => void;
}

/**
 * Standard back button used on every page header.
 * Renders a left-pointing chevron + label, no background — exactly
 * like iOS / Android system back controls.
 */
const BackButton: React.FC<BackButtonProps> = ({
  to = -1,
  label = "Back",
  className = "",
  onBeforeNavigate,
}) => {
  const navigate = useNavigate();

  const handlePress = () => {
    onBeforeNavigate?.();
    if (to === -1) {
      navigate(-1);
    } else {
      navigate(to as string);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePress}
      aria-label={`Go back${label !== "Back" ? ` to ${label}` : ""}`}
      className={[
        // Layout
        "flex items-center gap-1 select-none",
        // Colours — adaptive for both themes
        "text-gray-700 dark:text-gray-200",
        // Interactions
        "hover:opacity-70 active:scale-90 transition-all duration-150",
        className,
      ].join(" ")}
    >
      {/* Chevron SVG — crisp at any size */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5 flex-shrink-0"
        aria-hidden="true"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>

      <span className="text-sm font-semibold leading-none">{label}</span>
    </button>
  );
};

export default BackButton;
