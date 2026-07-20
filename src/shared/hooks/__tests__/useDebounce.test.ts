// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDebounce } from "../useDebounce"

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("retorna el valor inicial inmediatamente", () => {
    const { result } = renderHook(() => useDebounce("hola", 500))
    expect(result.current).toBe("hola")
  })

  it("no actualiza antes del delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 500 } }
    )

    expect(result.current).toBe("a")

    rerender({ value: "b", delay: 500 })

    expect(result.current).toBe("a")
  })

  it("actualiza despu�s del delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 500 } }
    )

    rerender({ value: "b", delay: 500 })

    act(() => { vi.advanceTimersByTime(500) })

    expect(result.current).toBe("b")
  })

  it("cancela el timer anterior si cambia el valor", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 500 } }
    )

    rerender({ value: "b", delay: 500 })

    act(() => { vi.advanceTimersByTime(300) })

    rerender({ value: "c", delay: 500 })

    act(() => { vi.advanceTimersByTime(300) })

    expect(result.current).toBe("a")

    act(() => { vi.advanceTimersByTime(200) })

    expect(result.current).toBe("c")
  })
})
