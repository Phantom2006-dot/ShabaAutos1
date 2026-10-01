import { Request, Response, Router } from 'express';
import { getDatabaseService } from '../database/index';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole } from '../models/types';
import { uploadImages, saveUploadedImage, removeStoredImage, validateImageBuffers, UploadedImageResult } from '../storage';

const router = Router();

function db() {
  return getDatabaseService();
}

function validNumber(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function validImageUrl(value: string): boolean {
  return /^https:\/\//i.test(value) || /^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(value);
}

router.get('/vehicles/:id/images', requireAuth, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    if (!await db().vehicles.findById(req.params.id)) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    res.json({ success: true, data: await db().vehicles.getImages(req.params.id) });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// Upload only to an existing draft/listing: no successful response can leave an unattached asset.
router.post('/vehicles/:id/images/upload', requireAuth, requireRole(['staff', 'admin']), uploadImages.array('images', 10), async (req: Request, res: Response) => {
  const stored: UploadedImageResult[] = [];
  try {
    const vehicle = await db().vehicles.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    const files = (req.files || []) as Express.Multer.File[];
    if (!files.length) return res.status(400).json({ success: false, message: 'Select at least one image.' });
    validateImageBuffers(files);
    const existing = await db().vehicles.getImages(vehicle.id);
    for (const file of files) stored.push(await saveUploadedImage(file.buffer, file.mimetype));
    const rows = await db().vehicles.addImages(vehicle.id, stored.map((item, index) => ({
      ...item,
      url: item.url.startsWith('/uploads/') ? `${req.protocol}://${req.get('host')}${item.url}` : item.url,
      displayOrder: existing.length + index,
      isPrimary: existing.length === 0 && index === 0,
    })));
    await db().audit.record({ actorUserId: req.user!.id, actorRole: req.user!.role as UserRole, action: 'vehicle.upload_images', resourceType: 'vehicle', resourceId: vehicle.id, changesJson: JSON.stringify({ imageIds: rows.map((row) => row.id) }) });
    res.status(201).json({ success: true, data: rows });
  } catch (err: any) {
    await Promise.all(stored.map((item) => removeStoredImage(item.url, item.publicId)));
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/ops/uploads/images — staff/admin multi-image upload → public URLs
// (with Cloudinary metadata, persisted once attached to a vehicle).
router.post(
  '/uploads/images',
  requireAuth,
  requireRole(['staff', 'admin']),
  uploadImages.array('images', 10),
  async (req: Request, res: Response) => {
    try {
      const files = (req.files || []) as Express.Multer.File[];
      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No images were uploaded. Attach files under the field name "images".',
          code: 'VALIDATION_ERROR',
        });
      }
      try {
        validateImageBuffers(files);
      } catch (vErr: any) {
        return res.status(400).json({
          success: false,
          message: vErr.message,
          code: 'VALIDATION_ERROR',
        });
      }
      const results = [];
      for (const f of files) {
        results.push(await saveUploadedImage(f.buffer, f.mimetype));
      }
      res.status(201).json({ success: true, data: results, count: results.length });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// PATCH /api/ops/vehicles/:id — staff/admin edit listing (images replaced when images[] sent).
router.patch(
  '/vehicles/:id',
  requireAuth,
  requireRole(['staff', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const current = await db().vehicles.findById(req.params.id);
      if (!current) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      if (b.status !== undefined && req.user!.role !== 'admin') return res.status(403).json({ success: false, message: 'Only an administrator may change lifecycle status.' });
      if (b.verified !== undefined) return res.status(400).json({ success: false, message: 'Use the administrator approval action to publish a listing.' });
      if (b.inspectionPassed !== undefined) return res.status(400).json({ success: false, message: 'Inspection status requires a separate evidence-backed workflow.' });
      if (b.cleanTitle === true) return res.status(400).json({ success: false, message: 'A clean-title claim requires verified documentation.' });
      if (b.year !== undefined && !validNumber(b.year, 1886, new Date().getFullYear() + 1)) return res.status(400).json({ success: false, message: 'Enter a valid model year.' });
      if (b.priceNgn !== undefined && !validNumber(b.priceNgn, 1, 100000000000)) return res.status(400).json({ success: false, message: 'Enter a valid positive price.' });
      if (b.mileage !== undefined && !validNumber(b.mileage, 0, 10000000)) return res.status(400).json({ success: false, message: 'Enter valid non-negative mileage.' });
      if (b.seats !== undefined && !validNumber(b.seats, 1, 80)) return res.status(400).json({ success: false, message: 'Enter a valid seat count.' });
      if (b.status !== undefined && !['available', 'reserved', 'sold', 'delisted'].includes(b.status)) return res.status(400).json({ success: false, message: 'Invalid vehicle status.' });
      if (Array.isArray(b.images) && b.images.some((item: unknown) => !validImageUrl(typeof item === 'string' ? item.trim() : String((item as any)?.url || '').trim()))) return res.status(400).json({ success: false, message: 'Use valid HTTPS image URLs or uploaded images.' });
      const updates: Record<string, unknown> = {};
      const strFields = ['make', 'model', 'trim', 'location', 'city', 'state', 'condition', 'bodyType', 'engine', 'driveType', 'color', 'description', 'stockId'] as const;
      for (const f of strFields) {
        if (typeof b[f] === 'string') updates[f] = String(b[f] as string).trim() || null;
      }
      if (b.year !== undefined) updates.year = Number(b.year);
      if (b.priceNgn !== undefined) updates.priceNgn = Number(b.priceNgn);
      if (b.priceUsd !== undefined) updates.priceUsd = b.priceUsd ? Number(b.priceUsd) : null;
      if (b.mileage !== undefined) updates.mileage = Number(b.mileage);
      if (b.mileageUnit !== undefined) updates.mileageUnit = b.mileageUnit === 'miles' ? 'miles' : 'km';
      if (b.transmission !== undefined) updates.transmission = b.transmission === 'Manual' ? 'Manual' : 'Automatic';
      if (b.fuelType !== undefined) updates.fuelType = ['Diesel', 'Hybrid', 'Electric'].includes(b.fuelType) ? b.fuelType : 'Petrol';
      if (b.seats !== undefined) updates.seats = Number(b.seats) || 5;
      if (Array.isArray(b.features)) updates.features = b.features.map(String);
      if (b.cleanTitle === false) updates.cleanTitle = false;
      if (b.status !== undefined) updates.status = b.status;
      if (current.verified && ['make', 'model', 'year', 'priceNgn', 'mileage', 'stockId', 'location', 'condition', 'bodyType'].some((field) => b[field] !== undefined && String(b[field]) !== String((current as any)[field]))) updates.verified = false;

      const updated = await db().vehicles.update(req.params.id, updates);
      if (!updated) return res.status(404).json({ success: false, message: 'Vehicle not found.' });

      // Rich image replacement: accept either plain URL strings or objects with
      // { url, publicId, assetId, width, height, format, isPrimary }.
      if (Array.isArray(b.images)) {
        const images = (b.images as unknown[])
          .map((item: unknown, idx: number) => {
            if (typeof item === 'string') {
              return { url: item.trim(), displayOrder: idx, isPrimary: idx === 0 };
            }
            const o = item as Record<string, unknown>;
            return {
              url: String(o.url).trim(),
              displayOrder: idx,
              isPrimary: Boolean(o.isPrimary) || idx === 0,
              publicId: o.publicId ? String(o.publicId) : undefined,
              assetId: o.assetId ? String(o.assetId) : undefined,
              width: o.width !== undefined ? Number(o.width) : undefined,
              height: o.height !== undefined ? Number(o.height) : undefined,
              format: o.format ? String(o.format) : undefined,
            };
          })
          .filter((img) => img.url);
        if (images.some((image) => !validImageUrl(image.url))) return res.status(400).json({ success: false, message: 'Use valid HTTPS image URLs or uploaded images.' });
        const previous = await db().vehicles.getImages(req.params.id);
        await db().vehicles.setImages(req.params.id, []);
        if (images.length > 0) await db().vehicles.addImages(req.params.id, images);
        await Promise.all(previous.filter((old) => !images.some((image) => image.url === old.url)).map((old) => removeStoredImage(old.url, old.publicId)));
      }

      await db().audit.record({
        actorUserId: req.user!.id,
        actorRole: req.user!.role as UserRole,
        action: 'vehicle.update_listing',
        resourceType: 'vehicle',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
        changesJson: JSON.stringify({ stockId: updated.stockId, verified: updated.verified }),
      }).catch(() => undefined);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// DELETE /api/ops/vehicles/:id — admin-only permanent deletion (FK cascade removes vehicle_images).
router.delete(
  '/vehicles/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const current = await db().vehicles.findById(req.params.id);
      if (!current) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      const images = await db().vehicles.getImages(req.params.id);
      const removed = await db().vehicles.delete(req.params.id);
      if (!removed) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      await Promise.all(images.map((img) => removeStoredImage(img.url, img.publicId)));
      await db().audit.record({
        actorUserId: req.user!.id,
        actorRole: req.user!.role as UserRole,
        action: 'vehicle.delete',
        resourceType: 'vehicle',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
        changesJson: JSON.stringify({ stockId: current.stockId, make: current.make, model: current.model }),
      }).catch(() => undefined);
      res.json({ success: true, message: 'Vehicle deleted.' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// POST /api/ops/vehicles/:id/images — append images (rich objects with metadata).
router.post(
  '/vehicles/:id/images',
  requireAuth,
  requireRole(['staff', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const current = await db().vehicles.findById(req.params.id);
      if (!current) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      const raw = Array.isArray(req.body?.images) ? req.body.images : [];
      if (!raw.length) return res.status(400).json({ success: false, message: 'No image data provided.' });

      const existing = await db().vehicles.getImages(req.params.id);
      const startOrder = existing.length;

      const inputs = (raw as unknown[])
        .map((item: unknown, idx: number) => {
          if (typeof item === 'string') {
            return { url: item.trim(), displayOrder: startOrder + idx, isPrimary: existing.length === 0 && idx === 0 };
          }
          const o = item as Record<string, unknown>;
          return {
            url: String(o.url).trim(),
            displayOrder: o.displayOrder !== undefined ? Number(o.displayOrder) : startOrder + idx,
            isPrimary: Boolean(o.isPrimary) || (existing.length === 0 && idx === 0),
            publicId: o.publicId ? String(o.publicId) : undefined,
            assetId: o.assetId ? String(o.assetId) : undefined,
            width: o.width !== undefined ? Number(o.width) : undefined,
            height: o.height !== undefined ? Number(o.height) : undefined,
            format: o.format ? String(o.format) : undefined,
          };
        })
        .filter((img) => img.url);

      const created = await db().vehicles.addImages(req.params.id, inputs);
      await db().audit.record({
        actorUserId: req.user!.id,
        actorRole: req.user!.role as UserRole,
        action: 'vehicle.add_images',
        resourceType: 'vehicle',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
        changesJson: JSON.stringify({ addedCount: created.length }),
      }).catch(() => undefined);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// PATCH /api/ops/vehicles/:id/images/:imageId — set primary, caption, or display order.
router.patch(
  '/vehicles/:id/images/:imageId',
  requireAuth,
  requireRole(['staff', 'admin']),
  async (req: Request, res: Response) => {
    try {
      if (!await db().vehicles.findById(req.params.id)) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      const owned = (await db().vehicles.getImages(req.params.id)).find((item) => item.id === req.params.imageId);
      if (!owned) return res.status(404).json({ success: false, message: 'Image not found for this vehicle.' });
      if (req.body?.displayOrder !== undefined && (!Number.isInteger(req.body.displayOrder) || req.body.displayOrder < 0)) return res.status(400).json({ success: false, message: 'Invalid image order.' });
      const image = await db().vehicles.updateImage(req.params.imageId, {
        isPrimary: req.body?.isPrimary !== undefined ? Boolean(req.body.isPrimary) : undefined,
        displayOrder: req.body?.displayOrder !== undefined ? Number(req.body.displayOrder) : undefined,
        caption: req.body?.caption !== undefined ? String(req.body.caption) : undefined,
      });
      if (!image) return res.status(404).json({ success: false, message: 'Image not found.' });
      if (image.isPrimary) {
        await db().vehicles.setPrimaryImage(req.params.id, image.id);
      }
      await db().audit.record({
        actorUserId: req.user!.id,
        actorRole: req.user!.role as UserRole,
        action: 'vehicle.update_image',
        resourceType: 'vehicle',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
        changesJson: JSON.stringify({ imageId: image.id, isPrimary: image.isPrimary, displayOrder: image.displayOrder }),
      }).catch(() => undefined);
      res.json({ success: true, data: image });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// DELETE /api/ops/vehicles/:id/images/:imageId — remove single image by ID:
// verify authz, load Cloudinary public_id, destroy asset, remove row, then respond.
router.delete(
  '/vehicles/:id/images/:imageId',
  requireAuth,
  requireRole(['staff', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const vehicle = await db().vehicles.findById(req.params.id);
      if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      const belongsToVehicle = (await db().vehicles.getImages(req.params.id)).some((item) => item.id === req.params.imageId);
      if (!belongsToVehicle) return res.status(404).json({ success: false, message: 'Image not found for this vehicle.' });
      const image = await db().vehicles.deleteImage(req.params.imageId);
      if (!image) return res.status(404).json({ success: false, message: 'Image not found.' });
      await removeStoredImage(image.url, image.publicId);
      await db().audit.record({
        actorUserId: req.user!.id,
        actorRole: req.user!.role as UserRole,
        action: 'vehicle.delete_image',
        resourceType: 'vehicle',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
        changesJson: JSON.stringify({ imageId: image.id, publicId: image.publicId || null }),
      }).catch(() => undefined);
      res.json({ success: true, message: 'Image removed.' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// POST /api/ops/vehicles/:id/images/reorder — accept ordered array of image IDs.
router.post(
  '/vehicles/:id/images/reorder',
  requireAuth,
  requireRole(['staff', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const order: string[] = Array.isArray(req.body?.order) ? req.body.order.map(String).filter(Boolean) : [];
      if (!order.length) return res.status(400).json({ success: false, message: 'No image order provided.' });
      if (!await db().vehicles.findById(req.params.id)) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      const existing = await db().vehicles.getImages(req.params.id);
      if (order.length !== existing.length || new Set(order).size !== order.length || order.some((id) => !existing.some((image) => image.id === id))) return res.status(400).json({ success: false, message: 'Image order must contain exactly the current vehicle images.' });
      for (let i = 0; i < order.length; i++) {
        await db().vehicles.updateImage(order[i], { displayOrder: i });
      }
      await db().audit.record({
        actorUserId: req.user!.id,
        actorRole: req.user!.role as UserRole,
        action: 'vehicle.reorder_images',
        resourceType: 'vehicle',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
      }).catch(() => undefined);
      const images = await db().vehicles.getImages(req.params.id);
      res.json({ success: true, data: images });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

export default router;
