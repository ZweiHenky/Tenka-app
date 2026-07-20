import { Drawer, DrawerContentScrollView } from "expo-router/drawer"
import { router, usePathname } from "expo-router"
import { Text, View, TouchableOpacity, Image } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Palette } from "@/constants/theme"
import { styles } from "@/constants/drawer.styles"
import { authClient } from "@/infrastructure/auth/client"

const DRAWER_ROUTES = ["index", "my-profile", "team", "leagues", "account", "support"] as const

function routeMatches(route: string, pathname: string): boolean {
  if (route === "index") return pathname === "/"
  if (route === "my-profile") return pathname.startsWith("/my-profile")
  if (route === "leagues") return pathname.startsWith("/leagues")
  if (route === "team") return pathname.startsWith("/team")
  if (route === "account") return pathname.startsWith("/account")
  if (route === "support") return pathname.startsWith("/support")
  return false
}

function CustomDrawerContent(props: any) {
  const { data: session } = authClient.useSession()
  const user = session?.user
  const pathname = usePathname()
  const { navigation } = props

  const items: { label: string; route: typeof DRAWER_ROUTES[number] }[] = [
    { label: "Inicio", route: "index" },
  ]

  if (user) {
    items.push({ label: "Mi perfil", route: "my-profile" })
  }

  items.push(
    { label: "Mis equipos", route: "team" },
    { label: "Mis ligas", route: "leagues" },
  )

  if (user) {
    items.push({ label: "Cuenta", route: "account" })
  }

  items.push({ label: "Ayuda", route: "support" })

  const routeIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    index: "home",
    "my-profile": "person",
    team: "groups",
    leagues: "emoji-events",
    account: "settings",
    support: "help-outline",
  }

  const handleFooterPress = () => {
    if (user) {
      authClient.signOut()
      router.replace("/(auth)/sign-in")
    } else {
      router.push("/(auth)/sign-in")
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <DrawerContentScrollView {...props} style={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.brand}>TENKA</Text>
          <View style={styles.brandDivider} />
          <Text style={styles.brandSub}>Sistema de competencias</Text>
        </View>

        <View style={styles.navSection}>
          {items.map((item) => {
            const focused = routeMatches(item.route, pathname)
            return (
              <TouchableOpacity
                key={item.route}
                onPress={() => {
                  if (item.route === "leagues") {
                    router.push("/(drawer)/leagues")
                  } else if (item.route === "my-profile") {
                    router.push("/(drawer)/my-profile")
                  } else {
                    navigation.navigate(item.route)
                  }
                  navigation.closeDrawer()
                }}
                style={[styles.itemContainer, focused && styles.itemContainerFocused]}
              >
                <MaterialIcons name={routeIcons[item.route]} size={22} color={focused ? Palette.cyan : "rgba(255,255,255,0.25)"} />
                <Text style={{ color: focused ? Palette.text : Palette.textSecondary, fontSize: 15, fontWeight: focused ? "600" : "500" }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.divider} />

        <TouchableOpacity onPress={handleFooterPress} style={styles.signInContainer}>
          <View style={styles.signInBullet} />
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "500" }}>
            {user ? "Cerrar sesión" : "Iniciar sesión"}
          </Text>
        </TouchableOpacity>
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <Image source={require("@/assets/images/icon.png")} style={styles.footerLogo} resizeMode="contain" />
        <Text style={styles.footerVersion}>v1.0.0</Text>
      </View>
    </View>
  )
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: { width: 260 },
        headerShown: false,
        headerTitleAlign: "left",
        headerStyle: { backgroundColor: Palette.black, elevation: 0, shadowOpacity: 0 },
        headerTintColor: Palette.text,
        headerTitleStyle: { fontWeight: "700", color: Palette.text },
      }}
    >
      <Drawer.Screen name="index" options={{ title: "Tenka" }} />
      <Drawer.Screen name="my-profile" options={{ title: "Mi perfil" }} />
      <Drawer.Screen name="team" options={{ title: "Mis equipos" }} />
      <Drawer.Screen name="player" options={{ drawerItemStyle: { display: "none" } }} />
      <Drawer.Screen name="(public)" options={{ drawerItemStyle: { display: "none" } }} />
      <Drawer.Screen name="leagues" options={{ title: "Mis ligas" }} />
      <Drawer.Screen name="account" options={{ title: "Cuenta" }} />
      <Drawer.Screen name="support" options={{ title: "Ayuda" }} />
    </Drawer>
  )
}
