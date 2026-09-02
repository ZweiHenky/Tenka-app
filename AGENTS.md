## Package manager

Uses **npm** (see `package-lock.json`). Do not use pnpm/yarn. All scripts and commands must be run with `npm`.

> ⚠️ El **frontend** usa **npm**. No usar pnpm ni yarn.

# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Commands

| Action | Command |
|--------|---------|
| Start dev | `npm start` |
| Android | `npm run android` |
| iOS | `npm run ios` |
| Web | `npm start --web` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) |
| Tests | `npm test` (Vitest) |

## Dependencies principales

| Librería | Uso |
|----------|-----|
| `expo@57` + `react-native@0.86` | Framework (Android es **edge-to-edge**) |
| `expo-router` | File-based routing (drawer + stack) |
| `better-auth` + `@better-auth/expo` | Auth (Google, Apple, phone OTP) |
| `@tanstack/react-query@5` | Server state (queries + mutations) |
| `zustand@5` | Client state (6 stores) |
| `@wrack/react-native-tour-guide` | Tours de onboarding (primera vez por pantalla) |
| `react-native-country-picker-modal` | Selector de país para teléfono |
| `react-native-google-places-textinput` | Location picker |
| `react-native-qrcode-svg` + `expo-camera` | QR (generación y escaneo) |
| `expo-image-picker` | Selección de imágenes |
| `expo-print` / `expo-sharing` | Generación y compartición de PDF |
| `expo-apple-authentication` | Sign in with Apple |
| `@gorhom/bottom-sheet` + `AppBottomSheetModal` | Bottom sheets |
| `react-native-keyboard-controller` | Manejo de teclado (KeyboardAwareScrollView) |
| `@react-native-async-storage/async-storage` | Zustand persist |
| `expo-secure-store` | Token storage (Better Auth) |
| `@expo-google-fonts/inter` / `sora` / `space-grotesk` | Tipografía |
| `nativewind` + `tailwindcss` | Utilidades de estilo |
| `axios` | HTTP client con interceptors |
| `react-native-onesignal` + `onesignal-expo-plugin` | Push notifications con OneSignal en Expo development/native build |

## Rules

- No instalar dependencias sin permiso explícito
- Skills instaladas: React Native (Expo), Better Auth, Zustand
- Arquitectura: `app/`, `infrastructure/`, `domain/`, `features/`, `stores/`, `shared/`, `constants/`
- Router por archivos (Expo Router) con route groups: `(drawer)/`, `(auth)/`, `(public)/`
- No modificar configuraciones del proyecto (`app.json`, `babel.config.js`, `metro.config.js`, etc.) sin permiso

## Architecture

```
src/
  app/                    # Expo Router screens
    _layout.tsx           # Root layout: GestureHandler + QueryClient + fonts
    index.tsx             # Redirect a /(drawer)
    (drawer)/             # Drawer navigation
      _layout.tsx         # Drawer layout + custom content
      index.tsx           # Home / feed de ligas públicas
      my-profile/         # Perfil de jugador ("Mi perfil")
        index.tsx         # Datos del jugador + equipos + privacidad del teléfono
        form.tsx          # Crear/editar perfil de jugador
      team/               # Mis equipos (folder)
        index.tsx         # CRUD de equipos
        team-form.tsx     # Form de equipo
        [id].tsx          # Detalle del equipo + divisiones + jugadores
        [id]/divisions/[divisionId].tsx  # División del equipo (detalle)
      player/             # Detalle de jugador (oculto del drawer)
        [id].tsx
      (public)/           # Vistas públicas sin login (oculto del drawer)
        liga/[id].tsx              # Detalle público de liga (posiciones/horario/goleo)
        equipo/[id].tsx            # Detalle público de equipo (jugadores/divisiones)
        equipo/[id]/division/[divisionId].tsx
        jugador/[id].tsx           # Detalle público de jugador
      leagues/            # Mis ligas (folder + stack)
        index.tsx         # CRUD de ligas
        league-form.tsx   # Form de liga (crear/editar)
        [id]/index.tsx    # Detalle de liga + CRUD de divisiones
        [id]/division-form.tsx     # Form de división (crear/editar)
        [id]/manage.tsx   # Gestión de divisiones
        [id]/divisions/[divisionId].tsx          # Hub de división
        [id]/divisions/[divisionId]/partidos/[partidoId].tsx  # Detalle/resultado de partido
        [id]/divisions/[divisionId]/jornadas/[jornadaId].tsx  # Resultados de jornada
        [id]/divisions/[divisionId]/teams/[teamId].tsx        # Equipo dentro de división
      account/            # Cuenta (auth/sesión)
        index.tsx         # Datos de sesión, rol, teléfono, cerrar sesión
        edit.tsx          # Editar teléfono con OTP (+ reenvío)
      support.tsx         # Ayuda/FAQ
    (public)/
      _layout.tsx
      arbitro/index.tsx   # Captura arbitral por token (deep link #token)
    (auth)/
      _layout.tsx
      sign-in.tsx         # Google/Apple sign-in
  infrastructure/         # External services
    config/env.ts         # Env vars (API_URL, GOOGLE_PLACES_API_KEY, ONESIGNAL_APP_ID)
    auth/client.ts        # Better Auth client con expo plugin
    auth/errors.ts        # Mapeo de códigos de error de auth → mensajes
    api/client.ts         # Axios instance con auth interceptor
    api/withNetworkRetry.ts  # Reintento con backoff ante fallos de red
    cloudinary/upload.ts  # Image upload a Cloudinary
    notifications/NotificationBootstrap.tsx # Inicializa OneSignal, login por user.id, click handlers
    notifications/notificationIdentity.ts   # Identidad push por sesión
  domain/                 # Domain interfaces
    interfaces/
      user.ts             # User interface
      league.ts           # League, Division, CreateDivisionInput, etc.
      team.ts             # Team interface
      player.ts           # Jugador, PosicionJugador, CreateJugadorInput, etc.
  features/               # Feature modules
    auth/                 # Auth components/hooks
    league/               # Liga api, hooks, components (incl. court-config utils)
    division/             # División api, hooks, components
    division-equipo/      # Pivot api, hooks
    team/                 # Equipo api, hooks, components
    jornada/              # Jornada api, hooks, components (PDF)
    partido/              # Partido api, hooks, scoring, referee client
    tabla-posicion/       # Standings api, hooks, components
    ronda-playoff/        # Playoff api, hooks, components
    jugador/              # Jugador api, hooks, components (incl. "mi perfil")
    goleador/             # Goleadores api, hooks, components
    arbitraje/            # Árbitros api, hooks, tab, PDF
    court-availability/   # Disponibilidad de canchas (planner)
    player/               # PlayerDetailScreen (detalle de jugador)
    profile/              # ProfileStore (zustand)
    notification/         # Suscripciones a notificaciones (subscriptionFlow)
    users/                # userApi (rol liga, visibilidad teléfono)
  stores/                 # Zustand stores
    themeStore.ts         # Theme toggle (light/dark/system)
    team-store.ts         # Local team seed data
    ligaFavoritaStore.ts  # Favorites (persisted)
    divisionSchedule.ts   # Schedule slots (persisted, most complex)
    divisionNotificationStore.ts # Suscripción a notificaciones por división
    refereeAssignments.ts # Asignaciones de árbitros
  shared/                 # Reusable components & utils
    components/           # PullToRefresh, CrudModal, Toast, CustomHeader, etc.
    hooks/                # useDebounce
    utils/                # resolve-lookup, parse-dias-partido, playoff-finalization, time-range,
                          # time-occupancy (única fuente de "¿hora libre?"), print-pdf
  constants/
    theme.ts              # Palette, Fonts, Pad, Gap, Radius, spacing
```

## Navigation

```
Root Stack
  index → redirect /(drawer)
  (drawer) → Drawer Navigator
    index            Home / Feed de ligas públicas
    my-profile       Mi perfil de jugador (+ form)
    team             Mis equipos (CRUD + detalle + divisiones)
    player           Detalle de jugador (oculto del drawer)
    (public)         Vistas públicas liga/equipo/jugador (oculto del drawer)
    leagues → Stack  Mis ligas
      index                    CRUD de ligas
      [id]/index               Detalle de liga + divisiones
      [id]/manage              Gestión de divisiones
      [id]/divisions/[divisionId]          Hub de división
      [id]/divisions/[divisionId]/jornadas/[jornadaId]  Resultados de jornada
      [id]/divisions/[divisionId]/partidos/[partidoId]  Detalle/resultado de partido
    account          Cuenta (sesión, teléfono con OTP, cerrar sesión)
    support          Ayuda/FAQ
  (public) → Stack
    arbitro/index    Captura arbitral por token (#token en deep link)
  (auth) → Stack
    sign-in          Google / Apple
```

## App Screens

| Ruta | Propósito |
|------|-----------|
| `(drawer)/index.tsx` | Home: buscador + filtros + favoritos + feed de ligas públicas |
| `(drawer)/my-profile/index.tsx` | Perfil de jugador: foto, posición, dorsal, equipos, privacidad del teléfono. Pull-to-refresh. |
| `(drawer)/my-profile/form.tsx` | Crear/editar perfil de jugador (nombre, posición, foto, edad) |
| `(drawer)/team/index.tsx` | CRUD de equipos del usuario, QR por equipo |
| `(drawer)/team/[id].tsx` | Detalle de equipo: jugadores + divisiones |
| `(drawer)/player/[id].tsx` | Detalle de jugador (privado, oculto del drawer) |
| `(drawer)/(public)/liga/[id].tsx` | Detalle público de liga: posiciones / horario / goleo + favorito + notificarme |
| `(drawer)/(public)/equipo/[id].tsx` | Detalle público de equipo: jugadores / divisiones |
| `(drawer)/(public)/jugador/[id].tsx` | Detalle público de jugador |
| `(drawer)/leagues/index.tsx` | CRUD de ligas con logo, cancha, ubicación |
| `(drawer)/leagues/[id]/index.tsx` | Detalle de liga + CRUD de divisiones |
| `(drawer)/leagues/[id]/divisions/[divisionId].tsx` | Hub de división: info, Publicar/Regresar/Reiniciar, equipos, jornadas, playoffs |
| `(drawer)/leagues/[id]/divisions/[divisionId]/jornadas/[jornadaId].tsx` | Resultados de jornada: scores, estados de partido |
| `(drawer)/leagues/[id]/divisions/[divisionId]/partidos/[partidoId].tsx` | Detalle/resultado de partido |
| `(drawer)/account/index.tsx` | Cuenta: nombre, email, rol, teléfono, activar rol liga, cerrar sesión |
| `(drawer)/account/edit.tsx` | Vincular/editar teléfono con OTP + reenvío |
| `(public)/arbitro/index.tsx` | Captura arbitral por token (deep link `#token=...`), finaliza partido con goles/penales/goleadores |
| `(auth)/sign-in.tsx` | Login con Google o Apple |

