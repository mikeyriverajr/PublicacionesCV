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
import {
  batchUpdateOrdersInFirestore,
  bulkSavePublicationsToFirestore,
  bulkSavePublishersToFirestore,
  collection,
  db as firestoreDb,
  deleteOrderFromFirestore,
  deletePublicationFromFirestore,
  deletePublisherFromFirestore,
  doc,
  ensureFirestoreSeeded,
  handleFirestoreError,
  onSnapshot,
  OperationType,
  saveOrderToFirestore,
  savePublicationToFirestore,
  savePublisherToFirestore,
  saveSettingsToFirestore,
} from './firebase';
import { ParsedInventoryRow } from './utils/pdfInventoryParser';
import { PublisherPortal, PublisherTab } from './components/PublisherPortal';
import { ServantPanel, ServantTab } from './components/ServantPanel';

const LOCAL_STORAGE_DB_KEY = 'congregation_publications_db_v2';
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
      // Ignore parse errors
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

  const updateLocalDb = (updater: (prev: AppDatabase) => AppDatabase) => {
    setDb((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Seed Firestore once if uninitialized, then attach live listeners
  useEffect(() => {
    let unsubSettings: (() => void) | undefined;
    let unsubPubs: (() => void) | undefined;
    let unsubPublishers: (() => void) | undefined;
    let unsubOrders: (() => void) | undefined;
    let active = true;

    async function initRealtimeSync() {
      try {
        await ensureFirestoreSeeded();
      } catch (err) {
        console.error('Seed check error:', err);
      }

      if (!active) return;

      unsubSettings = onSnapshot(
        doc(firestoreDb, 'settings', 'main'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            updateLocalDb((prev) => ({
              ...prev,
              congregationName:
                typeof data.congregationName === 'string'
                  ? data.congregationName
                  : prev.congregationName,
              adminPin:
                typeof data.adminPin === 'string'
                  ? data.adminPin
                  : prev.adminPin,
            }));
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'settings/main');
        }
      );

      unsubPubs = onSnapshot(
        collection(firestoreDb, 'publications'),
        (snap) => {
          const pubs: Publication[] = [];
          snap.forEach((d) => pubs.push(d.data() as Publication));
          pubs.sort((a, b) => a.title.localeCompare(b.title, 'es'));
          updateLocalDb((prev) => ({ ...prev, publications: pubs }));
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'publications');
        }
      );

      unsubPublishers = onSnapshot(
        collection(firestoreDb, 'publishers'),
        (snap) => {
          const list: Publisher[] = [];
          snap.forEach((d) => list.push(d.data() as Publisher));
          list.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
          updateLocalDb((prev) => ({ ...prev, publishers: list }));
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'publishers');
        }
      );

      unsubOrders = onSnapshot(
        collection(firestoreDb, 'orders'),
        (snap) => {
          const list: SpecialOrder[] = [];
          snap.forEach((d) => list.push(d.data() as SpecialOrder));
          list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          updateLocalDb((prev) => ({ ...prev, orders: list }));
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'orders');
        }
      );
    }

    initRealtimeSync();

    return () => {
      active = false;
      if (unsubSettings) unsubSettings();
      if (unsubPubs) unsubPubs();
      if (unsubPublishers) unsubPublishers();
      if (unsubOrders) unsubOrders();
    };
  }, []);

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

  // --- Optimistic + Firestore Handlers ---

  const handleCreateOrder = async (payload: {
    publisherId: string;
    publicationId: string;
    quantity: number;
    notes?: string;
    customLanguage?: string;
  }) => {
    const pub = db.publications.find((p) => p.id === payload.publicationId);
    const usr = db.publishers.find((p) => p.id === payload.publisherId);
    if (!pub || !usr) return;

    const reqQty = Math.max(1, Math.min(500, Number(payload.quantity) || 1));
    const now = new Date().toISOString();
    const hasStockInHall = pub.stockCount > 0;

    const updatedPub: Publication | null = hasStockInHall
      ? {
          ...pub,
          stockCount: Math.max(0, pub.stockCount - reqQty),
          updatedAt: now,
        }
      : null;

    const newOrder: SpecialOrder = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      publisherId: usr.id,
      publisherName: usr.fullName,
      publicationId: pub.id,
      publicationCode: pub.code,
      publicationTitle: pub.title,
      language: payload.customLanguage || pub.language || 'Español',
      quantity: reqQty,
      notes: hasStockInHall
        ? 'En existencia en mostrador — Entregar en la reunión'
        : payload.notes,
      status: hasStockInHall ? 'ready_pickup' : 'requested',
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic UI update
    updateLocalDb((prev) => ({
      ...prev,
      publications: updatedPub
        ? prev.publications.map((p) => (p.id === updatedPub.id ? updatedPub : p))
        : prev.publications,
      orders: [newOrder, ...prev.orders],
    }));

    if (updatedPub) {
      await savePublicationToFirestore(updatedPub);
    }
    await saveOrderToFirestore(newOrder);
  };

  const handleCancelOrder = async (orderId: string) => {
    await handleUpdateOrderStatus(orderId, 'cancelled');
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: OrderStatus
  ) => {
    const current = db.orders.find((o) => o.id === orderId);
    if (!current) return;
    const now = new Date().toISOString();
    const updated: SpecialOrder = {
      ...current,
      status,
      updatedAt: now,
      deliveredAt: status === 'delivered' ? now : current.deliveredAt,
    };

    updateLocalDb((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => (o.id === orderId ? updated : o)),
    }));

    await saveOrderToFirestore(updated);
  };

  const handleDeleteOrder = async (orderId: string) => {
    updateLocalDb((prev) => ({
      ...prev,
      orders: prev.orders.filter((o) => o.id !== orderId),
    }));
    await deleteOrderFromFirestore(orderId);
  };

  const handleBatchMarkOrdered = async () => {
    const now = new Date().toISOString();
    const toUpdate = db.orders
      .filter((o) => o.status === 'requested')
      .map((o) => ({
        ...o,
        status: 'ordered_branch' as OrderStatus,
        updatedAt: now,
      }));

    if (toUpdate.length === 0) return;

    updateLocalDb((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.status === 'requested'
          ? { ...o, status: 'ordered_branch', updatedAt: now }
          : o
      ),
    }));

    await batchUpdateOrdersInFirestore(toUpdate);
  };

  const handleCreatePublication = async (pub: Partial<Publication>) => {
    const now = new Date().toISOString();
    const created: Publication = {
      id: `pub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: (pub.code || 'cod').trim(),
      title: (pub.title || 'Publicación').trim(),
      category: pub.category || 'Libros',
      language: (pub.language || 'Español').trim(),
      isSpecialOrderEligible: pub.isSpecialOrderEligible ?? true,
      isGeneralStock: pub.isGeneralStock ?? true,
      isFeatured: pub.isFeatured ?? false,
      featuredNote: pub.featuredNote?.trim() || '',
      stockCount: Math.max(0, Number(pub.stockCount) || 0),
      updatedAt: now,
    };

    updateLocalDb((prev) => ({
      ...prev,
      publications: [created, ...prev.publications],
    }));

    await savePublicationToFirestore(created);
  };

  const handleUpdatePublication = async (
    id: string,
    patch: Partial<Publication>
  ) => {
    const current = db.publications.find((p) => p.id === id);
    if (!current) return;
    const updated: Publication = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    updateLocalDb((prev) => ({
      ...prev,
      publications: prev.publications.map((p) => (p.id === id ? updated : p)),
    }));

    await savePublicationToFirestore(updated);
  };

  const handleDeletePublication = async (id: string) => {
    updateLocalDb((prev) => ({
      ...prev,
      publications: prev.publications.filter((p) => p.id !== id),
    }));
    await deletePublicationFromFirestore(id);
  };

  const handleBulkImportInventory = async (
    items: ParsedInventoryRow[],
    reportLanguage: string
  ) => {
    if (items.length === 0) return;
    const now = new Date().toISOString();
    const toPersist: Publication[] = [];

    updateLocalDb((prev) => {
      const byCode = new Map<string, Publication>();
      prev.publications.forEach((p) => {
        byCode.set(p.code.trim().toLowerCase(), p);
      });

      const updatedMap = new Map<string, Publication>();
      prev.publications.forEach((p) => {
        updatedMap.set(p.id, p);
      });

      items.forEach((row, idx) => {
        const key = row.code.trim().toLowerCase();
        const existing = byCode.get(key);
        if (existing) {
          const updated: Publication = {
            ...existing,
            stockCount: Math.max(0, row.quantity),
            isGeneralStock: true,
            updatedAt: now,
          };
          updatedMap.set(updated.id, updated);
          toPersist.push(updated);
        } else {
          const safeCodeId = row.code
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .toLowerCase();
          const created: Publication = {
            id: `pub-${safeCodeId}-${Date.now()}-${idx}`,
            code: row.code.trim(),
            title: row.title.trim(),
            category: row.category || 'Libros',
            language: reportLanguage || 'Español',
            isSpecialOrderEligible: true,
            isGeneralStock: true,
            isFeatured: false,
            featuredNote: '',
            stockCount: Math.max(0, row.quantity),
            updatedAt: now,
          };
          updatedMap.set(created.id, created);
          byCode.set(key, created);
          toPersist.push(created);
        }
      });

      const merged = Array.from(updatedMap.values()).sort((a, b) =>
        a.title.localeCompare(b.title, 'es')
      );

      return {
        ...prev,
        publications: merged,
      };
    });

    if (toPersist.length > 0) {
      await bulkSavePublicationsToFirestore(toPersist);
    }
  };

  const handleCreatePublisher = async (pub: {
    fullName: string;
    groupName: string;
    phone: string;
  }) => {
    const created: Publisher = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: pub.fullName.trim(),
      groupName: pub.groupName.trim(),
      phone: pub.phone.replace(/[^\d+]/g, ''),
      active: true,
    };

    updateLocalDb((prev) => ({
      ...prev,
      publishers: [...prev.publishers, created].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, 'es')
      ),
    }));

    await savePublisherToFirestore(created);
  };

  const handleBulkAddPublishers = async (
    items: Array<{ fullName: string; groupName: string; phone: string }>
  ) => {
    const existing = new Set(
      db.publishers.map((p) => p.fullName.trim().toLowerCase())
    );
    const added: Publisher[] = [];
    items.forEach((it, idx) => {
      const lower = it.fullName.trim().toLowerCase();
      if (!lower || existing.has(lower)) return;
      existing.add(lower);
      added.push({
        id: `usr-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        fullName: it.fullName.trim(),
        groupName: '',
        phone: it.phone.replace(/[^\d+]/g, ''),
        active: true,
      });
    });

    if (added.length === 0) return;

    updateLocalDb((prev) => ({
      ...prev,
      publishers: [...prev.publishers, ...added].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, 'es')
      ),
    }));

    await bulkSavePublishersToFirestore(added);
  };

  const handleUpdatePublisher = async (
    id: string,
    patch: Partial<Publisher>
  ) => {
    const current = db.publishers.find((p) => p.id === id);
    if (!current) return;
    const updated: Publisher = {
      ...current,
      ...patch,
    };

    updateLocalDb((prev) => ({
      ...prev,
      publishers: prev.publishers
        .map((p) => (p.id === id ? updated : p))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es')),
    }));

    await savePublisherToFirestore(updated);
  };

  const handleDeletePublisher = async (id: string) => {
    updateLocalDb((prev) => ({
      ...prev,
      publishers: prev.publishers.filter((p) => p.id !== id),
    }));
    await deletePublisherFromFirestore(id);
  };

  const handleUpdateSettings = async (settings: {
    congregationName: string;
    adminPin: string;
  }) => {
    updateLocalDb((prev) => ({
      ...prev,
      congregationName: settings.congregationName,
      adminPin: settings.adminPin,
    }));
    await saveSettingsToFirestore(settings);
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
            onBulkImportInventory={handleBulkImportInventory}
            onCreatePublisher={handleCreatePublisher}
            onBulkAddPublishers={handleBulkAddPublishers}
            onUpdatePublisher={handleUpdatePublisher}
            onDeletePublisher={handleDeletePublisher}
            onUpdateSettings={handleUpdateSettings}
            showToast={showToast}
          />
        )}
      </main>

      {/* PIN Modal for Literature Servant (Does NOT reveal the PIN) */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xs bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#1E3A5F]">
                <Lock className="w-4 h-4" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Acceso del Encargado
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
              Ingresa el código PIN de siervo de publicaciones para continuar.
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
                placeholder="••••"
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
