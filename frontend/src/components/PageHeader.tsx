// src/components/PageHeader.tsx
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
}

export default function PageHeader({ title, subtitle, backTo }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="app-page-header" aria-label={`${title} page header`}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {backTo && (
          <button onClick={() => navigate(backTo)} className="btn-back" aria-label="Go back">
            ← BACK
          </button>
        )}
        <h1 className="app-title">{title}</h1>
      </div>
      {subtitle && <p className="app-subtitle">{subtitle}</p>}
    </header>
  );
}