## Features

### league
- **API**: listByUser, listPaginated (filtros: search, categoriaId, tipoId, estadoLigaId), getById, create, update, delete
- **Hooks**: `useUserLeagues`, `useLeague`, `useCreateLeague`, `useUpdateLeague`, `useDeleteLeague`, `useLigasInfinitas` (paginación infinita)
- **Lookups**: `useLookups()` — 5 queries paralelas (categorias, tipos, ubicaciones, estadosLiga, tiposCompetencia) con 5min staleTime
- **Utils**: `court-config.ts` (config de canchas/planner)

### division
- **API**: listByLiga, getById, create, update, delete, reset
- **Hooks**: `useDivisions`, `useCreateDivision`, `useUpdateDivision`, `useDeleteDivision`, `useResetDivision`, `useJornadaGeneration`
- **Components**: `DivisionListCard`, `DivisionInfoCard`, `DivisionActionSheet`, `DivisionScheduleManager` (horarios), `EquiposTab`, `PosicionesTab`, `TeamListCard`, `TimeSlotCard`, `TeamPickerModal`
- **Utils**: `prepareJornadaSlots.ts` (genera slots de jornada desde horarios), `slot-day-move.ts` y `slot-court-move.ts` (ver *Mover slots*)

### division-equipo
- **API**: findByDivision, findByEquipo, create, remove
- **Hooks**: `useDivisionEquipos`, `useAssignTeam`, `useRemoveTeam`

### team
- **API**: list, getById, create, update, delete
- **Hooks**: `useTeams`, `useUserTeams`, `useCreateTeam`, `useUpdateTeam`, `useDeleteTeam`
- **Components**: `TeamCard`, `TeamDetailHeaderCard`, `DivisionTeamInfoCard`, `TeamAchievementsList`
- **Pestaña Logros**: el palmarés del equipo, en las dos fichas (pública y "mis equipos"). Sale de `GET /api/campeones/equipo/:id` y **no** de la pestaña Divisiones: esa lista viene del pivote de inscripción, así que al sacar al equipo de la división la fila desaparece aunque el campeonato siga existiendo. La fecha es `createdAt` —cuándo se coronó— y se muestra como mes y año con `formatMonthYear`, porque el día exacto fingiría una precisión que ese dato no garantiza.
- `DivisionTeamInfoCard` es solo de la pantalla privada (`team/[id]/divisions/[divisionId]`). La pública equivalente **no lleva tarjeta**: el equipo ya se identifica en el `CustomHeader` y repetirlo abajo sobraba.

### jornada
- **API**: listByDivision, listByDivisionPaginated, getById, generateNext, delete
- **Hooks**: `useJornadas`, `useJornadasInfinitas`, `useGenerateNextJornada`, `useDeleteJornada`
- **Components**: `JornadaListCard`, `PartidoCard`, `PartidoResultEditor`, `ScoreModal`, `DayGroup`
- **Utils**: `programacion-jornada-pdf.ts` (PDF imprimible de programación)

### partido
- **API**: findByRondaPlayoff, update (+ `refereeApiClient(token)` para acceso árbitro)
- **Hooks**: `usePartidos`, `useUpdatePartido`
- **Components**: `ScorerAllocationEditor` (asignación de goles a jugadores)
- **Utils**: `scoring.ts` (buildResultPayload, allocations, validaciones)

### tabla-posicion
- **API**: listByDivision
- **Hooks**: `useTablaPosiciones`
- **Components**: `StandingsTable`

### ronda-playoff
- **API**: listByDivision, create, generate, deleteByDivision
- **Hooks**: `useRondasPlayoff`, `useGenerateRondas`, `useDeleteRondasByDivision`
- **Components**: `PlayoffRoundsAccordion`, `BracketView` (árbol SVG)

### jugador
- **API** (`api/jugadores.ts`): `getMe`, `createMe`, `updateMe` (perfil "mi perfil"), `list`/`search`/`getById`/`create`/`update`/`delete`, `assignToTeam`/`removeFromTeam`, `findForTeam` (buscar por teléfono con `withNetworkRetry`), `listByDivisionTeam`, `assignToDivision`/`removeFromDivision`, `listDivisionsByPlayer`
- **Hooks** (`hooks/useJugadores.ts`): `useJugadores`, `useMyProfile`, `useCreateMyProfile`, `useUpdateMyProfile`, etc.
- **Components**: `DivisionRosterGroups`, `DivisionTeamPlayersCard`
- **Utils**: `rosterGroups.ts`, `phone.ts`
- **Datos**: el perfil "Mi perfil" se vincula al User por `phoneNumber` (requiere teléfono verificado)
- **Dorsal**: no existe un dorsal global en `Jugador`. Siempre se resuelve por `equipoId` desde `EquipoJugador`; los perfiles lo muestran en "Dorsales por equipo" y nunca deben usar `equipos[0]`. Solo el dueño del equipo lo edita desde su plantilla. La actualización sincroniza `DivisionJugador`, mientras los partidos ya capturados conservan su snapshot histórico.

### goleador
- **API** (`api/goleadores.ts`): findByDivision
- **Hooks**: `useGoleadores`
- **Components**: `GoleadoresTable` (pestaña "Goleo" en detalle público de liga)

### division-campeon
- **API** (`divisionCampeon.ts`), **hooks** (`useDivisionCampeon.ts`), `queryKeys.ts`, `CampeonBanner`
- Campeón de la división y campeón de goleo. Ver "Campeón de división".

### arbitraje
- **API** (`api.ts`), **hooks** (`hooks.ts`), `LeagueRefereeTab`, `pdf.ts`, `types.ts`, `utils.ts`
- Asignación de árbitros por liga/división

### court-availability
- `planner.ts` (lógica de planeación de canchas), `api/courtAvailability.ts`, `hooks/useCourtAvailability.ts`
- `planCourtAssignments` reparte los slots entre canchas balanceando carga, y **respeta la `canchaId` manual** — un slot con cancha activa asignada no se reubica; si choca, se reporta como conflicto (`conflictSlotIds`, borde rojo). Por eso mover un partido de cancha a mano no se deshace solo.
- `isCourtOccupiedForSlot(slot, courtId, availability, draftSlots)` consulta las **reservas reales del backend** (`availability.ocupaciones` = partidos de otras divisiones de la liga). Es la que se inyecta como predicado en los utils de mover slots.
- ⚠️ No confundir con el planner del backend: ese se eliminó por no tener llamadores. **El servidor no asigna canchas, solo valida** — la asignación se calcula aquí y se envía.

### player
- `screens/PlayerDetailScreen.tsx` — detalle de jugador (privado y reutilizado en vistas públicas)

### profile
- **Store**: `ProfileStore` (zustand) — estado de perfil local

### notification
- `notificationSubscription.ts` (API subscribe/unsubscribe), `subscriptionFlow.ts` (flujo cambio de suscripción con commit local), `notificationIdentity.ts`
- Los tags OneSignal se sincronizan con el backend (`/api/notification-subscriptions`)

### users
- `userApi`: `activateLeagueRole()`, `updatePhoneVisibility()`, `updateMe`

## Shared Components

| Componente | Descripción |
|------------|-------------|
| **`AuthGate`** | Bloquea contenido si no hay sesión, muestra botón "Iniciar sesión" |
| **`PullToRefresh`** | ScrollView (o KeyboardAware) con RefreshControl + infinite scroll; soporta `scrollRef`/`onScroll` |
| **`AppBottomSheetModal`** | Bottom sheet reutilizable (título, snapPoints, children) |
| **`ConfirmationModal`** | Confirmación genérica (mensaje + acciones) |
| **`CrudModal`** | Bottom-sheet genérico con campos, `children`, botones Cancelar/Guardar, manejo de teclado |
| **`SelectField`** | Dropdown que abre bottom-sheet con lista de opciones (id/nombre), check en seleccionado |
| **`CustomHeader`** | Barra superior con menú/back, título centrado, acciones derecha |
| **`TabBar`** | Pestañas horizontales (activa resaltada) |
| **`Toast`** | Feedback `useToast()` → `toast.success/error/info` |
| **`ErrorState`** | Icono + mensaje + botón Reintentar opcional |
| **`EmptyState`** | Icono centrado + mensaje + acción opcional |
| **`LoadingScreen`** | ActivityIndicator full-screen |
| **`LogoImage`** | Imagen circular con fallback de icono/inicial |
| **`QrCard`** | Tarjeta blanca con QR, label y hint |
| **`QRScannerModal`** | Cámara full-screen para escanear QR |
| **`LocationPickerModal`** | Google Places input en bottom-sheet |
| **`DatePicker`** | Selector día/mes/año + `DateRangePicker` |
| **`TimeRangePicker`** | Lista editable de rangos horarios (inicio-fin) |

### Nunca un scrollable de React Native dentro de `AppBottomSheetModal`

`@gorhom/bottom-sheet` necesita **sus** contenedores para cederle el gesto de scroll al
contenido. Con un `FlatList` o `ScrollView` normal adentro, el gesto se lo queda la hoja: la
arrastra en vez de desplazar la lista, y **solo se ven las filas que entran en pantalla**. No lo
atrapan ni `tsc` ni el lint, y desde el código se ve perfectamente razonable — así estuvieron
los desplegables hasta que se notó que "faltaban categorías" que en realidad estaban abajo,
inalcanzables.

