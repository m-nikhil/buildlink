import { useState, useEffect, useCallback } from 'react';

// Global state for PWA update
let swRegistration: ServiceWorkerRegistration | null = null;
let updateListeners: Set<() => void> = new Set();
let isUpdateAvailable = false;

function notifyListeners() {
  isUpdateAvailable = true;
  updateListeners.forEach((cb) => cb());
}

// Register SW once
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      swRegistration = registration;

      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyListeners();
            }
          });
        }
      });
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(isUpdateAvailable);

  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    updateListeners.add(handler);
    // In case update was already detected
    if (isUpdateAvailable) setUpdateAvailable(true);
    return () => {
      updateListeners.delete(handler);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, []);

  const dismiss = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return { updateAvailable, applyUpdate, dismiss };
}
