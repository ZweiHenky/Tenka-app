import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { router, useIsFocused } from "expo-router";
import { useTourGuide } from "@wrack/react-native-tour-guide";
import { tourConfig, tourYaCompletado } from "@/shared/utils/tour-config"
import type { TourStep } from "@wrack/react-native-tour-guide";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Radius, Pad, Gap, Palette, Fonts } from "@/constants/theme";
import {
  useMyProfile,
  useUpdateMyProfile,
} from "@/features/jugador/hooks/useJugadores";
import { useCampeonatosJugador } from "@/features/division-campeon/hooks/useDivisionCampeon";
import PlayerAchievementsCard from "@/features/player/components/PlayerAchievementsCard";
import { authClient } from "@/infrastructure/auth/client";
import type { Jugador } from "@/domain/interfaces/player";
import { POSICIONES_JUGADOR } from "@/domain/interfaces/player";
import { useToast } from "@/shared/components/Toast";
import CustomHeader from "@/shared/components/CustomHeader";
import LoadingScreen from "@/shared/components/LoadingScreen";
import PullToRefresh from "@/shared/components/PullToRefresh";
import { useNavGuard } from "@/shared/hooks/useNavGuard";

function formatPosicion(posicion: string) {
  return POSICIONES_JUGADOR.find((p) => p.id === posicion)?.nombre ?? posicion;
}

function ProfileCard({ jugador }: { jugador: Jugador }) {
  return (
    <View
      style={{
        backgroundColor: Palette.surface,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Palette.border,
        padding: Pad.xl,
        alignItems: "center",
        gap: Gap.md,
      }}
    >
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: Radius.full,
          overflow: "hidden",
          borderWidth: 2,
          borderColor: Palette.cyan,
          backgroundColor: Palette.surfaceLight,
        }}
      >
        <Image
          source={
            jugador.foto
              ? { uri: jugador.foto }
              : require("@/assets/ejemplos/logo.png")
          }
          style={{ width: 88, height: 88 }}
          resizeMode="cover"
        />
      </View>
      <Text
        style={{
          color: Palette.text,
          fontSize: 22,
          fontFamily: Fonts.displayBold,
          textAlign: "center",
        }}
      >
        {jugador.nombre}
      </Text>
      <View style={{ flexDirection: "row", gap: Gap.sm }}>
        <View
          style={{
            backgroundColor: Palette.cyan10,
            borderRadius: Radius.full,
            paddingHorizontal: Pad.md,
            paddingVertical: Pad.micro,
          }}
        >
          <Text
            style={{
              color: Palette.cyan,
              fontFamily: Fonts.semiBold,
              fontSize: 13,
            }}
          >
            {formatPosicion(jugador.posicion)}
          </Text>
        </View>
      </View>
      {jugador.edad != null ? (
        <Text style={{ color: Palette.textSecondary, fontSize: 14 }}>
          {jugador.edad} años
        </Text>
      ) : null}
    </View>
  );
}

