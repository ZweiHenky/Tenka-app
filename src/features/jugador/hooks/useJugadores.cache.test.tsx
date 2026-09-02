// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useAssignJugadorToDivision, useCreateJugador, useDeleteJugador, useRemoveJugadorFromDivision, useRemoveJugadorFromTeam, useUpdateJugador } from "./useJugadores"

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), removeTeam: vi.fn(), assignDivision: vi.fn(), removeDivision: vi.fn(), removePlayer: vi.fn() }))
vi.mock("@/features/jugador/api/jugadores", () => ({
  jugadorApi: {
    create: mocks.create,
    update: mocks.update,
    removeFromTeam: mocks.removeTeam,
    assignToDivision: mocks.assignDivision,
    removeFromDivision: mocks.removeDivision,
    delete: mocks.removePlayer,
  },
}))

const player = {
  id: "player-1", nombre: "Ana", posicion: "MEDIO" as const, foto: null, edad: 20, telefono: "555", showPhoneInPublicProfile: false,
  createdAt: "2026-08-14", updatedAt: "2026-08-14", equipos: [{ equipoId: "team-1", jugadorId: "player-1", dorsal: 7, createdAt: "2026-08-14" }],
}

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe("player roster cache updates", () => {
  beforeEach(() => vi.clearAllMocks())

  it("upserts a created player and applies public privacy", async () => {
    const { client, wrapper } = setup()
    mocks.create.mockResolvedValue(player)
    const { result } = renderHook(() => useCreateJugador(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ nombre: "Ana", posicion: "MEDIO", equipoId: "team-1", dorsal: 7 }) })
    expect(client.getQueryData<any[]>(["jugadores", "equipo", "team-1"])?.[0]).toMatchObject({ id: player.id, telefono: null })
  })

  it("removes only the team membership and preserves division roster membership", async () => {
    const { client, wrapper } = setup()
    client.setQueryData(["jugadores", "equipo", "team-1"], [player])
    client.setQueryData(["jugadores", "equipo", "team-2"], [{ ...player, equipos: [...player.equipos, { ...player.equipos[0], equipoId: "team-2" }] }])
    client.setQueryData(["jugadores", "division", "division-1", "team-1"], [{ divisionId: "division-1", equipoId: "team-1", jugadorId: player.id, dorsal: 7, createdAt: "", jugador: player }])
    mocks.removeTeam.mockResolvedValue(undefined)
    const { result } = renderHook(() => useRemoveJugadorFromTeam(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ equipoId: "team-1", jugadorId: player.id }) })
    expect(client.getQueryData<any[]>(["jugadores", "equipo", "team-1"])).toEqual([])
    expect(client.getQueryData<any[]>(["jugadores", "equipo", "team-2"])?.[0].equipos.map((entry: any) => entry.equipoId)).toEqual(["team-2"])
    expect(client.getQueryData<any[]>(["jugadores", "division", "division-1", "team-1"])?.length).toBe(1)
  })

  it("updates a team dorsal in player and division projections", async () => {
    const { client, wrapper } = setup()
    const updated = { ...player, equipos: [{ ...player.equipos[0], dorsal: 12 }] }
    const divisionLink = { divisionId: "division-1", equipoId: "team-1", jugadorId: player.id, dorsal: 7, createdAt: "", jugador: player }
    client.setQueryData(["jugadores", "equipo", "team-1"], [player])
    client.setQueryData(["jugadores", "division", "division-1", "team-1"], [divisionLink])
    client.setQueryData(["jugadores", "me"], player)
    mocks.update.mockResolvedValue(updated)
    const { result } = renderHook(() => useUpdateJugador(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ id: player.id, data: { equipoId: "team-1", dorsal: 12 } }) })

    expect(client.getQueryData<any[]>(["jugadores", "equipo", "team-1"])?.[0].equipos[0].dorsal).toBe(12)
    expect(client.getQueryData<any[]>(["jugadores", "division", "division-1", "team-1"])?.[0].dorsal).toBe(12)
    expect(client.getQueryData<any>(["jugadores", "me"])?.equipos[0].dorsal).toBe(12)
  })

  it("upserts and removes an exact division roster row", async () => {
    const { client, wrapper } = setup()
    const link = { divisionId: "division-1", equipoId: "team-1", jugadorId: player.id, dorsal: 7, createdAt: "", jugador: player }
    mocks.assignDivision.mockResolvedValue(link)
    mocks.removeDivision.mockResolvedValue(undefined)
    const assign = renderHook(() => useAssignJugadorToDivision(), { wrapper })
    const remove = renderHook(() => useRemoveJugadorFromDivision(), { wrapper })
    await act(async () => { await assign.result.current.mutateAsync({ divisionId: "division-1", equipoId: "team-1", jugadorId: player.id }) })
    expect(client.getQueryData<any[]>(["jugadores", "division", "division-1", "team-1"])?.[0].jugadorId).toBe(player.id)
    await act(async () => { await remove.result.current.mutateAsync({ divisionId: "division-1", equipoId: "team-1", jugadorId: player.id }) })
    expect(client.getQueryData<any[]>(["jugadores", "division", "division-1", "team-1"])).toEqual([])
  })

  it("removes a deleted player from every roster projection", async () => {
    const { client, wrapper } = setup()
    client.setQueryData(["jugadores", "equipo", "team-1"], [player])
    client.setQueryData(["jugadores", "division", "division-1", "team-1"], [{ divisionId: "division-1", equipoId: "team-1", jugadorId: player.id, jugador: player }])
    mocks.removePlayer.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteJugador(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ id: player.id, equipoId: "team-1" }) })
    expect(client.getQueryData<any[]>(["jugadores", "equipo", "team-1"])).toEqual([])
    expect(client.getQueryData<any[]>(["jugadores", "division", "division-1", "team-1"])).toEqual([])
  })
})
