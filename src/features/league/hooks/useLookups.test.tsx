// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const api = vi.hoisted(() => ({
  categorias: vi.fn(),
  tipos: vi.fn(),
  ubicaciones: vi.fn(),
  estadosLiga: vi.fn(),
  tiposCompetencia: vi.fn(),
}))

vi.mock("@/features/league/api/lookups", () => ({ lookupsApi: api }))

// eslint-disable-next-line import/first
import { useLookups, type LookupSelection } from "./useLookups"

describe("useLookups", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const request of Object.values(api)) request.mockResolvedValue([])
  })

  it("requests only enabled catalogs and reuses their query keys when enabled later", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { rerender } = renderHook(
      ({ selection }: { selection: LookupSelection }) => useLookups(selection),
      { wrapper, initialProps: { selection: { ubicaciones: true } as LookupSelection } },
    )

    await waitFor(() => expect(api.ubicaciones).toHaveBeenCalledOnce())
    expect(api.categorias).not.toHaveBeenCalled()
    expect(api.tipos).not.toHaveBeenCalled()
    expect(api.estadosLiga).not.toHaveBeenCalled()
    expect(api.tiposCompetencia).not.toHaveBeenCalled()

    rerender({ selection: { ubicaciones: true, categorias: true } })
    await waitFor(() => expect(api.categorias).toHaveBeenCalledOnce())
    expect(api.ubicaciones).toHaveBeenCalledOnce()
  })
})
