import { OrderStatus, SpecialOrder } from '../types';

export const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    shortLabel: string;
    description: string;
    stepIndex: number;
    textColor: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  requested: {
    label: 'Solicitado (Pendiente)',
    shortLabel: 'Solicitado',
    description: 'Registrado para incluir en el próximo envío a la sucursal.',
    stepIndex: 1,
    textColor: 'text-amber-800',
    bgColor: 'bg-amber-50/80',
    borderColor: 'border-amber-300',
  },
  ordered_branch: {
    label: 'Pedido a la sucursal',
    shortLabel: 'En sucursal',
    description: 'El encargado ya lo solicitó a la sucursal; en espera de que llegue la caja.',
    stepIndex: 2,
    textColor: 'text-blue-800',
    bgColor: 'bg-blue-50/80',
    borderColor: 'border-blue-300',
  },
  ready_pickup: {
    label: 'En el Salón (Listo para recoger)',
    shortLabel: 'En el Salón',
    description: '¡Tu publicación ya llegó! Puedes pasar por el mostrador de publicaciones.',
    stepIndex: 3,
    textColor: 'text-emerald-800',
    bgColor: 'bg-emerald-50/80',
    borderColor: 'border-emerald-300',
  },
  delivered: {
    label: 'Entregado',
    shortLabel: 'Entregado',
    description: 'Entregado en mano al publicador.',
    stepIndex: 4,
    textColor: 'text-slate-600',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
  },
  cancelled: {
    label: 'Cancelado por el publicador',
    shortLabel: 'Cancelado',
    description: 'Solicitud cancelada.',
    stepIndex: 0,
    textColor: 'text-rose-800',
    bgColor: 'bg-rose-50/70',
    borderColor: 'border-rose-200',
  },
};

export function buildWhatsAppArrivalUrl(
  order: SpecialOrder,
  phone: string,
  congregationName: string
): string {
  const cleanPhone = (phone || '').replace(/[^\d]/g, '');
  const firstName = order.publisherName.split(' ')[0] || order.publisherName;
  const qtyText =
    order.quantity === 1
      ? `1 ejemplar de "${order.publicationTitle}" (${order.publicationCode})`
      : `${order.quantity} ejemplares de "${order.publicationTitle}" (${order.publicationCode})`;

  const message =
    `Hola ${firstName}, ¡buen día! Te escribimos del mostrador de publicaciones (${congregationName}). ` +
    `Te avisamos que ya llegó al Salón del Reino tu pedido especial: ${qtyText} en ${order.language}. ` +
    `Puedes pasar a recogerlo en la próxima reunión. ¡Muchas gracias!`;

  const encoded = encodeURIComponent(message);
  if (cleanPhone.length >= 7) {
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export function formatShortDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}
