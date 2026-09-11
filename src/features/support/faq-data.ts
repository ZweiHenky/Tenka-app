export interface Faq {
  id: string;
  category: FaqCategoryId;
  question: string;
  answer: string;
  keywords: string[];
}

export type FaqCategoryId =
  | "primeros-pasos"
  | "cuenta-perfil"
  | "equipos"
  | "ligas-divisiones"
  | "programacion"
  | "compartir-avisos";

export interface FaqCategory {
  id: FaqCategoryId | "todas";
  label: string;
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  { id: "todas", label: "Todas" },
  { id: "primeros-pasos", label: "Primeros pasos" },
  { id: "cuenta-perfil", label: "Cuenta y perfil" },
  { id: "equipos", label: "Equipos" },
  { id: "ligas-divisiones", label: "Ligas y divisiones" },
  { id: "programacion", label: "Programación" },
  { id: "compartir-avisos", label: "Compartir y avisos" },
];

export const FAQS: Faq[] = [
  // Primeros pasos
  {
    id: "encontrar-liga",
    category: "primeros-pasos",
    question: "¿Cómo encuentro una liga?",
    answer:
      "En Inicio escribí el nombre en “Buscar liga…”. También podés abrir Filtros y elegir una opción de Categoría, Tipo o Estado. Tocá una tarjeta para ver sus divisiones, horarios, resultados y estadísticas. Arrastrá hacia abajo para actualizar.",
    keywords: ["buscar", "filtros", "inicio", "liga", "tarjeta"],
  },
  {
    id: "ligas-cercanas",
    category: "primeros-pasos",
    question: "¿Cómo veo primero las ligas cercanas?",
    answer:
      "Tocá “Ligas cerca de ti” y concedé el permiso de ubicación. Tenka usa tu ubicación aproximada solo para ordenar el Inicio y mostrar la distancia, sin ubicación en segundo plano. Tocá la barra para actualizarla. Si tenés sesión, podés apagarla desde Cuenta → Privacidad y ubicación.",
    keywords: ["cerca", "ubicacion", "gps", "distancia", "permiso"],
  },
  {
    id: "favoritas",
    category: "primeros-pasos",
    question: "¿Cómo guardo una liga como favorita?",
    answer:
      "Tocá la estrella en Inicio o en la ficha pública de la liga. Tus favoritas aparecen como accesos rápidos debajo del buscador. Volvé a tocar la estrella para quitarla. Se guardan en este dispositivo y no activan notificaciones.",
    keywords: ["favorito", "estrella", "guardar", "acceso"],
  },
  {
    id: "consultar-division",
    category: "primeros-pasos",
    question: "¿Cómo consulto una división?",
    answer:
      "Abrí la liga y usá el selector “Divisiones”. Info muestra su configuración; Posiciones aparece cuando hay fase de liga; Horario trae jornadas y partidos; Goleo aparece si está habilitado; y Eliminatoria aparece cuando ya hay un cuadro con partidos.",
    keywords: ["division", "info", "posiciones", "horario", "goleo", "eliminatoria"],
  },
  {
    id: "ver-partidos",
    category: "primeros-pasos",
    question: "¿Cómo veo los partidos de una jornada?",
    answer:
      "Abrí la liga, elegí la división y entrá en Horario. Cambiá de jornada con J1, J2, etc. Tocá un partido para ver su estado, marcador, penales, fecha, cancha, goleadores y alineaciones registradas.",
    keywords: ["jornada", "partido", "horario", "marcador", "cancha"],
  },
  {
    id: "fichas-equipo-jugador",
    category: "primeros-pasos",
    question: "¿Qué muestran las fichas de equipo y jugador?",
    answer:
      "La ficha de equipo muestra Jugadores, Divisiones y Logros; desde una división ves la plantilla habilitada para esa competencia. La de jugador muestra foto, posición, edad, logros, dorsales por equipo y divisiones habilitadas. El teléfono solo aparece si es público.",
    keywords: ["equipo", "jugador", "plantilla", "logros", "dorsal"],
  },
  // Cuenta y perfil
  {
    id: "necesito-sesion",
    category: "cuenta-perfil",
    question: "¿Necesito iniciar sesión para usar Tenka?",
    answer:
      "No para consultar Inicio ni las fichas públicas de ligas, equipos, jugadores y partidos. Sí para Mi perfil, Mis equipos, Mis ligas y Cuenta. Si abrís una sección protegida sin sesión, vas a ver el botón “Iniciar sesión”.",
    keywords: ["sesion", "login", "cuenta", "publico", "sin cuenta"],
  },
  {
    id: "iniciar-sesion",
    category: "cuenta-perfil",
    question: "¿Cómo inicio y cierro sesión?",
    answer:
      "Abrí el menú lateral y tocá “Iniciar sesión”, con “Continuar con Google” o “Continuar con Apple”. Para salir, usá el pie del menú o Cuenta → Cerrar sesión; la app vuelve a Inicio y limpia sus consultas en memoria.",
    keywords: ["google", "apple", "entrar", "salir", "cerrar sesion"],
  },
  {
    id: "cuenta-vs-perfil",
    category: "cuenta-perfil",
    question: "¿Cuál es la diferencia entre Cuenta y Mi perfil?",
    answer:
      "Cuenta es tu identidad de acceso: nombre, foto, correo, rol y teléfono verificado. Mi perfil es tu ficha deportiva: nombre deportivo, posición, edad, foto, equipos, dorsales y logros. Para crear Mi perfil necesitás sesión y un teléfono verificado; si ya te registraron con tu número, se vincula automáticamente.",
    keywords: ["cuenta", "mi perfil", "telefono", "rol", "ficha"],
  },
  {
    id: "vincular-telefono",
    category: "cuenta-perfil",
    question: "¿Cómo vinculo mi teléfono y qué errores puedo ver?",
    answer:
      "En Cuenta tocá el lápiz, elegí el país, escribí el número y tocá “Enviar código”. Después ingresá el código de 6 dígitos y tocá “Verificar”; la verificación lo guarda enseguida en formato internacional. Si pasan 40 segundos aparece “Reenviar código”. Si el número ya pertenece a otra cuenta, ves “Este número ya está vinculado a otra cuenta.”; también hay avisos para código incorrecto, vencido o demasiados intentos.",
    keywords: ["telefono", "otp", "codigo", "verificar", "reenviar"],
  },
  {
    id: "eliminar-cuenta",
    category: "cuenta-perfil",
    question: "¿Cómo elimino mi cuenta?",
    answer:
      "En Cuenta tocá “Eliminar cuenta” y escribí tu correo exactamente para confirmar. La pantalla advierte que se eliminan ligas, equipos, divisiones, partidos, notificaciones y tu perfil deportivo, y que no se puede deshacer.",
    keywords: ["eliminar", "borrar cuenta", "correo", "confirmar"],
  },
  // Equipos
  {
    id: "crear-equipo",
    category: "equipos",
    question: "¿Cómo creo un equipo?",
    answer:
      "Entrá en Mis equipos y tocá “+”. El nombre es obligatorio y el logo opcional. La creación depende de tu rol y de la cuota de tu cuenta; si se agotó, la app muestra el límite y bloquea la creación.",
    keywords: ["crear equipo", "mis equipos", "logo", "cuota", "rol"],
  },
  {
    id: "agregar-jugadores",
    category: "equipos",
    question: "¿Cómo agrego jugadores a mi equipo?",
    answer:
      "Abrí el equipo, entrá en Jugadores y tocá “Buscar jugador”. Elegí el país, escribí el teléfono del perfil y tocá Buscar. Si existe y aún no está en el equipo, asignale un dorsal de 0 a 999 y tocá “Agregar al equipo”. Solo se pueden agregar perfiles ya existentes; si no hay un perfil con ese número, primero hay que crearlo desde Mi perfil.",
    keywords: ["plantilla", "jugador", "telefono", "dorsal", "buscar"],
  },
  {
    id: "dorsales",
    category: "equipos",
    question: "¿Por qué tengo dorsales distintos en cada equipo?",
    answer:
      "El dorsal pertenece a la relación con cada equipo, no al jugador. Puede ser distinto en cada uno y solo el dueño lo edita desde la plantilla del equipo. Con el icono de editar cambiás el dorsal y con el de eliminar retirás al jugador; retirarlo no borra su perfil.",
    keywords: ["dorsal", "numero", "editar", "retirar", "plantilla"],
  },
  {
    id: "plantilla-vs-division",
    category: "equipos",
    question: "¿Qué diferencia hay entre la plantilla del equipo y la de una división?",
    answer:
      "La plantilla del equipo trae todos sus jugadores. La plantilla de división es el subconjunto habilitado para esa competencia y se gestiona desde la liga: abrí la división, entrá en Equipos, tocá el icono de jugadores del equipo y agregá o retirá participantes.",
    keywords: ["plantilla", "division", "habilitar", "convocar"],
  },
  // Ligas y divisiones
  {
    id: "crear-liga",
    category: "ligas-divisiones",
    question: "¿Cómo creo o edito una liga?",
    answer:
      "Entrá en Mis ligas y tocá “+”. Si tu cuenta es de capitán, primero activá “Administración de ligas”. Cargá al menos nombre y ubicación; opcionalmente sumá descripción, logo, portada, canchas, árbitros, reglas y redes. Para editarla, usá el lápiz de su tarjeta en la lista. El nombre debe ser único.",
    keywords: ["crear liga", "editar", "nombre", "ubicacion", "canchas"],
  },
  {
    id: "canchas",
    category: "ligas-divisiones",
    question: "¿Cómo configuro las canchas?",
    answer:
      "En el formulario de liga activá “¿Programás partidos en varias canchas?” y registrá al menos dos canchas activas con nombres únicos. La portada no es una cancha programable. Al crear o editar una división podés usar el mismo horario en todas o indicar en qué canchas juega, con días y horas por cancha.",
    keywords: ["cancha", "horario", "multiples", "sede"],
  },
  {
    id: "crear-division",
    category: "ligas-divisiones",
    question: "¿Cómo creo una división?",
    answer:
      "Desde el detalle de la liga, pestaña Divisiones, tocá Agregar o el lápiz de una existente. Definí nombre, cupo, costo de arbitraje, duración, descanso, categoría, tipo, formato, regla de penales y horario. El formato de competencia queda fijo después de crearla.",
    keywords: ["division", "formato", "categoria", "arbitraje", "cupo"],
  },
  {
    id: "estados-division",
    category: "ligas-divisiones",
    question: "¿Qué significan los estados de una división?",
    answer:
      "Borrador está oculta al público; “Publicar división” en el menú de tres puntos la pasa a En Curso y la hace visible. En Curso podés regresarla a borrador. Finalizada y Cancelada son de solo lectura: usá “Reabrir división” para volver a En Curso. “Reiniciar división” borra jornadas, partidos, eliminatorias y estadísticas, conserva los equipos, archiva el campeón y vuelve a En Curso.",
    keywords: ["borrador", "publicar", "en curso", "reabrir", "reiniciar", "finalizada"],
  },
  {
    id: "agregar-equipos-division",
    category: "ligas-divisiones",
    question: "¿Cómo agrego, quito o reemplazo equipos en una división?",
    answer:
      "El equipo debe existir en la cuenta de su capitán: pedile que abra Mis equipos y muestre su QR. En la división abrí Equipos → Agregar → “Agregar equipo nuevo” y escanealo. Desde Agregar también podés reemplazar un equipo conservando jornadas, resultados, puntos, goles, saldo y eliminatorias. Publicar no bloquea agregar, reemplazar ni quitar equipos.",
    keywords: ["qr", "agregar equipo", "reemplazar", "quitar", "escanear"],
  },
  // Programación
  {
    id: "generar-jornada",
    category: "programacion",
    question: "¿Cómo preparo y genero una jornada?",
    answer:
      "En Equipos marcá quiénes participan en la próxima fecha: representan el arbitraje pagado de la semana y se necesitan al menos dos en una competencia con fase de liga. Después abrí Programación: hay un slot regular por cada par habilitado. Ajustá fecha, hora, cancha y equipos, sumá amistosos o complementos si hace falta, resolvé los conflictos de cancha y tocá “Generar jornada”. En eliminatoria pura los participantes los define el cuadro.",
    keywords: ["jornada", "programacion", "slots", "habilitados", "generar", "arbitraje pagado"],
  },
  {
    id: "tipos-partido",
    category: "programacion",
    question: "¿Qué tipos de partido admite la programación?",
    answer:
      "Regular: ambos suman puntos. Amistoso: ninguno suma. Completar: el visitante no suma. Eliminatoria: pertenece al cuadro. Los regulares se calculan solos; amistosos y complementos se agregan a mano durante la fase de liga. Con un número impar, elegí quién descansa o usá un complemento.",
    keywords: ["regular", "amistoso", "complemento", "eliminatoria", "descanso", "puntos"],
  },
  {
    id: "eliminatorias",
    category: "programacion",
    question: "¿Cómo genero las eliminatorias?",
    answer:
      "Con al menos dos equipos, abrí el menú de tres puntos y tocá “Generar eliminatorias”. Elegí cuántos pasan y la siembra: por posiciones solo si hubo fase de liga, sorteo aleatorio o cruces manuales. Después programá fecha, hora y cancha de esos partidos en Programación. Al terminar la final, asigná el campeón.",
    keywords: ["playoffs", "eliminatorias", "siembra", "cuadro", "cruces", "final"],
  },
  {
    id: "resultados",
    category: "programacion",
    question: "¿Cómo registro o corrijo resultados?",
    answer:
      "Abrí la Jornada, entrá al partido y cargá el marcador; si corresponde, sumá participantes, goleadores, notas y penales. “Finalizar partido” actualiza la tabla cuando aplica. Un partido finalizado se puede corregir sin borrarlo, suspender o reabrir; al reabrirlo se borran marcador, penales, goleadores y alineación para cargarlo de nuevo. En Opciones podés activar el registro de participantes y la tabla de goleo; con participantes activos, todo goleador debe estar en la alineación.",
    keywords: ["resultado", "marcador", "goleadores", "finalizar", "corregir", "penales", "alineacion"],
  },
  {
    id: "campeon",
    category: "programacion",
    question: "¿Cómo se asigna el campeón?",
    answer:
      "Guardar el resultado de la final finaliza la división, pero no asigna el campeón. Volvé al detalle y tocá el aviso o Opciones → “Asignar campeón”. La app sugiere al ganador de la final y, si hay tabla de goleo, al líder (que podés omitir), pero podés elegir otro equipo. Después puede editarse o quitarse.",
    keywords: ["campeon", "final", "goleo", "trofeo", "ganador"],
  },
  // Compartir y avisos
  {
    id: "compartir",
    category: "compartir-avisos",
    question: "¿Cómo comparto una liga o un equipo?",
    answer:
      "Abrí su ficha pública y tocá el icono Compartir: Tenka envía un enlace a esa vista pública. Hoy se pueden compartir ligas, equipos y la plantilla de un equipo dentro de una división. Las fichas de jugador y partido aún no tienen botón Compartir.",
    keywords: ["compartir", "enlace", "publico", "difundir"],
  },
  {
    id: "qr-equipo",
    category: "compartir-avisos",
    question: "¿Para qué sirve el QR de un equipo?",
    answer:
      "Identifica al equipo para inscribirlo en una división. El capitán lo muestra desde Mis equipos y el organizador lo escanea desde Equipos → Agregar en la división. No abre la liga pública ni se escanea desde Inicio.",
    keywords: ["qr", "codigo", "escanear", "inscribir"],
  },
  {
    id: "notificaciones",
    category: "compartir-avisos",
    question: "¿Cómo recibo avisos de una división?",
    answer:
      "Abrí la liga, elegí la división y tocá “Seguir esta división”. Concedé el permiso de notificaciones cuando se pida; el botón cambia a “Siguiendo esta división”. Tocá de nuevo para dejar de seguirla. El seguimiento es por división, independiente de Favoritos, y está pensado para avisarte cuando se publiquen jornadas. Si no se activa, revisá que las notificaciones de Tenka estén permitidas en el dispositivo.",
    keywords: ["notificaciones", "seguir", "division", "jornada", "permiso"],
  },
  {
    id: "arbitro",
    category: "compartir-avisos",
    question: "¿Cómo doy acceso a un árbitro y cómo carga el resultado?",
    answer:
      "Como organizador: abrí división, jornada y partido, desplegá “Acceso del árbitro” y tocá “Crear y compartir”. Es un enlace sin sesión, de un solo uso, con vencimiento y revocable. Como árbitro: abrí el enlace en Tenka, cargá goles y, si corresponde, participantes, goleadores, penales y notas, y tocá “Finalizar partido” solo cuando sea definitivo. Si ves “Enlace no válido”, pedí uno nuevo: el anterior expiró, se revocó, ya se usó o está incompleto.",
    keywords: ["arbitro", "enlace", "token", "captura", "finalizar", "revocar"],
  },
];
