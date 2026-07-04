# Especificación Técnica: Módulo del Empleado (App de Asistencia)

Este documento es una guía detallada (o *prompt* maestro) que puedes copiar y pegar en otra inteligencia artificial o usar como plano de construcción para replicar la lógica exacta del empleado en tu proyecto de aplicación móvil.

---

## 1. Objetivo del Módulo
El objetivo principal es permitir a los empleados registrar su asistencia diaria (entrada y salida) basándose en su ubicación GPS. El sistema debe validar que el empleado se encuentre físicamente dentro de una geocerca asignada (Sede) y determinar automáticamente si está llegando tarde o saliendo temprano.

---

## 2. Estructura de la Base de Datos (Firebase Firestore)

La aplicación móvil deberá conectarse a las siguientes colecciones en Firestore:

### A. Colección `users` (Perfiles de Empleados)
Cada documento es el UID del usuario de Firebase Authentication.
- `role`: string (debe ser `"employee"`).
- `zoneId`: string (ID de la sede a la que pertenece).

### B. Colección `zones` (Geocercas/Sedes)
- `id`: string
- `name`: string
- `polygon`: array de objetos `{ lat: number, lng: number }` (4 puntos exactos).
- `entryTime`: string (ej. `"08:00"`).
- `exitTime`: string (ej. `"17:00"`).

### C. Colección `asistencias` (Historial de Registros)
- `userId`: string (ID del empleado).
- `zoneId`: string (ID de la sede donde marcó).
- `date`: string (formato `YYYY-MM-DD`).
- `checkIn`: string (ISO String de la hora de entrada).
- `checkInStatus`: string (`"on-time"` o `"late"`).
- `checkOut`: string (opcional, ISO String de la hora de salida).
- `checkOutStatus`: string (opcional, `"on-time"` o `"early"`).

### D. Colección `justificaciones` (Excusas por tardanza/ausencia)
- `userId`: string.
- `date`: string (`YYYY-MM-DD`).
- `reason`: string (Texto escrito por el empleado).
- `status`: string (`"pending"`, `"approved"`, `"rejected"`).

---

## 3. Lógica y Flujo del Botón Principal (Marcar Entrada/Salida)

La pantalla principal del empleado debe tener un botón grande que cambia dinámicamente de estado siguiendo esta lógica al cargar la aplicación:

1. **Consultar Asistencia de Hoy:** La app debe consultar la colección `asistencias` buscando un documento donde `userId == [mi_id]` y `date == [fecha_de_hoy]`.
2. **Estado 1 (No hay registro hoy):** El botón debe ser VERDE y decir **"Marcar Entrada"**.
3. **Estado 2 (Hay registro de Entrada, pero no de Salida):** El botón debe ser ROJO/NARANJA y decir **"Marcar Salida"**.
4. **Estado 3 (Ya hay Entrada y Salida):** El botón debe estar DESHABILITADO, de color gris y decir **"Turno Completado"**.

---

## 4. Algoritmo de Geolocalización al Presionar el Botón

Cuando el empleado presiona el botón, la app móvil debe ejecutar este flujo exacto:

1. Extraer las coordenadas GPS actuales del teléfono (`userLocation`).
2. Descargar la información de la sede asignada al empleado (usando su `zoneId`).
3. Comprobar si `userLocation` está **adentro del polígono** de la sede (usar librerías de punto en polígono).
4. **Tolerancia GPS (CRÍTICO):** Si el empleado está fuera del polígono, calcular la distancia desde `userLocation` hasta el *centro geográfico* del polígono de la sede. Si la distancia es **menor a 150 metros**, aprobar la validación (esto absorbe el rebote e imprecisión de los GPS de los celulares).
5. Si falla ambas (polígono y tolerancia), mostrar error: *"Estás a X metros de la sede. Acércate."* y detener el flujo.

---

## 5. Algoritmo de Tiempo y Guardado en Firebase

Si la geolocalización es exitosa, se procede a guardar:

**Si es una ENTRADA:**
- Leer `entryTime` de la sede asignada (ej. `08:00`). Convertirlo a Date.
- Si la hora actual es MAYOR a `entryTime`, `isLate = true`.
- Crear el documento en la colección `asistencias` con `date`, `checkIn` (hora actual), y `checkInStatus` (`late` o `on-time`).
- **Evento Especial:** Si `isLate == true`, abrir inmediatamente una ventana modal (Pop-up) obligando al usuario a escribir una Justificación.

**Si es una SALIDA:**
- Leer `exitTime` de la sede asignada (ej. `17:00`). Convertirlo a Date.
- Si la hora actual es MENOR a `exitTime`, `isEarly = true`.
- Actualizar el documento de asistencia de hoy añadiéndole `checkOut` (hora actual) y `checkOutStatus` (`early` o `on-time`).

---

## 6. Panel de Historial y Justificaciones (UI/UX)

Debajo del botón principal, la pantalla del empleado debe tener dos secciones:

1. **Mi Historial Reciente:** Una lista que consulta las últimas asistencias del empleado. Por cada día, debe mostrar la Fecha, la Hora de Entrada (indicando en rojo si fue tarde) y la Hora de Salida (indicando en rojo si salió temprano).
2. **Mis Justificaciones:** Una lista que consulta la colección `justificaciones` de este empleado. Debe mostrar la fecha, el motivo escrito, y un badge (etiqueta) con el estado: Pendiente (amarillo), Aprobada (verde), o Rechazada (rojo). *Nota: El botón manual de enviar justificación fue eliminado; solo se pueden enviar cuando el sistema detecta una tardanza automáticamente.*
ITE_FIREBASE_API_KEY="AIzaSyDRrI9ECQB28mu71ioBoNmSt8OB9HmU8CM"
VITE_FIREBASE_AUTH_DOMAIN="admin-asistencia-2c3cb.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="admin-asistencia-2c3cb"
VITE_FIREBASE_STORAGE_BUCKET="admin-asistencia-2c3cb.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="651527062888"
VITE_FIREBASE_APP_ID="1:651527062888:web:212672e8cac54fcc98c2dd"
VITE_FIREBASE_MEASUREMENT_ID="G-C88TC29Y01"