function EquiposSection({ jugador }: { jugador: Jugador }) {
  const guard = useNavGuard();
  const equipos = jugador.equipos ?? [];
  if (equipos.length === 0) return null;
  return (
    <View
      style={{
        backgroundColor: Palette.surface,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Palette.border,
        padding: Pad.base,
        gap: Gap.md,
      }}
    >
      <Text
        style={{ color: Palette.text, fontFamily: Fonts.display, fontSize: 16 }}
      >
        Dorsales por equipo
      </Text>
      {equipos.map((eq) => (
        <TouchableOpacity
          key={eq.equipoId}
          activeOpacity={0.8}
          onPress={() =>
            guard(() =>
              router.push({
                pathname: "/(drawer)/(public)/equipo/[id]",
                params: { id: eq.equipoId },
              })
            )
          }
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: Gap.sm,
            backgroundColor: Palette.surfaceLight,
            borderRadius: Radius.md,
            padding: Pad.sm,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: Palette.cyan10,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: Palette.cyan,
                fontFamily: Fonts.displayBold,
                fontSize: 12,
              }}
            >
              #{eq.dorsal}
            </Text>
          </View>
          <Text
            style={{ color: Palette.text, fontFamily: Fonts.semiBold, flex: 1 }}
          >
            {eq.equipo?.nombre ?? eq.equipoId}
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={Palette.textMuted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function MyProfileScreen() {
  const toast = useToast();
  const guard = useNavGuard();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const user = session?.user;
  const phone = (user as any)?.phoneNumber;
  const phoneVerified = (user as any)?.phoneNumberVerified;
  const canQuery = !sessionPending && !!phone && !!phoneVerified;
  const {
    data: jugador,
    isLoading,
    error,
    refetch: refetchMyProfile,
  } = useMyProfile(canQuery);
  const { data: logros = [] } = useCampeonatosJugador(jugador?.id, canQuery);
  const updateProfile = useUpdateMyProfile();
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const createBtnRef = useRef<any>(null);
  const editBtnRef = useRef<any>(null);
  const profileCardRef = useRef<any>(null);
  const phoneRef = useRef<any>(null);
  const teamsRef = useRef<any>(null);
  const scrollRef = useRef<any>(null);
  const scrollOffsetRef = useRef(0);
  const createTourStartedRef = useRef(false);
  const manageTourStartedRef = useRef(false);
  const [profileCardReady, setProfileCardReady] = useState(false);
  const [phoneReady, setPhoneReady] = useState(false);
  const [teamsReady, setTeamsReady] = useState(false);

  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { startTour } = useTourGuide();

  const managementTargetsReady = profileCardReady && phoneReady && teamsReady;

  useEffect(() => {
    if (!isFocused || sessionPending || isLoading || error) return;

    if (!jugador) {
      if (createTourStartedRef.current) return;
      const init = async () => {
        const seen = await tourYaCompletado("player-profile-create-v1");
        if (seen) {
          createTourStartedRef.current = true;
          return;
        }
        if (!createBtnRef.current) return;
        createTourStartedRef.current = true;
        startTour(
          [
            {
              id: "player-profile-create",
              targetRef: createBtnRef,
              title: "Crea tu perfil de jugador",
              description:
                "Crea tu perfil para aparecer en los equipos y ligas donde participes.",
              spotlightPadding: 8,
              tooltipPosition: "bottom",
            },
          ],
          tourConfig({ tourId: "player-profile-create-v1", insets }),
        );
      };
      init();
    } else {
      if (manageTourStartedRef.current) return;
      if (
        !editBtnRef.current ||
        !profileCardRef.current ||
        !phoneRef.current ||
        !teamsRef.current ||
        !managementTargetsReady
      )
        return;
      const init = async () => {
        const seen = await tourYaCompletado("player-profile-management-v1");
        if (seen) {
          manageTourStartedRef.current = true;
          return;
        }
        manageTourStartedRef.current = true;
        const teamStep: TourStep =
          jugador.equipos && jugador.equipos.length > 0
            ? {
                id: "profile-teams",
                targetRef: teamsRef,
                title: "Tus equipos",
                description:
                  "Toca un equipo para ver su detalle, divisiones y resultados.",
                spotlightPadding: 8,
                tooltipPosition: "top",
              }
            : {
                id: "profile-teams",
                targetRef: teamsRef,
                title: "Tus equipos",
                description:
                  "Cuando un equipo te agregue, aparecerá aquí con su nombre y dorsal.",
                spotlightPadding: 8,
                tooltipPosition: "top",
              };
        startTour(
          [
            {
              id: "profile-detail",
              targetRef: profileCardRef,
              title: "Tu perfil de jugador",
              description:
                "Revisa tu foto, nombre y posición. Tus dorsales se muestran por separado en cada equipo.",
              spotlightPadding: 8,
              tooltipPosition: "bottom",
            },
            {
              id: "profile-edit",
              targetRef: editBtnRef,
              title: "Actualiza tu perfil",
              description:
                "Cambia tu foto, nombre, posición y demás datos personales.",
              spotlightPadding: 8,
              tooltipPosition: "bottom",
            },
            {
              id: "profile-phone",
              targetRef: phoneRef,
              title: "Controla tu privacidad",
              description:
                "Decide si tu teléfono aparece en el detalle público de tu perfil.",
              spotlightPadding: 8,
              tooltipPosition: "top",
            },
            teamStep,
          ],
          tourConfig({
            tourId: "player-profile-management-v1",
            insets,
            getCurrentScrollOffset: () => scrollOffsetRef.current,
          }),
        );
      };
      init();
    }
  }, [
    isFocused,
    sessionPending,
    isLoading,
    error,
    jugador,
    startTour,
    insets,
    managementTargetsReady,
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchMyProfile();
    } finally {
      setRefreshing(false);
    }
  };

  const handleTogglePhoneVisibility = useCallback(async () => {
    if (!jugador) return;
    const next = !jugador.showPhoneInPublicProfile;
    setSavingVisibility(true);
    try {
      await updateProfile.mutateAsync({ showPhoneInPublicProfile: next });
      toast.success(next ? "Teléfono visible" : "Teléfono oculto");
    } catch {
      toast.error("Error al cambiar la visibilidad");
    } finally {
      setSavingVisibility(false);
    }
  }, [jugador, updateProfile, toast]);

  if (sessionPending || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Mi perfil" />
        <LoadingScreen />
      </View>
    );
  }

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Palette.black,
          justifyContent: "center",
          alignItems: "center",
          padding: Pad.xl,
        }}
      >
        <Text
          style={{
            color: Palette.textMuted,
            fontSize: 16,
            textAlign: "center",
          }}
        >
          Inicia sesión para ver tu perfil
        </Text>
      </View>
    );
  }

  if (!phone || !phoneVerified) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Mi perfil" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: Pad.xl,
            gap: Gap.lg,
          }}
        >
          <MaterialIcons name="phone" size={56} color={Palette.textMuted} />
          <Text
            style={{
              color: Palette.text,
              fontSize: 18,
              fontFamily: Fonts.display,
              textAlign: "center",
            }}
          >
            Vincula y verifica tu teléfono
          </Text>
          <Text
            style={{
              color: Palette.textSecondary,
              fontSize: 14,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Necesitas un teléfono verificado en tu cuenta para crear un perfil
            de jugador.
          </Text>
          <TouchableOpacity
            onPress={() => guard(() => router.push("/(drawer)/account"))}
            style={{
              backgroundColor: Palette.cyan,
              borderRadius: Radius.md,
              paddingVertical: Pad.md,
              paddingHorizontal: Pad.xl,
            }}
          >
            <Text
              style={{
                color: Palette.black,
                fontFamily: Fonts.semiBold,
                fontSize: 15,
              }}
            >
              Ir a Cuenta
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!jugador) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.black }}>
        <CustomHeader title="Mi perfil" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: Pad.xl,
            gap: Gap.lg,
          }}
        >
          <MaterialIcons
            name="sports-soccer"
            size={56}
            color={Palette.textMuted}
          />
          <Text
            style={{
              color: Palette.text,
              fontSize: 18,
              fontFamily: Fonts.display,
              textAlign: "center",
            }}
          >
            Crea tu perfil de jugador
          </Text>
          <Text
            style={{
              color: Palette.textSecondary,
              fontSize: 14,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Tu perfil aparecerá en los equipos y ligas donde juegues. Si ya te
            registraron con tu teléfono, lo vincularemos automáticamente.
          </Text>
          <TouchableOpacity
            ref={createBtnRef}
            onPress={() =>
              guard(() => router.push({ pathname: "/(drawer)/my-profile/form" }))
            }
            style={{
              backgroundColor: Palette.cyan,
              borderRadius: Radius.md,
              paddingVertical: Pad.md,
              paddingHorizontal: Pad.xl,
            }}
          >
            <Text
              style={{
                color: Palette.black,
                fontFamily: Fonts.semiBold,
                fontSize: 15,
              }}
            >
              Crear perfil
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Palette.black }}>
      <CustomHeader
        title="Mi perfil"
        rightActions={[
          {
            icon: "edit",
            onPress: () =>
              guard(() => router.push({ pathname: "/(drawer)/my-profile/form" })),
            bg: Palette.cyan,
            color: Palette.black,
            ref: editBtnRef,
          },
        ]}
      />
      <PullToRefresh
        refreshing={refreshing}
        onRefresh={handleRefresh}
        scrollRef={scrollRef}
        onScroll={(e) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
        }}
      >
        <View style={{ padding: Pad.xl, gap: Gap.lg, paddingBottom: 48 }}>
          <View ref={profileCardRef} onLayout={() => setProfileCardReady(true)}>
            <ProfileCard jugador={jugador} />
          </View>

          <View
            ref={phoneRef}
            onLayout={() => setPhoneReady(true)}
            style={{
              backgroundColor: Palette.surface,
              borderRadius: Radius.xl,
              borderWidth: 1,
              borderColor: Palette.border,
              padding: Pad.base,
              gap: Gap.sm,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: Palette.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Teléfono en público
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: Palette.textMuted,
                    marginTop: Gap.micro,
                  }}
                >
                  {jugador.showPhoneInPublicProfile
                    ? "Visible en el detalle público de jugador."
                    : "Oculto en el detalle público de jugador."}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleTogglePhoneVisibility}
                disabled={savingVisibility}
                style={{
                  backgroundColor: jugador.showPhoneInPublicProfile
                    ? Palette.danger10
                    : Palette.cyan10,
                  borderWidth: 1,
                  borderColor: jugador.showPhoneInPublicProfile
                    ? Palette.danger
                    : Palette.cyan,
                  borderRadius: Radius.md,
                  paddingHorizontal: Pad.md,
                  paddingVertical: Pad.sm,
                  minWidth: 118,
                  alignItems: "center",
                  opacity: savingVisibility ? 0.45 : 1,
                }}
              >
                {savingVisibility ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      jugador.showPhoneInPublicProfile
                        ? Palette.danger
                        : Palette.cyan
                    }
                  />
                ) : (
                  <Text
                    style={{
                      color: jugador.showPhoneInPublicProfile
                        ? Palette.danger
                        : Palette.cyan,
                      fontSize: 12,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    {jugador.showPhoneInPublicProfile ? "Ocultar" : "Mostrar"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <PlayerAchievementsCard logros={logros} />

          <View ref={teamsRef} onLayout={() => setTeamsReady(true)}>
            {jugador.equipos && jugador.equipos.length > 0 ? (
              <EquiposSection jugador={jugador} />
            ) : (
              <View
                style={{
                  backgroundColor: Palette.surface,
                  borderRadius: Radius.xl,
                  borderWidth: 1,
                  borderColor: Palette.border,
                  padding: Pad.xl,
                  alignItems: "center",
                  gap: Gap.sm,
                }}
              >
                <MaterialIcons
                  name="groups"
                  size={32}
                  color={Palette.textMuted}
                />
                <Text
                  style={{
                    color: Palette.textMuted,
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  Aún no perteneces a ningún equipo. Cuando un equipo te
                  agregue, aparecerá aquí.
                </Text>
              </View>
            )}
          </View>
        </View>
      </PullToRefresh>
    </View>
  );
}
