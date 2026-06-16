import type { Ticket } from "../types"
import { getAuthHeaders } from "./auth"
import { APP_CONFIG } from "../config/app.config"

const BASE_URL = APP_CONFIG.api.txUrl
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

export async function getTickets(
  params?: { status?: "used" | "unused" | "invalid" },
  signal?: AbortSignal
): Promise<Ticket[]> {
  if (useMock) {
    const { MOCK_TICKETS } = await import("../mock/tickets")
    const data = params?.status
      ? MOCK_TICKETS.filter(t => t.status === params.status)
      : MOCK_TICKETS
    return delay(data, mockDelayMs, signal)
  }

  const query = new URLSearchParams(
    Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  )
  const res = await fetch(`${BASE_URL}/tickets?${query}`, { headers: getAuthHeaders(), signal })
  const json = await res.json()
  return json.data
}

export async function getTicketById(ticketId: string, signal?: AbortSignal): Promise<Ticket> {
  if (useMock) {
    const { MOCK_TICKETS } = await import("../mock/tickets")
    const ticket = MOCK_TICKETS.find(t => t.ticketId === ticketId)
    if (!ticket) throw new Error("Ticket not found")
    return delay(ticket, mockDelayMs, signal)
  }

  const res = await fetch(`${BASE_URL}/tickets/${ticketId}`, { headers: getAuthHeaders(), signal })
  const json = await res.json()
  return json.data
}

export async function checkin(
  ticketId: string,
  coords: { latitude: number; longitude: number }
): Promise<{ checkedIn: boolean; checkedInAt: string }> {
  if (useMock) {
    return delay({ checkedIn: true, checkedInAt: new Date().toISOString() }, mockActionDelayMs)
  }

  const res = await fetch(`${BASE_URL}/tickets/${ticketId}/checkin`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(coords),
  })
  const json = await res.json()
  if (!res.ok) throw json.error
  return json.data
}

export async function getEventTickets(
  eventId: string,
  params?: { status?: "used" | "unused" | "invalid"; page?: number; limit?: number },
  signal?: AbortSignal
) {
  if (useMock) {
    const { MOCK_CHECKIN_TICKETS } = await import("../mock/tickets")
    return delay({
      data: {
        summary: { used: 1, unused: 2, invalid: 0 },
        tickets: MOCK_CHECKIN_TICKETS,
      },
      pagination: { page: 1, limit: 10, total: 3 },
    }, mockDelayMs, signal)
  }

  const query = new URLSearchParams(
    Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  )
  const res = await fetch(`${BASE_URL}/events/${eventId}/tickets?${query}`, {
    headers: getAuthHeaders(),
    signal,
  })
  return res.json()
}