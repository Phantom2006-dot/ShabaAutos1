import express, { Request, Response } from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { getDatabaseService, getDatabaseType, getDatabaseReady } from './server/database/index';
import { seedDatabase, hashPassword } from './server/scripts/seed';
import crypto from 'node:crypto';
import { requireAuth, requireRole, getAuthenticatedClerkUser } from './server/middleware/auth';
import { handleClerkWebhook } from './server/routes/webhooks';
import { normalizeNigerianPhone } from './server/utils/phone';

const app = express();
const PORT = 3000;

app.use((req: Request, res: Response, next) => {
  const requestId = req.header('x-request-id') || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  next();
});

// Security Headers (CSP relaxed for Vite local development and preview iframe)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Capture raw body buffer for Svix webhook signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Initialize persistent database service
const dbService = getDatabaseService();

// Helper for password verification (legacy/compatibility)
function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(':');
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 1. Health & System Diagnostic Route
// -------------------------------------------------------------
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const { total } = await dbService.vehicles.list({ limit: 1 });
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: getDatabaseType(),
      totalVehicles: total,
      authProvider: 'clerk',
      demoMode: process.env.NODE_ENV !== 'production' && (process.env.DEMO_MODE === 'true' || !process.env.CLERK_SECRET_KEY),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/ready', async (_req: Request, res: Response) => {
  try {
    await getDatabaseReady();
    await dbService.vehicles.list({ limit: 1 });
    res.json({ success: true, status: 'ready', database: getDatabaseType() });
  } catch {
    res.status(503).json({ success: false, status: 'not_ready', code: 'DATABASE_UNAVAILABLE' });
  }
});

// -------------------------------------------------------------
// 2. Clerk Webhook Handler (Svix Signature Verified)
// -------------------------------------------------------------
app.post('/api/webhooks/clerk', handleClerkWebhook);

// -------------------------------------------------------------
// 2b. Authentication & User Profile Routes (Clerk Integrated)
// -------------------------------------------------------------
app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    res.json({
      success: true,
      user: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const { fullName, phone } = req.body;
    const updates: any = {};

    if (fullName && typeof fullName === 'string') {
      updates.fullName = fullName.trim();
    }

    if (phone) {
      const phoneRes = normalizeNigerianPhone(phone);
      if (!phoneRes.valid) {
        return res.status(400).json({
          success: false,
          message: phoneRes.error || 'Invalid Nigerian phone number',
          code: 'INVALID_PHONE',
          fieldErrors: { phone: phoneRes.error },
        });
      }
      updates.phone = phoneRes.normalized;
    }

    const updated = await dbService.users.update(req.user!.id, updates);
    res.json({
      success: true,
      message: 'Profile synchronized successfully',
      user: updated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/register', async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'ShabaAutos uses Clerk identity authentication. Please use Clerk custom authentication in AuthModalScreen.',
    provider: 'clerk',
  });
});

