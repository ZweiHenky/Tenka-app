import { ScrollView, TouchableOpacity, Text } from "react-native"
import { Palette, Fonts, Pad, Radius, Gap } from "@/constants/theme"

export interface Tab {
  key: string
  label: string
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (key: string) => void
  stretch?: boolean
}

export function TabBar({ tabs, activeTab, onTabChange, stretch = false }: TabBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: Gap.sm, paddingVertical: Pad.sm, ...(stretch ? { flexGrow: 1 } : {}) }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => onTabChange(tab.key)}
            style={{
              paddingHorizontal: Pad.base,
              paddingVertical: Pad.sm,
              borderRadius: Radius.md,
              backgroundColor: isActive ? Palette.cyan : Palette.surface,
              borderWidth: 1,
              borderColor: isActive ? Palette.cyan : Palette.border,
              ...(stretch ? { flex: 1, alignItems: "center", justifyContent: "center" } : {}),
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: Fonts.semiBold,
                color: isActive ? Palette.black : Palette.textSecondary,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}
