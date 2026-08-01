import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, RefreshControl } from "react-native"
import { router, useIsFocused } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTourGuide } from "@wrack/react-native-tour-guide"
import { Radius, Pad, Gap, Palette, MaxContentWidth, Fonts } from "@/constants/theme"
import { MaterialIcons } from "@expo/vector-icons"
import { useLookups } from "@/features/league/hooks/useLookups"
import { useLigasInfinitas } from "@/features/league/hooks/useLigasInfinitas"
import { useDebounce } from "@/shared/hooks/useDebounce"
import PublicLeagueCard from "@/features/league/components/PublicLeagueCard"
import ErrorState from "@/shared/components/ErrorState"
import EmptyState from "@/shared/components/EmptyState"
import CustomHeader from "@/shared/components/CustomHeader"
import AppBottomSheetModal from "@/shared/components/AppBottomSheetModal"
import { useLigaFavoritaStore } from "@/stores/ligaFavoritaStore"

interface AccordionFilterSectionProps {
  title: string
  icon: keyof typeof MaterialIcons.glyphMap
  items: { id: string; nombre: string }[]
  selected: Set<string>
  onToggle: (id: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

function AccordionFilterSection({ title, icon, items, selected, onToggle, isExpanded, onToggleExpand }: AccordionFilterSectionProps) {
  if (items.length === 0) return null
  const count = selected.size
  return (
    <View style={{ backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, overflow: "hidden" }}>
      <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", padding: Pad.base, gap: Gap.sm }}>
        <MaterialIcons name={icon} size={20} color={Palette.cyan} />
        <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: Palette.text }}>{title}</Text>
        {count > 0 && (
          <View style={{ backgroundColor: Palette.cyan, borderRadius: Radius.full, minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: Palette.black }}>{count}</Text>
          </View>
        )}
        <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={22} color={Palette.textMuted} />
      </TouchableOpacity>
      {isExpanded && (
        <View style={{ padding: Pad.base, paddingTop: 0, flexDirection: "row", flexWrap: "wrap", gap: Gap.sm }}>
          {items.map((item) => {
            const active = selected.has(item.id)
            return (
              <TouchableOpacity key={item.id} onPress={() => onToggle(item.id)} style={{ paddingHorizontal: Pad.md, paddingVertical: Pad.sm, borderRadius: Radius.full, backgroundColor: active ? Palette.cyan : Palette.surfaceLight, borderWidth: 1, borderColor: active ? Palette.cyan : Palette.border }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: active ? Palette.black : Palette.text }}>{item.nombre}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </View>
  )
}

function toggleSet(set: Set<string>, item: string): Set<string> {
  const next = new Set(set)
  if (next.has(item)) next.delete(item)
  else next.add(item)
  return next
}

export default function Home() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 400)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedCategoriaIds, setSelectedCategoriaIds] = useState<Set<string>>(new Set())
  const [selectedTipoIds, setSelectedTipoIds] = useState<Set<string>>(new Set())
  const [selectedEstadoIds, setSelectedEstadoIds] = useState<Set<string>>(new Set())

  const [refreshing, setRefreshing] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["categoria"]))

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const searchRef = useRef<View>(null)
  const filterRef = useRef<View>(null)
  const firstCardRef = useRef<View>(null)
  const flatListRef = useRef<FlatList>(null)
  const scrollOffsetRef = useRef(0)
  const tourStartedRef = useRef(false)
  const [firstCardReady, setFirstCardReady] = useState(false)

  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const { startTour } = useTourGuide()

  const lookups = useLookups()
  const favoritos = useLigaFavoritaStore((s) => s.favoritos)

  const filters = useMemo(() => ({
    search: debouncedSearch.trim() || undefined,
    categoriaId: selectedCategoriaIds.size === 1 ? [...selectedCategoriaIds][0] : undefined,
    tipoId: selectedTipoIds.size === 1 ? [...selectedTipoIds][0] : undefined,
    estadoLigaId: selectedEstadoIds.size === 1 ? [...selectedEstadoIds][0] : undefined,
  }), [debouncedSearch, selectedCategoriaIds, selectedTipoIds, selectedEstadoIds])

  const { data, isLoading, fetchNextPage, isFetchingNextPage, hasNextPage, error, refetch } = useLigasInfinitas(filters)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const ligas = useMemo(() => {
    const todas = data?.pages.flatMap((p) => p.rows) ?? []
    return todas
  }, [data])

