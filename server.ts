import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_DATABASE } from './src/data/seedData.ts';
import { AppDatabase, OrderStatus, Publication, Publisher, SpecialOrder } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'congregation_db.json');

function loadDatabase(): AppDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATABASE, null, 2), 'utf-8');
      return structuredClone(INITIAL_DATABASE);
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as AppDatabase;
    return {
      congregationName: parsed.congregationName || INITIAL_DATABASE.congregationName,
      adminPin: parsed.adminPin || INITIAL_DATABASE.adminPin,
      publications: Array.isArray(parsed.publications) ? parsed.publications : INITIAL_DATABASE.publications,
      publishers: Array.isArray(parsed.publishers) ? parsed.publishers : INITIAL_DATABASE.publishers,
      orders: Array.isArray(parsed.orders) ? parsed.orders : INITIAL_DATABASE.orders,
    };
  } catch (err) {
    console.error('Error loading database, using seed data:', err);
    return structuredClone(INITIAL_DATABASE);
  }
}

function saveDatabase(db: AppDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  let db: AppDatabase = loadDatabase();

  // GET all state
  app.get('/api/state', (_req, res) => {
    res.json(db);
  });

  // Update congregation settings (name, PIN)
  app.put('/api/settings', (req, res) => {
    const { congregationName, adminPin } = req.body;
    if (typeof congregationName === 'string' && congregationName.trim()) {
      db.congregationName = congregationName.trim();
    }
    if (typeof adminPin === 'string' && adminPin.trim()) {
      db.adminPin = adminPin.trim();
    }
    saveDatabase(db);
    res.json({ congregationName: db.congregationName, adminPin: db.adminPin });
  });

  // Create or update publication
  app.post('/api/publications', (req, res) => {
    const body = req.body as Partial<Publication>;
    if (!body.title || !body.code) {
      res.status(400).json({ error: 'El código y título son obligatorios.' });
      return;
    }
    const now = new Date().toISOString();
    const newPub: Publication = {
      id: `pub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: body.code.trim(),
      title: body.title.trim(),
      category: body.category || 'Libros',
      language: (body.language || 'Español').trim(),
      isSpecialOrderEligible: body.isSpecialOrderEligible ?? true,
      isGeneralStock: body.isGeneralStock ?? true,
      isFeatured: body.isFeatured ?? false,
      featuredNote: body.featuredNote?.trim() || '',
      stockCount: Math.max(0, Number(body.stockCount) || 0),
      updatedAt: now,
    };
    db.publications.unshift(newPub);
    saveDatabase(db);
    res.json(newPub);
  });

  app.put('/api/publications/:id', (req, res) => {
    const { id } = req.params;
    const idx = db.publications.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Publicación no encontrada.' });
      return;
    }
    const current = db.publications[idx];
    const body = req.body as Partial<Publication>;
    const updated: Publication = {
      ...current,
      code: body.code !== undefined ? body.code.trim() : current.code,
      title: body.title !== undefined ? body.title.trim() : current.title,
      category: body.category !== undefined ? body.category : current.category,
      language: body.language !== undefined ? body.language.trim() : current.language,
      isSpecialOrderEligible: body.isSpecialOrderEligible !== undefined ? body.isSpecialOrderEligible : current.isSpecialOrderEligible,
      isGeneralStock: body.isGeneralStock !== undefined ? body.isGeneralStock : current.isGeneralStock,
      isFeatured: body.isFeatured !== undefined ? body.isFeatured : current.isFeatured,
      featuredNote: body.featuredNote !== undefined ? body.featuredNote.trim() : current.featuredNote,
      stockCount: body.stockCount !== undefined ? Math.max(0, Number(body.stockCount)) : current.stockCount,
      updatedAt: new Date().toISOString(),
    };
    db.publications[idx] = updated;
    saveDatabase(db);
    res.json(updated);
  });

  app.delete('/api/publications/:id', (req, res) => {
    const { id } = req.params;
    db.publications = db.publications.filter((p) => p.id !== id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Create single publisher
  app.post('/api/publishers', (req, res) => {
    const { fullName, groupName, phone } = req.body;
    if (!fullName || !fullName.trim()) {
      res.status(400).json({ error: 'El nombre del publicador es obligatorio.' });
      return;
    }
    const newPub: Publisher = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: fullName.trim(),
      groupName: (groupName || 'Grupo 1').trim(),
      phone: (phone || '').replace(/[^\d+]/g, ''),
      active: true,
    };
    db.publishers.push(newPub);
    db.publishers.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
    saveDatabase(db);
    res.json(newPub);
  });

  // Bulk import publishers
  app.post('/api/publishers/bulk', (req, res) => {
    const { items } = req.body as {
      items: Array<{ fullName: string; groupName?: string; phone?: string }>;
    };
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'No se recibieron publicadores para importar.' });
      return;
    }

    const existingNames = new Set(
      db.publishers.map((p) => p.fullName.trim().toLowerCase())
    );
    const added: Publisher[] = [];

    items.forEach((item, index) => {
      const cleanName = (item.fullName || '').trim();
      if (!cleanName) return;
      const lower = cleanName.toLowerCase();
      if (existingNames.has(lower)) return;

      existingNames.add(lower);
      const newPublisher: Publisher = {
        id: `usr-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`,
        fullName: cleanName,
        groupName: (item.groupName || 'Grupo 1').trim(),
        phone: (item.phone || '').replace(/[^\d+]/g, ''),
        active: true,
      };
      db.publishers.push(newPublisher);
      added.push(newPublisher);
    });

    db.publishers.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
    saveDatabase(db);
    res.json({ addedCount: added.length, publishers: db.publishers });
  });

  // Update publisher
  app.put('/api/publishers/:id', (req, res) => {
    const { id } = req.params;
    const idx = db.publishers.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Publicador no encontrado.' });
      return;
    }
    const current = db.publishers[idx];
    const { fullName, groupName, phone, active } = req.body;
    const updated: Publisher = {
      ...current,
      fullName: fullName !== undefined ? fullName.trim() : current.fullName,
      groupName: groupName !== undefined ? groupName.trim() : current.groupName,
      phone: phone !== undefined ? phone.replace(/[^\d+]/g, '') : current.phone,
      active: active !== undefined ? Boolean(active) : current.active,
    };
    db.publishers[idx] = updated;
    db.publishers.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
    saveDatabase(db);
    res.json(updated);
  });

  // Delete publisher
  app.delete('/api/publishers/:id', (req, res) => {
    const { id } = req.params;
    db.publishers = db.publishers.filter((p) => p.id !== id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Create special order
  app.post('/api/orders', (req, res) => {
    const {
      publisherId,
      publicationId,
      quantity,
      notes,
      customLanguage,
    } = req.body;

    const publisher = db.publishers.find((p) => p.id === publisherId);
    const publication = db.publications.find((p) => p.id === publicationId);

    if (!publisher || !publication) {
      res.status(400).json({ error: 'Publicador o publicación no válidos.' });
      return;
    }

    const now = new Date().toISOString();
    const order: SpecialOrder = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      publisherId: publisher.id,
      publisherName: publisher.fullName,
      publicationId: publication.id,
      publicationCode: publication.code,
      publicationTitle: publication.title,
      language: (customLanguage || publication.language || 'Español').trim(),
      quantity: Math.max(1, Number(quantity) || 1),
      notes: notes?.trim() || undefined,
      status: 'requested',
      createdAt: now,
      updatedAt: now,
    };

    db.orders.unshift(order);
    saveDatabase(db);
    res.json(order);
  });

  // Update order status or details
  app.put('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const idx = db.orders.findIndex((o) => o.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Pedido no encontrado.' });
      return;
    }

    const current = db.orders[idx];
    const { status, quantity, notes } = req.body as {
      status?: OrderStatus;
      quantity?: number;
      notes?: string;
    };

    const now = new Date().toISOString();
    const updated: SpecialOrder = {
      ...current,
      status: status || current.status,
      quantity: quantity !== undefined ? Math.max(1, Number(quantity)) : current.quantity,
      notes: notes !== undefined ? notes.trim() : current.notes,
      updatedAt: now,
      deliveredAt: status === 'delivered' ? now : current.deliveredAt,
    };

    db.orders[idx] = updated;
    saveDatabase(db);
    res.json(updated);
  });

  // Batch mark all 'requested' orders as 'ordered_branch'
  app.post('/api/orders/batch-mark-ordered', (_req, res) => {
    const now = new Date().toISOString();
    let updatedCount = 0;
    db.orders = db.orders.map((order) => {
      if (order.status === 'requested') {
        updatedCount += 1;
        return {
          ...order,
          status: 'ordered_branch',
          updatedAt: now,
        };
      }
      return order;
    });
    saveDatabase(db);
    res.json({ updatedCount, orders: db.orders });
  });

  // Delete order permanently
  app.delete('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    db.orders = db.orders.filter((o) => o.id !== id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