| Cómo se usa la hoja | Qué va adentro |
|---|---|
| `scrollable={false}` (monta `BottomSheetView`) | `BottomSheetFlatList` con altura acotada —`flex: 1` o `maxHeight`—, que es lo que le da viewport para desplazar |
| `scrollable` por defecto (monta `BottomSheetScrollView`) | **Ningún scroll propio**: scrollea la hoja. Anidar dos scrollables los hace pelearse el gesto |

**El `snapPoints` solo manda en las hojas sin scroll propio.** La librería trae
`enableDynamicSizing` en `true`, y eso añade la altura del contenido como punto de anclaje: el
contenido puede **encoger la hoja por debajo de lo que declara**. Con un solo jugador en la lista,
el selector de participante quedaba en una franja pegada al borde inferior.

`AppBottomSheetModal` pasa `enableDynamicSizing={scrollable}`, así que:

- **Sin scroll propio** la altura pedida es la que vale, y el `BottomSheetView` lleva `flex: 1` para
  que un hijo pueda estirarse. Sin eso el contenido se apelmaza arriba y la lista no tiene contra
  qué desplazarse.
- **Con scroll propio** se conserva el ajuste al contenido, que ahí se ve bien: un desplegable de
  dos opciones no tiene por qué ocupar media pantalla.

Quitar el dimensionado dinámico solo puede hacer una hoja **más alta**, nunca más baja — el
contenido nunca superaba su `snapPoints`.

**Primero preguntá si hace falta virtualizar.** La fila de arriba es para listas que pueden ser
largas (`ParticipacionEditor` y `ScorerAllocationEditor`, que muestran plantillas de jugadores).
Un catálogo de 2 a 15 opciones no la necesita, y la altura acotada que exige es justo lo que
esconde filas: por eso `SelectField` renderiza con un `.map()` y deja que scrollee la hoja.
`TeamPickerModal`, `PlayoffTeamSelectorModal`, `TimePickerModal` y las cuatro hojas de
`DivisionScheduleManager` van por el mismo camino.

`DatePicker` es el único que no se puede desanidar: sus tres columnas necesitan scroll
independiente, así que la hoja va `scrollable={false}` y cada columna usa `BottomSheetScrollView`.

Las tiras horizontales del **cuerpo** de una pantalla (las pestañas de cancha y de día en
`DivisionScheduleManager`) sí son `ScrollView` de RN: no están dentro de una hoja.

## Shared Hooks

| Hook | Descripción |
|------|-------------|
| **`anonymousApi`** | Instancia de axios **sin la cookie de sesión**, en `src/infrastructure/api/client.ts`. Úsala en endpoints que se autentican con su propio token (el acceso de árbitro): mandar además la cookie haría que la petición llevara dos identidades, y la acción podría quedar atribuida a quien tenga la sesión abierta en el teléfono. Comparte request-id, logging y manejo de errores con `api`. |
| **`useNavGuard(ms = 600)`** | Previene doble navegación (double-tap) en `router.push`. En `src/shared/hooks/useNavGuard.ts`. Se usa como `const guard = useNavGuard()` y se envuelve cada navegación: `guard(() => router.push(...))`. Aplicado a todas las pantallas con push: Home, ligas (CRUD + división + jornadas + partidos), equipos, públicas (liga/equipo/jugador), mi perfil y cuenta. Ignora taps si el último fue hace menos de `ms`. |
| **`useDebounce`** | Debounce genérico (usado en el buscador del Home) |

## Form Unsaved-Changes Pattern

Los forms de creación/edición (`league-form.tsx`, `division-form.tsx`, `team-form.tsx`) protegen la salida con cambios sin guardar:

- Listener `navigation.addListener("beforeRemove", ...)` intercepta la navegación si `dirty` es `true` y `allowLeaveRef.current` es `false`, guarda el action en `pendingActionRef` y abre el `ConfirmationModal` "Descartar cambios".
- Al confirmar "Salir" se hace `allowLeaveRef.current = true` y se re-despacha el action.
- `BackHandler` duplica la protección para el botón físico de Android.

**Regla crítica:** tras un guardado exitoso hay que marcar `allowLeaveRef.current = true` **antes** de `router.back()`, para que el modal de descarte NO se muestre cuando el guardado ya se completó (bug corregido: el modal aparecía tras crear/guardar correctamente).

## Liga: nombre único global + manejo de 409

- El nombre de liga es **único global** (no por usuario): el backend lo normaliza (`trim + lowercase`) y valida contra la tabla `ligas`; si ya existe responde `ConflictError` 409 "Ya existe una liga con ese nombre".
- En `league-form.tsx` el 409 se detecta en el `catch` de `handleSave` (`e?.response?.status === 409`): muestra el mensaje como **error inline bajo el input "Nombre"** (borde rojo vía `Palette.danger`) además del toast, y se limpia automáticamente al editar el nombre.
- Los assets de Cloudinary subidos en un intento fallido se abandonan (`/api/media/:id/abandon`) antes de mostrar el error.

## Zustand Stores

| Store | Persist? | Estado | Métodos clave |
|-------|----------|--------|---------------|
| **`useThemeStore`** | No | `theme: "light"\|"dark"\|"system"` | `setTheme()` |
| **`useTeamStore`** | No | `teams[]`, `selectedTeam`, `isLoading` | CRUD local |
| **`useLigaFavoritaStore`** | AsyncStorage (`ligas-favoritas`) | `favoritos: LigaFavoritaItem[]` | `toggle(item)`, `esFavorito(id)` |
| **`useDivisionScheduleStore`** | AsyncStorage (`division-schedule-store`) | `schedules`, `habilitados`, `hasUnsaved` | `initSchedule`, `setSlotTeams`, `setSlotTipo`, `addSlot`, `removeSlot`, `replaceSlots`, etc. |
| **`useDivisionNotificationStore`** | AsyncStorage (`division-notifications`) | `subscriptions` | `toggle(item)`, `remove(divisionId)`, `isSubscribed(divisionId)` |
| **`useRefereeAssignments`** | AsyncStorage | asignaciones de árbitros | — |

### ligaFavoritaStore
```ts
interface LigaFavoritaItem { id: string; nombre: string; cancha: string | null; logo: string | null }
```
- `toggle(item)`: agrega si no existe, elimina si existe
- `remove(ligaId)`: elimina por id sin verificar existencia
- Uso: estrella en `PublicLeagueCard` y en detalle público `(public)/liga/[id]`
- Solo guarda acceso rápido a la liga; NO maneja notificaciones

### divisionNotificationStore
```ts
interface DivisionNotificationItem { divisionId: string; ligaId: string; ligaNombre: string; divisionNombre: string }
```
- `toggle(item)`: agrega/elimina suscripción a notificaciones de una división
- `remove(divisionId)`: elimina por id
- `isSubscribed(divisionId)`: boolean
- Botón en detalle público `(public)/liga/[id]` dentro de la tarjeta de división
- El flujo real pasa por `features/notification/subscriptionFlow.ts` (`changeDivisionSubscription`): primero llama al backend (`/api/notification-subscriptions/subscribe|unsubscribe`) con el OneSignal ID y luego hace `commitLocalState()` (persistencia local)
- Al activar: agrega tag OneSignal `division_{divisionId}=true`; al desactivar: lo remueve

### divisionScheduleStore
La store más compleja (~574 lines). Genera slots de horario desde la config de la división (diasPartido, horarioPartido, duracion, descanso). Maneja:
- Asignación de equipos a slots (local/visitante)
- Tipos de slot: regular, complemento (Puntos/Sin puntos), amistoso, eliminatoria
- Detección de conflictos
- Persistencia para evitar perder cambios no guardados

## Formato de competencia

Una división es de **liga + eliminatorias** o de **pura eliminatoria**. La regla vive en un solo
lugar: [`features/division/utils/competition-format.ts`](src/features/division/utils/competition-format.ts).

- Se decide con `TipoCompetencia.codigo` (`LIGA_Y_ELIMINATORIAS` | `ELIMINATORIA`), **nunca con
  el nombre**. Antes era `tipoCompNombre.includes("Eliminatorias")`, y como el nombre se edita por
  API bastaba renombrar el catálogo para apagar la pestaña de eliminatorias sin que nadie se enterara.
- Un código desconocido —o el catálogo todavía cargando— cae a `LIGA_Y_ELIMINATORIAS`: ante la duda
  se muestra de más, porque esconder pestañas ocultaría datos que sí existen. Por eso el tab bar
  espera a `formatoListo` en vez de dibujar el formato completo y quitarle pestañas después.
- `capabilities.tabs` define las pestañas y `activeTab` cae a la primera si la guardada no existe
  en ese formato; si no, la pantalla queda en blanco. Las queries por pestaña (`useJornadas`,
  `useTablaPosiciones`) se apagan cuando `faseLiga` es `false`.
- `DivisionScheduleManager` recibe `faseLiga`. Con `false`: `maxRegularSlots` es **0** (si no, un
  cuadro puro se llenaría solo de partidos de liga), no hay complemento ni equipo que descansa, y
  sin cuadro generado Programación muestra un estado vacío en vez de la pantalla de slots.
- **El backend no sabe de formatos.** Todo lo de eliminatorias se activa preguntando si existen
  rondas para la división. `tipoCompetencia` solo se muestra.

**El formato se fija al crear.** `buildDivisionPayload` está sobrecargado: con `isEdit: true` no
incluye `tipoCompetenciaId`, y el schema de update del backend tampoco lo declara (zod lo descarta).
La UI lo muestra en `readOnly`. Cambiarlo dejaría a la división con jornadas o rondas de un formato
que ya no aplica.

