# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Global Default Deny**: Any path not explicitly matched (`/settings/{settingId}`, `/publications/{publicationId}`, `/publishers/{publisherId}`, `/orders/{orderId}`) is strictly denied (`allow read, write: if false;`).
2. **ID Poisoning Guard**: Every single-document path variable (`settingId`, `publicationId`, `publisherId`, `orderId`) must match `^[a-zA-Z0-9_\-]+$` and have a length `<= 128`.
3. **Strict Key & Schema Validation (`hasAll` & `hasOnly`)**:
   - `CongregationSettings`: Only allows `['congregationName', 'adminPin', 'updatedAt']` with bounded string lengths.
   - `Publication`: Requires `['id', 'code', 'title', 'category', 'language', 'isSpecialOrderEligible', 'isGeneralStock', 'isFeatured', 'stockCount', 'updatedAt']` and only allows optional `'featuredNote'`. `stockCount` must be a non-negative number (`>= 0 && <= 100000`).
   - `Publisher`: Requires and only allows `['id', 'fullName', 'groupName', 'phone', 'active']` with bounded string lengths (`fullName.size() >= 1 && fullName.size() <= 150`).
   - `SpecialOrder`: Requires `['id', 'publisherId', 'publisherName', 'publicationId', 'publicationCode', 'publicationTitle', 'language', 'quantity', 'status', 'createdAt', 'updatedAt']` and only allows optional `['notes', 'deliveredAt']`. `status` must be one of `['requested', 'ordered_branch', 'ready_pickup', 'delivered', 'cancelled']` and `quantity` must be `>= 1 && <= 500`.

## 2. The "Dirty Dozen" Payloads

1. **Unkown Collection Write**: Writing to `/rogue_collection/doc1` -> Denied by global catch-all.
2. **Oversized Document ID**: Creating `/publications/<200-char-id>` -> Denied by `isValidId()`.
3. **Shadow Field Injection on Publication**: Creating `/publications/pub-1` with `{ ..., isAdmin: true }` -> Denied by `hasOnly()`.
4. **Negative Stock Injection**: Updating `/publications/pub-1` with `stockCount: -5` -> Denied by `isValidPublication()`.
5. **Oversized Publication Title (1MB string)**: Creating `/publications/pub-1` with `title` length > 250 -> Denied by `title.size() <= 250`.
6. **Shadow Field on Publisher**: Creating `/publishers/usr-1` with `{ ..., role: 'superuser' }` -> Denied by `hasOnly()`.
7. **Empty Publisher Name**: Creating `/publishers/usr-1` with `fullName: ""` -> Denied by `fullName.size() >= 1`.
8. **Invalid Order Status Enum**: Creating `/orders/ord-1` with `status: "hacked"` -> Denied by `status in ['requested', 'ordered_branch', 'ready_pickup', 'delivered', 'cancelled']`.
9. **Zero or Negative Order Quantity**: Creating `/orders/ord-1` with `quantity: 0` -> Denied by `quantity >= 1`.
10. **Excessive Order Quantity**: Creating `/orders/ord-1` with `quantity: 999999` -> Denied by `quantity <= 500`.
11. **Order ID Mismatch**: Creating `/orders/ord-1` where `data.id == 'ord-2'` -> Denied by `incoming().id == orderId`.
12. **Immutable Order Creation Timestamp Mutation**: Updating `/orders/ord-1` where `incoming().createdAt != existing().createdAt` -> Denied by immutability guard.
