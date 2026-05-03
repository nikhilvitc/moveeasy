import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

let initialized = false;

function initSentry() {
  if (typeof window === "undefined" || !dsn || initialized) return;
  initialized = true;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1,
    replaysSessionSampleRate: import.meta.env.PROD ? 0.05 : 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1 : 0,
  });
}

initSentry();

export function captureException(error, captureContext) {
  if (!dsn || !error) return;
  Sentry.captureException(error, captureContext);
}

export { Sentry };
