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

## Dependencies principales

| Librería | Uso |
|----------|-----|
| `expo@56` + `react-native@0.85` | Framework |
| `expo-router` | File-based routing (drawer + stack) |
| `better-auth` + `@better-auth/expo` | Auth (Google, Apple, phone OTP) |
| `@tanstack/react-query@5` | Server state (queries + mutations) |
| `zustand@5` | Client state (4 stores) |
| `react-native-country-picker-modal` | Country selector en perfil |
| `react-native-google-places-textinput` | Location picker |
| `react-native-qrcode-svg` | QR generation |
| `expo-camera` | QR scanning |
| `expo-image-picker` | Image selection |
| `@react-native-async-storage/async-storage` | Zustand persist |
| `expo-secure-store` | Token storage (Better Auth) |
| `@expo-google-fonts/inter` / `sora` | Tipografía |
| `axios` | HTTP client con interceptors |
| `react-native-onesignal` + `onesignal-expo-plugin` | Push notifications con OneSignal en Expo development/native build |

## Rules

- No instalar dependencias sin permiso explícito
- Skills instaladas: React Native (Expo), Better Auth, Zustand
- Arquitectura: `app/`, `infrastructure/`, `domain/`, `features/`, `stores/`, `shared/`, `constants/`
- Router por archivos (Expo Router) con route groups: `(drawer)/`, `(auth)/`, `(main)/`
- No modificar configuraciones del proyecto (`app.json`, `babel.config.js`, `metro.config.js`, etc.) sin permiso

## Architecture

```
src/
  app/                    # Expo Router screens
    _layout.tsx           # Root layout: GestureHandler + QueryClient + fonts
    index.tsx             # Redirect a /(drawer)
    (drawer)/             # Drawer navigation
      _layout.tsx         # Drawer layout + custom content
      index.tsx           # Home / public league feed
      team.tsx            # Team CRUD
      profile.tsx         # Profile screen
      leagues/            # League route group (stack)
        _layout.tsx
        index.tsx         # User's leagues CRUD
        [id]/
          _layout.tsx
          index.tsx       # League detail + divisions
          manage.tsx      # Manage divisions
          divisions/
            [divisionId].tsx              # Division detail (main hub)
            [divisionId]/
              manage.tsx                  # Schedule management
              eliminatorias.tsx           # Playoff brackets
              jornadas/[jornadaId].tsx    # Match results
      public-league/
        [id].tsx          # Public league view
    (auth)/
      _layout.tsx
      sign-in.tsx         # Google/Apple sign-in
  infrastructure/         # External services
    config/env.ts         # Env vars (API_URL, GOOGLE_PLACES_API_KEY, ONESIGNAL_APP_ID)
    auth/client.ts        # Better Auth client with expo plugin
    api/client.ts         # Axios instance with auth interceptor
    cloudinary/upload.ts  # Image upload to Cloudinary
    notifications/NotificationBootstrap.tsx # Inicializa OneSignal, login por user.id, click handlers
  domain/                 # Domain interfaces
    interfaces/
      user.ts             # User interface
      league.ts           # League, Division, CreateDivisionInput, etc.
      team.ts             # Team interface
  features/               # Feature modules
    auth/                 # Auth components/hooks
    league/               # League api, hooks, components
    division/             # Division api, hooks, components
    division-equipo/      # Pivot api, hooks
    team/                 # Team api, hooks, components
    jornada/              # Jornada api, hooks, components
    partido/              # Partido api, hooks
    tabla-posicion/       # Standings api, hooks, components
    ronda-playoff/        # Playoff api, hooks, components
    profile/              # Profile store + ProfileEditModal
    users/                # User store
  stores/                 # Zustand stores
    themeStore.ts         # Theme toggle (light/dark/system)
    team-store.ts         # Local team seed data
    ligaFavoritaStore.ts  # Favorites (persisted)
    divisionSchedule.ts   # Schedule slots (persisted, most complex)
  shared/                 # Reusable components & utils
    components/           # CrudModal, SelectField, AuthGate, etc.
    hooks/                # useDebounce
    utils/                # resolve-lookup, parse-dias-partido
  constants/
    theme.ts              # Palette, Fonts, Pad, Gap, Radius, spacing
  components/             # Generic app components (themed-text, etc.)
```