**Siembra del cuadro** (`PlayoffTeamSelectorModal`, tres pasos: cantidad → siembra → cruces):
`POSICIONES` (solo con fase de liga), `ALEATORIA` y `MANUAL`. La validación de los cruces manuales
es pura y está en [`utils/playoff.ts`](src/features/division/utils/playoff.ts)
(`validateBracketPairs`, `buildBracketPairs`, `availableTeamsForPair`) porque el repo no tiene tests
de componentes. La hoja se remonta con `key` en cada apertura en vez de resetear con un efecto.

## Tabla de goleo por división

`Division.registrarGoleo`, interruptor en el menú de opciones y **encendido por defecto**. No
confundir con `registrarParticipaciones`, que es la **alineación**: lo único que le hacía al goleo
era acotar la lista de goleadores a quien estuviera en ella.

Apagado esconde tres cosas: la pestaña **Goleo** en admin (`divisionTabs`), la pestaña **Goleo**
pública (`publicDivisionTabs`, tercer argumento) y el **editor de goleadores** en la pantalla de
resultado y en la del árbitro.

**Se lee siempre con `!== false`, nunca con `=== true`.** Una respuesta vieja sin el campo no debe
apagar el goleo; el argumento de `publicDivisionTabs` también tiene `= true` por defecto. Es la misma
política que `formatFromCodigo`: ante la duda se muestra de más.

**Congelar, no esconder, cuando hay historial.** `hasGoleadores = registrarGoleo ||
hayGoleadoresCapturados(partido.anotaciones)`: con goles ya capturados el editor se sigue dibujando
pero `disabled`. Sin eso quedarían invisibles e incorregibles. Es el mismo trato que
`hasParticipantes` le da a las alineaciones. Y `expandedSection` tiene que poder arrancar en `null`,
o abriría una sección que no existe.

**No midas ese historial con `anotaciones.length`.** El servidor escribe filas **sin dueño**
(`jugadorId` nulo) para que la suma de anotaciones cuadre con el marcador, y lo hace **también con el
goleo apagado** (`resultWriter`, rama `!goleoActivo`). Contarlas hacía aparecer el editor de
goleadores en cada partido guardado con el interruptor en off. La pregunta correcta es
[`hayGoleadoresCapturados`](src/features/partido/scoring.ts), que reusa el filtro de
`allocationsFromAnnotations` (`jugadorId` presente y `cantidad > 0`). La usan el editor de resultado
y las **dos** decisiones de la pantalla del árbitro; el error estaba copiado en los tres sitios.

**`divisionTabs` recibe el arreglo, no el objeto de capacidades.** Pasarle `capabilities` entero
hacía que el compilador de React asumiera que la función podía mutarlo. Y su resultado va en un
`useMemo` **no por rendimiento**: el arreglo vive desde el tope de la pantalla hasta el TabBar, y sin
ámbito propio engloba al `useMemo` de los pasos del tour, que entonces el compilador no puede
preservar. Los dos son errores de `react-hooks/preserve-manual-memoization`, no de tipos.

## Campeón de división

Cerrar una división le pone **equipo campeón** y, si hay tabla de goleo, **campeón de goleo**. Solo
esos dos: no hay subcampeón, ni tercer lugar, ni premios a nivel liga.

La lógica decidible vive en [`features/division/utils/campeon.ts`](src/features/division/utils/campeon.ts),
porque el repo no tiene tests de componentes:

| | |
|---|---|
| `ladoGanador(partido)` | Goles, y penales al empate. `null` si el partido no terminó o el empate no tiene penales — un cuadro mal capturado no debe inventar un ganador. **`BracketView` la importa**; antes tenía su propia copia inline. |
| `ultimaRonda` / `cuadroCompleto` | La final es la ronda de `orden` **máximo**, no la que se llama "Final": ese nombre es editable por API. |
| `campeonSugerido` | El ganador de la final. `null` si esa ronda tiene más de un partido: sin final única no hay un campeón del que hablar. |
| `goleadorSugerido` | La primera fila con `jugadorId`; las de jugadores borrados no se pueden premiar y el servidor las rechaza. |

**Es una sugerencia, no una decisión.** El selector llega con el ganador preseleccionado y un chip
"Sugerido", pero el dueño puede cambiarlo: descalificaciones, o torneos resueltos fuera de la app.

**La acción vive en `DivisionActionSheet`** y solo se dibuja con `cuadroCompleto` — ofrecerla antes
solo llevaría al 422 del servidor, igual que el botón de generar el cuadro no aparece sin equipos.
"Quitar campeón" va en la Zona de riesgo.

**`CampeonSelectorModal`** es un wizard equipo → goleo, con `.map()` y sin scrollable propio. El paso
de goleo **no existe** si no hay filas premiables, y trae "Omitir". Ojo: mientras la tabla de goleo
está en vuelo `premiables` está vacío y el paso se saltaría por accidente, así que los equipos no se
pueden tocar hasta que llega; la query se precarga al abrir el menú de opciones. La hoja se remonta
con `key` en cada apertura, como la de eliminatorias.

**`CampeonBanner`** usa `workspace-premium`, **no `emoji-events`**: la copa ya decora la celda
"Competencia", los encabezados de posiciones y goleo, y el botón de generar el cuadro. Aparece arriba
del cuadro en la pestaña Eliminatoria, privada y pública.

**En la ficha pública del equipo** (`(public)/equipo/[id].tsx`, pestaña Divisiones) cada fila lleva un
chip dorado si ese equipo ganó esa división. No hace falta pedir nada extra: la fila ya nombra la
liga, y `divisionEquipo.findByEquipo` trae `division.campeon` con los ids.

**El palmarés es historia.** Una división acumula N títulos, uno por temporada.

- **Generar un cuadro nuevo archiva el vigente** (temporada nueva). Borrar el cuadro **no lo toca**: sigue vigente para poder corregirlo con "Quitar campeón". **Reiniciar también archiva**, funciona con la división Finalizada y la devuelve a En Curso. Borrar la división deja los títulos huérfanos, legibles por sus snapshots.
- **El campeón de goleo es la misma fila que el de equipo**, así que hereda todo lo anterior sin código propio. Se ve en `PlayerAchievementsCard`, montada en `PlayerDetailScreen` —que cubre la ficha pública y la privada— y en `my-profile`, que es una pantalla aparte.
- Por eso `useGenerateRondas` limpia `division-campeon` e invalida `campeones-historial`, y `useDeleteRondasByDivision` **ya no** toca el campeón. Con el `staleTime` de 5 minutos, equivocarse aquí deja el banner mostrando al campeón de la temporada pasada.
- La pestaña pública **Eliminatoria** no muestra el historial: contiene el cuadro y, si existe, el `CampeonBanner` vigente. El palmarés histórico se consulta desde los perfiles de equipos y jugadores.
- El distintivo de campeón en la ficha del equipo mira `division.campeones`, un arreglo, e incluye los archivados: el equipo ganó esa división aunque después se rehiciera el cuadro.

## Horario por cancha

Una división define **días y horario por cada cancha** donde juega; `duracionPartido` y `descanso` siguen siendo de la división. Una cancha **sin configurar** significa que esa división no juega ahí.

**La regla de resolución vive en un solo lugar:** [`features/division/utils/division-schedule.ts`](src/features/division/utils/division-schedule.ts), espejo del backend (`utils/divisionSchedule.ts`):

| Caso | Resultado |
|---|---|
| Sin canchas (liga de cancha única) | Una entrada `undefined` con los escalares |
| Con filas (`division.canchaHorarios`) | Una entrada por cancha configurada y activa |
| Sin filas | Fallback legacy: **todas** las canchas activas heredan los escalares |

- `resolveCourtSchedules(division, canchas)` — el mapa completo. **Es la única función que decide dónde juega una división.**
- `scheduleForCourt(division, canchas, canchaId)` — el horario de una cancha; cae al resumen si esa cancha no está configurada.
- `unionOfPlayDays(division)` — los días que juega en algún lado, para las pestañas de día.

⚠️ `division.diasPartido`/`horarioPartido` son el **resumen (unión)** que mantiene el backend. Nunca los uses para decidir si un partido cabe en una cancha: son un superconjunto y colocarían partidos donde el backend los rechaza.

**La lógica del formulario es pura y está testeada** en [`features/division/utils/division-form.ts`](src/features/division/utils/division-form.ts): `hydrateDivisionForm`, `validateDivisionForm`, `buildDivisionPayload` y `perCourtRows`. El componente solo tiene estado y UI — si cambias reglas de validación o la forma del payload, van ahí y con test.

**Formulario** (`division-form.tsx`): interruptor "mismo horario en todas las canchas" (encendido por defecto, se comporta como antes y guarda los escalares). Al apagarlo aparece una tarjeta por cancha con switch "juega aquí" + días + horario, y se guardan las filas en `horariosPorCancha`. En edición, volver a "mismo horario" manda `horariosPorCancha: []` para borrar las filas.

**Validar días *y* horas por cancha.** `availableTimesForDay` recibe un `diasPartido?: DiasSource` opcional y devuelve `[]` si esa cancha no juega esa fecha. Como `preferredTimeForDay`, `placementForDay` y `timeForCourt` delegan en ella, **ese único chequeo cubre los tres**. Sin el parámetro no hay restricción, así que un caller que lo olvide puede colocar un partido en un día que la cancha no juega y la jornada falla al generar con `La división no juega ese día en la cancha "X"`.

**`visibleCourts`, no `canchas`.** En `DivisionScheduleManager` las pestañas de cancha, el filtro activo y la hoja "Seleccionar cancha" usan `visibleCourts` = las canchas configuradas **más** cualquiera que ya tenga slots (para no volver invisible un partido heredado). Y `showCanchaPicker` exige `visibleCourts.length > 1`: con una sola cancha usable no hay nada que elegir, así que no se muestran pestañas ni el botón de cancha en cada slot.

