# Sistema de Gestión de Publicaciones de la Congregación

Plataforma web gratuita, responsiva y optimizada para teléfonos móviles y escritorio, diseñada para que los publicadores soliciten publicaciones destacadas o del catálogo general, consulten las existencias actuales del mostrador y gestionen o cancelen sus pedidos, mientras el encargado administra pedidos especiales, existencias y avisos por WhatsApp desde su celular o computadora.

### User Review & Critical Decisions

> [!IMPORTANT]
> Se han incorporado las 5 mejoras solicitadas junto con las decisiones previas para asegurar una experiencia ágil tanto para los publicadores como para el encargado desde el teléfono móvil.

- **1. Añadir Publicadores en Masa (Nuevo)**: Herramienta de carga rápida en el panel del encargado donde se puede pegar una lista de hermanos (un publicador por línea o separado por comas: `Nombre Completo, Grupo, Teléfono`) copiada desde WhatsApp, notas o Excel para registrar a toda la congregación en segundos.
- **2. Panel Administrativo Optimizado para Móvil (Nuevo)**: Diseño adaptable (*Mobile-First & Touch-Ready*) con botones táctiles amplios ($\ge 44\text{px}$), tarjetas de gestión rápida para usar con una sola mano en el mostrador del Salón del Reino y navegación inferior en pantallas pequeñas, además de vista de tabla completa en computadora.
- **3. Consulta de Existencias para Publicadores (Confirmado y Reforzado)**: Pestaña dedicada **"Existencias en el Salón"** donde los publicadores ven en tiempo real qué publicaciones generales hay físicamente en el mostrador y cuántas unidades quedan disponibles.
- **4. Cancelación de Pedidos por el Publicador (Nuevo)**: Los publicadores cuentan con un botón directo **"Cancelar pedido"** dentro de su vista **"Mis Pedidos"** para anular cualquier solicitud si cometieron un error o ya consiguieron la publicación.
- **5. Publicaciones Destacadas para Pedido Rápido (Nuevo)**: El encargado puede marcar publicaciones como **"Destacadas"** (ej. *Examinando las Escrituras diariamente*, invitaciones de campaña o estrenos de asamblea). Estas aparecen al inicio de la pantalla del publicador para que puedan pedirlas en un solo toque sin buscar en la lista larga.
- **Identificación y Notificaciones (Confirmado)**: Selección del nombre de la lista de publicadores (sin cuentas ni contraseñas) y botón directo de WhatsApp (`wa.me`) con mensaje prellenado cuando el pedido llega al Salón.

---

### 1. Overview & Core Concept

- **Qué Hace**:
  1. **Portal del Publicador (Móvil y Web)**:
     - **Selección rápida de nombre**: El hermano elige su nombre del directorio de la congregación (queda guardado en su dispositivo).
     - **Sección de Publicaciones Destacadas**: Muestra en primer plano las publicaciones de temporada o campaña (ej. *Examinando las Escrituras*, folletos especiales, Biblias) con un botón **"Pedir 1 ejemplar"** o selector de cantidad inmediata sin recorrer todo el catálogo.
     - **Catálogo Completo de Pedidos Especiales**: Buscador por nombre, código (`nwt`, `lff`, `bt`, `od`) o categoría para solicitar publicaciones personales.
     - **Mis Pedidos y Cancelación**: Visualización clara del estado (*Solicitado*, *Pedido a la sucursal*, *Listo en el Salón*, *Entregado*) y opción para **cancelar el pedido** con confirmación inmediata.
     - **Existencias en el Salón**: Lista clara y filtrable de las publicaciones generales que tienen stock físico en el mostrador de la congregación.
  2. **Panel del Encargado (Optimizado para Celular y Escritorio)**:
     - **Control Móvil de Pedidos Especiales**: Tarjetas táctiles en móvil (y tabla en PC) para cambiar el estado con un toque, filtrar por etapa y pulsar **"Avisar por WhatsApp"** cuando la publicación está lista para recoger.
     - **Resumen Consolidado para Sucursal**: Suma automática de todos los pedidos pendientes agrupados por código e idioma para copiarlos fácilmente al sitio web de la sucursal y marcarlos como *"Pedidos a la sucursal"* en bloque.
     - **Gestor de Catálogo, Destacados y Existencias**: Controles rápidos `+` / `-` para ajustar el stock del mostrador desde el celular, e interruptor de estrella (**"Destacar"**) para fijar publicaciones al inicio del portal de los publicadores.
     - **Directorio con Carga Masiva de Publicadores**: Formulario individual y ventana de **Importación en Masa** para pegar decenas de nombres, grupos y teléfonos de una sola vez.

