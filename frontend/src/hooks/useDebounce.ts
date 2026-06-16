import { useRef, useCallback, useEffect } from "react"

export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fnRef = useRef(fn)

  // 每次 render 同步更新 ref，避免 stale closure
  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      fnRef.current(...args)
    }, delay)
  }, [delay]) // 移除 fn 依賴，改用 fnRef
}