**Respetar el opt-out en la UI.** Todo lo que ofrezca canchas debe acotarse a `courtSchedules` (las que la división juega), no a `canchas` (las de la liga). Si no, el partido se coloca, se ve bien y **la jornada falla al generar** con `no está configurada para jugar en la cancha "X"`. Aplica a `courtOrder` (fallback de "Cambiar día" y agregar slot), a la cancha preferida de `handleAddSlot` y a la hoja "Seleccionar cancha" (ahí las no configuradas se muestran **deshabilitadas** con `· No configurada`, no ocultas, porque un slot que ya esté en una necesita poder salir). Las pestañas de cancha usan `visibleCourts` (ver arriba): configuradas más las que ya tengan slots.

**Las vistas públicas eligen la cancha, no muestran la unión.** `division.diasPartido` /
`horarioPartido` son el resumen: "sáb, dom · 08:00-22:00" puede ser una cancha que solo juega
sábado de 8 a 12 y otra que solo juega domingo de 18 a 22, y nadie juega ese rango completo. La
tarjeta de la lista y el detalle público resuelven las celdas con
[`selectedCourtSchedule`](src/features/division/utils/court-schedule-selection.ts) y dejan elegir con
`CourtSchedulePicker`, que se dibuja solo con dos o más canchas (con una muestra su nombre, y con
cero no aparece: ahí los escalares ya son el horario real). `CourtScheduleLines` —la lista completa—
queda para `DivisionInfoSheet`, que es un panel de consulta y no una superficie para hojear. El selector va **debajo de Equipos y Arbitraje**: esos dos no dependen de la cancha, y ponerlo arriba sugería que filtraba toda la ficha.

**Goleo** solo si la división lo tiene encendido — ver "Tabla de goleo por división".

**Las pestañas públicas salen de `publicDivisionTabs`** ([features/division/utils/competition-format.ts](src/features/division/utils/competition-format.ts)): **Posiciones** solo con fase de liga —en un cuadro puro la tabla nunca se llena, porque `recalcular` excluye los partidos de eliminatoria— y **Eliminatoria** solo cuando hay partidos en el cuadro. El historial de títulos no habilita esa pestaña. Si la pestaña guardada o enlazada no está disponible, cae a Info.

**"Hay cuadro" se mide por partidos, no por rondas**, y con una sola función: `hayPartidosDeEliminatoria`. Una ronda puede quedar creada y vacía, y eso dibujaba la pestaña sobre un cuadro que no existe. La comparten las **dos** pantallas: la administrativa mostraba la eliminatoria siempre y la pública contaba rondas, así que cada una decidía distinto.

**Esconderla no deja nada inalcanzable**: "Generar eliminatorias" y "Eliminar eliminatorias" viven en `DivisionActionSheet`, no solo en el estado vacío de la pestaña. Por lo mismo, al borrar el cuadro la pantalla manda a Jornadas —o a Programación en un cuadro puro—, nunca de vuelta a Eliminatoria.

**`useRondasPlayoff` no puede estar atada a su pestaña**, en ninguna de las dos pantallas: su resultado es lo que decide si la pestaña existe, así que condicionarla a `activeTab === "eliminatorias"` es circular y aterrizar en otra pestaña no la dispararía nunca. Va atada al foco. El salto a la pestaña después de generar el cuadro sí se cura solo: `tab` conserva el valor y `activeTab` lo toma en cuanto llegan los partidos.

**Borrar rondas deja jornadas vacías si no se limpian.** `Partido` cascadea desde `RondaPlayoff` **y** desde `Jornada`, así que borrar el cuadro se lleva sus partidos pero deja viva la jornada que los contenía. En una división de puro cuadro esa jornada no tenía nada más y queda en cero, visible en el horario. Y hay una **segunda clase de escombro**: con el bracket activo, `prepareJornadaSlots` manda como amistoso todo slot que no sea de eliminatoria, así que una jornada generada durante las eliminatorias queda con puros amistosos que nadie jugó — no está vacía, pero tampoco tiene nada aprovechable. Por eso `delete` y `deleteByDivision` llaman a `deleteJornadasSinContenido` dentro de la misma transacción, que borra la jornada cuando **ningún** partido suyo es de otro tipo ni está finalizado. La jornada de una liga sobrevive en cuanto tiene un regular o un complemento —los que dan puntos— o cualquier partido con resultado capturado. Del lado del cliente, `useDeleteRondasByDivision` invalida `jornadas`, `jornadas-infinitas` y `last-jornada`: con el `staleTime` de 5 minutos, si no, la app muestra jornadas que ya no existen.

**La página pública se ve igual para todos.** `findVisibleById` filtra las divisiones con `PUBLIC_DIVISION_WHERE` también para el dueño: si le mostrara sus borradores no habría forma de comprobar qué ve el público. El dueño **sí** conserva la rama en el `where` de la liga, así que puede abrirla aunque no tenga ninguna división publicada — la ve vacía. El administrador mantiene visibilidad completa.

**Corolario: la pantalla administrativa NO puede leer `league.divisiones`.** Ese arreglo sale del
mismo `findVisibleById`, así que llega ya filtrado y una división recién creada —que nace en
`BORRADOR`— queda invisible justo donde hay que publicarla. El detalle administrativo
(`leagues/[id]/index.tsx`) usa **`useDivisions(id, isFocused)`**, que pega a
`GET /api/divisiones/por-liga/:ligaId` y resuelve con `visibleDivisionWhere(actor)`: esa sí le suma
al dueño las suyas. El resto de la pantalla (canchas, árbitros, reglas) sigue saliendo de
`useLeague`.

El arreglo va en el cliente y no en el servidor porque la vista pública usa **el mismo** endpoint:
aflojar `findVisibleById` para el dueño destaparía los borradores en la página pública. Volver a
`league.divisiones` "para ahorrarse una consulta" reintroduce el bug, y **no lo atrapan ni `tsc` ni
el lint** — los dos arreglos tipan igual.

**El reparto automático se acota a `playableCourtIds`.** `planCourtAssignments` acepta `assignableCourtIds`, que filtra **solo** las candidatas del reparto automático; el mapa de ocupación sigue leyendo todas las canchas para que un slot puesto a mano en una cancha ajena siga reportando su choque en vez de volverse invisible. `DivisionScheduleManager` deriva `playableCourtIds = courtSchedules.size > 0 ? [...courtSchedules.keys()] : courtIds` y se la pasa a `planFromAvailability`, `applyAutomaticCourtAssignments` y `getActiveSlots`. Sin esto el planificador mandaba los slots sin cancha a la **menos cargada** de la liga — que suele ser justo una que la división no configuró, por estar vacía — y el conflicto real nunca se mostraba.

**La sincronización semanal es de la liga, no del cuadro.** `syncSchedule` mapea cada slot a su
día de la semana en la semana destino: correcto para una plantilla que se repite, destructivo para
un bracket, donde dos sábados de semanas distintas terminarían en la misma fecha y hora. Por eso
acepta `{ faseLiga }` —por omisión `true`, para que un llamador que no la pase conserve el
comportamiento de siempre— y con `false` deja las fechas quietas, aunque sí actualiza el ancla de
la semana y las banderas de estado. Lo reenvían `useJornadaGeneration` y `useDeleteJornada`.

**Los slots del cuadro los crea `DivisionScheduleManager`, no la pantalla de detalle.** Su efecto
de reconciliación le da slot a cualquier partido pendiente que no lo tenga, y es el único lugar con
`courtSchedules`, `canchas` y la disponibilidad cargada. La grilla sale de `bracketCandidates`
([utils/playoff-slot-inheritance.ts](src/features/division/utils/playoff-slot-inheritance.ts)), que
reusa `buildSlotCandidates` semana a semana, así que cada candidato trae su `canchaId`; la
deduplicación usa `slotOccupancyKey` para que dos partidos puedan ir en paralelo a la misma hora en
canchas distintas. Al generar el cuadro, la pantalla de detalle solo crea la programación vacía —el
cascarón sin el cual `replaceSlots` no tiene dónde escribir.

**`isCourtOccupiedForSlot` mira el modo de la liga.** En `SINGLE` los partidos se guardan con
`canchaId: null`, así que filtrar por id descartaba **todas** las reservas y se colocaba encima de
otra división; ahí toda ocupación cuenta, igual que la cancha virtual de `planCourtAssignments`.

**El listado de días es la única vía de render de los slots, y también la lista que ofrece "Cambiar día".** `visibleWeekDates`
([features/division/utils/week-dates.ts](src/features/division/utils/week-dates.ts)) devuelve las
fechas con slot **más** los días configurados de la semana del ancla y de cada semana con partidos.
El ancla es `refDate` y, cuando falta, el slot más temprano: una división de puro cuadro se crea con
cupo 0 y se queda sin `refDate`, y sin ese respaldo los días configurados vacíos solo aparecían
después de la primera jornada —que es cuando `syncSchedule` lo escribe—, así que hasta entonces no
se podía mover un partido a un día sin partidos. El ancla se normaliza a su lunes porque la fecha de
un slot puede ser cualquier día.

**`habilitados` es un concepto de liga.** Es la selección semanal de quién pagó arbitraje, y en un
cuadro los equipos los decide el bracket. Por eso `useJornadaGeneration` recibe `faseLiga`: sin
ella no exige habilitados (exige tener partidos programados) y manda `equipoIds: undefined`, que el
backend interpreta como "todos los equipos de la división". Mandar `[]` no sirve — el validador
tiene `min(2)` sobre el campo cuando viene. El botón de generar sigue la misma regla:
`faseLiga ? habilitados.length >= 2 : activeSlots.length > 0`.

**El complemento solo absorbe el descanso de un grupo impar.** Con habilitados pares, Puntos
conserva su regular automático y juega además el complemento; con impares, como máximo un equipo de
Puntos libre ocupa el lugar del descanso. `utils/descanso.ts`, `DivisionScheduleManager`,
`prepareJornadaSlots` y `useJornadaGeneration` deben conservar la misma cuenta. La generación debe
enviar `descansoEquipoId` cuando Puntos ya tiene regular y el grupo sigue impar.

**Un solo overlay de "operación en curso"**, en `DivisionConfirmDialogs`: `busyLabel` elige el
texto entre generar jornada, generar eliminatorias, eliminarlas y reiniciar la división. Los
confirmadores de esas dos últimas se cierran **al confirmar**, no en `onSuccess`, o quedarían dos
modales apilados con el overlay encima.

