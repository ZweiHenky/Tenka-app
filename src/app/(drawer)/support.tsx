import { useMemo, useState } from "react"
import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Palette, Radius, Pad, Gap, Fonts, MaxContentWidth } from "@/constants/theme"
import CustomHeader from "@/shared/components/CustomHeader"
import EmptyState from "@/shared/components/EmptyState"
import { TabBar } from "@/shared/components/TabBar"
import { FAQS, FAQ_CATEGORIES, type Faq } from "@/features/support/faq-data"
import { filterFaqs } from "@/features/support/faq-filter"

function FaqItem({ faq, expanded, onToggle }: { faq: Faq; expanded: boolean; onToggle: () => void }) {
  return (
    <View
      style={{
        backgroundColor: Palette.surface,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: expanded ? Palette.borderActive : Palette.border,
        overflow: "hidden",
      }}
    >
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={faq.question}
        accessibilityHint={expanded ? "Toca para ocultar la respuesta" : "Toca para mostrar la respuesta"}
        style={{ flexDirection: "row", alignItems: "center", padding: Pad.base, gap: Gap.sm, minHeight: 48 }}
      >
        <Text style={{ flex: 1, fontSize: 15, color: Palette.text, fontFamily: Fonts.medium }}>
          {faq.question}
        </Text>
        <MaterialIcons
          name={expanded ? "expand-less" : "expand-more"}
          size={22}
          color={Palette.cyan}
        />
      </TouchableOpacity>
      {expanded ? (
        <View style={{ paddingHorizontal: Pad.base, paddingBottom: Pad.base }}>
          <View style={{ height: 1, backgroundColor: Palette.border, marginBottom: Pad.base }} />
          <Text style={{ fontSize: 14, color: Palette.textSecondary, lineHeight: 22 }}>
            {faq.answer}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

export default function SupportScreen() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("todas")
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => filterFaqs(FAQS, search, category as "todas"), [search, category])
  const visibleOpenId = filtered.some((faq) => faq.id === openId) ? openId : null

  const clearSearch = () => {
    setSearch("")
    setCategory("todas")
  }

  return (
    <>
      <CustomHeader title="Ayuda" />
      <View style={{ flex: 1, backgroundColor: Palette.black, alignItems: "center" }}>
        <View style={{ flex: 1, width: "100%", maxWidth: MaxContentWidth }}>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: Pad.xl, gap: Gap.lg }}
            ItemSeparatorComponent={() => <View style={{ height: Gap.lg }} />}
            ListHeaderComponent={
              <View style={{ gap: Gap.md, marginBottom: Gap.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: search ? Palette.borderActive : Palette.border, paddingHorizontal: Pad.base, gap: Gap.sm }}>
                  <MaterialIcons name="search" size={20} color={Palette.cyan} />
                  <TextInput
                    placeholder="Buscar en ayuda..."
                    placeholderTextColor={Palette.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    accessibilityLabel="Buscar en preguntas frecuentes"
                    returnKeyType="search"
                    style={{ flex: 1, paddingVertical: Pad.md, fontSize: 14, color: Palette.text }}
                  />
                  {search ? (
                    <TouchableOpacity
                      onPress={() => setSearch("")}
                      accessibilityRole="button"
                      accessibilityLabel="Limpiar búsqueda"
                      style={{ padding: 4 }}
                    >
                      <MaterialIcons name="close" size={18} color={Palette.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TabBar
                  tabs={FAQ_CATEGORIES.map((c) => ({ key: c.id, label: c.label }))}
                  activeTab={category}
                  onTabChange={setCategory}
                />
                <Text accessibilityLiveRegion="polite" style={{ fontSize: 13, color: Palette.textMuted }}>
                  {filtered.length} {filtered.length === 1 ? "pregunta" : "preguntas"}
                </Text>
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                message="No encontramos preguntas para esta búsqueda"
                icon="search-off"
                actionLabel="Limpiar búsqueda"
                onAction={clearSearch}
              />
            }
            renderItem={({ item }) => (
              <FaqItem
                faq={item}
                expanded={visibleOpenId === item.id}
                onToggle={() => setOpenId(visibleOpenId === item.id ? null : item.id)}
              />
            )}
          />
        </View>
      </View>
    </>
  )
}
