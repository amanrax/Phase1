// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import useAuthStore from "@/store/authStore";
import { logger } from "@/utils/logger";
import "./index.css";

// Temporarily disable service worker to avoid stale cached assets during UI fixes
// registerServiceWorker();
import { registerServiceWorker } from "./registerSW";

// Register service worker only in production to avoid cache during dev/preview
if (import.meta.env.MODE === "production") {
  registerServiceWorker();
}

// Global crash guards: capture unhandled runtime failures (including async network rejections)
// so the shell remains responsive while errors are logged centrally.
try {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    logger.error("main", "Unhandled promise rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    event.preventDefault();
  });

  window.addEventListener("error", (event) => {
    logger.error("main", "Uncaught window error", {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack,
    });
  });
} catch (e) {
  logger.warn("main", "Global error listeners could not be registered", { error: String(e) });
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
        // We're using HashRouter; check the hash to determine if we're at the app root.
        const hash = window.location.hash || '';
        const atRoot = hash === '' || hash === '#' || hash === '#/' || hash === '#/login' || hash === '#/';
        if (!atRoot) {
          window.history.back();
        } else {
          // At root — ignore to prevent app exiting immediately
          logger.info("main", "Back button ignored at root", { hash });
        }
      } catch (e) {
        logger.warn("main", "Back button handler error", { error: String(e) });
      }
    });
    // When app is paused or backgrounded on mobile, perform a logout for security
    try {
      if (typeof CapacitorApp.addListener === 'function') {
        CapacitorApp.addListener('pause', () => {
          try {
            useAuthStore.getState().logout();
            logger.info("main", "Pause event triggered logout");
          } catch (e) {
            logger.warn("main", "Pause handler error", { error: String(e) });
          }
        });

        CapacitorApp.addListener('appStateChange', (state: any) => {
          if (!state?.isActive) {
            try {
              useAuthStore.getState().logout();
              logger.info("main", "App state inactive triggered logout");
            } catch (e) {
              logger.warn("main", "App state change handler error", { error: String(e) });
            }
          }
        });
      }
    } catch (e) {
      logger.warn("main", "Pause/appStateChange listeners could not be registered", { error: String(e) });
    }
  }
} catch (e) {
  // Not running in Capacitor/native environment — nothing to do
  // console.debug('Capacitor App plugin not available', e);
}

// For web builds: logout when the tab/window is closed
try {
  window.addEventListener('beforeunload', () => {
    try {
      useAuthStore.getState().logout();
    } catch (e) {
      // ignore
    }
  });
} catch (e) {
  // ignore
}
