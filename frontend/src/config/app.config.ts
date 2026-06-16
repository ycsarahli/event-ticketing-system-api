export const APP_CONFIG = {
  api: {
    accountUrl: import.meta.env.VITE_ACCOUNT_API_URL ?? "http://localhost:8000/v1",
    eventUrl:   import.meta.env.VITE_EVENT_API_URL   ?? "http://localhost:3000/v1",
    txUrl:      import.meta.env.VITE_TX_API_URL      ?? "http://localhost:8002/v1",
  },
  auth: {
    autoLogoutMinutes: 30,
    tokenKey: "token",
    roleKey: "role",
    expiryKey: "tokenExpiry",
  },
  development: {
    mockDelayMs: 800,
    mockActionDelayMs: 500,
    useMock: import.meta.env.VITE_USE_MOCK === "true",
  }
} as const