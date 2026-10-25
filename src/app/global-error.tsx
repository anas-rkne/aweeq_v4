"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1628",
          color: "#f6e6d6",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div>
          <p style={{ color: "#cd9e61", letterSpacing: "0.3em" }}>3WEEQ</p>
          <h1 style={{ fontSize: "1.5rem", marginTop: "1rem" }}>
            حدث خطأ غير متوقع
          </h1>
          <p style={{ opacity: 0.6, marginTop: "0.75rem" }}>
            An unexpected error occurred.
          </p>
          {error.digest && (
            <p style={{ opacity: 0.35, fontSize: "0.7rem" }}>{error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: "1px solid #cd9e61",
              color: "#cd9e61",
              cursor: "pointer",
            }}
          >
            إعادة المحاولة / Retry
          </button>
        </div>
      </body>
    </html>
  )
}
