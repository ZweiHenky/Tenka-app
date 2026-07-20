import { useState } from "react"
import { View, Text, ScrollView, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Palette, Radius, Pad, Gap, Fonts } from "@/constants/theme"
import CustomHeader from "@/shared/components/CustomHeader"

const faqs = [
  {
    q: "¿Cómo creo una liga?",
    a: "Anda a la sección Ligas en el menú lateral y presioná el botón \"+\" en la esquina superior derecha. Completá el nombre, seleccioná la categoría, tipo de competencia y ubicación. Una vez creada, podés agregar divisiones y configurar los horarios.",
  },
  {
    q: "¿Cómo agrego equipos a mi liga?",
    a: "Desde el detalle de la liga, seleccioná una división. En la sección \"Equipos\" vas a ver un botón para agregar. Podés crear equipos nuevos o asignar equipos existentes. Cada equipo se identifica por su teléfono; si dos jugadores tienen el mismo teléfono, se vinculan al mismo equipo.",
  },
  {
    q: "¿Cómo publico una división?",
    a: "Dentro del detalle de la división, una vez que tengas equipos asignados y horarios configurados, presioná el botón \"Publicar\" (verde). Esto cambia el estado a \"En Curso\" y permite generar las jornadas. Una vez publicada, no se pueden modificar los equipos.",
  },
  {
    q: "¿Cómo genero las jornadas?",
    a: "Con la división en estado \"En Curso\", andá a la sección \"Programación\" dentro de la división. Configurá los slots de horario con los equipos correspondientes, luego presioná \"Generar Jornada\" para crear la próxima fecha automáticamente.",
  },
  {
    q: "¿Cómo funciona el sistema de eliminatorias?",
    a: "Las eliminatorias están disponibles solo para divisiones con tipo de competencia que incluya \"Eliminatorias\". Una vez definidos los equipos, presioná \"Generar Playoffs\" para crear el árbol. Cada ronda se resuelve partido a partido hasta la final.",
  },
  {
    q: "¿Cómo comparto mi liga con otros?",
    a: "En el detalle de tu liga, presioná el botón \"Compartir\" o usá el código QR que aparece en cada equipo. Los jugadores pueden escanear el código QR con la cámara desde la pantalla principal para ver la información pública de la liga.",
  },
]

export default function SupportScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i)

  return (
    <>
      <CustomHeader title="Ayuda" />
      <ScrollView style={{ flex: 1, backgroundColor: Palette.black }} contentContainerStyle={{ padding: Pad.xl, gap: Gap.lg }}>
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i
          return (
            <TouchableOpacity
              key={i}
              onPress={() => toggle(i)}
              activeOpacity={0.8}
              style={{
                backgroundColor: Palette.surface,
                borderRadius: Radius.xl,
                borderWidth: 1,
                borderColor: isOpen ? Palette.borderActive : Palette.border,
                overflow: "hidden",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", padding: Pad.base, gap: Gap.sm }}>
                <Text style={{ flex: 1, fontSize: 15, color: Palette.text, fontFamily: Fonts.medium }}>
                  {faq.q}
                </Text>
                <MaterialIcons
                  name={isOpen ? "expand-less" : "expand-more"}
                  size={22}
                  color={Palette.cyan}
                />
              </View>
              {isOpen && (
                <View style={{ paddingHorizontal: Pad.base, paddingBottom: Pad.base }}>
                  <View style={{ height: 1, backgroundColor: Palette.border, marginBottom: Pad.base }} />
                  <Text style={{ fontSize: 14, color: Palette.textSecondary, lineHeight: 22 }}>
                    {faq.a}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </>
  )
}
