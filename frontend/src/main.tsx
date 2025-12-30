// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import useAuthStore from "@/store/authStore";
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
        // We're using HashRouter; check the hash to determine if we're at the app root.
        const hash = window.location.hash || '';
        const atRoot = hash === '' || hash === '#' || hash === '#/' || hash === '#/login' || hash === '#/';
        if (!atRoot) {
          window.history.back();
        } else {
          // At root — ignore to prevent app exiting immediately
          console.log('[backButton] At root (hash)', hash, ' — ignoring to avoid exit');
        }
      } catch (e) {
        console.warn('[backButton] handler error', e);
      }
    });
    // When app is paused or backgrounded on mobile, perform a logout for security
    try {
      if (typeof CapacitorApp.addListener === 'function') {
        CapacitorApp.addListener('pause', () => {
          try {
            useAuthStore.getState().logout();
            console.log('[App] pause event - user logged out for security');
          } catch (e) {
            console.warn('[App] pause handler error', e);
          }
        });

        CapacitorApp.addListener('appStateChange', (state: any) => {
          if (!state?.isActive) {
            try {
              useAuthStore.getState().logout();
              console.log('[App] appStateChange - inactive, user logged out');
            } catch (e) {
              console.warn('[App] appStateChange handler error', e);
            }
          }
        });
      }
    } catch (e) {
      console.warn('[App] pause/appStateChange listeners could not be registered', e);
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