**La cantidad de slots regulares la fijan los equipos, no el usuario.** Son `floor(habilitados / 2)` y se ajustan habilitando o deshabilitando equipos:
- `canDeleteSlot(slot)` (en el store) es la regla: solo `amistoso` y `complemento` se borran. `removeSlot` la aplica, así que el guard no se puede saltear desde la UI. En los tests, para abrir un hueco a mano se usa `replaceSlots`.
- No hay botón "Agregar regular"; `handleAddSlot` solo acepta `'amistoso' | 'complemento'`. `TimeSlotCard` recibe `canDelete` y con `false` muestra la acción como "limpiar equipos" (`backspace`), no como bote de basura.
- Borrar un regular abría un hueco que el relleno automático volvía a tapar, y ahí era donde se colaba la cancha no configurada. Ante un choque, la única salida real es cambiar horarios o agregar una cancha — eso lo dice `summarizeCourtConflicts` ([`features/division/utils/court-conflicts.ts`](src/features/division/utils/court-conflicts.ts)), que arma el banner y el toast. Está aparte del componente porque es la única forma de cubrir ese texto con test en este repo.

**`addSlot` dice por qué falló.** Devuelve `{ slot, reason }` con `AddSlotFailure` = `SIN_CONFIGURACION | SEMANA_LLENA | CANCHAS_OCUPADAS | NO_PERMITIDO`, y `addSlotFailureMessage` lo traduce. La distinción no es cosmética: la causa más frecuente es que **otras divisiones** ya reservaron la cancha, y sus partidos **no se ven en Programación** — la pantalla muestra huecos que en realidad están tomados. El mensaje único de antes ("No hay horarios disponibles en esta semana") obligaba a adivinar entre tres causas distintas. `SCHEDULE_REMEDY` ("cambia horarios o agrega otra cancha") se comparte con `CONFLICT_REMEDY` para que la app ofrezca siempre la misma salida.

**`addSlot` mide contra lo que se ve, no contra la store.** `getActiveSlots` recorta los regulares sobrantes solo al leer, así que al deshabilitar equipos quedan slots recortados **dentro de la store** que la pantalla nunca muestra. La opción `occupancy` deja que el manager pase `activeSlots`; sin ella esos fantasmas bloquean celdas invisibles. No se podan de la store porque `getActiveSlots` usa `habilitados?.length ?? 0` y durante la carga el conteo es 0: podar ahí borraría todo.

**`addSlot` también respeta la grilla por cancha** vía la opción `courtSchedules`: recorre cada cancha candidata con `buildSlotCandidates` y **su** configuración. El barrido externo sigue siendo por cancha en orden de preferencia (agotar la preferida antes de pasar a la siguiente); dentro de cada una va por (fecha, hora).

**`canchaUnicaId` ya no existe.** El switch "Usar una sola cancha" se había retirado antes, y la
columna se eliminó después (migración `20260822100000_drop_division_cancha_unica`): configurar una
sola cancha en el formulario hace lo mismo por el camino normal, y la migración convierte a fila
explícita cualquier división que todavía dependiera de ella. Con eso se fueron `syncCanchaUnica`,
`canchaUnicaIdSnapshot` del store persistido, el décimo argumento de `initSchedule`, el efecto de
reacomodo a la cancha fija en `DivisionScheduleManager` y la normalización previa al plan en
`useJornadaGeneration`. Un objeto persistido viejo puede traer todavía `canchaUnicaIdSnapshot`: es
una clave de más que nadie lee.

**Al tocar este código:**
- Las utilidades de mover slots aceptan `HorarioSource` = `string | ((canchaId?) => string)`. Pasa la función cuando el horario sea por cancha; el string sigue funcionando y es lo que usan los tests.
- **`buildSlotCandidates` es el único lugar que decide dónde puede caer un slot.** Con `courtSchedules` arma la grilla de cada cancha con **sus** días y **su** rango; sin él cae al comportamiento legacy de días y horario únicos. Ordena por `(fecha, hora, orden de cancha)`, así la semana se llena en paralelo, y eso levanta el techo de capacidad a `días × horarios × canchas`. La consumen `generateSlots`, el relleno de `initSchedule` y la reparación de horarios fuera de rango — **cualquier camino nuevo que cree slots debe usarla**, o volverá a emitir slots sin cancha que terminan en canchas ajenas.
- **La ocupación se mide con `slotOccupancyKey`, que incluye la cancha.** Con clave solo por fecha y hora, una cancha llena bloqueaba a todas las demás y el relleno se quedaba por debajo de la capacidad que `handleGenerateSlots` había calculado sumando por cancha.
- `SLOT_DISTRIBUTION_VERSION` subió a **2** y `DivisionSchedule` guarda `courtSchedulesSnapshot`; cambiar el horario de una cancha invalida la distribución guardada.
- `useUpdateDivision` compara `horariosPorCancha` de forma canónica en la recuperación de escritura ambigua — un `===` sobre un arreglo siempre fallaría, y omitirlo reportaría como guardado algo que no lo está.

## Mover y ubicar slots (reglas de cancha)

**Toda decisión de "¿este horario está libre?" pasa por `isTimeOccupied` en [`shared/utils/time-occupancy.ts`](src/shared/utils/time-occupancy.ts).** Vive en `shared/` (no en `features/`) porque el store también la usa, y está tipada estructuralmente para no depender de `TimeSlotConfig`. **No dupliques esta lógica**: antes había 4 copias divergentes.

Su guard clave es `if (currentCanchaId && slot.canchaId !== currentCanchaId) return false`. Cuando el slot sondeado **no tiene cancha**, el chequeo es ciego a canchas y choca contra todos los slots — esa es la propiedad que mantiene intacto el comportamiento de las ligas de una sola cancha.

### Las cuatro operaciones y su orden de preferencia

| Operación | Dónde | Regla |
|---|---|---|
| **Cambiar hora** (mismo día) | `TimePickerModal` | Permite elegir una hora ocupada y **intercambia** los dos partidos (`moveSlotToTime`) |
| **Cambiar día** | `placementForDay` en `slot-day-move.ts` | Su cancha primero (conservando la hora si puede); si esa cancha está llena ese día, otras canchas **a la hora más temprana libre** |
| **Cambiar cancha** | `timeForCourt` en `slot-court-move.ts` | Su propio día primero (conserva la hora, si no la más temprana); si esa cancha está llena ese día, **el primer hueco en otro día** de `candidateDates` |
| **Agregar slot** | `addSlot` en el store | Orden **cancha → día → horario**: agota todos los días de la cancha preferida antes de mirar otra cancha |

La cancha preferida al agregar es **la que el usuario está viendo** (`activeCourtFilter`), no `canchas[0]`.

### Reglas al tocar este código

- **Usa `activeSlots`, no `slots`.** `getActiveSlots` recorta los slots sobrantes cuando bajan los equipos habilitados; esos slots "fantasma" siguen en el store y, si los pasas como ocupación, bloquean días que se ven vacíos.
- **Respeta las reservas del backend.** `availability.ocupaciones` son partidos de *otras divisiones* de la liga. Se inyectan como predicado (`isBlocked` / `isCourtBlocked`) para no acoplar los utils puros al feature de canchas.
- **Con una sola cancha usable no hay fallback**: `courtOrder` llega vacío vía `showCanchaPicker`, porque no hay a dónde mover el slot.
- **Si el slot cambia de cancha, llama `setSelectedCourtId`**, o desaparece detrás del filtro activo y parece borrado.

### `getActiveSlots(slots, equipoCount, playoffMode?, courtOrder?)`

Cuando sobran slots (bajaron los equipos habilitados) recorta **el último de la última cancha**: rankea por `(índice de cancha, fecha, hora)` sobre una *copia*, y filtra el arreglo original — así **el orden de salida no cambia**, solo cuáles sobreviven. Los slots sin cancha se descartan primero; sin `courtOrder` el desempate es cronológico.

⚠️ No es solo cosmético: también decide qué slots se vuelven partidos reales, vía `prepareJornadaSlots` y `useJornadaGeneration`. **Los tres llamadores deben recibir el mismo `courtOrder`**, o se ocultaría un slot y se generaría otro. Por eso `useJornadaGeneration` calcula el rango de fechas desde *todos* los slots y pide `availability` **antes** de recortar.

## Push Notifications

- SDK: `react-native-onesignal` v5.5.4
- Expo config plugin: `onesignal-expo-plugin` en `app.json` con `mode: "development"`
- No funciona en Expo Go; requiere development build o build nativo (`npx expo run:android` / `eas build`)
- Env var: `EXPO_PUBLIC_ONESIGNAL_APP_ID`
- Bootstrap en `src/app/_layout.tsx` mediante `<NotificationBootstrap />`
- Inicializa OneSignal, solicita permiso en Android, hace login/logout según sesión de Better Auth
- Click en notificación navega a `data.url` usando Expo Router
- Deep link de jornada generada: `/(drawer)/(public)/liga/{ligaId}?divisionId={divisionId}&tab=horario`
- Cobertura: usuarios registrados (dueños/capitanes vía external_id) + seguidores anónimos (vía tag `division_{divisionId}` agregado desde botón "Notificarme de esta división")
- Las suscripciones se sincronizan con el backend (`/api/notification-subscriptions`)
- Favoritos de liga ya no gestionan tags de OneSignal

## Los DTO no declaran obligatorio un objeto anidado

La app se despliega **por separado** del backend, así que se encuentra servidores más viejos: el de
testing, un usuario que no actualizó, un rollback. Un objeto anidado que el servidor podría no mandar
tiene que ser **opcional en el DTO**, aunque el servidor de hoy siempre lo mande.

Esto no es teórico. `PublicLeagueListDto` declaraba `categoria`, `tipo`, `tipoCompetencia` y
`estadoLiga` como obligatorios; `PublicLeagueCard` los leía sin `?.`; y un build de preview contra
`testing.tenka.studio` tumbaba el feed entero con *"Cannot read property 'nombre' of undefined"*.
En dev no pasaba porque el `.env` apunta a otro backend. **TypeScript no podía avisar: el tipo
prometía lo que el cable no garantiza.**

