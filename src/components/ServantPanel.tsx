import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  FileText,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
  Truck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  OrderStatus,
  Publication,
  PublicationCategory,
  Publisher,
  SpecialOrder,
} from '../types';
import {
  buildWhatsAppArrivalUrl,
  formatShortDate,
  STATUS_CONFIG,
} from '../utils/whatsapp';
import { ParsedInventoryRow } from '../utils/pdfInventoryParser';
import { BulkPublisherModal } from './BulkPublisherModal';
import { InventoryPdfImportModal } from './InventoryPdfImportModal';

export type ServantTab = 'orders' | 'branch_batch' | 'catalog_stock' | 'publishers';

interface ServantPanelProps {
  activeTab: ServantTab;
  setActiveTab: (tab: ServantTab) => void;
  congregationName: string;
  adminPin: string;
  publications: Publication[];
  publishers: Publisher[];
  orders: SpecialOrder[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onBatchMarkOrdered: () => Promise<void>;
  onCreateOrder: (payload: {
    publisherId: string;
    publicationId: string;
    quantity: number;
    notes?: string;
  }) => Promise<void>;
  onCreatePublication: (pub: Partial<Publication>) => Promise<void>;
  onUpdatePublication: (id: string, patch: Partial<Publication>) => Promise<void>;
  onDeletePublication: (id: string) => Promise<void>;
  onBulkImportInventory: (
    items: ParsedInventoryRow[],
    reportLanguage: string
  ) => Promise<void>;
  onCreatePublisher: (pub: {
    fullName: string;
    groupName: string;
    phone: string;
  }) => Promise<void>;
  onBulkAddPublishers: (
    items: Array<{ fullName: string; groupName: string; phone: string }>
  ) => Promise<void>;
  onUpdatePublisher: (id: string, patch: Partial<Publisher>) => Promise<void>;
  onDeletePublisher: (id: string) => Promise<void>;
  onUpdateSettings: (settings: {
    congregationName: string;
    adminPin: string;
  }) => Promise<void>;
  showToast: (msg: string) => void;
}

export const ServantPanel: React.FC<ServantPanelProps> = ({
  activeTab,
  congregationName,
  adminPin,
  publications,
  publishers,
  orders,
  onUpdateOrderStatus,
  onDeleteOrder,
  onBatchMarkOrdered,
  onCreateOrder,
  onCreatePublication,
  onUpdatePublication,
  onDeletePublication,
  onBulkImportInventory,
  onCreatePublisher,
  onBulkAddPublishers,
  onUpdatePublisher,
  onDeletePublisher,
  onUpdateSettings,
  showToast,
}) => {
  // Orders filter state (single select dropdown, no button strips)
  const [orderStatusFilter, setOrderStatusFilter] = useState<'active' | 'all' | OrderStatus>('active');
  const [orderSearch, setOrderSearch] = useState('');
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [manualPublisherId, setManualPublisherId] = useState(publishers[0]?.id || '');
  const [manualPubSearch, setManualPubSearch] = useState('');
  const [isManualPubPickerOpen, setIsManualPubPickerOpen] = useState(false);
  const [manualPublicationId, setManualPublicationId] = useState(publications[0]?.id || '');
  const [manualItemSearch, setManualItemSearch] = useState('');
  const [isManualItemPickerOpen, setIsManualItemPickerOpen] = useState(false);
  const [manualQty, setManualQty] = useState<number>(1);

  // Batch confirmation
  const [confirmBatchMark, setConfirmBatchMark] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Catalog & stock state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isNewPubOpen, setIsNewPubOpen] = useState(false);
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [newPubCode, setNewPubCode] = useState('');
  const [newPubTitle, setNewPubTitle] = useState('');
  const [newPubCategory, setNewPubCategory] = useState<PublicationCategory>('Libros');
  const [newPubLanguage, setNewPubLanguage] = useState('Español');
  const [newPubStock, setNewPubStock] = useState(0);
  const [newPubFeatured, setNewPubFeatured] = useState(false);
  const [newPubFeaturedNote, setNewPubFeaturedNote] = useState('');

