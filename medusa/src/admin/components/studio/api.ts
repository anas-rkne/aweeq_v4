export async function studioFetch<T = any>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? `Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

export const studioStyles = {
  input: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    marginBottom: "10px",
    boxSizing: "border-box" as const,
  },
  textarea: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    marginBottom: "10px",
    boxSizing: "border-box" as const,
    minHeight: "80px",
  },
  button: {
    padding: "8px 14px",
    border: "none",
    borderRadius: "6px",
    background: "#1c64f2",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
  },
  buttonGreen: {
    padding: "8px 14px",
    border: "none",
    borderRadius: "6px",
    background: "#059669",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
  },
  buttonGray: {
    padding: "8px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    background: "#f9fafb",
    color: "#374151",
    cursor: "pointer",
    fontSize: "14px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "4px",
    color: "#374151",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px",
  },
  error: {
    background: "#fde8e8",
    color: "#9b1c1c",
    padding: "10px 12px",
    borderRadius: "6px",
    marginBottom: "16px",
  },
  success: {
    background: "#def7ec",
    color: "#03543f",
    padding: "10px 12px",
    borderRadius: "6px",
    marginBottom: "16px",
  },
} as const
