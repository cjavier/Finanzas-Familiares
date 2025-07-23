Documentación de Vistas / URLs del MVP

1. / — Landing Page
Funcionalidad:
Página pública de bienvenida y presentación de la aplicación.
Características principales:
Explicación visual y breve de la app.


Botones claros para “Iniciar sesión” y “Crear cuenta”.


Diseño responsivo y atractivo.


Sección de preguntas frecuentes o ventajas destacadas.



2. /login — Iniciar sesión
Funcionalidad:
Acceso de usuarios existentes.
Características principales:
Formulario para email y contraseña.


Link para recuperar contraseña.


Acceso rápido a registro.



3. /register — Registro
Funcionalidad:
Registro de nuevo usuario y creación de equipo/familia.
Características principales:
Formulario para nombre, correo, contraseña, nombre de familia/equipo.


Opción para unirse con código de invitación (si ya existe el equipo).



4. /onboarding — Onboarding inicial
Funcionalidad:
Configuración rápida tras registro.
Características principales:
Paso 1: Selección de categorías sugeridas (color e ícono random).


Paso 2: Agregar nuevas categorías fácilmente.


Paso 3: Asignar presupuesto inicial a cada categoría.


Mensaje de que los datos pueden editarse después.


Proceso visual, amigable y gamificado.



5. /dashboard — Dashboard principal
Funcionalidad:
Vista central con resumen del estado financiero.
Características principales:
Barra de progreso por cada categoría (con color, ícono y presupuesto/gasto actual).


Gráficos tipo pastel o barras para ver la distribución de gastos.


Acceso rápido a agregar transacción, abrir el agente o ver notificaciones.


Resumen de notificaciones o alertas recientes.


Filtros por mes, usuario y categoría.



6. /transactions — Listado de transacciones
Funcionalidad:
Gestión y búsqueda de todas las transacciones.
Características principales:
Tabla o lista con filtros (fecha, categoría, usuario, fuente).


Acciones rápidas para editar, reclasificar o eliminar.


Buscador por texto en descripción.


Botón para agregar transacción manualmente.


Paginación o scroll infinito.


Vista de detalles de cada transacción al hacer clic.



7. /transactions/add — Agregar transacción manual
Funcionalidad:
Registrar un nuevo gasto/ingreso de forma manual.
Características principales:
Formulario simple con campos: monto, categoría (visual, con color e ícono), fecha, descripción.


Selección de usuario si hay multiusuario.


Confirmación visual y redirección tras guardar.



8. /categories — Gestión de categorías
Funcionalidad:
Ver, crear, editar y eliminar categorías.
Características principales:
Listado visual de categorías con color e ícono.


Botón para agregar nueva categoría (color e ícono random por default).


Edición inline de nombre, ícono y color.


Confirmación antes de eliminar.



9. /budgets — Gestión de presupuestos
Funcionalidad:
Visualizar y editar presupuestos asignados a cada categoría.
Características principales:
Tabla o tarjetas mostrando: categoría, monto asignado, monto gastado, % usado.


Edición rápida de montos asignados.


Selector de periodo (mensual, semanal, quincenal).


Indicación visual cuando una categoría está cerca o supera el presupuesto.



10. /rules — Reglas automáticas
Funcionalidad:
Gestión de reglas para clasificación automática de transacciones.
Características principales:
Lista de reglas existentes, mostrando campo y texto de match.


Crear, editar o eliminar reglas fácilmente.


Activar/desactivar reglas.


Selección visual de categoría para cada regla.



11. /files — Historial de archivos
Funcionalidad:
Gestión de archivos subidos (estados de cuenta, tickets, etc).
Características principales:
Lista de archivos subidos con tipo, fecha y estado (procesando, listo, error).


Ver detalles de cada archivo y las transacciones generadas.


Descargar archivo original.



12. /notifications — Centro de notificaciones
Funcionalidad:
Visualización y gestión de notificaciones internas.
Características principales:
Lista tipo inbox con notificaciones (título, resumen, leída/no leída).


Marcar como leída individual o masivamente.


Notificaciones relacionadas a transacciones y presupuestos.


Acceso rápido desde el icono de campanita.



13. /team — Gestión de equipo/familia
Funcionalidad:
Gestión de miembros del equipo/familia.
Características principales:
Listado de miembros (nombre, email, rol).


Invitar nuevos miembros por email.


Cambiar rol (admin/miembro), eliminar miembros (solo admin).


Editar nombre y detalles del equipo.



14. /profile — Perfil de usuario
Funcionalidad:
Edición de información personal del usuario.
Características principales:
Ver y editar nombre, email y contraseña.


Opción de darse de baja o cambiar contraseña.


Preferencias personales de notificaciones.



15. /logout — Cerrar sesión
Funcionalidad:
Cerrar sesión y redireccionar a login.
Características principales:
Logout inmediato y seguro.



16. /agente — Agente de IA interactivo
Funcionalidad:
Interfaz central de chat con agente de inteligencia artificial.
Características principales:
Ventana de chat donde se pueden subir archivos (imágenes, PDF, Excel, CSV, etc).


El agente puede analizar archivos y extraer, crear o editar transacciones directamente.


Herramientas del agente para: consultar transacciones, clasificarlas, sugerir reglas, crear nuevas, reclasificar, etc.


Posibilidad de corregir o confirmar acciones sugeridas por el agente.


Historial de interacción visible.


Diseño intuitivo, fácil de usar y amigable.



Notas generales para todas las vistas
Todas las vistas internas deben requerir autenticación.


El header/nav debe dar acceso a: Dashboard, Agente, Notificaciones, Perfil y Logout.


Toda la app debe ser responsiva y optimizada para móvil y escritorio.


Visual consistente, limpio y amigable en todas las pantallas.