- **Audiencia Objetivo**:
  - **Publicadores de la congregación**: Hermanos de todas las edades que entran desde su teléfono para pedir una publicación destacada, revisar si llegó su pedido especial o consultar si hay existencias en el mostrador.
  - **Encargado de publicaciones y auxiliares**: Hermanos que atienden el mostrador desde su celular o tablet y necesitan registrar entregas, actualizar stock o consolidar el pedido mensual a la sucursal.

---

### 2. User Experience & Visual Design

- **Flujos Principales de Usuario**:
  1. **Pedir una Publicación Destacada sin Buscar en la Lista**:
     - Al abrir la aplicación y seleccionar su nombre, el publicador ve en la parte superior el bloque **"Publicaciones Destacadas"**.
     - Con un solo toque en **"Solicitar"** (pudiendo ajustar cantidad o idioma si aplica), el pedido queda registrado instantáneamente sin navegar por el catálogo largo.
  2. **Consultar Estado o Cancelar un Pedido**:
     - En **"Mis Pedidos"**, el publicador ve sus solicitudes activas con una barra de progreso de 4 etapas (*Solicitado* → *Pedido a sucursal* → *En el Salón* → *Entregado*).
     - Si desea anular su solicitud, pulsa **"Cancelar pedido"** y confirma la acción; el pedido se elimina o marca como cancelado de inmediato para que el encargado no lo pida por demás.
  3. **Ver Existencias del Mostrador**:
     - En **"Existencias en el Salón"**, el publicador revisa las publicaciones generales divididas por categoría (Biblias, Libros, Folletos, Tratados, Revistas) con el indicador exacto de ejemplares disponibles en el mostrador.
  4. **Gestión Móvil del Encargado e Importación Masiva**:
     - En teléfonos móviles, el encargado cuenta con una barra inferior de acceso rápido a: *Pedidos*, *Lote Sucursal*, *Stock/Catálogo* y *Publicadores*.
     - En *Publicadores*, pulsa **"Añadir en Masa"**, pega una lista de líneas (ej. `Juan Pérez, Grupo 1, 5215512345678` o simplemente los nombres uno debajo del otro), previsualiza cuántos hermanos se van a agregar y confirma con un toque.

