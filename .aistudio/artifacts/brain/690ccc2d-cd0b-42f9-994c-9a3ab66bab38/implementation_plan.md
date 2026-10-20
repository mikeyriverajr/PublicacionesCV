# Plan de Corrección: Persistencia Real en Firebase, Botones Activos y Ocultación del PIN

Este plan resuelve los tres problemas detectados tras publicar la aplicación en GitHub Pages: que los botones (borrar, crear, editar, pedir) tengan efecto inmediato y permanente en Firebase Firestore, y que el código PIN del encargado nunca se muestre en la interfaz.

### User Review & Critical Decisions

> [!IMPORTANT]
> Se identificaron las causas exactas por las que los botones parecían no hacer nada y por qué el PIN era visible:

1. **Causa de que nada se guardara ni borrara en Firebase (`firestore.rules` + estado local)**:
   - En `firestore.rules`, la condición `allow list: if existing().id is string;` bloqueaba las consultas generales (`collection(db, 'publications')`, `'publishers'`, `'orders'`) porque el motor de consultas de Firestore rechaza lecturas de colecciones completas si la regla exige evaluar campos internos sin un filtro `where`.
   - Al fallar esa lectura inicial, la carga de datos semilla (`ensureFirestoreSeeded`) y la suscripción en tiempo real (`onSnapshot`) eran rechazadas por permisos, dejando la pantalla congelada con los datos de ejemplo en memoria sin aplicar los cambios de ningún botón.
2. **Solución de Persistencia y Respuesta Inmediata**:
   - Ajustar `firestore.rules` (y desplegarlas a Firebase) para permitir las lecturas de las colecciones de la congregación (`allow get, list: if true;`) manteniendo la validación de datos al escribir y borrar.
   - Implementar **actualización optimista inmediata** en el estado de React (`setDb`) además de la escritura en Firebase y el respaldo en `localStorage`, de modo que cada clic en cualquier botón (borrar publicador, cambiar stock, pedir, cancelar pedido, destacar publicación) actualice la pantalla al instante y persista en la nube.
   - Guardar una bandera de inicialización (`seeded: true` en `/settings/main`) para que, una vez que el encargado borre los publicadores o publicaciones de prueba, **nunca vuelvan a reaparecer** al recargar la página.
3. **Ocultar el PIN del Encargado en la Interfaz**:
   - Eliminar el texto `(por defecto: {db.adminPin})` que aparecía dentro de la ventana emergente de acceso del encargado, para que ningún publicador pueda ver el PIN en pantalla.

---

### 1. Overview & Core Concept

- **Qué Corrige**:
  - **Efecto Real e Inmediato en Todos los Botones**: Crear, editar y borrar publicadores (individual o en masa), crear/borrar publicaciones, cambiar stock (`-` / `+`), destacar publicaciones, hacer pedidos y cancelarlos tendrá efecto inmediato en pantalla y quedará guardado permanentemente en Firebase Firestore.
  - **No Reaparición de Datos Borrados**: Al marcar el documento `/settings/main` como inicializado, si el encargado borra los publicadores o publicaciones de ejemplo (incluso si deja la lista vacía temporalmente), el sistema respetará esa eliminación y no volverá a inyectar los datos de muestra.
  - **Privacidad del PIN**: El modal de ingreso al panel del encargado solo mostrará el campo de contraseña enmascarado (`••••`) sin revelar jamás cuál es el PIN actual.

---

### 2. User Experience & Visual Design

- **Flujo Corregido en Todos los Controles**:
  - Al pulsar **Eliminar** sobre un publicador, publicación o pedido: desaparece de inmediato de la lista y se elimina del servidor de Firebase Firestore.
  - Al pulsar **`-` / `+`** en el stock o **Destacar**: el número y el estado cambian al instante en la interfaz y se sincronizan con Firebase.
  - Al pulsar **Encargado**: se solicita únicamente introducir el PIN secreto sin mostrar pistas ni el valor del PIN en el texto del cuadro de diálogo.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Actualización Optimista + Sincronización con Firestore**
  - *Enfoque Elegido*: Cada acción actualiza primero el estado visual de la aplicación (`setDb`) y simultáneamente ejecuta la operación en Firebase Firestore (`setDoc` / `deleteDoc` / `writeBatch`).
  - *Por qué*: Garantiza que la interfaz responda en 0 milisegundos al tocar cualquier botón en el celular y que los cambios queden guardados en la nube.

- **Decisión 2: Control de Semilla Inicial (`seeded: true` en `/settings/main`)**
  - *Enfoque Elegido*: Verificar el documento `/settings/main` antes de cargar datos de ejemplo; una vez inicializado por primera vez, nunca vuelve a rellenar datos borrados.
  - *Por qué*: Evita que al borrar todos los datos de ejemplo se vuelvan a crear automáticamente al refrescar la página.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌──────────────────────────────────────────────────────────────────────┐
│                   Acción del Usuario en un Botón                     │
│  (Pedir · Cancelar · Borrar Hermano · Cambiar Stock · Destacar · PIN)│
└──────────────────┬───────────────────────────────────┬───────────────┘
                   │ 1. Actualización Inmediata (0ms)  │ 2. Escritura Cloud
                   ▼                                   ▼
        ┌─────────────────────┐             ┌─────────────────────┐
        │ Estado Local React  │             │ Firebase Firestore  │
        │ + localStorage      │◄────────────┤ (Reglas Corregidas  │
        │ (UI se actualiza ya)│  onSnapshot │  y Desplegadas)     │
        └─────────────────────┘             └─────────────────────┘
```

- **Ajustes en Reglas de Firestore (`firestore.rules`)**:
  - Permitir `get` y `list` en `/settings/{settingId}`, `/publications/{publicationId}`, `/publishers/{publisherId}` y `/orders/{orderId}` sin bloqueos de filtro para que `onSnapshot` funcione tanto en AI Studio como en GitHub Pages.
  - Mantener las validaciones de estructura y tipos en `create`, `update` y `delete`, y desplegar las reglas actualizadas directamente a Firebase mediante `DeployRules`.
