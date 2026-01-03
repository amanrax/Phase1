// src/utils/navigation.ts
import { NavigateFunction } from 'react-router-dom';

let isNavigating = false;
let navigationTimeout: NodeJS.Timeout | null = null;

/**
 * Safe navigation that prevents duplicate/rapid navigation calls
 */
export const safeNavigate = (
  navigate: NavigateFunction,
  path: string | number,
  options?: { replace?: boolean; state?: any }
) => {
  // If already navigating, ignore
  if (isNavigating) {
    console.warn('[SafeNavigate] Blocked - already navigating');
    return;
  }

  // Set flag
  isNavigating = true;
  console.log('[SafeNavigate] Navigating to:', path);

  // Clear any existing timeout
  if (navigationTimeout) {
    clearTimeout(navigationTimeout);
  }

  // Perform navigation
  if (typeof path === 'number') {
    navigate(path);
  } else {
    navigate(path, options);
  }

  // Reset flag after delay
  navigationTimeout = setTimeout(() => {
    isNavigating = false;
    navigationTimeout = null;
  }, 400);
};

/**
 * Safe back navigation
 */
export const safeGoBack = (navigate: NavigateFunction) => {
  console.log('[SafeGoBack] Going back');
  safeNavigate(navigate, -1);
};

/**
 * Check if currently navigating
 */
export const isCurrentlyNavigating = () => isNavigating;
