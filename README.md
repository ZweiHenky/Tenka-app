# Tenka ⚽

Gestión de ligas deportivas — mobile app construida con **Expo SDK 56** + **React Native 0.85**.

Crea ligas, administra divisiones, programa jornadas, asigna horarios, registra resultados y genera playoffs. Con tabla de posiciones, soporte para múltiples categorías y tipos de competencia.

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Framework | [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/) + React Native 0.85 |
| Router | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based, drawer + stack) |
| Auth | [Better Auth](https://www.better-auth.com/) + `@better-auth/expo` (Google, Apple, phone OTP) |
| Server state | [TanStack React Query 5](https://tanstack.com/query/v5) |
| Client state | [Zustand 5](https://zustand-demo.pmnd.rs/) (5 stores, AsyncStorage persist) |
| Styling | [NativeWind 4](https://www.nativewind.dev/) (Tailwind CSS v3) |
| HTTP | Axios con interceptors + auth interceptor |
| Notifications | OneSignal v5 (`react-native-onesignal` + `onesignal-expo-plugin`) |
| Testing | [Vitest](https://vitest.dev/) v4 + [Testing Library](https://testing-library.com/) |
| QR | `react-native-qrcode-svg` + `expo-camera` |
| Payments | Mercado Pago (próximamente) |

## Requisitos

- Node.js >= 18
- npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/eas/) (para builds nativos y notificaciones push)
- Dispositivo físico / emulador Android / iOS simulator

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales

# 3. Iniciar servidor de desarrollo
npx expo start
```

## Comandos

| Acción | Comando |
|--------|---------|
| Iniciar dev | `npm start` |
| Android (dev build) | `npm run android` |
| iOS (dev build) | `npm run ios` |
| Web | `npm start --web` |
| Lint | `npm run lint` |
| Tests | `npm test` |
| Tests (watch) | `npm run test:watch` |
| Reset project | `npm run reset-project` |

## Variables de Entorno

Ver `.env.example`:

| Variable | Descripción |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | URL del backend (ej: ngrok) |
| `EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_API_KEY` | Places API (New), restringida a Android `studio.tenka.app` + SHA-1 |
| `EXPO_PUBLIC_GOOGLE_PLACES_IOS_API_KEY` | Places API (New), restringida al bundle iOS `studio.tenka.app` |
| `EXPO_PUBLIC_GOOGLE_PLACES_WEB_API_KEY` | Places API (New), restringida por referentes web |
| `EXPO_PUBLIC_GOOGLE_PLACES_ANDROID_SHA1` | SHA-1 del certificado del build Android |
| `EXPO_PUBLIC_ONESIGNAL_APP_ID` | App ID de OneSignal para push notifications |

## Estructura del Proyecto

```
src/
  app/                  # Expo Router screens (file-based routing)
    (auth)/             # Sign-in screens
    (drawer)/           # Main app (drawer navigation)
    (public)/           # Public screens (no auth required)
  infrastructure/       # External services (auth, API, cloudinary, notifications)
  domain/               # Domain interfaces (user, league, team, player)
  features/             # Feature modules (auth, league, division, team, jornada, etc.)
  stores/               # Zustand stores (theme, team, favorites, schedule, notifications)
  shared/               # Reusable components, hooks, utils
  constants/            # Theme, palette, spacing, typography
  components/           # Generic app components (themed-text, animated-icon, etc.)
```

## Testing

El proyecto usa **Vitest** con 5 suites de prueba:

```
src/shared/hooks/__tests__/useDebounce.test.ts
src/shared/utils/__tests__/parse-dias-partido.test.ts
src/shared/utils/__tests__/resolve-lookup.test.ts
src/stores/__tests__/divisionSchedule.test.ts
src/stores/__tests__/ligaFavoritaStore.test.ts
```

```bash
npm test        # Run once
npm run test:watch  # Watch mode
```

## Builds Nativos

Configurado con **EAS Build** (ver `eas.json`):

| Profile | Uso |
|---------|-----|
| `development` | Dev client + distribución interna |
| `preview` | APK Android para pruebas |
| `production` | Build de producción (auto-increment version) |

```bash
eas build --profile development --platform android
eas build --profile production --platform all
```

## Licencia

Propietaria — Tenka Studio. Todos los derechos reservados.
