# Plan de Implementación: Edición de Catálogo, Pantalla Principal Limpia e Importador Universal de PDF

Este plan reúne las mejoras seleccionadas para hacer la pantalla de los hermanos mucho más clara en celular, permitir al encargado editar cualquier publicación del catálogo y dejar el importador de PDF completamente genérico.

### User Review & Critical Decisions

> [!IMPORTANT]
> Resumen de los cambios que se implementarán al aprobar el plan:

- **1. Editar Publicaciones en el Catálogo del Encargado**:
  - Cada publicación en **Encargado → Catálogo** tendrá un botón de **Editar** (icono de lápiz `Edit3`, igual que en la lista de hermanos).
  - Al tocarlo, permitirá modificar el **símbolo/código** (ej. `bhs`, `nwt`), el **título o descripción**, la **categoría**, el **idioma** y la **nota de publicación destacada**, guardando el cambio directamente en Firebase Firestore.
- **2. Página Principal de Publicadores Más Limpia y Amigable**:
  - **Secciones plegables por categoría**: Debajo de las *Publicaciones Destacadas* y del buscador, las publicaciones estarán organizadas en secciones desplegables (**Biblias**, **Libros**, **Letra Grande**, **Folletos y Tratados**, **Revistas**). Cuando el hermano escribe en el buscador, los resultados aparecen abiertos automáticamente.
  - **Filas limpias sin ruido visual**: Se oculta el texto repetitivo `· Español` (solo se muestra el idioma si es distinto de Español) y se ocultan los formularios internos del siervo (`Formularios y Suministros` / `S-4`) en la vista de publicadores para no confundirlos.
  - **Elegir cantidad al tocar «Pedir»**: Se quitan los selectores `- 1 +` repetidos en cada fila. Cada publicación muestra únicamente su título, código y el botón **«Pedir»**. Al tocar **«Pedir»**, se abre una ventana compacta para confirmar (con cantidad `1` lista por defecto, o la opción de ajustar con `-` / `+` o escribir cualquier número) y enviar el pedido.
- **3. Ventana «Importar PDF» 100 % Genérica**:
  - Se elimina el botón temporal *"Cargar tu PDF de Libros (32 títulos)"* y queda únicamente el botón universal **«Seleccionar archivo PDF»**, que detecta y lee automáticamente cualquier PDF de **Informe de Inventario** (con cantidades) o de **Catálogo de JW Hub** (sin cantidades).

---

### 1. Archivos que se Modificarán

1. **`src/components/ServantPanel.tsx`**:
   - Añadir estado de edición (`editingPubId`, `editPubCode`, `editPubTitle`, `editPubCategory`, `editPubLanguage`, `editPubFeaturedNote`) y el formulario en línea para editar y guardar cualquier publicación del catálogo.
2. **`src/components/PublisherPortal.tsx`**:
   - Agrupar el catálogo en secciones plegables por categoría (`Biblias`, `Libros`, `Letra Grande`, `Folletos y Tratados`, `Revistas`).
   - Filtrar los formularios internos (`Formularios y Suministros`, código `S-4`) de la vista de publicadores y ocultar el idioma cuando sea `Español`.
   - Reemplazar los controles `- 1 +` en cada fila por un modal/cuadro compacto de confirmación de cantidad al pulsar **«Pedir»**.
3. **`src/components/InventoryPdfImportModal.tsx`**:
   - Retirar el botón y listado estático de los 32 libros, dejando únicamente el botón universal **«Seleccionar archivo PDF»** con soporte para ambos tipos de PDF de JW Hub.
