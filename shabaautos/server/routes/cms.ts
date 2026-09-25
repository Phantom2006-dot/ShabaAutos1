import { Request, Response, Router } from 'express';
import { getDatabaseService } from '../database/index';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole } from '../models/types';
import { uploadImages, saveUploadedImage, removeStoredImage, validateImageBuffers } from '../storage';

const router = Router();

function db() {
  return getDatabaseService();
}

// POST /api/ops/uploads/images — staff/admin multi-image upload → public URLs.
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
      const urls: string[] = [];
      for (const f of files) {
        urls.push(await saveUploadedImage(f.buffer, f.mimetype));
      }
      res.status(201).json({ success: true, data: urls, count: urls.length });
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
      if (b.cleanTitle !== undefined) updates.cleanTitle = Boolean(b.cleanTitle);
      if (b.inspectionPassed !== undefined) updates.inspectionPassed = Boolean(b.inspectionPassed);
      if (b.status !== undefined) updates.status = ['available', 'reserved', 'sold', 'delisted'].includes(b.status) ? b.status : 'available';
      if (b.verified !== undefined && req.user!.role === 'admin') updates.verified = Boolean(b.verified);

      const updated = await db().vehicles.update(req.params.id, updates);
      if (!updated) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      if (Array.isArray(b.images)) await db().vehicles.setImages(req.params.id, b.images.map(String).filter(Boolean));

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

// DELETE /api/ops/vehicles/:id — staff/admin permanently delete (FK cascade removes vehicle_images.
router.delete(
  '/vehicles/:id',
  requireAuth,
  requireRole(['staff', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const current = await db().vehicles.findById(req.params.id);
      if (!current) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      const images = await db().vehicles.getImages(req.params.id);
      const removed = await db().vehicles.delete(req.params.id);
      if (!removed) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      await Promise.all(images.map((img) => removeStoredImage(img.url)));
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

// DELETE /api/ops/vehicles/:id/images/:index — remove a single image by display order
router.delete(
  '/vehicles/:id/images/:index',
  requireAuth,
  requireRole(['staff', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const images = await db().vehicles.getImages(req.params.id);
      if (!images.length) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      const index = Number(req.params.index);
      if (!Number.isInteger(index) || index < 0 || index >= images.length) {
        return res.status(400).json({ success: false, message: 'Invalid image index.' });
      }
      const removedUrl = images[index].url;
      const remaining = images.filter((_, i) => i !== index).map((img, i) => ({ url: img.url, displayOrder: i }));
      await db().vehicles.setImages(req.params.id, remaining.map((r) => r.url));
      await removeStoredImage(removedUrl);
      res.json({ success: true, data: remaining.map((r) => r.url), message: 'Image removed.' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// POST /api/ops/vehicles/:id/images — append images (or replace with replace=true..
router.post(
  '/vehicles/:id/images',
  requireAuth,
  requireRole(['staff', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const current = await db().vehicles.findById(req.params.id);
      if (!current) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      const urls = Array.isArray(req.body?.images) ? req.body.images.map(String).filter(Boolean) : [];
      if (!urls.length) return res.status(400).json({ success: false, message: 'No image URLs provided.' });
      const existing = (await db().vehicles.getImages(req.params.id)).map((img) => img.url);
      const merged = req.body?.replace === true ? urls : [...existing, ...urls];
      await db().vehicles.setImages(req.params.id, merged);
      await db().audit.record({
        actorUserId: req.user!.id,
        actorRole: req.user!.role as UserRole,
        action: 'vehicle.update_images',
        resourceType: 'vehicle',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
      }).catch(() => undefined);
      res.json({ success: true, data: merged });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

export default router;