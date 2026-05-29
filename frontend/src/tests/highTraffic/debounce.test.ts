import { renderHook, act } from "@testing-library/react"
import { vi, describe, it, expect, afterEach } from "vitest"
import { useDebounce } from "../../hooks/useDebounce"

describe("useDebounce — 防重複點擊", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("連續呼叫 5 次，只執行 1 次", () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounce(fn, 500))

    act(() => {
      result.current()
      result.current()
      result.current()
      result.current()
      result.current()
    })

    // 計時器跑完前不應該被呼叫
    expect(fn).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(500))

    // 計時器跑完後只呼叫一次
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("兩次點擊間隔不足 500ms，只執行最後一次", () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounce(fn, 500))

    act(() => result.current("第一次"))
    act(() => vi.advanceTimersByTime(300)) // 還沒到 500ms

    act(() => result.current("第二次"))   // 重置計時器
    act(() => vi.advanceTimersByTime(500)) // 現在才跑完

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith("第二次") // 執行的是最後一次
  })

  it("間隔超過 500ms 的兩次點擊，各自執行", () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounce(fn, 500))

    act(() => result.current())
    act(() => vi.advanceTimersByTime(600)) // 第一次完成

    act(() => result.current())
    act(() => vi.advanceTimersByTime(600)) // 第二次完成

    expect(fn).toHaveBeenCalledTimes(2)
  })
})