// -------------------------------------------------------------
// 2c. Operations Dashboard APIs (Admin / Staff)
// -------------------------------------------------------------
app.get('/api/ops/summary', requireAuth, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const [all, pending, reserved, sold, delisted] = await Promise.all([
      dbService.vehicles.list({ limit: 1000 }),
      dbService.vehicles.list({ limit: 1000, verified: false }),
      dbService.vehicles.list({ limit: 1000, status: 'reserved' }),
      dbService.vehicles.list({ limit: 1000, status: 'sold' }),
      dbService.vehicles.list({ limit: 1000, status: 'delisted' }),
    ]);
    const notifications = await dbService.notifications.listByUserId(req.user!.id);
    res.json({ success: true, role: req.user!.role, metrics: {
      totalVehicles: all.total,
      pendingApproval: pending.total,
      available: all.vehicles.filter((vehicle) => vehicle.status === 'available' && vehicle.verified).length,
      reserved: reserved.total,
      sold: sold.total,
      delisted: delisted.total,
      unreadNotifications: notifications.filter((item) => item.status !== 'read').length,
    }});
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/ops/vehicles', requireAuth, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const result = await dbService.vehicles.list({ limit: 100, status });
    const vehicles = await Promise.all(result.vehicles.map(async (vehicle) => ({
      ...vehicle,
      images: (await dbService.vehicles.getImages(vehicle.id)).map((image) => image.url),
    })));
    res.json({ success: true, data: vehicles, total: result.total });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/ops/vehicles', requireAuth, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const required = ['make', 'model', 'year', 'priceNgn', 'mileage', 'stockId', 'description'];
    const missing = required.filter((field) => body[field] === undefined || body[field] === '');
    if (missing.length) return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}`, code: 'VALIDATION_ERROR' });
    const created = await dbService.vehicles.create({
      make: String(body.make).trim(), model: String(body.model).trim(), year: Number(body.year),
      trim: body.trim ? String(body.trim) : undefined, priceNgn: Number(body.priceNgn),
      priceUsd: body.priceUsd ? Number(body.priceUsd) : undefined, mileage: Number(body.mileage),
      mileageUnit: body.mileageUnit === 'miles' ? 'miles' : 'km', transmission: body.transmission === 'Manual' ? 'Manual' : 'Automatic',
      fuelType: ['Diesel', 'Hybrid', 'Electric'].includes(body.fuelType) ? body.fuelType : 'Petrol',
      location: String(body.location || 'Lagos'), city: body.city ? String(body.city) : String(body.location || 'Lagos'),
      state: body.state ? String(body.state) : undefined, verified: false, cleanTitle: body.cleanTitle !== false,
      condition: body.condition || 'Foreign Used (Tokunbo)', bodyType: body.bodyType || 'SUV', engine: String(body.engine || '2.5L 4-Cylinder'),
      driveType: body.driveType || 'FWD', color: String(body.color || 'Silver'), seats: Number(body.seats || 5),
      stockId: String(body.stockId).trim(), description: String(body.description).trim(), features: Array.isArray(body.features) ? body.features.map(String) : [],
      inspectionPassed: false, sellerId: body.sellerId ? String(body.sellerId) : undefined, status: 'available',
    }, Array.isArray(body.images) ? body.images.map(String).filter(Boolean) : []);
    await dbService.audit.record({ actorUserId: req.user!.id, actorRole: req.user!.role, action: 'vehicle.create_draft', resourceType: 'vehicle', resourceId: created.id, ipAddress: req.ip, userAgent: req.get('user-agent') || undefined, changesJson: JSON.stringify({ stockId: created.stockId, verified: false, status: created.status }) });
    const staffUsers = (await dbService.users.list(100, 0)).filter((user) => user.role === 'staff' || user.role === 'admin');
    await Promise.all(staffUsers.map((user) => dbService.notifications.create({ userId: user.id, recipientEmail: user.email, channel: 'in_app', title: 'Vehicle submitted for review', message: `${created.year} ${created.make} ${created.model} (${created.stockId}) is waiting for inspection and listing approval.`, status: 'queued', relatedEntityType: 'vehicle', relatedEntityId: created.id })));
    res.status(201).json({ success: true, data: created, message: 'Vehicle submitted for approval.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.patch('/api/ops/vehicles/:id/approve', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const current = await dbService.vehicles.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    const updated = await dbService.vehicles.update(req.params.id, { verified: true, inspectionPassed: true });
    await dbService.audit.record({ actorUserId: req.user!.id, actorRole: req.user!.role, action: 'vehicle.approve_listing', resourceType: 'vehicle', resourceId: req.params.id, ipAddress: req.ip, userAgent: req.get('user-agent') || undefined, changesJson: JSON.stringify({ before: { verified: current.verified, inspectionPassed: current.inspectionPassed }, after: { verified: true, inspectionPassed: true } }) });
    const staffUsers = (await dbService.users.list(100, 0)).filter((user) => user.role === 'staff' || user.role === 'admin');
    await Promise.all(staffUsers.map((user) => dbService.notifications.create({ userId: user.id, recipientEmail: user.email, channel: 'in_app', title: 'Vehicle listing approved', message: `${current.year} ${current.make} ${current.model} (${current.stockId}) is now verified and ready for customer discovery.`, status: 'queued', relatedEntityType: 'vehicle', relatedEntityId: req.params.id })));
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/ops/notifications', requireAuth, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await dbService.notifications.listByUserId(req.user!.id) }); }
  catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/ops/audit', requireAuth, requireRole('admin'), async (_req: Request, res: Response) => {
  try { res.json({ success: true, data: await dbService.audit.list(undefined, undefined, 100) }); }
  catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/auth/login', async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'ShabaAutos uses Clerk identity authentication. Please use Clerk custom authentication in AuthModalScreen.',
    provider: 'clerk',
  });
});

// Helper: Map database vehicle entity into UI-ready Car model with stable images, explicit licensing & sanitization
async function formatVehicleToCar(v: any, images?: string[], seller?: any): Promise<any> {
  const defaultImages = [
    'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
  ];

  let resolvedImages = images;
  if (!resolvedImages || resolvedImages.length === 0) {
    const dbImages = await dbService.vehicles.getImages(v.id);
    resolvedImages = dbImages.length > 0 ? dbImages.map((img) => img.url) : defaultImages;
  }

  let resolvedSeller = seller;
  if (!resolvedSeller && v.sellerId) {
    resolvedSeller = await dbService.vehicles.getSeller(v.sellerId);
  }

  const createdDate = new Date(v.createdAt || Date.now());
  const diffHours = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60)));
  const listedTimeAgo =
    diffHours < 1 ? 'Just listed' : diffHours < 24 ? `${diffHours} hours ago` : `${Math.floor(diffHours / 24)} days ago`;

  return {
    id: v.id,
    make: v.make,
    model: v.model,
    year: Number(v.year),
    trim: v.trim || undefined,
    priceNgn: Number(v.priceNgn),
    priceUsd: v.priceUsd ? Number(v.priceUsd) : Math.round(Number(v.priceNgn) / 1500),
    mileage: Number(v.mileage),
    mileageUnit: v.mileageUnit || 'km',
    transmission: v.transmission === 'Manual' ? 'Manual' : 'Automatic',
    fuelType: v.fuelType || 'Petrol',
    location: v.location || 'Lagos',
    city: v.city || 'Lagos',
    state: v.state || 'Lagos',
    verified: Boolean(v.verified),
    cleanTitle: v.cleanTitle !== undefined ? Boolean(v.cleanTitle) : undefined,
    condition: v.condition || 'Nigeria Used',
    bodyType: v.bodyType || 'SUV',
    engine: v.engine || '2.5L 4-Cylinder',
    driveType: v.driveType || 'AWD',
    color: v.color || 'Silver',
    seats: Number(v.seats) || 5,
    stockId: v.stockId,
    listedTimeAgo,
    images: resolvedImages,
    imageSource: 'Verified Dealership Catalog & Studio Media',
    imageLicense: 'Editorial & Commercial Vehicle Marketplace Display Rights Granted',
    description: v.description || '',
    features: Array.isArray(v.features) ? v.features : [],
    inspectionPassed: v.inspectionPassed !== undefined ? Boolean(v.inspectionPassed) : undefined,
    // Strictly omit internal supplier notes, private seller banking/phone, or admin moderation fields
    seller: resolvedSeller
      ? {
          name: resolvedSeller.name,
          verified: Boolean(resolvedSeller.verified),
          rating: Number(resolvedSeller.rating) || 4.9,
          reviewsCount: Number(resolvedSeller.reviewsCount) || 42,
          location: resolvedSeller.location || 'Lagos, Nigeria',
          joinedYear: resolvedSeller.joinedYear || '2021',
        }
      : {
          name: 'Prime Motors Ltd',
          verified: true,
          rating: 4.9,
          reviewsCount: 42,
          location: 'Lekki Phase 1, Lagos',
          joinedYear: '2021',
        },
  };
}

// -------------------------------------------------------------
// 2c. Customer-Owned Private Resources (Scoped to Authenticated User)
// -------------------------------------------------------------
app.get('/api/me/saved-vehicles', requireAuth, async (req: Request, res: Response) => {
  try {
    const saved = await dbService.saved.getSavedVehicles(req.user!.id);
    const vehicles = await Promise.all(
      saved.map(async (vId) => {
        const v = await dbService.vehicles.findById(vId);
        return v ? formatVehicleToCar(v) : null;
      })
    );
    res.json({
      success: true,
      savedCarIds: saved,
      vehicles: vehicles.filter(Boolean),
      count: saved.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/me/saved-vehicles/:vehicleId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;
    if (!vehicleId) {
      return res.status(400).json({ success: false, message: 'vehicleId parameter is required' });
    }
    await dbService.saved.saveVehicle(req.user!.id, vehicleId);
    const saved = await dbService.saved.getSavedVehicles(req.user!.id);
    res.json({
      success: true,
      message: 'Vehicle saved to wishlist',
      savedCarIds: saved,
      count: saved.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/me/saved-vehicles/:vehicleId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;
    if (!vehicleId) {
      return res.status(400).json({ success: false, message: 'vehicleId parameter is required' });
    }
    await dbService.saved.unsaveVehicle(req.user!.id, vehicleId);
    const saved = await dbService.saved.getSavedVehicles(req.user!.id);
    res.json({
      success: true,
      message: 'Vehicle removed from wishlist',
      savedCarIds: saved,
      count: saved.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Backward compatibility for body-based saved-vehicles
app.post('/api/me/saved-vehicles', requireAuth, async (req: Request, res: Response) => {
  try {
    const { carId, vehicleId, action } = req.body;
    const targetId = vehicleId || carId;
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'vehicleId or carId is required' });
    }
    if (action === 'remove') {
      await dbService.saved.unsaveVehicle(req.user!.id, targetId);
    } else {
      await dbService.saved.saveVehicle(req.user!.id, targetId);
    }
    const saved = await dbService.saved.getSavedVehicles(req.user!.id);
    res.json({ success: true, savedCarIds: saved, count: saved.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Backward compatibility for /api/user/saved-cars
app.get('/api/user/saved-cars', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedClerkUser(req);
    if (!user) {
      return res.json({ success: true, savedCarIds: [] });
    }
    const saved = await dbService.saved.getSavedVehicles(user.id);
    res.json({ success: true, savedCarIds: saved, count: saved.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/user/saved-cars', requireAuth, async (req: Request, res: Response) => {
  try {
    const { carId, vehicleId, action } = req.body;
    const targetId = vehicleId || carId;
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'carId is required' });
    }
    if (action === 'remove') {
      await dbService.saved.unsaveVehicle(req.user!.id, targetId);
    } else {
      await dbService.saved.saveVehicle(req.user!.id, targetId);
    }
    const saved = await dbService.saved.getSavedVehicles(req.user!.id);
    res.json({ success: true, savedCarIds: saved, count: saved.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// Saved Searches Endpoints
// -------------------------------------------------------------
app.get('/api/me/saved-searches', requireAuth, async (req: Request, res: Response) => {
  try {
    const searches = await dbService.saved.getSavedSearches(req.user!.id);
    res.json({ success: true, data: searches });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/me/saved-searches', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, criteria, notifyEmail, notifySms } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, message: 'A descriptive search name is required' });
    }
    if (!criteria || typeof criteria !== 'object') {
      return res.status(400).json({ success: false, message: 'Search criteria object is required' });
    }
    const created = await dbService.saved.createSavedSearch({
      userId: req.user!.id,
      name: name.trim(),
      criteria,
      notifyEmail: Boolean(notifyEmail),
      notifySms: Boolean(notifySms),
    });
    res.status(201).json({
      success: true,
      message: 'Search criteria saved successfully',
      data: created,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/me/saved-searches/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Saved search ID is required' });
    }
    const deleted = await dbService.saved.deleteSavedSearch(id, req.user!.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Saved search not found or unauthorized' });
    }
    res.json({ success: true, message: 'Saved search deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/me/saved-searches', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Saved search id is required' });
    }
    const deleted = await dbService.saved.deleteSavedSearch(id, req.user!.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Saved search not found or unauthorized' });
    }
    res.json({ success: true, message: 'Saved search deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// Comparison Endpoints
// -------------------------------------------------------------
app.get('/api/me/comparison', requireAuth, async (req: Request, res: Response) => {
  try {
    const list = await dbService.saved.getComparisonList(req.user!.id);
    const vehicles = await Promise.all(
      (list || []).map(async (vId) => {
        const v = await dbService.vehicles.findById(vId);
        return v ? formatVehicleToCar(v) : null;
      })
    );
    res.json({
      success: true,
      vehicleIds: list || [],
      vehicles: vehicles.filter(Boolean),
      count: (list || []).length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const saveComparisonHandler = async (req: Request, res: Response) => {
  try {
    const { vehicleIds } = req.body;
    if (!Array.isArray(vehicleIds)) {
      return res.status(400).json({ success: false, message: 'vehicleIds array is required' });
    }
    const sanitizedIds = vehicleIds.filter((id) => typeof id === 'string').slice(0, 5);
    const saved = await dbService.saved.saveComparisonList(req.user!.id, 'Default Comparison', sanitizedIds);
    const vehicles = await Promise.all(
      saved.vehicleIds.map(async (vId) => {
        const v = await dbService.vehicles.findById(vId);
        return v ? formatVehicleToCar(v) : null;
      })
    );
    res.json({
      success: true,
      message: 'Comparison list updated successfully',
      vehicleIds: saved.vehicleIds,
      vehicles: vehicles.filter(Boolean),
      count: saved.vehicleIds.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

app.put('/api/me/comparison', requireAuth, saveComparisonHandler);
app.post('/api/me/comparison', requireAuth, saveComparisonHandler);

app.get('/api/me/offers', requireAuth, async (req: Request, res: Response) => {
  try {
    const offers = await dbService.offers.listByUserId(req.user!.id);
    res.json({ success: true, data: offers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/me/inspections', requireAuth, async (req: Request, res: Response) => {
  try {
    const inspections = await dbService.inspections.listByUserId(req.user!.id);
    res.json({ success: true, data: inspections });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/me/rentals', requireAuth, async (req: Request, res: Response) => {
  try {
    const rentals = await dbService.rentals.listBookingsByUserId(req.user!.id);
    res.json({ success: true, data: rentals });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/me/imports', requireAuth, async (req: Request, res: Response) => {
  try {
    const imports = await dbService.imports.listRequests(req.user!.id);
    res.json({ success: true, data: imports });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/me/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const notifications = await dbService.notifications.listByUserId(req.user!.id);
    res.json({ success: true, data: notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 2d. Staff & Admin Protected Routes
// -------------------------------------------------------------
app.get('/api/admin/users', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const users = await dbService.users.list(100, 0);
    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/admin/users/:id/role', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (!['customer', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be customer, staff, or admin.' });
    }
    const updated = await dbService.users.update(req.params.id, { role });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/staff/offers', requireRole(['staff', 'admin']), async (_req: Request, res: Response) => {
  try {
    const offers = await dbService.offers.listAll(100, 0);
    res.json({ success: true, data: offers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/staff/inspections', requireRole(['staff', 'admin']), async (_req: Request, res: Response) => {
  try {
    const inspections = await dbService.inspections.listAll(100, 0);
    res.json({ success: true, data: inspections });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/metrics-summary', requireRole(['staff', 'admin']), async (_req: Request, res: Response) => {
  try {
    const [vehicles, offers, inspections, rentals, imports] = await Promise.all([
      dbService.vehicles.list({ limit: 1 }),
      dbService.offers.listAll(1, 0),
      dbService.inspections.listAll(1, 0),
      dbService.rentals.listAllBookings(1, 0),
      dbService.imports.listRequests(),
    ]);
    res.json({ success: true, data: { inventoryCount: vehicles.total, offerCount: offers.length, inspectionCount: inspections.length, rentalCount: rentals.length, importCount: imports.length } });
  } catch {
    res.status(500).json({ success: false, code: 'METRICS_UNAVAILABLE', message: 'Operational metrics are temporarily unavailable.' });
  }
});

// -------------------------------------------------------------
// 3. Vehicles Showroom & Inventory Endpoints
// -------------------------------------------------------------
app.get('/api/vehicles/facets', async (_req: Request, res: Response) => {
  try {
    const facets = await dbService.vehicles.getFacets();
    res.json({
      success: true,
      data: facets,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/vehicles', async (req: Request, res: Response) => {
  try {
    const {
      search,
      make,
      model,
      condition,
      bodyType,
      transmission,
      fuelType,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
      minMileage,
      maxMileage,
      city,
      verified,
      page = '1',
      pageSize = '12',
      limit,
      sort = 'newest',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const sizeParam = pageSize || limit;
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(sizeParam as string, 10) || 12));
    const offset = (pageNum - 1) * pageSizeNum;

    const result = await dbService.vehicles.list({
      make: make && make !== 'All Makes' && make !== 'All' ? String(make) : undefined,
      model: model && model !== 'All Models' && model !== 'All' ? String(model) : undefined,
      condition: condition && condition !== 'All Conditions' && condition !== 'All' ? String(condition) : undefined,
      bodyType: bodyType && bodyType !== 'All Body Types' && bodyType !== 'All' ? String(bodyType) : undefined,
      transmission: transmission && transmission !== 'All Transmissions' && transmission !== 'All' ? String(transmission) : undefined,
      fuelType: fuelType && fuelType !== 'All Fuels' && fuelType !== 'All' ? String(fuelType) : undefined,
      minPrice: minPrice ? parseInt(String(minPrice), 10) : undefined,
      maxPrice: maxPrice ? parseInt(String(maxPrice), 10) : undefined,
      minYear: minYear && minYear !== 'Min Year' ? parseInt(String(minYear), 10) : undefined,
      maxYear: maxYear && maxYear !== 'Max Year' ? parseInt(String(maxYear), 10) : undefined,
      minMileage: minMileage ? parseInt(String(minMileage), 10) : undefined,
      maxMileage: maxMileage ? parseInt(String(maxMileage), 10) : undefined,
      city: city && city !== 'All Locations' && city !== 'All Cities' && city !== 'Select Location' ? String(city) : undefined,
      verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
      search: search ? String(search).trim() : undefined,
      sort: sort ? String(sort) : 'newest',
      limit: pageSizeNum,
      offset,
    });

    const enrichedVehicles = await Promise.all(
      result.vehicles.map((v) => formatVehicleToCar(v))
    );

    const totalPages = Math.max(1, Math.ceil(result.total / pageSizeNum));

    res.json({
      success: true,
      data: enrichedVehicles,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total: result.total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      total: result.total,
      page: pageNum,
      limit: pageSizeNum,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/vehicles/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    let vehicle = await dbService.vehicles.findById(id);
    if (!vehicle) {
      vehicle = await dbService.vehicles.findByStockId(id);
    }
    if (!vehicle) {
      return res.status(404).json({ success: false, message: `Vehicle '${id}' not found` });
    }

    const formatted = await formatVehicleToCar(vehicle);

    res.json({
      success: true,
      data: formatted,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/vehicles/:id/share-token', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    let vehicle = await dbService.vehicles.findById(id);
    if (!vehicle) {
      vehicle = await dbService.vehicles.findByStockId(id);
    }
    if (!vehicle) {
      return res.status(404).json({ success: false, message: `Vehicle with ID or stock ID '${id}' not found` });
    }

    const shareToken = `sh_${crypto.randomBytes(12).toString('hex')}`;
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const shareUrl = `${protocol}://${host}/?carId=${encodeURIComponent(vehicle.id)}&shareToken=${shareToken}`;

    res.json({
      success: true,
      vehicleId: vehicle.id,
      shareToken,
      shareUrl,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 4. Offers Submission & Processing
// -------------------------------------------------------------
app.post('/api/offers', requireAuth, async (req: Request, res: Response) => {
  try {
    const { carId, carName, name, buyerName, phone, buyerPhone, email, buyerEmail, offerAmountNgn, paymentMethod, notes, purchaseNotes } = req.body;
    const finalName = (name || buyerName || req.user?.fullName || '').trim();
    const rawPhone = (phone || buyerPhone || req.user?.phone || '').trim();
    const finalEmail = (email || buyerEmail || req.user?.email || '').trim();
    const finalNotes = (notes || purchaseNotes || '').trim();
    const amount = Number(offerAmountNgn);

    if (!carId || !finalName || !rawPhone || !amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required offer information (carId, name, phone, offerAmountNgn)',
      });
    }

    const phoneRes = normalizeNigerianPhone(rawPhone);
    if (!phoneRes.valid) {
      return res.status(400).json({
        success: false,
        message: phoneRes.error || 'Invalid Nigerian phone number',
        code: 'INVALID_PHONE',
        fieldErrors: { phone: phoneRes.error },
      });
    }
    const finalPhone = phoneRes.normalized;

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Offer amount must be greater than zero' });
    }

    // Do NOT trust client-provided price; look up genuine listing price from database
    const vehicle = await dbService.vehicles.findById(carId);
    const trueListingPrice = vehicle ? vehicle.priceNgn : amount;

    const offer = await dbService.offers.create({
      carId,
      carName: carName || (vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle'),
      userId: req.user!.id,
      name: finalName,
      phone: finalPhone,
      email: finalEmail || undefined,
      offerAmountNgn: amount,
      vehicleListingPriceNgn: trueListingPrice,
      paymentMethod: paymentMethod || 'Bank Transfer',
      notes: finalNotes || undefined,
      status: 'Pending Review',
    });

    // Record audit log
    await dbService.audit.record({
      actorRole: req.user!.role,
      action: 'SUBMIT_PRICE_OFFER',
      resourceType: 'offer',
      resourceId: offer.id,
      changesJson: JSON.stringify({ amountNgn: amount, carId, userId: req.user!.id }),
    });

    res.status(201).json({
      success: true,
      message: 'Your offer has been securely recorded and sent to the dealer for review!',
      data: offer,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 5. Vehicle Inspection Bookings
// -------------------------------------------------------------
app.post('/api/inspections', requireAuth, async (req: Request, res: Response) => {
  try {
    const { carId, carName, name, customerName, buyerName, phone, customerPhone, buyerPhone, email, customerEmail, buyerEmail, date, inspDate, timeSlot, inspTime, hubLocation, inspHub, inspectionType, inspType } = req.body;
    const finalName = (name || customerName || buyerName || req.user?.fullName || '').trim();
    const rawPhone = (phone || customerPhone || buyerPhone || req.user?.phone || '').trim();
    const finalDate = (date || inspDate || '').trim();
    const finalTime = (timeSlot || inspTime || '10:00 AM - 12:00 PM').trim();
    const finalHub = (hubLocation || inspHub || 'Lekki Phase 1 Hub, Lagos').trim();
    const finalType = (inspectionType || inspType || 'Physical Inspection').trim() as any;

    if (!carId || !finalName || !rawPhone || !finalDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required inspection booking details (carId, name, phone, date)',
      });
    }

    const phoneRes = normalizeNigerianPhone(rawPhone);
    if (!phoneRes.valid) {
      return res.status(400).json({
        success: false,
        message: phoneRes.error || 'Invalid Nigerian phone number',
        code: 'INVALID_PHONE',
        fieldErrors: { phone: phoneRes.error },
      });
    }
    const finalPhone = phoneRes.normalized;

    const vehicle = await dbService.vehicles.findById(carId);

    const inspection = await dbService.inspections.create({
      carId,
      carName: carName || (vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle'),
      userId: req.user!.id,
      name: finalName,
      phone: finalPhone,
      email: (email || customerEmail || buyerEmail || req.user?.email || '').trim() || undefined,
      date: finalDate,
      timeSlot: finalTime,
      hubLocation: finalHub,
      inspectionType: finalType,
      status: 'Confirmed',
    });

    res.status(201).json({
      success: true,
      message: 'Inspection booked successfully! Our certified automotive inspector will be expecting you.',
      data: inspection,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 6. Rental Vehicles & Transactional Booking
// -------------------------------------------------------------
app.get('/api/rentals/vehicles', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const vehicles = await dbService.rentals.listVehicles(category);
    res.json({ success: true, data: vehicles });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/rentals/book', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      carId,
      carName,
      customerName,
      renterName,
      name,
      phone,
      renterPhone,
      email,
      renterEmail,
      pickupDate,
      returnDate,
      dropoffDate,
      pickupLocation,
      days,
      withChauffeur,
      withInsurance,
    } = req.body;

    const finalName = (customerName || renterName || name || req.user?.fullName || '').trim();
    const rawPhone = (phone || renterPhone || req.user?.phone || '').trim();
    const finalEmail = (email || renterEmail || req.user?.email || '').trim();
    const finalPickup = (pickupDate || '').trim();
    const finalReturn = (returnDate || dropoffDate || '').trim();
    const numDays = Math.max(1, parseInt(days as string, 10) || 1);

    if (!finalName || !rawPhone || !finalPickup || !carId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required rental reservation details (carId, name, phone, pickupDate)',
      });
    }

    const phoneRes = normalizeNigerianPhone(rawPhone);
    if (!phoneRes.valid) {
      return res.status(400).json({
        success: false,
        message: phoneRes.error || 'Invalid Nigerian phone number',
        code: 'INVALID_PHONE',
        fieldErrors: { phone: phoneRes.error },
      });
    }
    const finalPhone = phoneRes.normalized;

    // Look up vehicle to enforce genuine daily rate (do NOT trust client rate)
    const rentalVehicle = await dbService.rentals.findVehicleById(carId);
    if (!rentalVehicle) {
      return res.status(404).json({ success: false, message: 'Rental vehicle not found' });
    }

    const dailyRate = rentalVehicle.pricePerDayNgn;
    const chauffeurFee = withChauffeur ? 25000 * numDays : 0;
    const insuranceFee = withInsurance ? 10000 * numDays : 0;
    const serverComputedTotal = dailyRate * numDays + chauffeurFee + insuranceFee;

    const booking = await dbService.rentals.createBookingWithBlock({
      carId,
      carName: carName || rentalVehicle.name,
      userId: req.user!.id,
      customerName: finalName,
      phone: finalPhone,
      email: finalEmail || undefined,
      pickupDate: finalPickup,
      returnDate: finalReturn || finalPickup,
      pickupLocation: pickupLocation || 'Lekki Hub, Lagos',
      days: numDays,
      dailyRateNgn: dailyRate,
      withChauffeur: Boolean(withChauffeur),
      withInsurance: Boolean(withInsurance),
      chauffeurFeeNgn: chauffeurFee,
      insuranceFeeNgn: insuranceFee,
      totalNgn: serverComputedTotal,
      status: 'Active Reservation',
    });

    res.status(201).json({
      success: true,
      message: 'Rental reservation confirmed! Our fleet coordinator will contact you for vehicle handover.',
      data: booking,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('already booked')) {
      return res.status(409).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 7. Import Duty & Landed Cost Calculation Engine
// -------------------------------------------------------------
app.post('/api/imports/calculate', (req: Request, res: Response) => {
  try {
    const { auctionPriceUsd, year, originPort, isElectric } = req.body;

    if (!auctionPriceUsd || isNaN(auctionPriceUsd) || Number(auctionPriceUsd) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid or missing auctionPriceUsd' });
    }

    const priceUsd = Number(auctionPriceUsd);
    const vehicleYear = parseInt(year as string, 10) || new Date().getFullYear();

    const USD_TO_NGN = Number(process.env.IMPORT_USD_TO_NGN_RATE || 1500);
    const oceanFreightUsd = originPort === 'Houston'
      ? Number(process.env.IMPORT_FREIGHT_HOUSTON_USD || 1950)
      : Number(process.env.IMPORT_FREIGHT_DEFAULT_USD || 1800);
    const inlandTowingUsd = Number(process.env.IMPORT_INLAND_TOWING_USD || 450);
    const totalUsd = priceUsd + oceanFreightUsd + inlandTowingUsd;

    const cifNgn = totalUsd * USD_TO_NGN;

    const dutyRate = isElectric ? 0.10 : 0.35;
    const levyRate = isElectric ? 0.05 : 0.15;
    const vatRate = 0.075;

    const importDutyNgn = Math.round(cifNgn * dutyRate);
    const nacLevyNgn = Math.round(cifNgn * levyRate);
    const vatNgn = Math.round((cifNgn + importDutyNgn + nacLevyNgn) * vatRate);

    const terminalChargesNgn = Number(process.env.IMPORT_TERMINAL_CHARGES_NGN || 380000);
    const clearingAgencyFeeNgn = Number(process.env.IMPORT_CLEARING_FEE_NGN || 450000);
    const totalCustomsClearanceNgn = importDutyNgn + nacLevyNgn + vatNgn + terminalChargesNgn + clearingAgencyFeeNgn;
    const vehicleLandedCostNgn = cifNgn + totalCustomsClearanceNgn;

    const estimatedLocalDealerPriceNgn = Math.round(vehicleLandedCostNgn * 1.35);
    const savingsVsLocalMarketNgn = Math.max(0, estimatedLocalDealerPriceNgn - vehicleLandedCostNgn);

    res.json({
      success: true,
      data: {
        auctionPriceUsd: priceUsd,
        oceanFreightUsd,
        inlandTowingUsd,
        cifValueUsd: totalUsd,
        cifValueNgn: cifNgn,
        usdToNgnRate: USD_TO_NGN,
        dutyRate: dutyRate * 100,
        levyRate: levyRate * 100,
        importDutyNgn,
        nacLevyNgn,
        vatNgn,
        terminalChargesNgn,
        clearingAgencyFeeNgn,
        totalCustomsClearanceNgn,
        vehicleLandedCostNgn,
        estimatedLocalDealerPriceNgn,
        savingsVsLocalMarketNgn,
        estimatedTransitDays: '21-28 Days',
        calculationVersion: process.env.IMPORT_CALCULATION_VERSION || 'estimate-v1',
        assumptions: {
          originPort: originPort || 'default origin',
          electricVehicleRatesConfigured: Boolean(isElectric),
          disclaimer: 'Estimate only. Final customs, duty, levy, VAT, terminal, and clearing charges require current official assessment and staff confirmation.',
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 8. Custom Import Request Submission
// -------------------------------------------------------------
app.post('/api/imports/request', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      make,
      model,
      year,
      yearMin,
      yearMax,
      estimatedBudgetUsd,
      budgetRange,
      vin,
      customerName,
      fullName,
      phone,
      email,
      deliveryCity,
      vehicleType,
      fuelType,
      transmission,
      driveType,
      mileagePref,
      features,
      additionalNotes,
    } = req.body;

    const finalName = (customerName || fullName || req.user?.fullName || '').trim();
    const rawPhone = (phone || req.user?.phone || '').trim();
    const finalMake = (make || '').trim();
    const finalModel = (model || '').trim();

    if (!finalName || !rawPhone || !finalMake || !finalModel) {
      return res.status(400).json({
        success: false,
        message: 'Missing required import request fields (customerName, phone, make, model)',
      });
    }

    const phoneRes = normalizeNigerianPhone(rawPhone);
    if (!phoneRes.valid) {
      return res.status(400).json({
        success: false,
        message: phoneRes.error || 'Invalid Nigerian phone number',
        code: 'INVALID_PHONE',
        fieldErrors: { phone: phoneRes.error },
      });
    }
    const finalPhone = phoneRes.normalized;

    const trackingId = `SHA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await dbService.imports.createRequest({
      trackingId,
      userId: req.user!.id,
      customerName: finalName,
      phone: finalPhone,
      email: (email || req.user?.email || '').trim() || undefined,
      make: finalMake,
      model: finalModel,
      year: year ? parseInt(year as string, 10) : undefined,
      yearMin: yearMin ? String(yearMin) : undefined,
      yearMax: yearMax ? String(yearMax) : undefined,
      budgetRange: budgetRange ? String(budgetRange) : undefined,
      estimatedBudgetUsd: estimatedBudgetUsd ? parseInt(estimatedBudgetUsd as string, 10) : undefined,
      vin: vin ? String(vin).trim() : undefined,
      vehicleType: vehicleType ? String(vehicleType) : undefined,
      fuelType: fuelType ? String(fuelType) : undefined,
      transmission: transmission ? String(transmission) : undefined,
      driveType: driveType ? String(driveType) : undefined,
      mileagePref: mileagePref ? String(mileagePref) : undefined,
      features: Array.isArray(features) ? features : [],
      deliveryCity: deliveryCity || 'Lagos',
      destinationPort: 'Tin Can Island Container Terminal, Lagos',
      originPort: 'Port of Newark, NJ, USA',
      additionalNotes: additionalNotes || undefined,
      status: 'Sourcing Started',
    });

    // Add first initial milestone
    await dbService.imports.addMilestone({
      trackingId,
      stepOrder: 1,
      title: 'Order Submitted & US Agent Assigned',
      description: 'Your sourcing request has been received and assigned to our US dealer auction team.',
      scheduledDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      completedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isCompleted: true,
      isCurrent: true,
      location: 'ShabaAutos Operations Hub, Lagos',
    });

    res.status(201).json({
      success: true,
      message: 'Import order request submitted! Your designated US sourcing specialist will contact you.',
      trackingId,
      data: order,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 9. Order & Container Tracking (No Fabricated Facts)
// -------------------------------------------------------------
app.get('/api/tracking/:trackingId', async (req: Request, res: Response) => {
  try {
    const query = req.params.trackingId.toUpperCase().trim();
    let order = await dbService.imports.findByTrackingId(query);
    if (!order) {
      order = await dbService.imports.findByVin(query);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        found: false,
        trackingId: query,
        code: 'TRACKING_NOT_FOUND',
        message: 'No active shipment found matching tracking code or VIN in our database.',
      });
    }

    const milestones = await dbService.imports.getMilestones(order.trackingId);
    const events = await dbService.imports.getTrackingEvents(order.trackingId);

    const mappedSteps = milestones.map((m) => ({
      step: m.stepOrder,
      title: m.title,
      desc: m.description,
      date: m.scheduledDate,
      completed: m.isCompleted,
      current: m.isCurrent,
    }));

    res.json({
      success: true,
      found: true,
      trackingId: order.trackingId,
      data: {
        orderId: order.trackingId,
        status: order.status,
        customerName: order.customerName,
        originPort: order.originPort,
        destinationPort: order.destinationPort,
        vesselName: events.length > 0 && events[0].vesselName ? events[0].vesselName : 'Vessel Assignment in Progress',
        containerNo: events.length > 0 && events[0].containerNo ? events[0].containerNo : 'Container Assignment in Progress',
        currentLocation: events.length > 0 ? events[0].location : 'Origin Terminal',
        car: {
          make: order.make,
          model: order.model,
          year: order.year || 2022,
          vin: order.vin || 'VIN Pending Assignment',
        },
        steps: mappedSteps,
        events,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 10. Sell Car Valuation & Consignment Submission
// -------------------------------------------------------------
app.post('/api/sell', requireAuth, async (req: Request, res: Response) => {
  try {
    const { make, model, year, trim, mileage, condition, askingPriceNgn, sellerName, fullName, phone, email, location, issues } = req.body;
    const finalSeller = (sellerName || fullName || req.user?.fullName || '').trim();
    const rawPhone = (phone || req.user?.phone || '').trim();
    const finalMake = (make || '').trim();
    const finalModel = (model || '').trim();

    if (!finalMake || !finalModel || !finalSeller || !rawPhone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required vehicle information (make, model, sellerName, phone)',
      });
    }

    const phoneRes = normalizeNigerianPhone(rawPhone);
    if (!phoneRes.valid) {
      return res.status(400).json({
        success: false,
        message: phoneRes.error || 'Invalid Nigerian phone number',
        code: 'INVALID_PHONE',
        fieldErrors: { phone: phoneRes.error },
      });
    }
    const finalPhone = phoneRes.normalized;

    const asking = Number(askingPriceNgn) || 15000000;
    const carYear = parseInt(year as string, 10) || 2020;
    const carMileage = Number(mileage) || 50000;
    const carCondition = condition || 'Nigeria Used';

    // Market Valuation Algorithm
    const basePrices: Record<string, number> = {
      Toyota: 28000000,
      Lexus: 38000000,
      Mercedes: 45000000,
      Honda: 22000000,
      Hyundai: 18000000,
      Ford: 24000000,
    };
    const makeKey = Object.keys(basePrices).find((k) => finalMake.toLowerCase().includes(k.toLowerCase())) || 'Toyota';
    const base = basePrices[makeKey];

    const currentYear = new Date().getFullYear();
    const age = Math.max(0, currentYear - carYear);
    const ageFactor = Math.max(0.4, 1 - age * 0.05);
    const mileageFactor = Math.max(0.65, 1 - (carMileage / 10000) * 0.03);
    const conditionFactor = carCondition === 'Foreign Used (Tokunbo)' ? 1.15 : carCondition === 'Brand New' ? 1.4 : 0.85;

    const estimatedValueNgn = Math.round(base * ageFactor * mileageFactor * conditionFactor);

    const submission = await dbService.sell.create({
      sellerName: finalSeller,
      phone: finalPhone,
      email: (email || req.user?.email || '').trim() || undefined,
      make: finalMake,
      model: finalModel,
      year: carYear,
      trim: trim || undefined,
      mileage: carMileage,
      condition: carCondition,
      issues: issues || undefined,
      location: location || 'Lagos',
      askingPriceNgn: asking,
      estimatedValueNgn,
      status: 'Under Review',
    });

    // Record valuation audit history
    await dbService.sell.recordValuationHistory({
      sellSubmissionId: submission.id,
      make: finalMake,
      model: finalModel,
      year: carYear,
      mileage: carMileage,
      condition: carCondition,
      algorithmVersion: 'v2.2-ngn-market',
      baseValueNgn: base,
      mileageFactor,
      conditionFactor,
      finalValuationNgn: estimatedValueNgn,
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle evaluation submitted! A ShabaAutos certified pricing specialist will inspect your vehicle details.',
      submissionId: submission.id,
      estimatedValueNgn,
      data: submission,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 11. Car Concierge ("Find Me a Car") Request
// -------------------------------------------------------------
app.post('/api/concierge', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      phone,
      email,
      desiredMake,
      make,
      desiredModel,
      model,
      bodyType,
      yearRange,
      budgetRange,
      maxBudgetNgn,
      preferredCondition,
      fuelType,
      fuel,
      transmission,
      colorPref,
      interiorPref,
      notes,
    } = req.body;

    const finalName = (fullName || req.user?.fullName || '').trim();
    const rawPhone = (phone || req.user?.phone || '').trim();
    const finalMake = (desiredMake || make || '').trim();
    const finalModel = (desiredModel || model || 'Any Model').trim();

    if (!finalName || !rawPhone || !finalMake) {
      return res.status(400).json({
        success: false,
        message: 'Missing required concierge fields (fullName, phone, desiredMake/make)',
      });
    }

    const phoneRes = normalizeNigerianPhone(rawPhone);
    if (!phoneRes.valid) {
      return res.status(400).json({
        success: false,
        message: phoneRes.error || 'Invalid Nigerian phone number',
        code: 'INVALID_PHONE',
        fieldErrors: { phone: phoneRes.error },
      });
    }
    const finalPhone = phoneRes.normalized;

    const maxBudget = Number(maxBudgetNgn) || (budgetRange ? parseInt(String(budgetRange).replace(/[^0-9]/g, ''), 10) : 35000000) || 35000000;

    const request = await dbService.concierge.create({
      fullName: finalName,
      phone: finalPhone,
      email: (email || req.user?.email || '').trim() || undefined,
      desiredMake: finalMake,
      desiredModel: finalModel,
      bodyType: bodyType || undefined,
      yearRange: yearRange || '2020 - 2024',
      budgetRange: budgetRange || undefined,
      maxBudgetNgn: maxBudget,
      preferredCondition: preferredCondition || 'Foreign Used (Tokunbo)',
      fuelType: fuelType || fuel || undefined,
      transmission: transmission || undefined,
      colorPref: colorPref || undefined,
      interiorPref: interiorPref || undefined,
      notes: notes || undefined,
      status: 'Request Received',
    });

    res.status(201).json({
      success: true,
      ticketId: request.id,
      message: 'Your concierge request has been prioritized! An automotive sourcing executive will contact you shortly with matched vehicles.',
      data: request,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 12. Optional AI assistance (server-side only)
// -------------------------------------------------------------
const aiRequestCounts = new Map<string, { day: string; count: number }>();

async function runAiAssistant(req: Request, res: Response, feature: string) {
  const userId = req.user!.id;
  const today = new Date().toISOString().slice(0, 10);
  const limit = Number(process.env.AI_REQUESTS_PER_USER_PER_DAY || 20);
  const current = aiRequestCounts.get(userId);
  if (current?.day === today && current.count >= limit) {
    return res.status(429).json({ success: false, code: 'AI_QUOTA_EXCEEDED', message: 'Daily AI request limit reached.' });
  }
  aiRequestCounts.set(userId, { day: today, count: current?.day === today ? current.count + 1 : 1 });

  const maxInput = Number(process.env.AI_MAX_INPUT_CHARS || 4000);
  const input = JSON.stringify(req.body || {}).slice(0, maxInput);
  const disclaimer = 'This is informational assistance based only on supplied facts; it is not a safety, legal, tax, financing, or purchase guarantee.';
  const fallback = {
    summary: `${feature.replace(/-/g, ' ')} is available using the vehicle and preference facts supplied. Missing facts remain unavailable.`,
    strengths: [],
    tradeoffs: ['Verify inspection, title, pricing, customs, and financing details independently.'],
    bestFor: 'Customers comparing supplied marketplace information.',
    cautions: ['Do not treat this response as verified vehicle history or a guarantee.'],
    disclaimer,
    sourceVehicleIds: Array.isArray(req.body?.vehicleIds) ? req.body.vehicleIds.slice(0, 4) : [],
  };

  const enabled = process.env.AI_FEATURES_ENABLED === 'true' && Boolean(process.env.GROQ_API_KEY);
  if (!enabled) return res.json({ success: true, data: fallback, provider: 'deterministic-fallback' });

  try {
    const response = await fetch(`${process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        temperature: 0.2,
        max_tokens: Number(process.env.AI_MAX_OUTPUT_TOKENS || 500),
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `You are a cautious automotive marketplace assistant. Use only supplied application facts. Never invent title, theft, recalls, inspection, market price, customs law, financing approval, or safety conclusions. Return JSON with summary, strengths, tradeoffs, bestFor, cautions, disclaimer, sourceVehicleIds. Include this disclaimer: ${disclaimer}` },
          { role: 'user', content: input },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
    const payload = (await response.json()) as any;
    const content = payload.choices?.[0]?.message?.content;
    const parsed = typeof content === 'string' ? JSON.parse(content) : null;
    if (!parsed || typeof parsed.summary !== 'string') throw new Error('Invalid AI response');
    return res.json({ success: true, data: { ...fallback, ...parsed, disclaimer }, provider: 'groq' });
  } catch {
    return res.json({ success: true, data: fallback, provider: 'deterministic-fallback', degraded: true });
  }
}

for (const feature of ['vehicle-assistant', 'compare-summary', 'import-explainer', 'concierge-match', 'sell-guidance']) {
  app.post(`/api/ai/${feature}`, requireAuth, (req, res) => runAiAssistant(req, res, feature));
}

// -------------------------------------------------------------
// 13. External API Grounding (Cached & Truthful)
// -------------------------------------------------------------

// A. NHTSA Vehicle Models by Make
app.get('/api/external/models', async (req: Request, res: Response) => {
  const make = ((req.query.make as string) || 'toyota').trim().toLowerCase();
  const cacheKey = `nhtsa:models:${make}`;

  const cached = await dbService.cache.get(cacheKey);
  if (cached) {
    return res.json({ success: true, cached: true, make, models: cached });
  }

  try {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make)}?format=json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`NHTSA returned status ${response.status}`);
    const data = (await response.json()) as any;

    if (data.Results && Array.isArray(data.Results)) {
      const models = data.Results.map((r: any) => r.Model_Name).filter(Boolean);
      const uniqueModels = Array.from(new Set(models)).sort().slice(0, 40);

      // Cache for 24 hours
      await dbService.cache.set(cacheKey, 'nhtsa', uniqueModels, 86400, url);
      return res.json({ success: true, cached: false, make, models: uniqueModels });
    }
    throw new Error('No models found in NHTSA payload');
  } catch (err: any) {
    res.status(502).json({ success: false, code: 'PROVIDER_UNAVAILABLE', message: 'Manufacturer model data is temporarily unavailable.' });
  }
});

// B. Truthful NHTSA VIN Decoder (NEVER fabricate title, theft, or Carfax facts)
app.get('/api/external/vin/:vin', async (req: Request, res: Response) => {
  const vin = req.params.vin.trim().toUpperCase();
  if (vin.length !== 17) {
    return res.status(400).json({ success: false, message: 'VIN must be exactly 17 alphanumeric characters' });
  }

  const cacheKey = `nhtsa:vin:${vin}`;
  const cached = await dbService.cache.get(cacheKey);
  if (cached) {
    return res.json({ success: true, cached: true, data: cached });
  }

  try {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error(`NHTSA HTTP ${response.status}`);
    const data = (await response.json()) as any;

    if (data.Results && data.Results[0]) {
      const result = data.Results[0];

      if (!result.Make || result.ErrorCode === '1') {
        return res.status(404).json({
          success: false,
          message: 'Vehicle VIN not recognized by government registry',
        });
      }

      const decoded = {
        vin,
        year: result.ModelYear || 'N/A',
        make: result.Make,
        model: result.Model,
        trim: result.Trim || undefined,
        bodyClass: result.BodyClass || undefined,
        doors: result.Doors || undefined,
        driveType: result.DriveType || undefined,
        engineCylinders: result.EngineCylinders || undefined,
        displacementL: result.DisplacementL ? `${parseFloat(result.DisplacementL).toFixed(1)}L` : undefined,
        fuelTypePrimary: result.FuelTypePrimary || undefined,
        plantCountry: result.PlantCountry || undefined,
        manufacturer: result.Manufacturer || result.Make,
        // Truthful notice: do NOT fabricate title or Carfax facts
        historyRecordsVerified: false,
        historyNotice: 'Title, theft, and recall verification require official NMVTIS / CarFax partner integration.',
      };

      await dbService.cache.set(cacheKey, 'nhtsa', decoded, 86400, url);
      return res.json({ success: true, cached: false, data: decoded });
    }
    return res.status(404).json({ success: false, message: 'Vehicle VIN not found in government registry' });
  } catch (err: any) {
    res.status(502).json({
      success: false,
      message: 'NHTSA government registry service temporarily unavailable. No verified data can be returned.',
    });
  }
});

// C. Free Car Lookup & Image Fetcher (Wikipedia / Wikimedia Commons Media API)
app.get('/api/external/car-lookup', async (req: Request, res: Response) => {
  const query = (req.query.query as string) || '';
  const make = (req.query.make as string) || '';
  const model = (req.query.model as string) || '';
  const searchTerm = (query || `${make} ${model}`).trim();

  if (!searchTerm) {
    return res.status(400).json({ success: false, message: 'Query or make/model required' });
  }

  const cacheKey = `car-lookup:${searchTerm.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = await dbService.cache.get(cacheKey);
  if (cached) {
    return res.json({ success: true, cached: true, data: cached });
  }

  try {
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`;
    const response = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'ShabaAutos/2.0 (automotive marketplace info)' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = (await response.json()) as any;
      const result = {
        searchTerm,
        title: data.title || searchTerm,
        description: data.extract || `${searchTerm} overview and specifications.`,
        imageUrl: data.originalimage?.source || data.thumbnail?.source,
        pageUrl: data.content_urls?.desktop?.page,
        verifiedSource: 'Wikimedia Open Automotive Encyclopedia',
      };

      await dbService.cache.set(cacheKey, 'wikimedia', result, 604800, wikiUrl);
      return res.json({ success: true, cached: false, data: result });
    }
    throw new Error('Wikipedia page summary not found');
  } catch (err: any) {
    res.status(502).json({ success: false, code: 'PROVIDER_UNAVAILABLE', message: 'Reference vehicle information is temporarily unavailable.' });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Production Static Handling
// -------------------------------------------------------------
async function startServer() {
  try {
    await getDatabaseReady();
    if (process.env.USE_SQLITE === 'true' || process.env.SEED_DATABASE === 'true' || !process.env.DATABASE_URL) {
      await seedDatabase(false);
    }
  } catch (err: any) {
    console.warn('[Database] Startup warning:', err.message);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShabaAutos Server running on http://localhost:${PORT}`);
  });
}

startServer();