  const hasAnyFilter = selectedCategoriaIds.size > 0 || selectedTipoIds.size > 0 || selectedEstadoIds.size > 0

  const clearAll = useCallback(() => {
    setSelectedCategoriaIds(new Set())
    setSelectedTipoIds(new Set())
    setSelectedEstadoIds(new Set())
  }, [])

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const card = (
      <PublicLeagueCard
        league={item}
        ubicacionTexto={lookups.ubicaciones.find((u) => u.id === item.ubicacionId)?.nombreCompleto}
      />
    )
    if (index === 0) {
      return (
        <View ref={firstCardRef} onLayout={() => setFirstCardReady(true)}>
          {card}
        </View>
      )
    }
    return card
  }, [lookups])

  useEffect(() => {
    if (tourStartedRef.current) return
    if (!isFocused || ligas.length === 0 || !firstCardReady) return
    if (!searchRef.current || !filterRef.current || !firstCardRef.current) return

    const initTour = async () => {
      const seen = await AsyncStorage.getItem("@tour_guide:home-discovery-v1")
      if (seen === "completed") {
        tourStartedRef.current = true
        return
      }

      const flatListScroller = { current: { scrollTo: ({ y, animated }: { y: number; animated?: boolean }) => { flatListRef.current?.scrollToOffset({ offset: y, animated }) } } }

      startTour(
        [
          {
            id: "home-search",
            targetRef: searchRef,
            title: "Busca una liga",
            description: "Escribe el nombre de una liga para encontrarla rápidamente.",
            spotlightPadding: 8,
            tooltipPosition: "bottom",
          },
          {
            id: "home-filter",
            targetRef: filterRef,
            title: "Filtra los resultados",
            description: "Filtra las ligas por categoría, tipo y estado.",
            spotlightPadding: 8,
            tooltipPosition: "bottom",
          },
          {
            id: "home-explore",
            targetRef: firstCardRef,
            title: "Explora una liga",
            description: "Toca una liga para consultar sus divisiones, horarios, resultados y estadísticas.",
            spotlightPadding: 8,
            tooltipPosition: "top",
          },
        ],
        {
          tourId: "home-discovery-v1",
          insets: { top: insets.top, bottom: insets.bottom },
          nextButtonText: "Siguiente",
          prevButtonText: "Atrás",
          skipButtonText: "Saltar",
          doneButtonText: "Entendido",
          onTourEnd: () => { AsyncStorage.setItem("@tour_guide:home-discovery-v1", "completed") },
          tooltipStyles: {
            backgroundColor: Palette.surface,
            titleColor: Palette.text,
            descriptionColor: Palette.textSecondary,
            buttonTextColor: Palette.black,
            primaryButtonColor: Palette.cyan,
            skipButtonColor: Palette.textMuted,
            borderRadius: Radius.lg,
          },
          spotlightStyles: {
            overlayColor: Palette.black,
            overlayOpacity: 0.7,
          },
          scrollRef: flatListScroller,
          getCurrentScrollOffset: () => scrollOffsetRef.current,
        }
      )
      tourStartedRef.current = true
    }

    initTour()
  }, [isFocused, ligas.length, firstCardReady, startTour, insets.top, insets.bottom])

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader title="TENKA" titleFontFamily={Fonts.brand} titleLetterSpacing={0.8} titleColor={Palette.cyan} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, maxWidth: MaxContentWidth, alignSelf: "center", width: "100%" }}>
      <FlatList
        ref={flatListRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: Pad.xl, paddingTop: Gap.base, paddingBottom: 48 }}
        onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        data={ligas}
        renderItem={renderItem}
        keyExtractor={(item: any) => item.id}
        onEndReached={hasNextPage ? () => fetchNextPage() : undefined}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Palette.cyan}
            colors={[Palette.cyan]}
            progressBackgroundColor={Palette.dark}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: Gap.xl }} />}
        ListHeaderComponent={
          <View style={{ gap: Gap.md, marginBottom: Gap.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Gap.sm }}>
              <View ref={searchRef} style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: Palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: search ? Palette.borderActive : Palette.border, paddingHorizontal: Pad.base, gap: Gap.sm }}>
                <MaterialIcons name="search" size={20} color={Palette.cyan} />
                <TextInput
                  placeholder="Buscar liga..."
                  placeholderTextColor={Palette.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  style={{ flex: 1, paddingVertical: Pad.md, fontSize: 14, color: Palette.text }}
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
                    <MaterialIcons name="close" size={18} color={Palette.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                ref={filterRef}
                onPress={() => setFilterOpen(true)}
                style={{ backgroundColor: hasAnyFilter ? Palette.cyan : Palette.surface, borderWidth: 1, borderColor: hasAnyFilter ? Palette.cyan : Palette.border, borderRadius: Radius.md, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <MaterialIcons name="filter-list" size={22} color={hasAnyFilter ? Palette.black : Palette.text} />
                {hasAnyFilter ? (
                  <View style={{ position: "absolute", top: -4, right: -4, backgroundColor: Palette.cyan, borderRadius: Radius.full, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: Palette.black }}>{selectedCategoriaIds.size + selectedTipoIds.size + selectedEstadoIds.size}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            {favoritos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Gap.md, paddingVertical: Gap.sm }}>
                {favoritos.map((fav) => (
                  <TouchableOpacity key={fav.id} onPress={() => router.push({ pathname: "/(drawer)/(public)/liga/[id]", params: { id: fav.id } })} style={{ alignItems: "center", gap: 4 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, overflow: "hidden", borderWidth: 2, borderColor: Palette.warning, alignItems: "center", justifyContent: "center", backgroundColor: Palette.surface }}>
                      {fav.logo ? (
                        <Image source={{ uri: fav.logo }} style={{ width: 56, height: 56 }} resizeMode="cover" />
                      ) : fav.cancha ? (
                        <Image source={{ uri: fav.cancha }} style={{ width: 56, height: 56 }} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 22, fontFamily: Fonts.bold, color: Palette.cyan }}>{fav.nombre.charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 11, color: Palette.textSecondary, maxWidth: 64, textAlign: "center" }}>{fav.nombre}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            {hasAnyFilter ? (
              <TouchableOpacity onPress={clearAll} style={{ alignSelf: "flex-start", paddingVertical: 4 }}>
                <Text style={{ fontSize: 13, color: Palette.danger, fontWeight: "600" }}>Limpiar filtros</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        ListEmptyComponent={error ? (
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        ) : ligas.length === 0 && !isLoading ? (
          <EmptyState message="Sin resultados" icon="search-off" />
        ) : null}
        ListFooterComponent={
          isLoading ? (
            <View style={{ paddingVertical: Pad.base, alignItems: "center" }}>
              <ActivityIndicator size="large" color={Palette.cyan} />
            </View>
          ) : isFetchingNextPage ? (
            <View style={{ paddingVertical: Pad.base, alignItems: "center" }}>
              <ActivityIndicator size="small" color={Palette.cyan} />
            </View>
          ) : null
        }
      />
      </View>
      </KeyboardAvoidingView>

      <AppBottomSheetModal visible={filterOpen} onClose={() => setFilterOpen(false)} title="Filtros" snapPoints={["65%"]}>
        <View style={{ gap: Gap.md }}>
          <AccordionFilterSection title="Categoría" icon="category" items={lookups.categorias} selected={selectedCategoriaIds} onToggle={(id) => setSelectedCategoriaIds((p) => toggleSet(p, id))} isExpanded={expandedSections.has("categoria")} onToggleExpand={() => toggleSection("categoria")} />
          <AccordionFilterSection title="Tipo" icon="sports" items={lookups.tipos} selected={selectedTipoIds} onToggle={(id) => setSelectedTipoIds((p) => toggleSet(p, id))} isExpanded={expandedSections.has("tipo")} onToggleExpand={() => toggleSection("tipo")} />
          <AccordionFilterSection title="Estado" icon="flag" items={lookups.estadosLiga} selected={selectedEstadoIds} onToggle={(id) => setSelectedEstadoIds((p) => toggleSet(p, id))} isExpanded={expandedSections.has("estado")} onToggleExpand={() => toggleSection("estado")} />
          {hasAnyFilter ? (
            <TouchableOpacity onPress={clearAll} style={{ alignSelf: "center", paddingVertical: Pad.md }}>
              <Text style={{ fontSize: 14, color: Palette.danger, fontWeight: "600" }}>Limpiar todos</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </AppBottomSheetModal>
    </View>
  )
}
