import { View, Text, TouchableOpacity, Keyboard, Platform, ActivityIndicator } from "react-native"
import { useEffect, useState } from "react"
import GooglePlacesTextInput, { type Place, type PlaceDetailsFields } from "react-native-google-places-textinput"
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme"
import { env } from "@/infrastructure/config/env"
import AppBottomSheetModal from "./AppBottomSheetModal"

interface PlaceResult {
  texto: string
  lat: number
  lng: number
  estado: string
  municipio: string
  nombreCompleto: string
}

interface Props {
  visible: boolean
  currentText?: string
  onSelect: (place: PlaceResult) => void
  onClose: () => void
}

const DETAILS_FIELDS = ["addressComponents", "formattedAddress", "location", "displayName"]

interface AddressComponent {
  longText?: string
  types?: string[]
}

interface PlaceDetails extends PlaceDetailsFields {
  addressComponents?: AddressComponent[]
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
}

async function fetchDetails(placeId: string, apiKey: string): Promise<PlaceDetails | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), 8000)
      const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": DETAILS_FIELDS.join(","),
        },
        signal: ac.signal,
      })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: PlaceDetails & { error?: { message?: string } } = await res.json()
      if (data.error) throw new Error(data.error.message)
      return data
    } catch {
      if (attempt === 2) return null
    }
  }
  return null
}

function extractComp(components: AddressComponent[], type: string): string {
  return components.find((component) => component.types?.includes(type))?.longText ?? ""
}

export default function LocationPickerModal({ visible, currentText, onSelect, onClose }: Props) {
  const [keyboardH, setKeyboardH] = useState(0)
  const [selecting, setSelecting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) => setKeyboardH(e.endCoordinates.height))
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardH(0))
    return () => { show.remove(); hide.remove() }
  }, [])

  const handleClose = () => {
    setSelecting(false)
    setError("")
    onClose()
  }

  const handleSelect = async (place: Place) => {
    if (selecting) return
    setError("")
    setSelecting(true)

    try {
      let details: PlaceDetails | null | undefined = place.details as PlaceDetails | undefined
      if (!details && place.placeId) {
        details = await fetchDetails(place.placeId, env.GOOGLE_PLACES_API_KEY)
      }

      if (!details) {
        setError("No se pudieron obtener los datos de esta ubicación. Verifica tu conexión e intenta de nuevo.")
        return
      }

      const ac = details.addressComponents || []
      const estado = extractComp(ac, "administrative_area_level_1")
      const municipio = extractComp(ac, "locality") || extractComp(ac, "administrative_area_level_2")
      const lat = details.location?.latitude
      const lng = details.location?.longitude

      if (typeof lat !== "number" || !Number.isFinite(lat) || typeof lng !== "number" || !Number.isFinite(lng)) {
        setError("No se pudo determinar la ubicación exacta. Intenta con otra dirección.")
        return
      }

      const st = place.structuredFormat
      const texto = st?.secondaryText
        ? `${st.mainText.text}, ${st.secondaryText.text}`
        : st?.mainText?.text ?? details.formattedAddress ?? ""

      onSelect({ texto, lat, lng, estado, municipio, nombreCompleto: details.formattedAddress || texto })
      handleClose()
    } finally {
      setSelecting(false)
    }
  }

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose} title="Ubicación" snapPoints={["85%"]} scrollable={false} enableContentPanningGesture={false}>
      <View style={{ gap: Gap.md, marginBottom: keyboardH }}>
        {currentText ? (
          <Text style={{ fontSize: 13, color: Palette.textMuted, fontFamily: Fonts.medium, marginTop: Gap.sm }}>Actual: {currentText}</Text>
        ) : null}
        <GooglePlacesTextInput
          apiKey={env.GOOGLE_PLACES_API_KEY}
          placeHolderText="Ej: Estadio Azteca"
          fetchDetails
          detailsFields={DETAILS_FIELDS}
          onPlaceSelect={handleSelect}
          includedRegionCodes={["mx"]}
          scrollEnabled
          nestedScrollEnabled
          suggestionTextProps={{
            mainTextNumberOfLines: 2,
            secondaryTextNumberOfLines: 2,
          }}
          style={{
            input: {
              color: Palette.black,
              fontSize: 15,
            },
            placeholder: { color: Palette.textMuted },
            suggestionsContainer: {
              backgroundColor: Palette.dark,
            },
            suggestionsList: {
              backgroundColor: Palette.dark,
            },
            suggestionItem: {
              paddingVertical: Pad.md,
              paddingHorizontal: Pad.base,
              borderBottomWidth: 1,
              borderBottomColor: Palette.border,
              backgroundColor: Palette.dark,
            },
            suggestionText: {
              main: { fontSize: 15, fontFamily: Fonts.semiBold, color: Palette.text },
              secondary: { fontSize: 13, color: Palette.textSecondary, marginTop: 2 },
            },
          }}
        />
        {selecting ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
            <ActivityIndicator size="small" color={Palette.cyan} />
            <Text style={{ color: Palette.textSecondary, fontSize: 14 }}>Obteniendo datos de la ubicación...</Text>
          </View>
        ) : null}
        {error ? (
          <Text style={{ color: Palette.danger, fontSize: 13, fontFamily: Fonts.medium }}>{error}</Text>
        ) : null}
        <TouchableOpacity onPress={handleClose} disabled={selecting} style={{ paddingVertical: Pad.md, borderRadius: Radius.md, backgroundColor: Palette.danger10, borderWidth: 1, borderColor: Palette.danger, alignItems: "center", opacity: selecting ? 0.5 : 1 }}>
          <Text style={{ color: Palette.danger, fontFamily: Fonts.medium, fontSize: 15 }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </AppBottomSheetModal>
  )
}
