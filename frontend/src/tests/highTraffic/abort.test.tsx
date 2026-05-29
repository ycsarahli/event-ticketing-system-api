import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import EventListPage from "../../pages/EventListPage"

vi.mock("../../api/events", () => ({
  getEvents: vi.fn(),
}))

import { getEvents } from "../../api/events"

// 可手動控制的 Promise（模擬慢速 API）
function controllablePromise<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>(res => { resolve = res })
  return { promise, resolve }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<EventListPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("AbortController — 避免舊請求蓋掉新結果", () => {
  beforeEach(() => {
    vi.mocked(getEvents).mockResolvedValue({
      data: [], pagination: { page: 1, limit: 10, total: 0 },
    })
  })

  it("切換分類時，前一個請求要被取消（signal.aborted）", async () => {
    const user = userEvent.setup()
    let firstSignal: AbortSignal | undefined
    let callCount = 0

    vi.mocked(getEvents).mockImplementation(async (_params, signal) => {
        callCount++
        // ✅ 只存第一次呼叫的 signal
        if (callCount === 1) {
        firstSignal = signal
        }
        // ✅ 延遲拉長到 300ms，確保第一次請求還在跑時被取消
        await new Promise(resolve => setTimeout(resolve, 300))
        return { data: [], pagination: { page: 1, limit: 10, total: 0 } }
    })

    renderPage()
    await waitFor(() => screen.getByRole("combobox"))

    // 切換分類，觸發第二次 getEvents，同時取消第一次
    await user.selectOptions(screen.getByRole("combobox"), "sport")

    // ✅ 驗證第一次請求的 signal 被 abort
    await waitFor(() => {
        expect(firstSignal?.aborted).toBe(true)
    })
    })

  it("搜尋時快速輸入，只有最後一次輸入的請求完成", async () => {
    const user = userEvent.setup()

    const { promise: slow, resolve: resolveSlow } = controllablePromise<any>()
    const { promise: fast, resolve: resolveFast } = controllablePromise<any>()

    let callCount = 0
    vi.mocked(getEvents).mockImplementation(() => {
      callCount++
      return callCount === 1 ? slow : fast
    })

    renderPage()
    const input = await screen.findByPlaceholderText("搜尋活動...")

    // 快速輸入（debounce 內）
    await user.type(input, "烤")
    await user.type(input, "肉") // 前一個 debounce 被重置

    // 只讓最後一次的請求完成
    act(() => {
      resolveFast({ data: [{ eventId: "ev_001", name: "夏日烤肉趴" }], pagination: { page: 1, limit: 1, total: 1 } })
    })

    // 舊的慢速請求（即使完成）不應該影響畫面
    act(() => {
      resolveSlow({ data: [{ eventId: "ev_999", name: "舊的結果" }], pagination: { page: 1, limit: 1, total: 1 } })
    })

    // 畫面只顯示最後一次的結果
    await waitFor(() => {
      expect(screen.queryByText("舊的結果")).not.toBeInTheDocument()
    })
  })
})