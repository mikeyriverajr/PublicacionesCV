import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Layers,
  Lock,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { INITIAL_DATABASE } from './data/seedData';
import {
  AppDatabase,
  OrderStatus,
  Publication,
  Publisher,
  SpecialOrder,
} from './types';
import { PublisherPortal, PublisherTab } from './components/PublisherPortal';
import { ServantPanel, ServantTab } from './components/ServantPanel';

const LOCAL_STORAGE_DB_KEY = 'congregation_publications_db_v1';
const LOCAL_STORAGE_PUBLISHER_ID_KEY = 'congregation_selected_publisher_id';
const LOCAL_STORAGE_SERVANT_AUTH_KEY = 'congregation_servant_authenticated';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
      if (saved) {
        return JSON.parse(saved) as AppDatabase;
      }
    } catch {
      // Fallback to initial seed data
    }
    return INITIAL_DATABASE;
  });

  const [mode, setMode] = useState<'publisher' | 'servant'>('publisher');
  const [publisherTab, setPublisherTab] = useState<PublisherTab>('catalog');
  const [servantTab, setServantTab] = useState<ServantTab>('orders');

  const [selectedPublisherId, setSelectedPublisherId] = useState<string>(() => {
    return (
      localStorage.getItem(LOCAL_STORAGE_PUBLISHER_ID_KEY) ||
      INITIAL_DATABASE.publishers[0]?.id ||
      ''
    );
  });

  const [isServantUnlocked, setIsServantUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(LOCAL_STORAGE_SERVANT_AUTH_KEY) === 'true';
  });
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/state')
      .then((res) => {
        if (!res.ok) throw new Error('Backend unavailable');
        return res.json();
      })
      .then((data: AppDatabase) => {
        if (mounted && data && Array.isArray(data.publications)) {
          setDb(data);
          localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(data));
        }
      })
      .catch(() => {
        // Fallback to localStorage
      });
    return () => {
      mounted = false;
    };
  }, []);

  const persistLocal = (nextDb: AppDatabase) => {
    setDb(nextDb);
    try {
      localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(nextDb));
    } catch {
      // Ignore storage errors
    }
  };

  const handleSelectPublisherId = (id: string) => {
    setSelectedPublisherId(id);
    localStorage.setItem(LOCAL_STORAGE_PUBLISHER_ID_KEY, id);
  };

  const handleToggleMode = () => {
    if (mode === 'servant') {
      setMode('publisher');
      return;
    }
    if (isServantUnlocked) {
      setMode('servant');
    } else {
      setPinInput('');
      setPinError('');
      setIsPinModalOpen(true);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === db.adminPin) {
      setIsServantUnlocked(true);
      sessionStorage.setItem(LOCAL_STORAGE_SERVANT_AUTH_KEY, 'true');
      setIsPinModalOpen(false);
      setMode('servant');
      showToast('Modo Encargado activado.');
    } else {
      setPinError('PIN incorrecto.');
    }
  };

  // --- API & State Handlers ---

  const handleCreateOrder = async (payload: {
    publisherId: string;
    publicationId: string;
    quantity: number;
    notes?: string;
    customLanguage?: string;
  }) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created: SpecialOrder = await res.json();
        persistLocal({
          ...db,
          orders: [created, ...db.orders],
        });
        return;
      }
    } catch {
      // Fallback local
    }

    const pub = db.publications.find((p) => p.id === payload.publicationId);
    const usr = db.publishers.find((p) => p.id === payload.publisherId);
    if (!pub || !usr) return;
    const now = new Date().toISOString();
    const fallbackOrder: SpecialOrder = {
      id: `ord-${Date.now()}`,
      publisherId: usr.id,
      publisherName: usr.fullName,
      publicationId: pub.id,
      publicationCode: pub.code,
      publicationTitle: pub.title,
      language: payload.customLanguage || pub.language,
      quantity: payload.quantity,
      notes: payload.notes,
      status: 'requested',
      createdAt: now,
      updatedAt: now,
    };
    persistLocal({
      ...db,
      orders: [fallbackOrder, ...db.orders],
    });
  };

  const handleCancelOrder = async (orderId: string) => {
    await handleUpdateOrderStatus(orderId, 'cancelled');
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: OrderStatus
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated: SpecialOrder = await res.json();
        persistLocal({
          ...db,
          orders: db.orders.map((o) => (o.id === orderId ? updated : o)),
        });
        return;
      }
    } catch {
      // Fallback local
    }

    const now = new Date().toISOString();
    persistLocal({
      ...db,
      orders: db.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              updatedAt: now,
              deliveredAt: status === 'delivered' ? now : o.deliveredAt,
            }
          : o
      ),
    });
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    } catch {
      // Fallback local
    }
    persistLocal({
      ...db,
      orders: db.orders.filter((o) => o.id !== orderId),
    });
  };

  const handleBatchMarkOrdered = async () => {
    try {
      const res = await fetch('/api/orders/batch-mark-ordered', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        persistLocal({
          ...db,
          orders: data.orders,
        });
        return;
      }
    } catch {
      // Fallback local
    }

    const now = new Date().toISOString();
    persistLocal({
      ...db,
      orders: db.orders.map((o) =>
        o.status === 'requested'
          ? { ...o, status: 'ordered_branch', updatedAt: now }
          : o
      ),
    });
  };

  const handleCreatePublication = async (pub: Partial<Publication>) => {
    try {
      const res = await fetch('/api/publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pub),
      });
      if (res.ok) {
        const created: Publication = await res.json();
        persistLocal({
          ...db,
          publications: [created, ...db.publications],
        });
        return;
      }
    } catch {
      // Fallback local
    }

    const now = new Date().toISOString();
    const created: Publication = {
      id: `pub-${Date.now()}`,
      code: pub.code || 'cod',
      title: pub.title || 'Publicación',
      category: pub.category || 'Libros',
      language: pub.language || 'Español',
      isSpecialOrderEligible: pub.isSpecialOrderEligible ?? true,
      isGeneralStock: pub.isGeneralStock ?? true,
      isFeatured: pub.isFeatured ?? false,
      featuredNote: pub.featuredNote || '',
      stockCount: pub.stockCount ?? 0,
      updatedAt: now,
    };
    persistLocal({
      ...db,
      publications: [created, ...db.publications],
    });
  };

  const handleUpdatePublication = async (
    id: string,
    patch: Partial<Publication>
  ) => {
    try {
      const res = await fetch(`/api/publications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated: Publication = await res.json();
        persistLocal({
          ...db,
          publications: db.publications.map((p) =>
            p.id === id ? updated : p
          ),
        });
        return;
      }
    } catch {
      // Fallback local
    }

    persistLocal({
      ...db,
      publications: db.publications.map((p) =>
        p.id === id
          ? { ...p, ...patch, updatedAt: new Date().toISOString() }
          : p
      ),
    });
  };

  const handleDeletePublication = async (id: string) => {
    try {
      await fetch(`/api/publications/${id}`, { method: 'DELETE' });
    } catch {
      // Fallback local
    }
    persistLocal({
      ...db,
      publications: db.publications.filter((p) => p.id !== id),
    });
  };

  const handleCreatePublisher = async (pub: {
    fullName: string;
    groupName: string;
    phone: string;
  }) => {
    try {
      const res = await fetch('/api/publishers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pub),
      });
      if (res.ok) {
        const created: Publisher = await res.json();
        const nextList = [...db.publishers, created].sort((a, b) =>
          a.fullName.localeCompare(b.fullName, 'es')
        );
        persistLocal({
          ...db,
          publishers: nextList,
        });
        return;
      }
    } catch {
      // Fallback local
    }

    const created: Publisher = {
      id: `usr-${Date.now()}`,
      fullName: pub.fullName,
      groupName: pub.groupName,
      phone: pub.phone.replace(/[^\d+]/g, ''),
      active: true,
    };
    const nextList = [...db.publishers, created].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'es')
    );
    persistLocal({
      ...db,
      publishers: nextList,
    });
  };

  const handleBulkAddPublishers = async (
    items: Array<{ fullName: string; groupName: string; phone: string }>
  ) => {
    try {
      const res = await fetch('/api/publishers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        const data = await res.json();
        persistLocal({
          ...db,
          publishers: data.publishers,
        });
        return;
      }
    } catch {
      // Fallback local
    }

    const existing = new Set(
      db.publishers.map((p) => p.fullName.trim().toLowerCase())
    );
    const added: Publisher[] = [];
    items.forEach((it, idx) => {
      const lower = it.fullName.trim().toLowerCase();
      if (!lower || existing.has(lower)) return;
      existing.add(lower);
      added.push({
        id: `usr-${Date.now()}-${idx}`,
        fullName: it.fullName.trim(),
        groupName: '',
        phone: it.phone.replace(/[^\d+]/g, ''),
        active: true,
      });
    });

    const nextList = [...db.publishers, ...added].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'es')
    );
    persistLocal({
      ...db,
      publishers: nextList,
    });
  };

  const handleUpdatePublisher = async (
    id: string,
    patch: Partial<Publisher>
  ) => {
    try {
      const res = await fetch(`/api/publishers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated: Publisher = await res.json();
        const nextList = db.publishers
          .map((p) => (p.id === id ? updated : p))
          .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
        persistLocal({
          ...db,
          publishers: nextList,
        });
        return;
      }
    } catch {
      // Fallback local
    }

    const nextList = db.publishers
      .map((p) => (p.id === id ? { ...p, ...patch } : p))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
    persistLocal({
      ...db,
      publishers: nextList,
    });
  };

  const handleDeletePublisher = async (id: string) => {
    try {
      await fetch(`/api/publishers/${id}`, { method: 'DELETE' });
    } catch {
      // Fallback local
    }
    persistLocal({
      ...db,
      publishers: db.publishers.filter((p) => p.id !== id),
    });
  };

  const handleUpdateSettings = async (settings: {
    congregationName: string;
    adminPin: string;
  }) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch {
      // Fallback local
    }
    persistLocal({
      ...db,
      congregationName: settings.congregationName,
      adminPin: settings.adminPin,
    });
  };

  const activePublisherOrdersCount = db.orders.filter(
    (o) =>
      o.publisherId === selectedPublisherId &&
      (o.status === 'requested' ||
        o.status === 'ordered_branch' ||
        o.status === 'ready_pickup')
  ).length;

  const requestedBatchCount = db.orders.filter(
    (o) => o.status === 'requested'
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 overflow-x-hidden">
      {/* Compact Header (Fits 100% on narrow phones with zero horizontal scroll) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setMode('publisher');
            setPublisherTab('catalog');
          }}
          className="font-display text-sm sm:text-base font-bold text-slate-900 truncate"
        >
          Publicaciones · {db.congregationName}
        </a>

        <button
          type="button"
          onClick={handleToggleMode}
          className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            mode === 'servant'
              ? 'bg-slate-900 text-white'
              : 'bg-[#1E3A5F] text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>{mode === 'servant' ? 'Salir de Encargado' : 'Encargado'}</span>
        </button>
      </header>

      {/* Single Unified Navigation Grid (Fits 100% width on mobile & desktop, NO horizontal scrolling) */}
      <div className="bg-white border-b border-slate-200 px-2 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {mode === 'publisher' ? (
            <div className="grid grid-cols-3 gap-1 py-1.5">
              <button
                type="button"
                onClick={() => setPublisherTab('catalog')}
                className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-colors ${
                  publisherTab === 'catalog'
                    ? 'bg-[#1E3A5F] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>Pedir</span>
              </button>

              <button
                type="button"
                onClick={() => setPublisherTab('my_orders')}
                className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-colors ${
                  publisherTab === 'my_orders'
                    ? 'bg-[#1E3A5F] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>Mis Pedidos ({activePublisherOrdersCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setPublisherTab('stock')}
                className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-colors ${
                  publisherTab === 'stock'
                    ? 'bg-[#1E3A5F] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>Existencias</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1 py-1.5">
              <button
                type="button"
                onClick={() => setServantTab('orders')}
                className={`min-h-[46px] rounded-xl text-[11px] sm:text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
                  servantTab === 'orders'
                    ? 'bg-[#1E3A5F] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span>Pedidos</span>
              </button>

              <button
                type="button"
                onClick={() => setServantTab('branch_batch')}
                className={`min-h-[46px] rounded-xl text-[11px] sm:text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
                  servantTab === 'branch_batch'
                    ? 'bg-[#1E3A5F] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Truck className="w-4 h-4 shrink-0" />
                <span>Sucursal ({requestedBatchCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setServantTab('catalog_stock')}
                className={`min-h-[46px] rounded-xl text-[11px] sm:text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
                  servantTab === 'catalog_stock'
                    ? 'bg-[#1E3A5F] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>Catálogo</span>
              </button>

              <button
                type="button"
                onClick={() => setServantTab('publishers')}
                className={`min-h-[46px] rounded-xl text-[11px] sm:text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
                  servantTab === 'publishers'
                    ? 'bg-[#1E3A5F] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Hermanos</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs sm:text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-6 pt-4">
        {mode === 'publisher' ? (
          <PublisherPortal
            activeTab={publisherTab}
            setActiveTab={setPublisherTab}
            publications={db.publications}
            publishers={db.publishers}
            orders={db.orders}
            selectedPublisherId={selectedPublisherId}
            onSelectPublisherId={handleSelectPublisherId}
            onCreateOrder={handleCreateOrder}
            onCancelOrder={handleCancelOrder}
            showToast={showToast}
          />
        ) : (
          <ServantPanel
            activeTab={servantTab}
            setActiveTab={setServantTab}
            congregationName={db.congregationName}
            adminPin={db.adminPin}
            publications={db.publications}
            publishers={db.publishers}
            orders={db.orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onBatchMarkOrdered={handleBatchMarkOrdered}
            onCreateOrder={handleCreateOrder}
            onCreatePublication={handleCreatePublication}
            onUpdatePublication={handleUpdatePublication}
            onDeletePublication={handleDeletePublication}
            onCreatePublisher={handleCreatePublisher}
            onBulkAddPublishers={handleBulkAddPublishers}
            onUpdatePublisher={handleUpdatePublisher}
            onDeletePublisher={handleDeletePublisher}
            onUpdateSettings={handleUpdateSettings}
            showToast={showToast}
          />
        )}
      </main>

      {/* PIN Modal for Literature Servant */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xs bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#1E3A5F]">
                <Lock className="w-4 h-4" />
                <h2 className="text-sm font-semibold text-slate-900">
                  PIN del Encargado
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Ingresa el PIN (por defecto: <strong className="font-mono text-slate-900">{db.adminPin}</strong>)
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="1914"
                className="w-full min-h-[46px] px-3 py-2 text-center text-lg font-mono tracking-widest border border-slate-300 rounded-xl"
              />
              {pinError && (
                <p className="text-xs text-rose-600 font-medium text-center">
                  {pinError}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="min-h-[42px] text-xs font-medium text-slate-700 bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] text-xs font-medium text-white bg-[#1E3A5F] rounded-xl"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
