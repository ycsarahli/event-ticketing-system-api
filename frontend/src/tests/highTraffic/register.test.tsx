import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import EventDetailPage from "../../pages/EventDetailPage"

// Mock API 模組
vi.mock("../../api/events", () => ({
  getEventById: vi.fn(),
}))
vi.mock("../../api/transactions", () => ({
  checkEligibility: vi.fn(),
  createTransaction: vi.fn(),
}))

import { getEventById } from "../../api/events"
import { checkEligibility, createTransaction } from "../../api/transactions"

const mockEvent = {
  eventId: "ev_001",
  name: "夏日烤肉趴",
  description: "部門聯誼",
  category: "sport",
  location: "台北辦公室頂樓",
  latitude: 25.0478, longitude: 121.5319,
  checkinRadiusMeters: 200,
  eventStartTime: "2025-07-15T18:00:00Z",
  eventEndTime: "2025-07-15T22:00:00Z",
  registrationStart: "2025-06-01T00:00:00Z",
  registrationEnd: "2025-07-01T23:59:59Z",
  status: "registering" as const,
  ticketLimit: 50, remainingTickets: 12,
  cancellationDeadline: "2025-07-10T00:00:00Z",
  guestAllowed: false, guestCount: 0,
  updatedAt: "2025-05-18T10:00:00Z",
  isDraft: false,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/events/ev_001"]}>
      <Routes>
        <Route path="/events/:eventId" element={<EventDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

    describe("多人搶票競態處理", () => {
    beforeEach(() => {
        vi.mocked(getEventById).mockResolvedValue(mockEvent)
        vi.mocked(checkEligibility).mockResolvedValue({
        eligible: true, reason: null,
        remainingTickets: 12, isWaitlist: false,
        })
    })

    it("快速點擊報名按鈕多次，API 只被呼叫一次", async () => {
    const user = userEvent.setup()
    vi.mocked(createTransaction).mockImplementation(
        () => new Promise(resolve => setTimeout(() =>
        resolve({ transactionId: "tx_001", status: "confirmed", ticketId: "tk_001", waitlistNumber: null, registeredAt: new Date().toISOString() }),
        1000))
    )

    renderPage()
    await waitFor(() => screen.getByText("立即報名"))

    const button = screen.getByText("立即報名")

    await user.click(button)
    await user.click(button)
    await user.click(button)

    // ✅ 等 debounce 500ms 跑完
    await new Promise(resolve => setTimeout(resolve, 600))

    expect(createTransaction).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()
    })

  it("票被搶走（NO_TICKETS 409），顯示候補提示並更新狀態", async () => {
    const user = userEvent.setup()
    vi.mocked(createTransaction).mockRejectedValue({ code: "NO_TICKETS" })
    vi.mocked(checkEligibility)
      .mockResolvedValueOnce({ eligible: true, reason: null, remainingTickets: 1, isWaitlist: false })
      .mockResolvedValueOnce({ eligible: true, reason: null, remainingTickets: 0, isWaitlist: true })

    renderPage()
    await waitFor(() => screen.getByText("立即報名"))

    await user.click(screen.getByText("立即報名"))

    await waitFor(() => {
      expect(screen.getByText(/名額.*滿.*候補/)).toBeInTheDocument()
    })
  })

  it("帳號被鎖定（ACCOUNT_LOCKED 409），顯示鎖定提示", async () => {
    const user = userEvent.setup()
    vi.mocked(createTransaction).mockRejectedValue({ code: "ACCOUNT_LOCKED" })

    renderPage()
    await waitFor(() => screen.getByText("立即報名"))

    await user.click(screen.getByText("立即報名"))

    await waitFor(() => {
      expect(screen.getByText(/帳號已被鎖定/)).toBeInTheDocument()
    })
  })

  it("已報名再點一次（ALREADY_REGISTERED 409），畫面更新為已報名狀態", async () => {
    const user = userEvent.setup()
    vi.mocked(createTransaction).mockRejectedValue({ code: "ALREADY_REGISTERED" })

    renderPage()
    await waitFor(() => screen.getByText("立即報名"))

    await user.click(screen.getByText("立即報名"))

    await waitFor(() => {
        // ✅ 用 getAllByText，因為按鈕區和 Toast 都會顯示這段文字
        const elements = screen.getAllByText("您已報名此活動")
        expect(elements.length).toBeGreaterThanOrEqual(1)
    })
    })
})