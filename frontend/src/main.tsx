// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Temporarily disable service worker to avoid stale cached assets during UI fixes
// registerServiceWorker();
import { registerServiceWorker } from "./registerSW";

// Register service worker only in production to avoid cache during dev/preview
if (import.meta.env.MODE === "production") {
  registerServiceWorker();
}

// Create root and render app at #root element
ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
