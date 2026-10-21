# Plan de Implementación: Importador de PDF de Inventario Mensual (JW Hub)

Esta función permite al encargado subir directamente el archivo PDF oficial de **Informe de inventario — Publicaciones de la congregación (JW Hub)** desde su celular o computadora para leer automáticamente todas las publicaciones y sus cantidades, previsualizar los cambios y actualizar el inventario en Firebase Firestore en un solo clic (creando además las publicaciones que aún no existan en el catálogo).

### User Review & Critical Decisions

> [!IMPORTANT]
> Se ha actualizado el plan con el formato exacto de tu PDF en español (`INFORME DE INVENTARIO — Septiembre de 2026 | Español`), manteniendo además compatibilidad si alguna vez se sube en inglés:

- **1. Reconocimiento Exacto del Formato de JW Hub en Español**:
  - Detecta el período y el idioma directamente del encabezado (ej. `Septiembre de 2026 | Español`).
  - Reconoce las secciones oficiales del PDF (`Biblias`, `Libros`, `Folletos`, `Formularios y suministros`, `Revistas para el público`) para clasificar cada publicación automáticamente.
  - Extrae cada fila con el formato `(código) Título Cantidad` (ej. `(nwt) Traducción del Nuevo Mundo 52`, `(bhs) Nos enseña 48`, `(lffi) Disfrute de la vida (folleto) 2476`, `(g18.3) ¡Despertad! 321`).
  - Ignora automáticamente las filas de resumen `Otros` (`Otros 1`, `Otros 28`, `Otros 1482`).
- **2. Actualización y Creación Automática con Vista Previa**:
  - Si el código ya existe en el catálogo (ej. `nwt`, `lffi`, `lmd`), actualiza su cantidad en existencia (`stockCount`) con el número del PDF.
  - Si la publicación aún no está en la aplicación (ej. `bhs`, `kr`, `lvs`, `sjjls`, `fg`), la marca como **[Nueva]** en la vista previa y la crea automáticamente en el catálogo al confirmar.
- **3. Funciona 100 % en el Navegador (Compatible con GitHub Pages y Gratis)**:
  - Usa `pdfjs-dist` directamente en el navegador sin requerir servidor backend ni claves de pago, por lo que funcionará tanto aquí como en tu página publicada en **GitHub Pages**.

---

### 1. Overview & Core Concept

- **Qué Hace**:
  1. En el panel del **Encargado** → pestaña **Catálogo**, añade un botón **"Importar PDF"**.
  2. Al seleccionar el archivo PDF descargado de JW Hub, lee todas las páginas y abre una **Ventana de Vista Previa**:
     - Muestra la lista completa de publicaciones encontradas en el PDF con su código, título, sección y cantidad (`35 publicaciones` en el PDF de ejemplo).
     - Distingue claramente cuáles **actualizarán su stock actual** (`Stock anterior → Nuevo stock`) y cuáles **se agregarán como nuevas** al catálogo.
     - Incluye casillas de selección por si el encargado desea excluir alguna fila o sección (por ejemplo, si prefiere no publicar formularios como `(S-4) Informe del servicio del campo` en la lista de los publicadores).
  3. Al pulsar **"Confirmar e Importar"**, actualiza el estado en pantalla al instante y guarda todos los cambios en bloque (`writeBatch`) en Firebase Firestore.

---

### 2. User Experience & Visual Design

- **Flujo Paso a Paso del Encargado**:
  1. Entra a **Encargado** → **Catálogo** y toca el botón **"Importar PDF"**.
  2. Selecciona el archivo `Informes_de_inventario...pdf` en su celular o computadora.
  3. Revisa la vista previa de las publicaciones detectadas y confirma con un toque.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Extracción de Filas por Coordenadas `(X, Y)` en PDF.js**
  - *Enfoque Elegido*: Agrupar los fragmentos de texto del PDF por su posición vertical (`Y`) y unirlos de izquierda a derecha (`X`) antes de aplicar la expresión regular `^\(([A-Za-z0-9.\-]+)\)\s+(.+?)\s+(\d+)$`.
  - *Por qué*: Garantiza que cada fila se reconstruya con precisión total entre las 3 páginas del informe.

- **Decisión 2: Identificación Clara de Ediciones de Revistas**
  - *Enfoque Elegido*: En la sección `Revistas para el público`, como varias filas tienen el mismo título `(g18.3) ¡Despertad!` o `(wp18.3) La Atalaya (ed. para el público)`, se conserva el código exacto (`g18.3`, `wp18.3`, etc.) para que cada número de revista se distinga claramente.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌─────────────────────────────────────────────────────────────────────────┐
│     PDF Subido: "INFORME DE INVENTARIO — Septiembre de 2026 | Español"  │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ Lectura Local en Navegador (pdfjs-dist)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             Analizador de Filas y Secciones de JW Hub                   │
│  • Detecta sección: Biblias, Libros, Folletos, Formularios, Revistas    │
│  • Extrae: (código) Título Cantidad  ──► Ej: (bhs) Nos enseña -> 48     │
│  • Ignora filas "Otros" / "Others"                                      │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Modal de Vista Previa (Selección y Revisión)              │
│  • [✓] (nwt) Traducción del Nuevo Mundo          Stock: 16  ──► 52      │
│  • [✓] (bhs) Nos enseña                          [Nueva]    ──► 48      │
│  • [✓] (lffi) Disfrute de la vida (folleto)      Stock: 52  ──► 2476    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ Confirmar Lote
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│       Actualización Inmediata en UI + Lote en Firebase Firestore        │
└─────────────────────────────────────────────────────────────────────────┘
```
