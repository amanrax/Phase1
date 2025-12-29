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

// Handle Android hardware back button in Capacitor to avoid app closing unexpectedly.
// If there's history we navigate back, otherwise ignore the back button (prevents exit).
try {
  // Importing dynamically to avoid bundling issues when not using Capacitor
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { App: CapacitorApp } = require('@capacitor/app');
  if (CapacitorApp && typeof CapacitorApp.addListener === 'function') {
    CapacitorApp.addListener('backButton', () => {
      try {
        const canGoBack = window.history.length > 1;
        if (canGoBack) {
          window.history.back();
        } else {
          // No history — ignore to prevent app exiting immediately
          console.log('[backButton] At root, ignoring back button to avoid exit');
        }
      } catch (e) {
        console.warn('[backButton] handler error', e);
      }
    });
  }
} catch (e) {
  // Not running in Capacitor/native environment — nothing to do
  // console.debug('Capacitor App plugin not available', e);
}
