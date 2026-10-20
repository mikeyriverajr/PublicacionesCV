import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  getFirestore,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { INITIAL_DATABASE } from './data/seedData';
import {
  OrderStatus,
  Publication,
  Publisher,
  SpecialOrder,
} from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Sanitization helpers matching firebase-blueprint.json & firestore.rules
function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  return cleaned || `id-${Date.now()}`;
}

export function sanitizePublication(pub: Publication): Publication {
  const base: Publication = {
    id: sanitizeId(pub.id),
    code: (pub.code || 'cod').trim().slice(0, 40),
    title: (pub.title || 'Publicación').trim().slice(0, 250),
    category: (pub.category || 'Libros').slice(0, 80) as Publication['category'],
    language: (pub.language || 'Español').trim().slice(0, 80),
    isSpecialOrderEligible: Boolean(pub.isSpecialOrderEligible),
    isGeneralStock: Boolean(pub.isGeneralStock),
    isFeatured: Boolean(pub.isFeatured),
    stockCount: Math.max(0, Math.min(100000, Math.floor(Number(pub.stockCount) || 0))),
    updatedAt: (pub.updatedAt || new Date().toISOString()).slice(0, 64),
  };
  if (pub.featuredNote !== undefined) {
    base.featuredNote = pub.featuredNote.trim().slice(0, 300);
  }
  return base;
}

export function sanitizePublisher(pub: Publisher): Publisher {
  return {
    id: sanitizeId(pub.id),
    fullName: (pub.fullName || 'Publicador').trim().slice(0, 150),
    groupName: (pub.groupName || '').trim().slice(0, 80),
    phone: (pub.phone || '').replace(/[^\d+]/g, '').slice(0, 40),
    active: Boolean(pub.active),
  };
}

export function sanitizeOrder(ord: SpecialOrder): SpecialOrder {
  const validStatuses: OrderStatus[] = [
    'requested',
    'ordered_branch',
    'ready_pickup',
    'delivered',
    'cancelled',
  ];
  const status: OrderStatus = validStatuses.includes(ord.status)
    ? ord.status
    : 'requested';

  const base: SpecialOrder = {
    id: sanitizeId(ord.id),
    publisherId: sanitizeId(ord.publisherId),
    publisherName: (ord.publisherName || 'Publicador').trim().slice(0, 150),
    publicationId: sanitizeId(ord.publicationId),
    publicationCode: (ord.publicationCode || 'cod').trim().slice(0, 40),
    publicationTitle: (ord.publicationTitle || 'Publicación').trim().slice(0, 250),
    language: (ord.language || 'Español').trim().slice(0, 80),
    quantity: Math.max(1, Math.min(500, Math.floor(Number(ord.quantity) || 1))),
    status,
    createdAt: (ord.createdAt || new Date().toISOString()).slice(0, 64),
    updatedAt: (ord.updatedAt || new Date().toISOString()).slice(0, 64),
  };

  if (ord.notes !== undefined && ord.notes.trim().length > 0) {
    base.notes = ord.notes.trim().slice(0, 400);
  }
  if (ord.deliveredAt !== undefined && ord.deliveredAt.trim().length > 0) {
    base.deliveredAt = ord.deliveredAt.trim().slice(0, 64);
  }
  return base;
}

let isSeeding = false;

export async function ensureFirestoreSeeded(): Promise<void> {
  if (isSeeding) return;
  isSeeding = true;
  try {
    const pubsSnap = await getDocs(collection(db, 'publications'));
    if (!pubsSnap.empty) {
      return;
    }

    const batch = writeBatch(db);
    const now = new Date().toISOString().slice(0, 64);

    // Seed settings
    batch.set(doc(db, 'settings', 'main'), {
      congregationName: INITIAL_DATABASE.congregationName.slice(0, 120),
      adminPin: INITIAL_DATABASE.adminPin.slice(0, 32),
      updatedAt: now,
    });

    // Seed publications
    INITIAL_DATABASE.publications.forEach((p) => {
      const clean = sanitizePublication(p);
      batch.set(doc(db, 'publications', clean.id), clean);
    });

    // Seed publishers
    INITIAL_DATABASE.publishers.forEach((u) => {
      const clean = sanitizePublisher(u);
      batch.set(doc(db, 'publishers', clean.id), clean);
    });

    // Seed orders
    INITIAL_DATABASE.orders.forEach((o) => {
      const clean = sanitizeOrder(o);
      batch.set(doc(db, 'orders', clean.id), clean);
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed_initial_data');
  } finally {
    isSeeding = false;
  }
}

export async function saveSettingsToFirestore(settings: {
  congregationName: string;
  adminPin: string;
}): Promise<void> {
  const path = 'settings/main';
  try {
    await setDoc(doc(db, 'settings', 'main'), {
      congregationName: (settings.congregationName || 'Congregación').trim().slice(0, 120),
      adminPin: (settings.adminPin || '1914').trim().slice(0, 32),
      updatedAt: new Date().toISOString().slice(0, 64),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function savePublicationToFirestore(pub: Publication): Promise<void> {
  const clean = sanitizePublication(pub);
  const path = `publications/${clean.id}`;
  try {
    await setDoc(doc(db, 'publications', clean.id), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePublicationFromFirestore(id: string): Promise<void> {
  const cleanId = sanitizeId(id);
  const path = `publications/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'publications', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function savePublisherToFirestore(pub: Publisher): Promise<void> {
  const clean = sanitizePublisher(pub);
  const path = `publishers/${clean.id}`;
  try {
    await setDoc(doc(db, 'publishers', clean.id), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function bulkSavePublishersToFirestore(
  pubs: Publisher[]
): Promise<void> {
  const path = 'publishers';
  try {
    const batch = writeBatch(db);
    pubs.forEach((p) => {
      const clean = sanitizePublisher(p);
      batch.set(doc(db, 'publishers', clean.id), clean);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePublisherFromFirestore(id: string): Promise<void> {
  const cleanId = sanitizeId(id);
  const path = `publishers/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'publishers', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveOrderToFirestore(ord: SpecialOrder): Promise<void> {
  const clean = sanitizeOrder(ord);
  const path = `orders/${clean.id}`;
  try {
    await setDoc(doc(db, 'orders', clean.id), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchUpdateOrdersInFirestore(
  ordersList: SpecialOrder[]
): Promise<void> {
  const path = 'orders';
  try {
    const batch = writeBatch(db);
    ordersList.forEach((o) => {
      const clean = sanitizeOrder(o);
      batch.set(doc(db, 'orders', clean.id), clean);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteOrderFromFirestore(id: string): Promise<void> {
  const cleanId = sanitizeId(id);
  const path = `orders/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'orders', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export { collection, doc, onSnapshot };