La regla operativa: si dudas de si el servidor manda un anidado, ponlo opcional. `tsc` marca
entonces cada lectura y hace la auditoría por ti — un campo ausente debe dejar **un hueco** (no
dibujar el chip, no dibujar la celda), no un guion de relleno y desde luego no una pantalla negra.

**Ya se aplicó a los dos DTO que traen catálogos anidados**: `PublicLeagueListDto` y
`DivisionConRelaciones` (el de `League.divisiones`). Los cuatro catálogos —`categoria`, `tipo`,
`estadoLiga`, `tipoCompetencia`— son opcionales en ambos.

Para el texto compuesto está [`divisionLabel`](src/features/division/utils/division-label.ts):
`"Primera Fuerza · Libre"`, o solo el nombre si no llegó la categoría. **No interpoles a mano** —
`` `${d.nombre} · ${d.categoria.nombre}` `` deja el separador colgando en cuanto falta el dato, y es
justo lo que el helper evita. Lo usan la tarjeta del feed y el desplegable del detalle público.

**La pantalla de error nombra el componente.** El `ErrorBoundary` de `app/_layout.tsx` saca el primer
componente del `componentStack` y lo muestra bajo el mensaje. Sin eso, averiguar qué reventó en un
build instalado exigía conectar el teléfono y leer `adb logcat *:S ReactNativeJS:V` — que sigue
siendo la vía para el stack completo.

## Los tours: una sola configuración, en `tourConfig`

Toda la configuración de los tours vive en
[`shared/utils/tour-config.ts`](src/shared/utils/tour-config.ts). **Ninguna pantalla debe armarla
a mano** — ni las nueve que llaman a `startTour` directo, ni el hook [`useTour`](src/shared/hooks/useTour.ts).

La razón es una cicatriz: el objeto estaba copiado en línea en las diez pantallas —doce veces,
idéntico salvo el `tourId`—, así que un arreglo de posición se aplicó en la única copia que vivía
en un hook y **el bug siguió vivo en las otras nueve** sin que nada avisara.

### Por qué los insets van cruzados

Android es **edge-to-edge** desde el salto a Expo 57 / RN 0.86, así que `measureInWindow` devuelve
coordenadas de pantalla completa. `@wrack/react-native-tour-guide` asume lo contrario —lo documenta
en su `TourGuideOverlay`: *"measureInWindow returns coordinates relative to the app content area,
which sits BELOW the status bar"*— y le suma `insets.top` a cada medición (`measureTopOffset`). El
spotlight y su tooltip caían **una barra de estado más abajo** del elemento. Antes del salto esa
suma era correcta, y por eso el síntoma apareció de golpe sin tocar los tours.

La librería calcula ese offset **solo con `insets`**, mientras que el recorte que mantiene al
tooltip fuera del sistema usa la **suma `insets + extraInsets`**. Por eso la fábrica manda
`insets: { top: 0, bottom: 0 }` y el área segura real en `extraInsets`: apaga la corrección
sobrante sin perder los márgenes. Izquierda y derecha se omiten para que la librería las siga
resolviendo sola (`config.insets.top ?? auto.top` — un `0` explícito gana, un ausente no).

`scrollRef` y `getCurrentScrollOffset` se reenvían **por separado**: hay pantallas que pasan solo el
segundo, y agruparlos en un spread condicional lo descartaba en silencio.

### El interruptor de depuración

`TOURS_QUE_SE_REPITEN` lista `tourId` que vuelven a salir en cada apertura, saltándose
`@tour_guide:{tourId}` de AsyncStorage. Sirve para revisar la posición de un tour sin reinstalar la
app para borrar el almacenamiento. No va detrás de `__DEV__` porque las pruebas también se hacen en
APK de preview, donde `__DEV__` es `false`.

**Se publica vacío**, y hay un test que falla si se commitea con algo dentro. El modo de fallo real
no es que el interruptor exista, sino olvidarlo encendido: la app compila y funciona igual, solo que
un tutorial le sale en cada apertura a todos los usuarios.

Nada de esto lo atrapan `tsc` ni el lint: todas las variantes compilan. Lo cubren los tests de
`shared/utils/__tests__/tour-config.test.ts`.

## Ligas cercanas

El Home puede ordenar el listado publico por cercania mediante `expo-location`. La activacion es una
tarjeta discreta; nunca se solicita permiso al entrar si sigue `undetermined`. Un permiso ya
concedido si se usa automaticamente. Solo se pide foreground, sin watchers ni persistencia de
coordenadas. Pull-to-refresh y la barra compacta fuerzan una posicion nueva; al volver a primer
plano se renueva solo si pasaron 5 minutos. `features/location/location-policy.ts` fija 3 decimales,
ultima ubicacion de hasta 5 minutos/1 km y timeout de 8 segundos. La etiqueta visible sale de
`reverseGeocodeAsync` y vive solo en memoria; si falla muestra `Tu ubicacion actual`.

Las mismas coordenadas normalizadas van al request y a la query key. El DTO nuevo trae
`ubicacion.nombreCompleto`; el lookup completo de ubicaciones se habilita solo como fallback para un
backend anterior. `distanceKm` es opcional y se formatea en la tarjeta. Los diagnosticos HTTP deben
redactar siempre el query string, porque contiene la ubicacion aproximada.

La preferencia local `nearby-leagues-preference` guarda solamente si la funcion esta habilitada.
El switch de Cuenta la puede apagar: limpia la ubicacion de sesion, deja de consultar GPS y elimina
las queries cercanas del cache. La barra de Home permanece visible para reactivarla. La hidratacion
de la preferencia termina antes de consultar permisos, para no hacer una lectura fugaz al iniciar.

`expo-location` tiene los tres flags de background en `false`; no agregar `location` a
`UIBackgroundModes` ni `ACCESS_BACKGROUND_LOCATION`. Cualquier cambio del plugin exige build nativo.

## Data Fetching

**TanStack React Query** con patrón consistente:

**Queries** (`useQuery`):
- `useLeague(id)`, `useDivisions(ligaId)`, `useDivisionEquipos(divisionId)`
- `useUserTeams(userId)`; los equipos de una división llegan enriquecidos desde `useDivisionEquipos`
- `useJornadas(divisionId)`, `useTablaPosiciones(divisionId)`
- `useRondasPlayoff(divisionId)`, `useMyProfile(enabled)`, `useJugadores(equipoId)`, `useGoleadores(divisionId)`

**Infinite queries** (`useInfiniteQuery`):
- `useLigasInfinitas(filters)` — 20 por página y termina usando el `total` del backend
- `useJornadasInfinitas(divisionId)` — 2 por página

**Mutations** (`useMutation`):
- Todas siguen: `mutationFn → onSuccess → invalidateQueries` con query keys relacionadas
- Ej: `useCreateDivision` invalida `["divisions", ligaId]`, `useUpdatePartido` invalida `["jornada"]`, `["jornadas-infinitas"]`, `["partidos-ronda"]`, `["tabla-posiciones", divisionId]`

## Theme (`constants/theme.ts`)

### Palette

Dark-only. La fuente es [`constants/theme.ts`](src/constants/theme.ts); esta tabla la resume.

```ts
// Base            Texto                    Marca
black: "#090B10"   text/white: "#FFFFFF"    cyan: "#4DD0E1"
dark: "#11151D"    textSecondary: "#B0BAC9" cyanBright: "#7CE7F2"
surface: "#171C26" textMuted: "#7A8598"     cyanDark: "#2196A8"
surfaceLight: "#202736"

// Estados                     Superficies de acento (sufijo 10/20 = alfa)
success: "#69F0AE"             cyan10, cyan20, success10, danger10, warning10
danger:  "#FF5252"             playoff: "#A78BFA", playoff10
warning: "#FFD54F"

// Bordes y overlays
border: "#293241"  borderActive: "#4DD0E1"  overlay, dark40, dark60
```

Convenciones que ya usa el código: `warning` es el dorado (campeón, borrador, penales), `playoff` el
morado de eliminatoria, y `danger` marca tanto errores como la Zona de riesgo. Los sufijos `10`/`20`
son la misma tinta con alfa, para fondos.

### Fonts
- `sans`: Inter_400Regular (cuerpo)
- `medium`: Inter_500Medium (botones, labels)
- `semiBold`: Inter_600SemiBold (tablas)
- `bold`: Inter_700Bold (énfasis)
- `display`: Sora_600SemiBold (títulos)
- `displayBold`: Sora_700Bold (números)

### Spacing
- `Pad`: micro(4), sm(8), md(12), base(16), lg(20), xl(24), xxl(32)
- `Gap`: micro(4), sm(8), md(12), base(16), lg(24), xl(32)
- `Radius`: none(0), sm(4), md(8), lg(12), xl(16), xxl(24), full(999)

## Cloudinary Upload

```ts
uploadToCloudinary(uri: string): Promise<string>
```
Envía FormData a Cloudinary, retorna `secure_url`.

- Cloud name: `duyh7uidy`
- Upload preset: `teamsUpdate`
- Usado en: logo de liga, cancha de liga, logo de equipo, avatar de perfil

**Flujo**: `expo-image-picker` → `uploadToCloudinary` → guardar URL en form → `authClient.updateUser()` / API

## Image sizes
- **Campo (hero card)**: 1200×675px — 16:9, JPEG 80% (~200-400 KB)
- **Logo**: 200×200px — PNG o WebP (~20-50 KB)
- **Círculo (avatar/favorito)**: prioridad `logo ?? cancha ?? primera letra del nombre`

## Phone / OTP Flow

En `(drawer)/account/edit.tsx`:

1. Usuario selecciona país (`react-native-country-picker-modal`, filtrado a América + España) e ingresa el número en formato E.164
2. `authClient.phoneNumber.sendOtp({ phoneNumber })` — el backend **valida primero que el teléfono no esté registrado** (plugin `preventOtpForRegisteredPhone`): si ya existe un User con ese número, responde `PHONE_NUMBER_EXIST` **sin enviar SMS**
3. `authClient.phoneNumber.verify({ phoneNumber, code, updatePhoneNumber: true })` persiste `phoneNumber` + `phoneNumberVerified` en el User
4. Reenvío con countdown (40s): botón "Reenviar código en {n}s"; al llegar a 0 aparece "Reenviar código"
5. `userApi.updatePhoneVisibility(next)` controla `showPhoneInPublicLeague` (visible en el detalle público)

**Campo en sesión**: `user.phoneNumber` (no `user.phone`).

**Errores** (mapeados en `src/infrastructure/auth/errors.ts`):
- `PHONE_NUMBER_EXIST` → "Este número ya está vinculado a otra cuenta." (`errors.ts:12`)
- `INVALID_OTP`, `OTP_EXPIRED`, `TOO_MANY_ATTEMPTS` → mensajes propios

**Relación con "Mi perfil"**: el perfil de jugador (`(drawer)/my-profile`) se vincula al User por `phoneNumber` (`GET /api/jugadores/me`); se requiere un teléfono verificado para crear/ver el perfil de jugador.

## Keyboard Handling

Patrón usado en `CrudModal.tsx`, `account/edit.tsx`, `LocationPickerModal.tsx`, y `(public)/arbitro` (vía `KeyboardAwareScrollView` de `react-native-keyboard-controller`):

```ts
const [keyboardH, setKeyboardH] = useState(0)
useEffect(() => {
  const show = Keyboard.addListener(
    Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
    (e) => setKeyboardH(e.endCoordinates.height)
  )
  const hide = Keyboard.addListener(
    Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
    () => setKeyboardH(0)
  )
  return () => { show.remove(); hide.remove() }
}, [])
```

El `keyboardH` se aplica como `paddingBottom` en el contenedor del modal para que botones (Guardar/Cancelar) no queden tapados por el teclado.

## Favorites

- Store: `ligaFavoritaStore.ts` (Zustand + AsyncStorage)
- Items: `LigaFavoritaItem { id, nombre, cancha, logo }`
- Toggle desde estrella en `PublicLeagueCard` y detalle público
- Carrusel horizontal en Home debajo del buscador
- Prioridad imagen círculo: `logo ?? cancha ?? letra inicial`
- No gestiona notificaciones; para eso está `divisionNotificationStore`

## Estado de la división (frontend)

**La lógica va por `codigo`, nunca por `nombre`** — [`utils/estado-liga.ts`](src/features/division/utils/estado-liga.ts):
`estadoIdPorCodigo` para elegir la fila del catálogo al publicar o volver a borrador, `codigoDeEstado`
para saber en cuál está la división, `esSoloLectura` para `FINALIZADA`/`CANCELADA`. El catálogo es
editable por API: comparar el nombre hacía que renombrar "Borrador" dejara sin efecto los botones y
publicara todos los borradores. **El nombre se sigue mostrando** — es la etiqueta, y ese es el punto.

Con la división en `FINALIZADA` o `CANCELADA` el servidor responde **422** a generar jornadas,
crear o borrar partidos, generar o borrar eliminatorias, guardar resultados —también desde el enlace
del árbitro— y reiniciar. **Asignar campeón sí funciona**: es el acto de cierre.

**El servidor finaliza la división solo al guardarse el resultado de la final**, así que la app tiene
que ofrecer la salida: la acción **"Reabrir división"** del menú de opciones aparece con
`esSoloLectura` y devuelve el estado a `EN_CURSO`. Sin ella el dueño queda con todo bloqueado y sin
control visible — "Publicar" solo sale en Borrador y "Regresar a borrador" solo en En Curso.

**El aviso de "falta el campeón" va arriba del `TabBar`**, no dentro de la pestaña Eliminatoria:
también hace falta cuando la final la cerró un árbitro por QR, y ahí el dueño no vio ningún modal.
La condición es `faltaCampeon(rondas, campeon)` en `utils/campeon.ts`.

**El modal del momento se deriva de la división, no de la respuesta del guardado.**
`partidoApi.updateResult` va envuelto en `withAmbiguousWriteRecovery`, y su camino de recuperación
reconstruye la respuesta con `getPartidoById`: una bandera que el servidor pusiera ahí se perdería.
La pantalla del partido refetchea la división en el `onSuccess` y compara su `codigo` — código
imperativo dentro del callback, no un efecto que setea estado.

**La fila "Asignar campeón" se dibuja en cuanto hay cuadro**, deshabilitada hasta que la final tenga
resultado. Escondida no se descubría que la función existe.

## Division State (Frontend)

Botones en `leagues/[id]/divisions/[divisionId].tsx` dentro de `DivisionInfoCard` (entre Resumen y Programación):

| Botón | Color | Acción |
|-------|-------|--------|
| **Publicar** | Verde (`neonGreen`) | Cambia estado a "En Curso" |
| **Regresar a borrador** | Rojo (`neonRed`) | Cambia estado a "Borrador" |
| **Reiniciar división** | Rojo (`neonRed`) | `resetDivision()`: borra jornadas, playoffs, standings |

Orden: Publicar (izquierda), Reiniciar (derecha). Condicional: Publicar solo visible si estado actual es Borrador; Regresar solo si no es Borrador; Reiniciar siempre visible.

## Project Status & Roadmap

### ✅ Working Well
- CRUD completo: ligas, divisiones, equipos, jugadores, jornadas, partidos, playoffs
- Perfil de jugador ("Mi perfil") con vínculo por teléfono + tours de onboarding (`@wrack/react-native-tour-guide`)
- Captura arbitral por token: árbitro escanea/abre deep link (`(public)/arbitro#token=...`), registra goles/penales/goleadores y finaliza el partido
- Tabla de goleadores (pestaña "Goleo" en detalle público de liga)
- Búsqueda + filtros (acordeón) en Home
- Páginas públicas (liga, equipo, jugador) sin login
- Favoritos con carrusel en Home
- Gestión de horarios (slots, tipos, descanso, equipo libre)
- Tabla de posiciones, árbol de eliminatorias
- Tema dark consistente (Tenka palette)
- Pantalla de ayuda con FAQ acordeón
- Bottom sheet consistente en toda la app
- Notificaciones push para jornada generada: usuarios registrados vía external_id + seguidores anónimos vía tag OneSignal `division_{id}=true` desde botón "Notificarme de esta división"
- Anti double-tap de navegación (`useNavGuard`) aplicado a todas las pantallas con `router.push`
- Modal "Descartar cambios" ya no aparece tras un guardado exitoso en los forms de liga/división/equipo
- Error 409 (nombre de liga duplicado global) mostrado inline bajo el input "Nombre" en `league-form.tsx`

### 🔴 Critical (must fix before launch)
1. ✅ ~~**Backend env vars vacíos**~~ — Google y Apple configurados y funcionando (Apple usa JWT con `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY`; ya no existe `APPLE_CLIENT_SECRET`)
2. ✅ ~~**Standings no se invalidan** al actualizar resultado de partido~~ — `useUpdatePartido` invalida `["tabla-posiciones", divisionId]`
3. 🟡 **Falta el atajo para editar la liga desde su detalle** — editar sí se puede, desde la lista de ligas (`leagues/index.tsx`, `onEdit`). Lo que no hay es un acceso desde `leagues/[id]/index.tsx`. Estaba anotado como 🔴 "no hay botón editar liga", que sobredimensiona el problema.
4. **Jugadores no se pueden editar** — solo crear y eliminar (excepto el propio perfil "Mi perfil")

### 🟡 Important (improve UX)
5. ✅ ~~`Alert.alert()` → toast/snackbar~~ — todo el feedback no-confirmación usa toast
6. ✅ ~~**Sin feedback de éxito** en mutaciones~~ — toast.success() en todas las mutaciones
7. ✅ ~~**Estrella favorito ausente** en detalle de liga pública~~ — estrella agregada en hero
8. **Liga pública sin lista de equipos** — solo se accede a equipos via tabla de posiciones
9. ✅ ~~**N+1 queries** en pestaña de divisiones del equipo (`team/[id]`)~~ — el backend ya incluía la división en la respuesta, se eliminaron las N consultas extras
10. ✅ ~~**Sin botón "Compartir"** en páginas públicas~~ — botón share en header de liga pública

### 🟢 Future Implementations (post-MVP)
- **Calificaciones y comentarios de ligas** — sistema de reseñas para ligas públicas (estrellas + texto)
- **QR impreso de partido para árbitros** — actualmente la captura arbitral usa un deep link por token (`#token`); pendiente imprimir el QR en la programación/jornada para escaneo directo

## Pricing Oficial (modelo futuro aprobado)

Billing, RevenueCat y las compras de Apple/Google **no están implementados hoy**, y todavía no hay un precio de pago aprobado. Al implementarse, la app mostrará únicamente el precio mensual localizado que entregue la tienda; no se deben hardcodear importes.

- Niveles fijos de 2 a 15 divisiones administrables; más de 15 requiere Enterprise manual.
- Se paga la capacidad completa elegida, se use o no. Cada división ocupa un slot durante todo el período y finalizarla, cancelarla o eliminarla no cambia el precio ni libera el slot; el estado deportivo no interviene en billing.
- El upgrade se habilita inmediatamente solo después de verificar y sincronizar RevenueCat; el downgrade se aplica en la siguiente renovación.
- El plan gratuito conserva la semántica actual: LIGA con 1 liga, 1 división total y 40 equipos propios; CAPITÁN con 10 equipos propios; equipos ajenos por QR fuera del límite; administrador ilimitado.
- Tras 7 días de gracia o al expirar, no se borran datos ni se cambian estados: las divisiones que excedan la capacidad quedan públicas o en modo lectura.
- Las suscripciones de billing son independientes de las suscripciones gratuitas a notificaciones de OneSignal.

La especificación autoritativa completa está en `../PAID-SUBSCRIPTIONS-PLAN.md`.