## Navigation

```
Root Stack
  index → redirect /(drawer)
  (drawer) → Drawer Navigator
    index               Home / League Feed
    team                Team CRUD
    leagues → Stack
      index             My Leagues CRUD
      [id]/index        League Detail + Divisions
      [id]/manage       Manage Divisions
      [id]/divisions/[divisionId]       Division Hub
      [id]/divisions/[divisionId]/manage          Schedule
      [id]/divisions/[divisionId]/eliminatorias   Playoffs
      [id]/divisions/[divisionId]/jornadas/[jornadaId]  Match Scores
    profile             User Profile
    public-league/[id]  Public League View (hidden from drawer)
  (auth) → Stack
    sign-in             Google / Apple sign-in
```

## App Screens

| Ruta | Propósito |
|------|-----------|
| `(drawer)/index.tsx` | Home: buscador + filtros + favoritos + feed de ligas públicas |
| `(drawer)/team.tsx` | CRUD de equipos del usuario, QR por equipo |
| `(drawer)/profile.tsx` | Perfil del usuario (nombre, email, rol, teléfono), cierre sesión |
| `(drawer)/leagues/index.tsx` | CRUD de ligas del usuario con logo, cancha, ubicación |
| `(drawer)/leagues/[id]/index.tsx` | Detalle de liga + CRUD de divisiones |
| `(drawer)/leagues/[id]/manage.tsx` | Gestión de divisiones (con estado, categoría, tipo) |
| `(drawer)/leagues/[id]/divisions/[divisionId].tsx` | Hub de división: info, Publicar/Regresar/Reiniciar, equipos, jornadas, playoffs |
| `(drawer)/leagues/[id]/divisions/[divisionId]/manage.tsx` | Gestión de horarios: slots, asignación equipos, tipos de partido |
| `(drawer)/leagues/[id]/divisions/[divisionId]/eliminatorias.tsx` | Árbol de playoff con resultados |
| `(drawer)/leagues/[id]/divisions/[divisionId]/jornadas/[jornadaId].tsx` | Resultados de jornada: scores, estados de partido |
| `(drawer)/public-league/[id].tsx` | Vista pública: standings + horarios + playoff |
| `(auth)/sign-in.tsx` | Login con Google o Apple |

## Features

### league
- **API**: list, listPaginated (filtros: search, categoriaId, tipoId, estadoLigaId), getById, create, update, delete
- **Hooks**: `useLeagues`, `useUserLeagues`, `useLeague`, `useCreateLeague`, `useUpdateLeague`, `useDeleteLeague`, `useLigasInfinitas` (paginación infinita)
- **Lookups**: `useLookups()` — 5 queries paralelas (categorias, tipos, ubicaciones, estadosLiga, tiposCompetencia) con 5min staleTime

### division
- **API**: listByLiga, getById, create, update, delete, reset
- **Hooks**: `useDivisions`, `useCreateDivision`, `useUpdateDivision`, `useDeleteDivision`, `useResetDivision`
- **Components**: `DivisionListCard`, `DivisionInfoCard` (con `children` entre Resumen y Programación), `DivisionFormModal`, `TeamListCard`, `TimeSlotCard`, `TeamPickerModal`, `TimePickerModal`

### division-equipo
- **API**: findByDivision, findByEquipo, create, remove
- **Hooks**: `useDivisionEquipos`, `useAssignTeam`, `useRemoveTeam`

### team
- **API**: list, getById, create, update, delete
- **Hooks**: `useTeams`, `useUserTeams`, `useCreateTeam`, `useUpdateTeam`, `useDeleteTeam`

### jornada
- **API**: listByDivision, listByDivisionPaginated, getById, generateNext, delete
- **Hooks**: `useJornadas`, `useJornadasInfinitas`, `useGenerateNextJornada`, `useDeleteJornada`
- **Components**: `JornadaListCard`, `PartidoCard`, `ScoreModal`, `DayGroup`

### partido
- **API**: findByRondaPlayoff, update
- **Hooks**: `useUpdatePartido`

### tabla-posicion
- **API**: listByDivision
- **Hooks**: `useTablaPosiciones`
- **Components**: `StandingsTable`

