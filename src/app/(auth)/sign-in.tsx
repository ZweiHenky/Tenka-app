import { useEffect, useState } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from "react-native"
import { router } from "expo-router"
import { Palette } from "@/constants/theme"
import { styles } from "@/features/auth/screens/SignIn.styles"
import { authClient } from "@/infrastructure/auth/client"
import { getAuthErrorMessage } from "@/infrastructure/auth/errors"
import { useToast } from "@/shared/components/Toast"

export default function SignInScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false)
  const { data: session, isPending } = authClient.useSession()
  const toast = useToast()

  useEffect(() => {
    if (session) {
      router.replace("/(drawer)")
    }
  }, [session])

  if (isPending) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={Palette.cyan} size="large" />
      </View>
    )
  }

  if (session) {
    return null
  }

  const handleGoogle = async () => {
    if (isSigningIn) return
    setIsSigningIn(true)
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/(drawer)",
      })
      if (error) toast.error(getAuthErrorMessage(error, "No se pudo iniciar sesión con Google."))
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "No se pudo iniciar sesión con Google."))
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/icon-horizontal.png")}
          style={styles.logoHorizontal}
          resizeMode="contain"
        />

        <View style={styles.brandDividerRow}>
          <View style={styles.brandDot} />
          <View style={styles.divider} />
        </View>

        <Text style={styles.description}>
          La plataforma que transforma la forma de gestionar ligas deportivas.
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity onPress={handleGoogle} style={styles.primaryButton} activeOpacity={0.85} disabled={isSigningIn}>
          {isSigningIn ? (
            <ActivityIndicator color={Palette.black} size="small" />
          ) : (
            <Text style={{ fontSize: 16, color: Palette.black, fontWeight: "700" }}>G</Text>
          )}
          <Text style={styles.primaryButtonText}>Continuar con Google</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <Text style={styles.footerText}>Deportes · Ligas · Estadísticas</Text>
      </View>
    </View>
  )
}
