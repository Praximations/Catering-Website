"use client";

import { useEffect } from "react";

/**
 * The last resort: an error thrown by the root layout itself.
 *
 * app/error.tsx renders INSIDE the root layout, so it cannot catch a failure in
 * that layout. This one replaces the whole document, which is why it has to
 * render its own <html> and <body>.
 *
 * It is deliberately styled inline and uses no imports beyond React. Whatever
 * broke may be the font loader, globals.css, or a component the layout pulls
 * in, so this page cannot rely on any of them being available.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          color: "#172019",
          background: "#ffffff",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.75rem", fontWeight: 700 }}>
            The site is having trouble loading.
          </h1>
          <p style={{ margin: "0 0 1.5rem", lineHeight: 1.6, color: "#586158" }}>
            This is a problem on our side. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "3rem",
              padding: "0 1.5rem",
              border: 0,
              borderRadius: "0.5rem",
              background: "#3d5b3f",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "#83897f" }}>
              Reference: <code>{error.digest}</code>
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
