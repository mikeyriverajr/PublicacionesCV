import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  Clock,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Truck,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  Publication,
  Publisher,
  SpecialOrder,
} from '../types';
import { formatShortDate, STATUS_CONFIG } from '../utils/whatsapp';

export type PublisherTab = 'catalog' | 'my_orders' | 'stock';

interface PublisherPortalProps {
  activeTab: PublisherTab;
  setActiveTab: (tab: PublisherTab) => void;
  publications: Publication[];
  publishers: Publisher[];
  orders: SpecialOrder[];
  selectedPublisherId: string;
  onSelectPublisherId: (id: string) => void;
  onCreateOrder: (payload: {
    publisherId: string;
    publicationId: string;
    quantity: number;
    notes?: string;
    customLanguage?: string;
  }) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
  showToast: (msg: string) => void;
}

export const PublisherPortal: React.FC<PublisherPortalProps> = ({
  activeTab,
  setActiveTab,
  publications,
  publishers,
  orders,
  selectedPublisherId,
  onSelectPublisherId,
  onCreateOrder,
  onCancelOrder,
  showToast,
}) => {
  // Searchable + Selectable Publisher Combobox State
  const [isNamePickerOpen, setIsNamePickerOpen] = useState(false);
  const [nameSearchQuery, setNameSearchQuery] = useState('');

  // Catalog search & quantity state
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submittingPubId, setSubmittingPubId] = useState<string | null>(null);

  // In-stock modal state (when ordering an item that is already in stock)
  const [inStockNoticePub, setInStockNoticePub] = useState<{
    title: string;
    code: string;
    quantity: number;
  } | null>(null);

  // Stock view search
  const [stockSearch, setStockSearch] = useState('');

  // Cancel confirmation state
  const [confirmCancelOrderId, setConfirmCancelOrderId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Strict alphabetical list of active publishers (A-Z)
  const sortedPublishers = useMemo(() => {
    return [...publishers]
      .filter((p) => p.active)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
  }, [publishers]);

  const filteredPublishers = useMemo(() => {
    const q = nameSearchQuery.trim().toLowerCase();
    if (!q) return sortedPublishers;
    return sortedPublishers.filter((p) =>
      p.fullName.toLowerCase().includes(q)
    );
  }, [sortedPublishers, nameSearchQuery]);

  const selectedPublisher = useMemo(
    () => sortedPublishers.find((p) => p.id === selectedPublisherId) || null,
    [sortedPublishers, selectedPublisherId]
  );

  // Featured publications
  const featuredPublications = useMemo(
    () => publications.filter((p) => p.isFeatured),
    [publications]
  );

  // Special order catalog
  const catalogPublications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publications.filter((p) => {
      if (!p.isSpecialOrderEligible) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.language.toLowerCase().includes(q)
      );
    });
  }, [publications, searchQuery]);

  // General counter stock
  const stockPublications = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    return publications.filter((p) => {
      if (!p.isGeneralStock && p.stockCount === 0) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.language.toLowerCase().includes(q)
      );
    });
  }, [publications, stockSearch]);

  // Orders for the selected publisher
  const myOrders = useMemo(() => {
    if (!selectedPublisherId) return [];
    return orders.filter((o) => o.publisherId === selectedPublisherId);
  }, [orders, selectedPublisherId]);

  const myReadyOrders = useMemo(
    () => myOrders.filter((o) => o.status === 'ready_pickup'),
    [myOrders]
  );

  const getQty = (pubId: string) => quantities[pubId] || 1;

  const updateQty = (pubId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[pubId] || 1;
      const next = Math.max(1, Math.min(50, current + delta));
      return { ...prev, [pubId]: next };
    });
  };

  const handleRequestPublication = async (pub: Publication) => {
    if (!selectedPublisher) {
      setIsNamePickerOpen(true);
      showToast('Por favor selecciona o escribe tu nombre primero.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const quantity = getQty(pub.id);
    const hadStock = pub.stockCount > 0;

    setSubmittingPubId(pub.id);
    try {
      await onCreateOrder({
        publisherId: selectedPublisher.id,
        publicationId: pub.id,
        quantity,
      });
      setQuantities((prev) => ({ ...prev, [pub.id]: 1 }));

      if (hadStock) {
        setInStockNoticePub({
          title: pub.title,
          code: pub.code,
          quantity,
        });
      } else {
        showToast(`Pedido registrado: ${quantity} × ${pub.title}`);
      }
    } finally {
      setSubmittingPubId(null);
    }
  };

  const handleConfirmCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await onCancelOrder(orderId);
      setConfirmCancelOrderId(null);
      showToast('Pedido cancelado.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Searchable & Selectable Publisher Combobox (Alphabetical A-Z) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600">
            Tu nombre (toca para elegir de la lista o escribe para buscar):
          </label>

          {!isNamePickerOpen && selectedPublisher ? (
            <button
              type="button"
              onClick={() => {
                setNameSearchQuery('');
                setIsNamePickerOpen(true);
              }}
              className="w-full min-h-[46px] px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-between gap-2 text-left transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserCheck className="w-4 h-4 text-[#1E3A5F] shrink-0" />
                <span className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                  {selectedPublisher.fullName}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-[#1E3A5F] shrink-0">
                <span>Cambiar / Buscar</span>
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  autoFocus={isNamePickerOpen}
                  value={nameSearchQuery}
                  onChange={(e) => setNameSearchQuery(e.target.value)}
                  placeholder="Escribe tu nombre o selecciónalo abajo..."
                  className="w-full min-h-[46px] pl-10 pr-10 py-2 text-sm bg-white border-2 border-[#1E3A5F] rounded-xl focus:outline-none"
                />
                {selectedPublisher && (
                  <button
                    type="button"
                    onClick={() => setIsNamePickerOpen(false)}
                    className="absolute right-2.5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                    aria-label="Cerrar buscador"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                {filteredPublishers.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">
                    No se encontró ningún hermano con «{nameSearchQuery}».
                  </div>
                ) : (
                  filteredPublishers.map((pub) => {
                    const isSelected = pub.id === selectedPublisherId;
                    return (
                      <button
                        key={pub.id}
                        type="button"
                        onClick={() => {
                          onSelectPublisherId(pub.id);
                          setIsNamePickerOpen(false);
                          setNameSearchQuery('');
                        }}
                        className={`w-full min-h-[44px] px-3.5 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? 'bg-[#1E3A5F] text-white font-semibold'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span className="truncate">{pub.fullName}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {myReadyOrders.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('my_orders')}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
          >
            <PackageCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              ¡Tienes {myReadyOrders.length} publicación{myReadyOrders.length === 1 ? '' : 'es'} lista{myReadyOrders.length === 1 ? '' : 's'} en el Salón! Toca para ver
            </span>
          </button>
        )}
      </section>

      {/* TAB 1: PEDIR PUBLICACIÓN (DESTACADAS + CATÁLOGO SIMPLE) */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Featured Publications (1-Tap Order) */}
          {featuredPublications.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-[#1E3A5F] px-1">
                <Star className="w-4 h-4 fill-[#1E3A5F] shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Publicaciones Destacadas (Pedido Rápido)
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {featuredPublications.map((pub) => {
                  const qty = getQty(pub.id);
                  const isBusy = submittingPubId === pub.id;
                  return (
                    <div
                      key={pub.id}
                      className="bg-white border-2 border-[#1E3A5F]/20 rounded-2xl p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="text-xs text-slate-500">
                          <span className="font-mono font-semibold text-[#1E3A5F]">
                            {pub.code}
                          </span>
                          {' · '}
                          <span>{pub.language}</span>
                          {pub.stockCount > 0 && (
                            <span className="text-emerald-700 font-medium">
                              {' · '}En existencia ({pub.stockCount})
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                          {pub.title}
                        </h3>
                        {pub.featuredNote && (
                          <p className="text-xs text-slate-600">
                            {pub.featuredNote}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <div className="inline-flex items-center border border-slate-300 rounded-xl bg-slate-50 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQty(pub.id, -1)}
                            className="min-h-[44px] min-w-[40px] flex items-center justify-center text-slate-700"
                            aria-label="Restar"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-2.5 text-sm font-mono font-semibold tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(pub.id, 1)}
                            className="min-h-[44px] min-w-[40px] flex items-center justify-center text-slate-700"
                            aria-label="Sumar"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRequestPublication(pub)}
                          className="flex-1 min-h-[44px] px-4 py-2 bg-[#1E3A5F] active:bg-[#162B47] text-white text-sm font-medium rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag className="w-4 h-4 shrink-0" />
                          <span>{isBusy ? 'Enviando...' : 'Pedir ahora'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Simple Full List with a Single Search Bar */}
          <section className="space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 px-1">
              Todas las publicaciones disponibles
            </h2>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o código (ej. nwt, lff)..."
                className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>

            {catalogPublications.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-500">
                No se encontraron publicaciones con ese nombre.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden">
                {catalogPublications.map((pub) => {
                  const qty = getQty(pub.id);
                  const isBusy = submittingPubId === pub.id;

                  return (
                    <div
                      key={pub.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-xs text-slate-500">
                          <span className="font-mono font-semibold text-slate-800">
                            {pub.code}
                          </span>
                          {' · '}
                          <span>{pub.language}</span>
                          {pub.stockCount > 0 && (
                            <span className="text-emerald-700 font-medium">
                              {' · '}Hay {pub.stockCount} en mostrador
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                          {pub.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="inline-flex items-center border border-slate-300 rounded-xl bg-slate-50">
                          <button
                            type="button"
                            onClick={() => updateQty(pub.id, -1)}
                            className="min-h-[42px] min-w-[38px] flex items-center justify-center text-slate-700"
                            aria-label="Restar"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-2.5 text-sm font-mono font-semibold tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(pub.id, 1)}
                            className="min-h-[42px] min-w-[38px] flex items-center justify-center text-slate-700"
                            aria-label="Sumar"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRequestPublication(pub)}
                          className="flex-1 sm:flex-initial min-h-[42px] px-4 py-2 bg-slate-900 text-white text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <span>{isBusy ? 'Pidiendo...' : 'Pedir'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: MIS PEDIDOS (ESTADO Y CANCELACIÓN) */}
      {activeTab === 'my_orders' && (
        <section className="space-y-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 px-1">
            Mis Pedidos Especiales
          </h2>

          {!selectedPublisher ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-600">
              Selecciona tu nombre arriba para ver tus pedidos.
            </div>
          ) : myOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
              <p className="text-sm text-slate-600">
                No tienes pedidos registrados a nombre de <strong>{selectedPublisher.fullName}</strong>.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className="min-h-[44px] px-4 py-2 bg-[#1E3A5F] text-white text-xs sm:text-sm font-medium rounded-xl"
              >
                Hacer un pedido
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myOrders.map((order) => {
                const statusInfo = STATUS_CONFIG[order.status];
                const canCancel =
                  order.status === 'requested' ||
                  order.status === 'ordered_branch' ||
                  order.status === 'ready_pickup';
                const isConfirmingCancel = confirmCancelOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className={`bg-white border rounded-2xl p-4 space-y-3 ${
                      order.status === 'ready_pickup'
                        ? 'border-emerald-400'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-xs text-slate-500">
                          <span className="font-mono font-semibold text-slate-700">
                            {order.publicationCode}
                          </span>
                          {' · '}
                          <span>{order.language}</span>
                          {' · '}
                          <span className="font-mono">{formatShortDate(order.createdAt)}</span>
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                          <span className="font-mono text-[#1E3A5F]">{order.quantity} ×</span>{' '}
                          {order.publicationTitle}
                        </h3>
                        {order.notes && (
                          <p className="text-xs text-emerald-700 font-medium">
                            {order.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 ${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.textColor}`}
                      >
                        {order.status === 'ready_pickup' && <PackageCheck className="w-4 h-4 shrink-0" />}
                        {order.status === 'ordered_branch' && <Truck className="w-4 h-4 shrink-0" />}
                        {order.status === 'requested' && <Clock className="w-4 h-4 shrink-0" />}
                        {order.status === 'delivered' && <Check className="w-4 h-4 shrink-0" />}
                        {order.status === 'cancelled' && <XCircle className="w-4 h-4 shrink-0" />}
                        <span>{statusInfo.label}</span>
                      </div>

                      {canCancel && (
                        <div>
                          {!isConfirmingCancel ? (
                            <button
                              type="button"
                              onClick={() => setConfirmCancelOrderId(order.id)}
                              className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 rounded-lg flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancelar pedido</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={cancellingId === order.id}
                                onClick={() => handleConfirmCancel(order.id)}
                                className="min-h-[38px] px-3 py-1.5 bg-rose-700 text-white text-xs font-medium rounded-lg"
                              >
                                {cancellingId === order.id ? 'Cancelando...' : 'Confirmar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmCancelOrderId(null)}
                                className="min-h-[38px] px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg"
                              >
                                No
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: EXISTENCIAS EN EL SALÓN */}
      {activeTab === 'stock' && (
        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Existencias disponibles hoy en el mostrador
            </h2>
            <p className="text-xs text-slate-500">
              Publicaciones generales que hay físicamente en el Salón del Reino.
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              placeholder="Buscar publicación en el mostrador..."
              className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden">
            {stockPublications.map((pub) => {
              const available = pub.stockCount > 0;
              return (
                <div
                  key={pub.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700">
                        {pub.code}
                      </span>
                      {' · '}
                      <span>{pub.language}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                      {pub.title}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-mono font-bold tabular-nums ${
                        available ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {available ? `${pub.stockCount} disp.` : 'Agotado'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Modal Notice when ordering a publication that is ALREADY IN STOCK */}
      {inStockNoticePub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <PackageCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                ¡Disponible en el mostrador!
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>
                  {inStockNoticePub.quantity} × {inStockNoticePub.title}
                </strong>{' '}
                ya está en existencia en el Salón.{' '}
                <strong className="text-emerald-800">
                  El encargado de publicaciones te la entregará en la reunión.
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setInStockNoticePub(null)}
              className="w-full min-h-[44px] px-4 py-2.5 bg-[#1E3A5F] text-white text-sm font-semibold rounded-xl"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
