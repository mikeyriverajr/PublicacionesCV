# Plan de Implementación: Cantidades sin Límite, Mensaje de WhatsApp y Pedidos Verbales

Este plan incorpora los tres ajustes solicitados para agilizar los pedidos de publicaciones, las notificaciones por WhatsApp y el registro de pedidos verbales por parte del encargado.

### User Review & Critical Decisions

> [!IMPORTANT]
> Resumen de los 3 cambios que se aplicarán:

- **1. Sin límite máximo de cantidad al hacer pedidos**:
  - Se eliminan los topes de `99` y `500` unidades tanto en la vista de **Publicadores** como en el panel del **Encargado**, en la lógica de guardado (`App.tsx` y `firebase.ts`) y en las reglas de seguridad de **Firestore** (`firestore.rules`).
  - Además de los botones `-` y `+`, el cuadro de número permitirá escribir directamente cualquier cantidad (por ejemplo `250`, `1000`, `3000`) sin restricciones.
- **2. Mensaje de WhatsApp más directo**:
  - Se elimina la oración `Te escribimos del mostrador de publicaciones (...).` en `src/utils/whatsapp.ts`.
  - El nuevo texto será:
    > *Hola Mike, ¡buen día! Te avisamos que ya llegó al Salón del Reino tu pedido especial: 50 ejemplares de "Traducción del Nuevo Mundo" (nwt) en Español. Puedes pasar a recogerlo en la próxima reunión. ¡Muchas gracias!*
- **3. Buscador rápido en «+ Anotar pedido» para pedidos verbales**:
  - En el formulario **«+ Anotar pedido»** del Encargado (pestaña *Pedidos*), se reemplazan las listas simples por campos con búsqueda instantánea al escribir tanto el **nombre del publicador** como la **publicación o código**, y entrada libre de cantidad sin límite.
  - Asimismo, el encargado también puede usar en cualquier momento la pestaña principal **Pedir** seleccionando el nombre del hermano que se lo pidió en persona.

---

### 1. Archivos que se Modificarán

1. **`src/utils/whatsapp.ts`**:
   - Actualizar `buildWhatsAppArrivalUrl` para retirar la frase `Te escribimos del mostrador de publicaciones (${congregationName}).`.
2. **`src/components/PublisherPortal.tsx`**:
   - Quitar el límite `99` en las tarjetas de **Publicaciones Destacadas** y del **Catálogo Completo**, permitiendo además escribir directamente el número de ejemplares en el campo numérico entre los botones `-` y `+`.
3. **`src/components/ServantPanel.tsx`**:
   - Mejorar el panel **«+ Anotar pedido»** con buscador escribiendo para elegir rápidamente al hermano y la publicación cuando alguien hace un pedido verbal, y quitar el atributo `max={99}` en el campo de cantidad.
4. **`src/App.tsx`, `src/firebase.ts` y `firestore.rules`**:
   - Quitar el tope de `500` unidades en `quantity` para que Firestore acepte pedidos de cualquier cantidad válida (`>= 1`).
