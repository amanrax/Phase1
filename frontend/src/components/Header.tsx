// src/components/Header.tsx
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
}

export default function Header({
  title,
  subtitle,
  showBack = true,
  backTo,
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="app-topbar">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={() => navigate(backTo || -1)}
              className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition"
              aria-label="Go back"
            >
              <span className="topbar-title">← Back</span>
            </button>
          )}
          <div>
            <h1 className="topbar-title">{title}</h1>
            {subtitle && (
              <p className="text-gray-500 text-sm" aria-live="polite">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
