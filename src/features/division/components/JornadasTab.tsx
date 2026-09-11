import { View } from "react-native"
import ErrorState from "@/shared/components/ErrorState"
import JornadaListCard from "@/features/jornada/components/JornadaListCard"
import { router } from "expo-router"
import { Gap } from "@/constants/theme"
import { useNavGuard } from "@/shared/hooks/useNavGuard"

interface JornadaItem {
  id: string
  numero: number
  partidos?: { estado: string | null }[]
}

interface Props {
  divisionId: string
  ligaId: string
  jornadas: JornadaItem[]
  jornadasError: Error | null
  refetchJornadas: () => void
  ligaCompletada: boolean
  onDelete: (jornadaId: string, numero: number) => void
}

export default function JornadasTab({
  divisionId,
  ligaId,
  jornadas,
  jornadasError,
  refetchJornadas,
  ligaCompletada,
  onDelete,
}: Props) {
  const guard = useNavGuard()

  return (
    <View style={{ gap: Gap.md }}>
      {jornadasError ? (
        <ErrorState message={jornadasError.message} onRetry={() => refetchJornadas()} />
      ) : (
        <JornadaListCard
          jornadas={jornadas}
          disabled={ligaCompletada}
          disabledMessage="Temporada completada. Reinicia la liga para continuar."
          onNavigate={(jornadaId) => guard(() => router.push(`/(drawer)/leagues/${ligaId}/divisions/${divisionId}/jornadas/${jornadaId}`))}
          onDelete={onDelete}
          flat
        />
      )}
    </View>
  )
}
