// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useUpdateTeam } from "@/features/team/hooks/useTeams"
import { useUpdateLeague } from "@/features/league/hooks/useLeagues"
import { useRemoveTeam, useUpdateTeamSaldo } from "@/features/division-equipo/hooks/useDivisionEquipo"
import { useUpdateMyProfile } from "@/features/jugador/hooks/useJugadores"
import { useDeleteRondasByDivision, useGenerateRondas } from "@/features/ronda-playoff/hooks/useRondasPlayoff"

const mocks = vi.hoisted(() => ({
  updateTeam: vi.fn(),
  updateLeague: vi.fn(),
  removeTeam: vi.fn(),
  updateSaldo: vi.fn(),
  updateProfile: vi.fn(),
  generateRounds: vi.fn(),
  deleteRounds: vi.fn(),
}))

vi.mock("@/features/team/api/teams", () => ({ teamApi: { update: mocks.updateTeam } }))
vi.mock("@/features/league/api/leagues", () => ({ leagueApi: { update: mocks.updateLeague } }))
vi.mock("@/features/division-equipo/api/division-equipo", () => ({ divisionEquipoApi: { remove: mocks.removeTeam, updateSaldo: mocks.updateSaldo } }))
vi.mock("@/features/jugador/api/jugadores", () => ({ jugadorApi: { updateMe: mocks.updateProfile } }))
vi.mock("@/features/ronda-playoff/api/rondasPlayoff", () => ({ rondaPlayoffApi: { generate: mocks.generateRounds, deleteByDivision: mocks.deleteRounds } }))

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe("targeted mutation cache updates", () => {
  beforeEach(() => vi.clearAllMocks())

  it("updates only the changed team detail and cached user lists", async () => {
    const { client, wrapper } = setup()
    const team = { id: "team-1", nombre: "Nuevo", logo: null, codigo: "TEAM1", esPropio: true }
    client.setQueryData(["teams", "user", "user-1"], [{ ...team, nombre: "Anterior" }])
    client.setQueryData(["division-equipos", "division-1"], [{ divisionId: "division-1", equipoId: team.id, equipo: { ...team, nombre: "Anterior" } }])
    mocks.updateTeam.mockResolvedValue(team)
    const invalidate = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useUpdateTeam("user-1"), { wrapper })

    await act(async () => { await result.current.mutateAsync({ id: team.id, data: { nombre: team.nombre } }) })

    expect(client.getQueryData(["teams", team.id])).toEqual(team)
    expect(client.getQueryData(["teams", "user", "user-1"])).toEqual([team])
    expect(client.getQueryData<any[]>(["division-equipos", "division-1"])?.[0].equipo).toEqual(team)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("updates league caches and defers the public feed request", async () => {
    const { client, wrapper } = setup()
    const league = { id: "league-1", nombre: "Nueva liga", logo: null, userId: "user-1" }
    client.setQueryData(["leagues", "user", "user-1"], [{ id: league.id, nombre: "Anterior", logo: null }])
    mocks.updateLeague.mockResolvedValue(league)
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined)
    const { result } = renderHook(() => useUpdateLeague(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ id: league.id, data: { nombre: league.nombre } }) })

    expect(client.getQueryData(["leagues", league.id])).toEqual(league)
    expect(client.getQueryData(["leagues", "user", "user-1"])).toEqual([{ id: league.id, nombre: league.nombre, logo: null }])
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ligas-infinitas"], refetchType: "none" })
  })

  it("patches division teams, balance and own profile without list refetches", async () => {
    const { client, wrapper } = setup()
    const links = [
      { divisionId: "division-1", equipoId: "team-1", saldoPendiente: "10", equipo: { id: "team-1", nombre: "Uno", logo: null, codigo: "UNO", esPropio: true } },
      { divisionId: "division-1", equipoId: "team-2", saldoPendiente: "20", equipo: { id: "team-2", nombre: "Dos", logo: null, codigo: "DOS", esPropio: true } },
    ]
    client.setQueryData(["division-equipos", "division-1"], links)
    mocks.updateSaldo.mockResolvedValue({ ...links[0], saldoPendiente: "0" })
    const saldo = renderHook(() => useUpdateTeamSaldo(), { wrapper })
    await act(async () => { await saldo.result.current.mutateAsync({ divisionId: "division-1", equipoId: "team-1", saldoPendiente: "0" }) })
    expect((client.getQueryData<typeof links>(["division-equipos", "division-1"]) ?? [])[0].saldoPendiente).toBe("0")

    mocks.removeTeam.mockResolvedValue(undefined)
    const remove = renderHook(() => useRemoveTeam(), { wrapper })
    await act(async () => { await remove.result.current.mutateAsync({ divisionId: "division-1", equipoId: "team-1" }) })
    expect(client.getQueryData<typeof links>(["division-equipos", "division-1"])?.map((link) => link.equipoId)).toEqual(["team-2"])

    const profile = { id: "player-1", nombre: "Ana" }
    mocks.updateProfile.mockResolvedValue(profile)
    const updateProfile = renderHook(() => useUpdateMyProfile(), { wrapper })
    await act(async () => { await updateProfile.result.current.mutateAsync({ nombre: "Ana" }) })
    expect(client.getQueryData(["jugadores", "me"])).toEqual(profile)
  })

  it("writes deterministic playoff state and scopes deferred candidates", async () => {
    const { client, wrapper } = setup()
    const rounds = [{ id: "round-1", divisionId: "division-1", partidos: [] }]
    mocks.generateRounds.mockResolvedValue(rounds)
    mocks.deleteRounds.mockResolvedValue(undefined)
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined)
    const generate = renderHook(() => useGenerateRondas(), { wrapper })
    const remove = renderHook(() => useDeleteRondasByDivision(), { wrapper })

    await act(async () => { await generate.result.current.mutateAsync({ divisionId: "division-1", leagueId: "league-1", cantidadEquipos: 4 }) })
    expect(client.getQueryData(["rondas-playoff", "division-1"])).toEqual(rounds)

    await act(async () => { await remove.result.current.mutateAsync({ divisionId: "division-1", leagueId: "league-1" }) })
    expect(client.getQueryData(["rondas-playoff", "division-1"])).toEqual([])
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["referee-candidates", "league-1"], exact: true, refetchType: "none" })
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["rondas-playoff", "division-1"] }))
  })
})
