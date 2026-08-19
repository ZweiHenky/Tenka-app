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
| `expo@56` + `react-native@0.85` | Framework |
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
- **Components**: `TeamCard`, `TeamDetailHeaderCard`, `DivisionTeamInfoCard`

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

### goleador
- **API** (`api/goleadores.ts`): findByDivision
- **Hooks**: `useGoleadores`
- **Components**: `GoleadoresTable` (pestaña "Goleo" en detalle público de liga)

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

## Shared Hooks

| Hook | Descripción |
|------|-------------|
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

## Horario por cancha

Una división define **días y horario por cada cancha** donde juega; `duracionPartido` y `descanso` siguen siendo de la división. Una cancha **sin configurar** significa que esa división no juega ahí.

**La regla de resolución vive en un solo lugar:** [`features/division/utils/division-schedule.ts`](src/features/division/utils/division-schedule.ts), espejo del backend (`utils/divisionSchedule.ts`):

| Caso | Resultado |
|---|---|
| Sin canchas (liga de cancha única) | Una entrada `undefined` con los escalares |
| Con filas (`division.canchaHorarios`) | Una entrada por cancha configurada y activa |
| Sin filas | Fallback legacy: todas las canchas activas heredan los escalares, acotado por `canchaUnicaId` |

- `resolveCourtSchedules(division, canchas)` — el mapa completo. **Es la única función que decide dónde juega una división.**
- `scheduleForCourt(division, canchas, canchaId)` — el horario de una cancha; cae al resumen si esa cancha no está configurada.
- `unionOfPlayDays(division)` — los días que juega en algún lado, para las pestañas de día.

⚠️ `division.diasPartido`/`horarioPartido` son el **resumen (unión)** que mantiene el backend. Nunca los uses para decidir si un partido cabe en una cancha: son un superconjunto y colocarían partidos donde el backend los rechaza.

**Formulario** (`division-form.tsx`): interruptor "mismo horario en todas las canchas" (encendido por defecto, se comporta como antes y guarda los escalares). Al apagarlo aparece una tarjeta por cancha con switch "juega aquí" + días + horario, y se guardan las filas en `horariosPorCancha`. En edición, volver a "mismo horario" manda `horariosPorCancha: []` para borrar las filas.

**Validar días *y* horas por cancha.** `availableTimesForDay` recibe un `diasPartido?: DiasSource` opcional y devuelve `[]` si esa cancha no juega esa fecha. Como `preferredTimeForDay`, `placementForDay` y `timeForCourt` delegan en ella, **ese único chequeo cubre los tres**. Sin el parámetro no hay restricción, así que un caller que lo olvide puede colocar un partido en un día que la cancha no juega y la jornada falla al generar con `La división no juega ese día en la cancha "X"`.

**Respetar el opt-out en la UI.** Todo lo que ofrezca canchas debe acotarse a `courtSchedules` (las que la división juega), no a `canchas` (las de la liga). Si no, el partido se coloca, se ve bien y **la jornada falla al generar** con `no está configurada para jugar en la cancha "X"`. Aplica a `courtOrder` (fallback de "Cambiar día" y agregar slot), a la cancha preferida de `handleAddSlot` y a la hoja "Seleccionar cancha" (ahí las no configuradas se muestran **deshabilitadas** con `· No configurada`, no ocultas, porque un slot que ya esté en una necesita poder salir). Las pestañas de cancha de arriba **sí** listan todas: son un filtro sobre los slots existentes y ocultarlas volvería invisible un slot heredado.

**`canchaUnicaId` ya no se edita desde la app.** El switch "Usar una sola cancha" se retiró: configurar una sola cancha en el formulario lo sustituye, y con filas por cancha el campo quedaba ignorado por `resolveCourtSchedules`. La columna sigue existiendo y acota el fallback legacy de las divisiones sin filas, así que `syncCanchaUnica` y la validación del backend se conservan.

**Al tocar este código:**
- Las utilidades de mover slots aceptan `HorarioSource` = `string | ((canchaId?) => string)`. Pasa la función cuando el horario sea por cancha; el string sigue funcionando y es lo que usan los tests.
- `generateSlots` acepta un `courtSchedules` opcional: con él genera la grilla de cada cancha y ordena por `(fecha, hora, orden de cancha)`, de modo que la semana se llena en paralelo. Eso además levanta el techo de capacidad a `días × horarios × canchas`.
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
- **Una sola cancha y cancha fija (`canchaUnicaId`) no reciben fallback**: `courtOrder` llega vacío vía `showCanchaPicker`. Con cancha fija es crítico — el efecto de sincronización reescribiría cualquier `canchaId` distinto.
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
```ts
bone: "#F2F2F0"       white: "#FFFFFF"    blue: "#2C4673"
burgundy: "#6B2337"    red: "#C62828"      gold: "#D4A72C"
dark: "#141414"        dark40/dark60       bone30/bone60/bone80
overlay: "#14141480"   neonCyan: "#4DD0E1" neonRed: "#FF5252"
neonGreen: "#69F0AE"   neonGold: "#FFD54F"
```

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
3. **No hay botón editar liga** desde el detalle (`leagues/[id]/index.tsx`) — existe `league-form.tsx` pero no se invoca desde el detalle
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

## Pricing Oficial (decidido 13 Jul 2026)

Cobro por **división activa al mes**. Ligas típicas: 3-10 divisiones, 15-30 equipos c/u, arbitraje $300-$500/partido. Estado de México.

| Etapa | Precio por división/mes |
|---|---:|
| Lanzamiento (primeros 3 meses) | $149 MXN |
| Precio estándar | $199 MXN |

Sin escala por volumen inicialmente. Se puede agregar descuento progresivo después (ej. 6+ divisiones a $149).
