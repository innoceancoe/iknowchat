/**
 * Frontend entry point.
 * Fetches the Clerk publishable key from the server, then mounts the app
 * inside <ClerkProvider> so auth is available everywhere.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { App } from "./App";

async function bootstrap() {
  // Fetch safe client config from the server (never sends CLERK_SECRET_KEY)
  let publishableKey = "";
  try {
    const res = await fetch("/api/config");
    const config = await res.json() as { clerkPublishableKey: string };
    publishableKey = config.clerkPublishableKey;
  } catch {
    console.warn("[InnoChat] Could not fetch /api/config — Clerk auth unavailable.");
  }

  const elem = document.getElementById("root")!;
  const app = (
    <StrictMode>
      <ClerkProvider publishableKey={publishableKey}>
        <App />
      </ClerkProvider>
    </StrictMode>
  );

  // https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
  (import.meta.hot.data.root ??= createRoot(elem)).render(app);
}

bootstrap();

