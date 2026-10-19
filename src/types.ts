export type PublicationCategory =
  | 'Anuales y Campaña'
  | 'Biblias'
  | 'Libros'
  | 'Letra Grande'
  | 'Folletos y Tratados'
  | 'Revistas'
  | 'Otros Idiomas';

export type OrderStatus =
  | 'requested'      // Solicitado por el publicador (pendiente de pedir a sucursal)
  | 'ordered_branch' // Pedido a la sucursal (en tránsito)
  | 'ready_pickup'   // En el Salón del Reino (listo para recoger)
  | 'delivered'      // Entregado al publicador
  | 'cancelled';     // Cancelado por el publicador

export interface Publication {
  id: string;
  code: string; // Símbolo oficial, ej. nwt, nwtsty, es27, lff
  title: string;
  category: PublicationCategory;
  language: string;
  isSpecialOrderEligible: boolean;
  isGeneralStock: boolean;
  isFeatured: boolean;
  featuredNote?: string;
  stockCount: number;
  updatedAt: string;
}

export interface Publisher {
  id: string;
  fullName: string;
  groupName: string; // Ej. "Grupo 1", "Grupo 2"
  phone: string;     // Número para WhatsApp
  active: boolean;
}

export interface SpecialOrder {
  id: string;
  publisherId: string;
  publisherName: string;
  publicationId: string;
  publicationCode: string;
  publicationTitle: string;
  language: string;
  quantity: number;
  notes?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}

export interface AppDatabase {
  congregationName: string;
  adminPin: string;
  publications: Publication[];
  publishers: Publisher[];
  orders: SpecialOrder[];
}