  // Editing an existing catalog item
  const [editingCatalogPubId, setEditingCatalogPubId] = useState<string | null>(null);
  const [editCatalogCode, setEditCatalogCode] = useState('');
  const [editCatalogTitle, setEditCatalogTitle] = useState('');
  const [editCatalogCategory, setEditCatalogCategory] = useState<PublicationCategory>('Libros');
  const [editCatalogLanguage, setEditCatalogLanguage] = useState('Español');
  const [editCatalogFeaturedNote, setEditCatalogFeaturedNote] = useState('');

  // Publishers state (strictly alphabetical, no service groups)
  const [pubSearch, setPubSearch] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [editingPublisherId, setEditingPublisherId] = useState<string | null>(null);
  const [editPubName, setEditPubName] = useState('');
  const [editPubPhone, setEditPubPhone] = useState('');

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempCongName, setTempCongName] = useState(congregationName);
  const [tempPin, setTempPin] = useState(adminPin);

  const sortedPublishers = useMemo(() => {
    return [...publishers].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
  }, [publishers]);

  const counts = useMemo(() => {
    return {
      requested: orders.filter((o) => o.status === 'requested').length,
      ordered_branch: orders.filter((o) => o.status === 'ordered_branch').length,
      ready_pickup: orders.filter((o) => o.status === 'ready_pickup').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
    };
  }, [orders]);

  const publisherPhoneMap = useMemo(() => {
    const map: Record<string, string> = {};
    publishers.forEach((p) => {
      map[p.id] = p.phone;
    });
    return map;
  }, [publishers]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter === 'active') {
        if (o.status === 'delivered' || o.status === 'cancelled') return false;
      } else if (orderStatusFilter !== 'all') {
        if (o.status !== orderStatusFilter) return false;
      }
      const q = orderSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        o.publisherName.toLowerCase().includes(q) ||
        o.publicationTitle.toLowerCase().includes(q) ||
        o.publicationCode.toLowerCase().includes(q)
      );
    });
  }, [orders, orderStatusFilter, orderSearch]);

  const branchBatchItems = useMemo(() => {
    const requestedOrders = orders.filter((o) => o.status === 'requested');
    const grouped = new Map<
      string,
      {
        key: string;
        code: string;
        title: string;
        language: string;
        totalQuantity: number;
        requesters: Array<{ orderId: string; name: string; qty: number }>;
      }
    >();

    requestedOrders.forEach((ord) => {
      const key = `${ord.publicationCode.toLowerCase()}__${ord.language.toLowerCase()}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.totalQuantity += ord.quantity;
        existing.requesters.push({
          orderId: ord.id,
          name: ord.publisherName,
          qty: ord.quantity,
        });
      } else {
        grouped.set(key, {
          key,
          code: ord.publicationCode,
          title: ord.publicationTitle,
          language: ord.language,
          totalQuantity: ord.quantity,
          requesters: [
            {
              orderId: ord.id,
              name: ord.publisherName,
              qty: ord.quantity,
            },
          ],
        });
      }
    });

    return Array.from(grouped.values());
  }, [orders]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return publications;
    return publications.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.language.toLowerCase().includes(q)
    );
  }, [publications, catalogSearch]);

  const filteredPublishersList = useMemo(() => {
    const q = pubSearch.trim().toLowerCase();
    if (!q) return sortedPublishers;
    return sortedPublishers.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.phone.includes(q)
    );
  }, [sortedPublishers, pubSearch]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      showToast(`Código copiado: ${code}`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      showToast(`Código: ${code}`);
    }
  };

  const handleManualOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPublisherId || !manualPublicationId) return;
    await onCreateOrder({
      publisherId: manualPublisherId,
      publicationId: manualPublicationId,
      quantity: Math.max(1, Number(manualQty) || 1),
    });
    setManualQty(1);
    setManualPubSearch('');
    setManualItemSearch('');
    setIsManualPubPickerOpen(false);
    setIsManualItemPickerOpen(false);
    setIsManualOrderOpen(false);
    showToast('Pedido registrado.');
  };

  const handleCreatePubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPubCode.trim() || !newPubTitle.trim()) return;
    await onCreatePublication({
      code: newPubCode.trim(),
      title: newPubTitle.trim(),
      category: newPubCategory,
      language: newPubLanguage.trim() || 'Español',
      stockCount: newPubStock,
      isSpecialOrderEligible: true,
      isGeneralStock: newPubCategory !== 'Formularios y Suministros',
      isFeatured: newPubFeatured,
      featuredNote: newPubFeaturedNote.trim(),
    });
    setNewPubCode('');
    setNewPubTitle('');
    setNewPubCategory('Libros');
    setNewPubStock(0);
    setNewPubFeatured(false);
    setNewPubFeaturedNote('');
    setIsNewPubOpen(false);
    showToast('Publicación agregada.');
  };

  const handleSaveCatalogPubEdit = async (pubId: string) => {
    if (!editCatalogCode.trim() || !editCatalogTitle.trim()) return;
    await onUpdatePublication(pubId, {
      code: editCatalogCode.trim(),
      title: editCatalogTitle.trim(),
      category: editCatalogCategory,
      language: editCatalogLanguage.trim() || 'Español',
      featuredNote: editCatalogFeaturedNote.trim(),
    });
    setEditingCatalogPubId(null);
    showToast('Publicación actualizada.');
  };

  const handleAddSinglePublisher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    await onCreatePublisher({
      fullName: newPersonName.trim(),
      groupName: '',
      phone: newPersonPhone.trim(),
    });
    setNewPersonName('');
    setNewPersonPhone('');
    showToast('Publicador agregado.');
  };

  const handleSavePublisherEdit = async (id: string) => {
    if (!editPubName.trim()) return;
    await onUpdatePublisher(id, {
      fullName: editPubName.trim(),
      phone: editPubPhone.trim(),
    });
    setEditingPublisherId(null);
    showToast('Datos actualizados.');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      congregationName: tempCongName,
      adminPin: tempPin,
    });
    setIsSettingsOpen(false);
    showToast('Ajustes guardados.');
  };

  return (
    <div className="space-y-4 pb-8">
      {/* VIEW 1: PEDIDOS ESPECIALES */}
      {activeTab === 'orders' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Pedidos Especiales
            </h2>
            <button
              type="button"
              onClick={() => {
                setManualPublisherId(sortedPublishers[0]?.id || '');
                setManualPublicationId(publications[0]?.id || '');
                setManualPubSearch('');
                setManualItemSearch('');
                setIsManualPubPickerOpen(false);
                setIsManualItemPickerOpen(false);
                setIsManualOrderOpen(!isManualOrderOpen);
              }}
              className="min-h-[40px] px-3 py-1.5 bg-[#1E3A5F] text-white text-xs font-medium rounded-xl flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Anotar pedido</span>
            </button>
          </div>

          {isManualOrderOpen && (
            <form
              onSubmit={handleManualOrderSubmit}
              className="bg-white border border-slate-300 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  Anotar pedido verbal de un hermano
                </span>
                <button
                  type="button"
                  onClick={() => setIsManualOrderOpen(false)}
                  className="text-xs text-slate-500"
                >
                  Cerrar
                </button>
              </div>

              <div className="space-y-3">
                {/* Searchable Publisher Picker */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">
                    Hermano (toca para cambiar o escribir nombre):
                  </label>
                  {!isManualPubPickerOpen ? (
                    <button
                      type="button"
                      onClick={() => {
                        setManualPubSearch('');
                        setIsManualPubPickerOpen(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-2 text-left"
                    >
                      <span className="font-semibold text-slate-900 truncate">
                        {sortedPublishers.find((p) => p.id === manualPublisherId)
                          ?.fullName || 'Seleccionar hermano...'}
                      </span>
                      <span className="text-xs font-medium text-[#1E3A5F] shrink-0">
                        Buscar
                      </span>
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          autoFocus
                          value={manualPubSearch}
                          onChange={(e) => setManualPubSearch(e.target.value)}
                          placeholder="Escribe el nombre del hermano..."
                          className="w-full min-h-[42px] pl-9 pr-3 py-2 text-sm border-2 border-[#1E3A5F] rounded-xl focus:outline-none"
                        />
                      </div>
                      <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                        {sortedPublishers
                          .filter((p) =>
                            p.fullName
                              .toLowerCase()
                              .includes(manualPubSearch.trim().toLowerCase())
                          )
                          .map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setManualPublisherId(p.id);
                                setIsManualPubPickerOpen(false);
                              }}
                              className={`w-full min-h-[40px] px-3 py-2 text-left text-sm flex items-center justify-between ${
                                p.id === manualPublisherId
                                  ? 'bg-[#1E3A5F] text-white font-semibold'
                                  : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <span className="truncate">{p.fullName}</span>
                              {p.id === manualPublisherId && (
                                <Check className="w-4 h-4 shrink-0" />
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Searchable Publication Picker */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">
                    Publicación (toca para cambiar o escribir título/código):
                  </label>
                  {!isManualItemPickerOpen ? (
                    <button
                      type="button"
                      onClick={() => {
                        setManualItemSearch('');
                        setIsManualItemPickerOpen(true);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-2 text-left"
                    >
                      <span className="font-semibold text-slate-900 truncate">
                        {(() => {
                          const found = publications.find(
                            (pub) => pub.id === manualPublicationId
                          );
                          return found
                            ? `[${found.code}] ${found.title}`
                            : 'Seleccionar publicación...';
                        })()}
                      </span>
                      <span className="text-xs font-medium text-[#1E3A5F] shrink-0">
                        Buscar
                      </span>
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          autoFocus
                          value={manualItemSearch}
                          onChange={(e) => setManualItemSearch(e.target.value)}
                          placeholder="Buscar por nombre o código (ej. nwt, lffi)..."
                          className="w-full min-h-[42px] pl-9 pr-3 py-2 text-sm border-2 border-[#1E3A5F] rounded-xl focus:outline-none"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                        {publications
                          .filter((pub) => {
                            const q = manualItemSearch.trim().toLowerCase();
                            if (!q) return true;
                            return (
                              pub.title.toLowerCase().includes(q) ||
                              pub.code.toLowerCase().includes(q)
                            );
                          })
                          .map((pub) => (
                            <button
                              key={pub.id}
                              type="button"
                              onClick={() => {
                                setManualPublicationId(pub.id);
                                setIsManualItemPickerOpen(false);
                              }}
                              className={`w-full min-h-[42px] px-3 py-2 text-left text-sm flex items-center justify-between gap-2 ${
                                pub.id === manualPublicationId
                                  ? 'bg-[#1E3A5F] text-white font-semibold'
                                  : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="min-w-0 flex-1 truncate">
                                <span className="font-mono font-bold">
                                  [{pub.code}]
                                </span>{' '}
                                <span>{pub.title}</span>
                              </div>
                              {pub.id === manualPublicationId && (
                                <Check className="w-4 h-4 shrink-0" />
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={manualQty === 0 ? '' : manualQty}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setManualQty(0);
                      } else {
                        const num = parseInt(val, 10);
                        if (!Number.isNaN(num) && num >= 0) {
                          setManualQty(num);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (!manualQty || manualQty < 1) setManualQty(1);
                    }}
                    placeholder="Cantidad"
                    className="w-28 min-h-[44px] px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl"
                  />
                  <button
                    type="submit"
                    className="flex-1 min-h-[44px] px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl"
                  >
                    Guardar pedido
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Simple Filter Row (1 Dropdown + 1 Search Box, ZERO horizontal button scrolling) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value as typeof orderStatusFilter)}
              className="w-full min-h-[44px] px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-xl"
            >
              <option value="active">
                Pendientes de entregar ({counts.requested + counts.ordered_branch + counts.ready_pickup})
              </option>
              <option value="requested">
                1. Por pedir a sucursal ({counts.requested})
              </option>
              <option value="ordered_branch">
                2. Pedidos a sucursal ({counts.ordered_branch})
              </option>
              <option value="ready_pickup">
                3. En el Salón - Listos ({counts.ready_pickup})
              </option>
              <option value="delivered">
                4. Ya entregados ({counts.delivered})
              </option>
              <option value="cancelled">Cancelados</option>
              <option value="all">Ver todos</option>
            </select>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Buscar hermano o publicación..."
                className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-500">
              No hay pedidos en esta vista.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => {
                const statusInfo = STATUS_CONFIG[order.status];
                const phone = publisherPhoneMap[order.publisherId] || '';
                const whatsappUrl = buildWhatsAppArrivalUrl(
                  order,
                  phone,
                  congregationName
                );

                return (
                  <div
                    key={order.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900">
                          {order.publisherName}
                        </div>
                        <div className="text-xs text-slate-500">
                          <span className="font-mono font-semibold text-[#1E3A5F]">
                            {order.publicationCode}
                          </span>
                          {' · '}
                          <span>{order.language}</span>
                          {' · '}
                          <span className="font-mono">{formatShortDate(order.createdAt)}</span>
                        </div>
                        <div className="text-sm font-medium text-slate-800 mt-1">
                          <strong className="font-mono text-[#1E3A5F]">
                            {order.quantity} ×
                          </strong>{' '}
                          {order.publicationTitle}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onDeleteOrder(order.id);
                          showToast('Pedido eliminado.');
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg shrink-0"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Clean Action Bar */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                      <select
                        value={order.status}
                        onChange={(e) => {
                          onUpdateOrderStatus(order.id, e.target.value as OrderStatus);
                          showToast('Estado actualizado.');
                        }}
                        className={`min-h-[42px] px-3 py-2 text-xs font-semibold rounded-xl border ${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.textColor}`}
                      >
                        <option value="requested">1. Solicitado (Por pedir)</option>
                        <option value="ordered_branch">2. Pedido a sucursal</option>
                        <option value="ready_pickup">3. En el Salón (Listo)</option>
                        <option value="delivered">4. Entregado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>

                      <div className="flex items-center gap-2 flex-1">
                        {order.status === 'requested' && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateOrderStatus(order.id, 'ordered_branch');
                              showToast('Marcado como Pedido a sucursal.');
                            }}
                            className="flex-1 min-h-[42px] px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5"
                          >
                            <Truck className="w-4 h-4 shrink-0" />
                            <span>Pedir a sucursal</span>
                          </button>
                        )}

                        {order.status === 'ordered_branch' && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateOrderStatus(order.id, 'ready_pickup');
                              showToast('Marcado como Listo en el Salón.');
                            }}
                            className="flex-1 min-h-[42px] px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5"
                          >
                            <PackageCheck className="w-4 h-4 shrink-0" />
                            <span>Ya llegó al Salón</span>
                          </button>
                        )}

                        {order.status === 'ready_pickup' && (
                          <>
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 min-h-[42px] px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5"
                            >
                              <MessageCircle className="w-4 h-4 shrink-0" />
                              <span>WhatsApp</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateOrderStatus(order.id, 'delivered');
                                showToast('Entregado.');
                              }}
                              className="flex-1 min-h-[42px] px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4 shrink-0" />
                              <span>Entregado</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* VIEW 2: LOTE PARA SUCURSAL */}
      {activeTab === 'branch_batch' && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Totales para Pedir a la Sucursal
            </h2>
            <p className="text-xs text-slate-600">
              Suma automática de todas las solicitudes pendientes agrupadas por código.
            </p>
          </div>

          {branchBatchItems.length > 0 && (
            <div>
              {!confirmBatchMark ? (
                <button
                  type="button"
                  onClick={() => setConfirmBatchMark(true)}
                  className="w-full min-h-[44px] px-4 py-2.5 bg-[#1E3A5F] text-white text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Marcar todos como «Pedido a sucursal»</span>
                </button>
              ) : (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl space-y-2">
                  <p className="text-xs font-medium text-blue-900">
                    ¿Confirmar que ya fueron pedidos en el sitio de la sucursal?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await onBatchMarkOrdered();
                        setConfirmBatchMark(false);
                        showToast('Lote marcado como Pedido a sucursal.');
                      }}
                      className="min-h-[40px] bg-blue-700 text-white text-xs font-medium rounded-lg"
                    >
                      Sí, confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmBatchMark(false)}
                      className="min-h-[40px] bg-white text-slate-700 border border-slate-300 text-xs font-medium rounded-lg"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {branchBatchItems.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-600">
              No hay pedidos pendientes de enviar a la sucursal.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden">
              {branchBatchItems.map((item) => (
                <div
                  key={item.key}
                  className="p-4 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#1E3A5F]">
                        {item.code}
                      </span>
                      <span className="text-xs text-slate-500">· {item.language}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(item.code)}
                        className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedCode === item.code ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    <div className="text-xs text-slate-500">
                      Para:{' '}
                      {item.requesters.map((r, i) => (
                        <span key={r.orderId}>
                          {i > 0 && ', '}
                          {r.name} ({r.qty})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                      {item.totalQuantity}
                    </div>
                    <div className="text-[11px] text-slate-500">unidades</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* VIEW 3: CATÁLOGO, STOCK Y DESTACADOS */}
      {activeTab === 'catalog_stock' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Catálogo y Existencias
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPdfImportOpen(true)}
                className="min-h-[40px] px-3 py-1.5 bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-medium rounded-xl flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-[#1E3A5F]" />
                <span>Importar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNewPubOpen(!isNewPubOpen)}
                className="min-h-[40px] px-3 py-1.5 bg-[#1E3A5F] text-white text-xs font-medium rounded-xl flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva publicación</span>
              </button>
            </div>
          </div>

          {isNewPubOpen && (
            <form
              onSubmit={handleCreatePubSubmit}
              className="bg-white border border-slate-300 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  Agregar publicación
                </span>
                <button
                  type="button"
                  onClick={() => setIsNewPubOpen(false)}
                  className="text-xs text-slate-500"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  value={newPubCode}
                  onChange={(e) => setNewPubCode(e.target.value)}
                  placeholder="Código (ej. es27)"
                  className="min-h-[44px] px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl"
                />
                <input
                  type="text"
                  required
                  value={newPubTitle}
                  onChange={(e) => setNewPubTitle(e.target.value)}
                  placeholder="Título de la publicación"
                  className="sm:col-span-2 min-h-[44px] px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <select
                  value={newPubCategory}
                  onChange={(e) => setNewPubCategory(e.target.value as PublicationCategory)}
                  className="min-h-[44px] px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Biblias">Biblias</option>
                  <option value="Libros">Libros</option>
                  <option value="Letra Grande">Letra Grande</option>
                  <option value="Folletos y Tratados">Folletos y Tratados</option>
                  <option value="Revistas">Revistas</option>
                  <option value="Anuales y Campaña">Anuales y Campaña</option>
                  <option value="Formularios y Suministros">Formularios y Suministros</option>
                  <option value="Otros Idiomas">Otros Idiomas</option>
                </select>
                <input
                  type="text"
                  value={newPubLanguage}
                  onChange={(e) => setNewPubLanguage(e.target.value)}
                  placeholder="Idioma"
                  className="min-h-[44px] px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
                <input
                  type="number"
                  min={0}
                  value={newPubStock}
                  onChange={(e) => setNewPubStock(Math.max(0, Number(e.target.value)))}
                  placeholder="Stock actual"
                  className="min-h-[44px] px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={newPubFeatured}
                  onChange={(e) => setNewPubFeatured(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span>Destacar al inicio para que los hermanos la pidan sin buscar</span>
              </label>

              {newPubFeatured && (
                <input
                  type="text"
                  value={newPubFeaturedNote}
                  onChange={(e) => setNewPubFeaturedNote(e.target.value)}
                  placeholder="Nota breve opcional (ej. Pedido anual)"
                  className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              )}

              <button
                type="submit"
                className="w-full min-h-[44px] bg-slate-900 text-white text-sm font-medium rounded-xl"
              >
                Guardar publicación
              </button>
            </form>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Buscar publicación por nombre o código..."
              className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden">
            {filteredCatalog.map((pub) => {
              const isEditing = editingCatalogPubId === pub.id;

              return (
                <div
                  key={pub.id}
                  className="p-3.5 sm:p-4 flex flex-col gap-3"
                >
                  {isEditing ? (
                    <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-800">
                        Editar publicación
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Símbolo / Código
                          </label>
                          <input
                            type="text"
                            value={editCatalogCode}
                            onChange={(e) => setEditCatalogCode(e.target.value)}
                            placeholder="Ej. bhs, nwt"
                            className="w-full min-h-[40px] px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Título / Descripción
                          </label>
                          <input
                            type="text"
                            value={editCatalogTitle}
                            onChange={(e) => setEditCatalogTitle(e.target.value)}
                            placeholder="Título de la publicación"
                            className="w-full min-h-[40px] px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Categoría
                          </label>
                          <select
                            value={editCatalogCategory}
                            onChange={(e) =>
                              setEditCatalogCategory(
                                e.target.value as PublicationCategory
                              )
                            }
                            className="w-full min-h-[40px] px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="Biblias">Biblias</option>
                            <option value="Libros">Libros</option>
                            <option value="Letra Grande">Letra Grande</option>
                            <option value="Folletos y Tratados">
                              Folletos y Tratados
                            </option>
                            <option value="Revistas">Revistas</option>
                            <option value="Anuales y Campaña">
                              Anuales y Campaña
                            </option>
                            <option value="Formularios y Suministros">
                              Formularios y Suministros
                            </option>
                            <option value="Otros Idiomas">Otros Idiomas</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Idioma
                          </label>
                          <input
                            type="text"
                            value={editCatalogLanguage}
                            onChange={(e) =>
                              setEditCatalogLanguage(e.target.value)
                            }
                            placeholder="Español"
                            className="w-full min-h-[40px] px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Nota (si es destacada)
                          </label>
                          <input
                            type="text"
                            value={editCatalogFeaturedNote}
                            onChange={(e) =>
                              setEditCatalogFeaturedNote(e.target.value)
                            }
                            placeholder="Opcional"
                            className="w-full min-h-[40px] px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingCatalogPubId(null)}
                          className="min-h-[38px] px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveCatalogPubEdit(pub.id)}
                          className="min-h-[38px] px-4 py-1.5 bg-[#1E3A5F] text-white text-xs font-medium rounded-lg"
                        >
                          Guardar cambios
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-xs text-slate-500">
                          <span className="font-mono font-bold text-slate-800">
                            {pub.code}
                          </span>
                          {' · '}
                          <span>{pub.category}</span>
                          {pub.language && pub.language !== 'Español' && (
                            <span> · {pub.language}</span>
                          )}
                          {pub.isFeatured && (
                            <span className="text-[#1E3A5F] font-semibold">
                              {' '}
                              · ★ Destacada
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                          {pub.title}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const next = !pub.isFeatured;
                            onUpdatePublication(pub.id, {
                              isFeatured: next,
                              isSpecialOrderEligible: true,
                            });
                            showToast(
                              next
                                ? 'Publicación destacada.'
                                : 'Quitada de destacadas.'
                            );
                          }}
                          className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1 ${
                            pub.isFeatured
                              ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              pub.isFeatured ? 'fill-white' : ''
                            }`}
                          />
                          <span>{pub.isFeatured ? 'Destacada' : 'Destacar'}</span>
                        </button>

                        <div className="inline-flex items-center border border-slate-300 rounded-xl bg-slate-50">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdatePublication(pub.id, {
                                stockCount: Math.max(0, pub.stockCount - 1),
                                isGeneralStock: true,
                              })
                            }
                            className="min-h-[40px] min-w-[36px] flex items-center justify-center text-slate-700"
                            aria-label="Restar stock"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-2 text-sm font-mono font-bold tabular-nums min-w-[34px] text-center">
                            {pub.stockCount}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdatePublication(pub.id, {
                                stockCount: pub.stockCount + 1,
                                isGeneralStock: true,
                              })
                            }
                            className="min-h-[40px] min-w-[36px] flex items-center justify-center text-slate-700"
                            aria-label="Sumar stock"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatalogPubId(pub.id);
                            setEditCatalogCode(pub.code);
                            setEditCatalogTitle(pub.title);
                            setEditCatalogCategory(pub.category || 'Libros');
                            setEditCatalogLanguage(pub.language || 'Español');
                            setEditCatalogFeaturedNote(pub.featuredNote || '');
                          }}
                          className="p-2 text-slate-500 hover:text-slate-900 rounded-lg"
                          aria-label="Editar publicación"
                          title="Editar código o descripción"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onDeletePublication(pub.id);
                            showToast('Publicación eliminada.');
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* VIEW 4: DIRECTORIO ALFABÉTICO DE PUBLICADORES + AÑADIR EN MASA */}
      {activeTab === 'publishers' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Publicadores (A–Z)
              </h2>
              <p className="text-xs text-slate-500">
                Ordenados alfabéticamente ({sortedPublishers.length} registrados)
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="min-h-[40px] px-3 py-1.5 bg-[#1E3A5F] text-white text-xs font-medium rounded-xl flex items-center gap-1.5"
              >
                <Users className="w-4 h-4" />
                <span>Añadir en masa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempCongName(congregationName);
                  setTempPin(adminPin);
                  setIsSettingsOpen(!isSettingsOpen);
                }}
                className="min-h-[40px] px-2.5 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-xl flex items-center gap-1"
                title="Ajustes y PIN"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">PIN</span>
              </button>
            </div>
          </div>

          {isSettingsOpen && (
            <form
              onSubmit={handleSaveSettings}
              className="bg-white border border-slate-300 rounded-2xl p-4 space-y-3"
            >
              <div className="text-xs font-semibold text-slate-900">
                Ajustes de Congregación y PIN del Encargado
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={tempCongName}
                  onChange={(e) => setTempCongName(e.target.value)}
                  placeholder="Nombre de la congregación"
                  className="min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
                <input
                  type="text"
                  value={tempPin}
                  onChange={(e) => setTempPin(e.target.value)}
                  placeholder="PIN de encargado"
                  className="min-h-[42px] px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[42px] bg-slate-900 text-white text-xs font-medium rounded-xl"
              >
                Guardar ajustes
              </button>
            </form>
          )}

          {/* Simple Add Single Publisher */}
          <form
            onSubmit={handleAddSinglePublisher}
            className="bg-white border border-slate-200 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5"
          >
            <input
              type="text"
              required
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Nombre y apellido..."
              className="min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-xl"
            />
            <input
              type="tel"
              value={newPersonPhone}
              onChange={(e) => setNewPersonPhone(e.target.value)}
              placeholder="Teléfono WhatsApp (opcional)"
              className="min-h-[42px] px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl"
            />
            <button
              type="submit"
              className="min-h-[42px] px-4 py-2 bg-slate-900 text-white text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Agregar publicador</span>
            </button>
          </form>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={pubSearch}
              onChange={(e) => setPubSearch(e.target.value)}
              placeholder="Buscar publicador en la lista alfabética..."
              className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden">
            {filteredPublishersList.map((person) => {
              const isEditing = editingPublisherId === person.id;
              return (
                <div
                  key={person.id}
                  className="p-3.5 flex items-center justify-between gap-2"
                >
                  {isEditing ? (
                    <div className="flex flex-col sm:flex-row gap-2 flex-1">
                      <input
                        type="text"
                        value={editPubName}
                        onChange={(e) => setEditPubName(e.target.value)}
                        className="min-h-[40px] px-3 py-1.5 text-sm border border-slate-300 rounded-lg flex-1"
                      />
                      <input
                        type="tel"
                        value={editPubPhone}
                        onChange={(e) => setEditPubPhone(e.target.value)}
                        placeholder="Teléfono WhatsApp"
                        className="min-h-[40px] px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSavePublisherEdit(person.id)}
                          className="min-h-[40px] px-3 py-1.5 bg-[#1E3A5F] text-white text-xs font-medium rounded-lg"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPublisherId(null)}
                          className="min-h-[40px] px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {person.fullName}
                        </div>
                        {person.phone && (
                          <div className="text-xs font-mono text-slate-500">
                            WhatsApp: {person.phone}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPublisherId(person.id);
                            setEditPubName(person.fullName);
                            setEditPubPhone(person.phone);
                          }}
                          className="p-2 text-slate-500 hover:text-slate-900 rounded-lg"
                          aria-label="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeletePublisher(person.id);
                            showToast('Publicador eliminado.');
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <BulkPublisherModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        existingPublishers={publishers}
        onBulkAdd={async (items) => {
          await onBulkAddPublishers(items);
          showToast(`Se agregaron ${items.length} publicadores.`);
        }}
      />

      <InventoryPdfImportModal
        isOpen={isPdfImportOpen}
        onClose={() => setIsPdfImportOpen(false)}
        existingPublications={publications}
        onConfirmImport={onBulkImportInventory}
        showToast={showToast}
      />
    </div>
  );
};
