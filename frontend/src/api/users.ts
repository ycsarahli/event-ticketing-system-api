import type { User } from "../types"
import { getAuthHeaders } from "./auth"
import { APP_CONFIG } from "../config/app.config"

const BASE_URL = APP_CONFIG.api.accountUrl
const { useMock, mockDelayMs, mockActionDelayMs } = APP_CONFIG.development

function delay<T>(data: T, ms: number = mockDelayMs, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    const timer = setTimeout(() => resolve(data), ms)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    })
  })
}

export async function getUsers(
  params?: { page?: number; limit?: number; role?: string; status?: string },
  signal?: AbortSignal
): Promise<{ data: User[]; pagination: { page: number; limit: number; total: number } }> {
  if (useMock) {
    const { MOCK_USERS } = await import("../mock/users")
    let data = [...MOCK_USERS] as User[]
    if (params?.role)   data = data.filter(u => u.role === params.role)
    if (params?.status) data = data.filter(u => u.registrationStatus === params.status)
    return delay({ data, pagination: { page: 1, limit: data.length, total: data.length } }, mockDelayMs, signal)
  }

  const query = new URLSearchParams(
    Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  )
  const res = await fetch(`${BASE_URL}/users?${query}`, { headers: getAuthHeaders(), signal })
  return res.json()
}

export async function getUserById(userId: string): Promise<User> {
  if (useMock) {
    const { MOCK_USERS } = await import("../mock/users")
    const user = MOCK_USERS.find(u => u.userId === userId)
    if (!user) throw new Error("User not found")
    return delay(user as User)
  }

  const res = await fetch(`${BASE_URL}/users/${userId}`, { headers: getAuthHeaders() })
  const json = await res.json()
  return json.data
}

export async function updateUser(
  userId: string,
  body: {
    preferences?: string[]
    autofill?: { dietType: "veg" | "non-veg" | null; selfDriving: boolean }
  }
) {
  if (useMock) {
    return delay({ updated: true, updatedAt: new Date().toISOString() })
  }

  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw json.error
  return json.data
}

export async function updateUserRole(userId: string, role: string) {
  if (useMock) {
    return delay({ updated: true, updatedAt: new Date().toISOString() }, mockActionDelayMs)
  }

  const res = await fetch(`${BASE_URL}/users/${userId}/role`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  })
  const json = await res.json()
  if (!res.ok) throw json.error
  return json.data
}

export async function unlockUser(userId: string) {
  if (useMock) {
    return delay({ unlocked: true, updatedAt: new Date().toISOString() }, mockActionDelayMs)
  }

  const res = await fetch(`${BASE_URL}/users/${userId}/unlock`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  })
  const json = await res.json()
  if (!res.ok) throw json.error
  return json.data
}

export async function deleteUser(userId: string) {
  if (useMock) {
    return delay({ deleted: true }, mockActionDelayMs)
  }

  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })
  const json = await res.json()
  if (!res.ok) throw json.error
  return json.data
}