- **Identidad Visual y Ergonomía Móvil**:
  - *Diseño Touch-First y Escritorio Completo*:
    - Todos los botones, selectores de estado, controles de stock (`-` / `+`) y pestañas tienen un área táctil mínima de $44 \times 44\text{px}$ para evitar toques accidentales en el celular.
    - En pantallas móviles ($375\text{px}$–$430\text{px}$), las tablas administrativas se transforman automáticamente en tarjetas apiladas limpias con acciones de pulgar claras; en escritorio ($1440\text{px}$), se expanden en tablas de alta densidad.
  - *Paleta de Colores (Regla 60-30-10)*:
    - **60 % Lienzo Neutro**: Blanco puro (`#FFFFFF`) sobre fondo piedra suave (`#F8FAFC`).
    - **30 % Estructura**: Bordes sutiles de `1px` (`#E2E8F0`) y texto secundario legible (`#475569`).
    - **10 % Acento y Estados Semánticos (Color + Icono + Texto)**:
      - Azul Profundo (`#1E3A5F`): Acciones principales y publicaciones destacadas.
      - Ámbar (`#D97706`): *Solicitado (Pendiente)*
      - Azul (`#2563EB`): *Pedido a la sucursal*
      - Verde Esmeralda (`#16A34A`): *En el Salón (Listo para recoger)* + Botón WhatsApp
      - Pizarra (`#64748B`): *Entregado*
  - *Tipografía*:
    - Encabezados en `Plus Jakarta Sans`, texto de interfaz en `DM Sans` y códigos de publicación (`nwt`, `lff`, `es26`) y cantidades en `JetBrains Mono` (`tabular-nums`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Publicaciones Destacadas Controladas por el Encargado**
  - *Enfoque Elegido*: Campo booleano `isFeatured` (con nota opcional de campaña, ej. *"Anuario / Texto Diario 2027"* o *"Campaña Especial"*) que posiciona esas publicaciones arriba del todo con botón de pedido directo.
  - *Por qué*: Gran parte de los pedidos especiales de una congregación ocurren en temporadas específicas (como el pedido anual de *Examinando las Escrituras*, agendas o publicaciones nuevas). Destacarlas ahorra tiempo a toda la congregación.

- **Decisión 2: Importación Masiva Tolerante a Formatos Simples**
  - *Enfoque Elegido*: Analizador de texto inteligente que acepta tanto solo nombres (uno por línea) como líneas separadas por coma, punto y coma o tabulación (`Nombre, Grupo, Teléfono` o `Nombre, Teléfono`).
  - *Por qué*: El encargado suele tener la lista de los grupos de servicio en un mensaje de WhatsApp o en una hoja de cálculo; poder copiar y pegar directamente sin formatear archivos complejos ahorra muchísimo trabajo inicial.

- **Decisión 3: Cancelación de Pedidos con Control Transparente**
  - *Enfoque Elegido*: Los publicadores pueden cancelar sus pedidos directamente desde *"Mis Pedidos"*. Si el pedido aún estaba en estado *Solicitado*, se retira de la lista pendiente a pedir a la sucursal; si ya había sido pedido a la sucursal, se advierte al usuario al cancelar o se notifica al encargado.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Diagrama de Arquitectura y Componentes**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│            Navegación Adaptable (Barra Superior PC / Barra Inferior Móvil) │
└───────────────────┬────────────────────────────────────┬───────────────────┘
                    │                                    │
        ┌───────────▼───────────┐            ┌───────────▼───────────┐
        │  Portal Publicador    │            │  Panel Encargado      │
        │  (Móvil y Escritorio) │            │  (Móvil Touch + PC)   │
        └───────────┬───────────┘            └───────────┬───────────┘
                    │                                    │
   ┌───────────┬────┴──────┬───────────┐    ┌────────────┼───────────┬────────────┐
   ▼           ▼           ▼           ▼    ▼            ▼           ▼            ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────┐┌──────────┐┌──────────┐┌───────────┐┌──────────┐
│Destaca- │ │Catálogo │ │Mis      │ │Stock││Pedidos   ││Resumen   ││Catálogo,  ││Directorio│
│das (1   │ │Completo │ │Pedidos +│ │en el││Móvil +   ││Lote para ││Stock (+/-)││+ Carga   │
│Toque)   │ │Especial │ │Cancelar │ │Salón││WhatsApp  ││Sucursal  ││y Destacar ││en Masa   │
└────┬────┘ └────┬────┘ └────┬────┘ └──┬──┘└────┬─────┘└────┬─────┘└─────┬─────┘└────┬─────┘
     │           │           │         │        │           │            │           │
     └───────────┴───────────┴─────────┴───┬────┴───────────┴────────────┴───────────┘
                                           │ API REST (/api/*)
                                           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│              Servidor Backend Express + Almacenamiento Persistente         │
│  • /api/publications       (CRUD, toggle isFeatured, ajuste rápido stock)  │
│  • /api/publishers         (CRUD individual + POST /api/publishers/bulk)   │
│  • /api/orders             (Crear, cancelar pedido, cambiar estado, lote)  │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Modelo de Datos Actualizado**:
  - **Publicación (`Publication`)**:
    - `id`, `code` (ej. `es26`, `nwtsty`, `lff`), `title`, `category`, `language`, `isSpecialOrderEligible` (booleano), `isGeneralStock` (booleano), `isFeatured` (booleano — **Nuevo** para destacar al inicio), `featuredNote` (texto opcional, ej. *"Pedido anual"*), `stockCount` (existencias actuales en el mostrador), `updatedAt`.
  - **Publicador (`Publisher`)**:
    - `id`, `fullName`, `groupName` (ej. *Grupo 1*), `phone` (para WhatsApp), `active`.
  - **Pedido Especial (`SpecialOrder`)**:
    - `id`, `publisherId`, `publisherName`, `publicationId`, `publicationCode`, `publicationTitle`, `language`, `quantity`, `notes`, `status` (`requested` | `ordered_branch` | `ready_pickup` | `delivered` | `cancelled`), `createdAt`, `updatedAt`.

- **Mapeo de Interacciones Clave**:
  - **Pedido Rápido de Destacados**: Tarjeta destacada en la parte superior del portal con botón **"Pedir ahora"** que abre confirmación instantánea con cantidad `1` por defecto (ajustable) y registra el pedido en un toque.
  - **Importación en Masa (`POST /api/publishers/bulk`)**: Cuadro de texto multilínea con vista previa en vivo que detecta nombres, grupos y teléfonos, evita duplicados por nombre exacto e inserta todo el lote de una vez.
  - **Cancelación por el Publicador (`DELETE /api/orders/:id` o cambio a `cancelled`)**: Botón accesible en cada pedido activo del publicador con confirmación en línea para evitar cancelaciones accidentales.
  - **Vista de Existencias para Publicadores**: Filtra todas las publicaciones con `isGeneralStock: true`, mostrando claramente el número de ejemplares disponibles en el Salón del Reino (`Disponible: 18 uds.` o `Agotado temporalmente`).