### ronda-playoff
- **API**: listByDivision, create, generate, deleteByDivision
- **Hooks**: `useRondasPlayoff`, `useGenerateRondas`, `useDeleteRondasByDivision`
- **Components**: `BracketView` (árbol SVG)

### profile
- **Store**: `ProfileStore` (zustand)
- **Components**: `ProfileEditModal` (nombre, avatar, teléfono con OTP)

## Shared Components

| Componente | Descripción |
|------------|-------------|
| **`AuthGate`** | Bloquea contenido si no hay sesión, muestra botón "Iniciar sesión" |
| **`CrudModal`** | Bottom-sheet genérico con campos, `children`, botones Cancelar/Guardar, manejo de teclado |
| **`SelectField`** | Dropdown que abre bottom-sheet con lista de opciones (id/nombre), check en seleccionado |
| **`CustomHeader`** | Barra superior con menú/back, título centrado, acciones derecha |
| **`ErrorState`** | Icono + mensaje + botón Reintentar opcional |
| **`EmptyState`** | Icono centrado + mensaje + acción opcional |
| **`LoadingScreen`** | ActivityIndicator full-screen |
| **`PullToRefresh`** | ScrollView con RefreshControl + infinite scroll |
| **`QrCard`** | Tarjeta blanca con QR, label y hint |
| **`QRScannerModal`** | Cámara full-screen para escanear QR |
| **`LocationPickerModal`** | Google Places input en bottom-sheet |
| **`DatePicker`** | Selector día/mes/año + `DateRangePicker` |
| **`TimeRangePicker`** | Lista editable de rangos horarios (inicio-fin) |

## Zustand Stores

| Store | Persist? | Estado | Métodos clave |
|-------|----------|--------|---------------|
| **`useThemeStore`** | No | `theme: "light"\|"dark"\|"system"` | `setTheme()` |
| **`useTeamStore`** | No | `teams[]`, `selectedTeam`, `isLoading` | CRUD local |
| **`useLigaFavoritaStore`** | AsyncStorage (`ligas-favoritas`) | `favoritos: LigaFavoritaItem[]` | `toggle(item)`, `esFavorito(id)` |
| **`useDivisionScheduleStore`** | AsyncStorage (`division-schedule-store`) | `schedules`, `habilitados`, `hasUnsaved` | `initSchedule`, `setSlotTeams`, `setSlotTipo`, `addSlot`, `removeSlot`, `replaceSlots`, etc. |
| **`useDivisionNotificationStore`** | AsyncStorage (`division-notifications`) | `subscriptions` | `toggle(item)`, `remove(divisionId)`, `isSubscribed(divisionId)` |

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
- Al activar: agrega tag OneSignal `division_{divisionId}=true`
- Al desactivar: remueve tag `division_{divisionId}`

### divisionScheduleStore
La store más compleja (~574 lines). Genera slots de horario desde la config de la división (diasPartido, horarioPartido, duracion, descanso). Maneja:
- Asignación de equipos a slots (local/visitante)
- Tipos de slot: regular, complemento (Puntos/Sin puntos), amistoso, eliminatoria
- Detección de conflictos
- Persistencia para evitar perder cambios no guardados

## Push Notifications

- SDK: `react-native-onesignal` v5.5.4
- Expo config plugin: `onesignal-expo-plugin` en `app.json` con `mode: "development"`
- No funciona en Expo Go; requiere development build o build nativo (`npx expo run:android` / `eas build`)
- Env var: `EXPO_PUBLIC_ONESIGNAL_APP_ID`
- Bootstrap en `src/app/_layout.tsx` mediante `<NotificationBootstrap />`
- Inicializa OneSignal, solicita permiso en Android, hace login/logout según sesión de Better Auth
- Click en notificación navega a `data.url` usando Expo Router
- Favoritos públicos agregan tag OneSignal `liga_{ligaId}=true`; al quitar favorito se remueve
- Deep link de jornada generada: `/(drawer)/(public)/liga/{ligaId}?divisionId={divisionId}&tab=horario`
- Cobertura: usuarios registrados (dueños/capitanes vía external_id) + seguidores anónimos (vía tag `division_{divisionId}` agregado desde botón "Notificarme de esta división")
- Favoritos de liga ya no gestionan tags de OneSignal

## Data Fetching

**TanStack React Query** con patrón consistente:

**Queries** (`useQuery`):
- `useLeague(id)`, `useDivisions(ligaId)`, `useDivisionEquipos(divisionId)`
- `useTeams()`, `useUserTeams(userId)`
- `useJornadas(divisionId)`, `useTablaPosiciones(divisionId)`
- `useRondasPlayoff(divisionId)`

**Infinite queries** (`useInfiniteQuery`):
- `useLigasInfinitas(filters)` — 5 por página
- `useJornadasInfinitas(divisionId)` — 2 por página

**Mutations** (`useMutation`):
- Todas siguen: `mutationFn → onSuccess → invalidateQueries` con query keys relacionadas
- Ej: `useCreateDivision` invalida `["divisions", ligaId]`, `useUpdatePartido` invalida `["jornada"]`, `["jornadas-infinitas"]`, `["partidos-ronda"]`

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

En `ProfileEditModal.tsx`:
1. Usuario selecciona país (`react-native-country-picker-modal`, filtrado a América + España)
2. Ingresa número → `sendOTP({ phoneNumber })`
3. Recibe código → `verify({ phoneNumber, code, updatePhoneNumber: true })`
4. Better Auth persiste `phoneNumber` y `phoneNumberVerified` en el User
5. `onUserUpdated()` invalida sesión para refrescar pantalla

**Campo en sesión**: `user.phoneNumber` (no `user.phone`)

## Keyboard Handling

Patrón usado en `CrudModal.tsx`, `ProfileEditModal.tsx`, `LocationPickerModal.tsx`:

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
- Búsqueda + filtros (acordeón) en Home
- Páginas públicas (liga, equipo, jugador) sin login
- Favoritos con carrusel en Home
- Gestión de horarios (slots, tipos, descanso, equipo libre)
- Tabla de posiciones, árbol de eliminatorias
- Tema dark consistente (Tenka palette)
- Pantalla de ayuda con FAQ acordeón
- Bottom sheet consistente en toda la app
- Notificaciones push para jornada generada: usuarios registrados vía external_id + seguidores anónimos vía tag OneSignal `division_{id}=true` desde botón "Notificarme de esta división"

### 🔴 Critical (must fix before launch)
1. **Backend env vars vacíos** — Google/Apple login no funciona hasta configurar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`
2. ✅ ~~**Standings no se invalidan** al actualizar resultado de partido~~ — `useUpdatePartido` invalida `["tabla-posiciones", divisionId]`
3. **No hay botón editar liga** desde el detalle (`[id]/index.tsx`)
4. **Jugadores no se pueden editar** — solo crear y eliminar

### 🟡 Important (improve UX)
5. ✅ ~~`Alert.alert()` → toast/snackbar~~ — todo el feedback no-confirmación usa toast
6. ✅ ~~**Sin feedback de éxito** en mutaciones~~ — toast.success() en todas las mutaciones
7. ✅ ~~**Estrella favorito ausente** en detalle de liga pública~~ — estrella agregada en hero
8. **Liga pública sin lista de equipos** — solo se accede a equipos via tabla de posiciones
9. ✅ ~~**N+1 queries** en pestaña de divisiones del equipo (`team/[id]`)~~ — el backend ya incluía la división en la respuesta, se eliminaron las N consultas extras
10. ✅ ~~**Sin botón "Compartir"** en páginas públicas~~ — botón share en header de liga pública

### 🟢 Future Implementations (post-MVP)
- **Calificaciones y comentarios de ligas** — sistema de reseñas para ligas públicas (estrellas + texto)
- **QR de partido para árbitros** — generar QR que abre un partido específico; un árbitro puede actualizar el resultado (goles, estado) sin necesidad de tener cuenta ni ser dueño de la liga. Flujo: escanear QR → pantalla pública del partido → botón "Actualizar resultado" → formulario con goles local/visitante + estado

## Pricing Oficial (decidido 13 Jul 2026)

Cobro por **división activa al mes**. Ligas típicas: 3-10 divisiones, 15-30 equipos c/u, arbitraje $300-$500/partido. Estado de México.

| Etapa | Precio por división/mes |
|---|---:|
| Lanzamiento (primeros 3 meses) | $149 MXN |
| Precio estándar | $199 MXN |

Sin escala por volumen inicialmente. Se puede agregar descuento progresivo después (ej. 6+ divisiones a $149).
