import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/express';
import { getDatabaseService } from '../database/index';
import { UserRole } from '../models/types';

export interface AuthenticatedUser {
  id: string; // Database user ID or Clerk user ID
  clerkId: string; // Clerk User ID (e.g. user_2xxx)
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      auth?: {
        userId: string;
        role: UserRole;
      };
    }
  }
}

/**
 * Extracts and strictly verifies the Clerk session token from the Authorization header.
 * Supports production Clerk token verification when CLERK_SECRET_KEY is present,
 * and safe development-mode token verification when DEMO_MODE=true or keys are absent.
 */
export async function getAuthenticatedClerkUser(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) return null;

  const dbService = getDatabaseService();
  const storedClerk = await dbService.settings.getKey('apikey.clerk.secret_key').catch(() => null);
  const secretKey = storedClerk?.settingValue || process.env.CLERK_SECRET_KEY;
  const isDemoMode = process.env.NODE_ENV !== 'production' && (process.env.DEMO_MODE === 'true' || !secretKey || secretKey.includes('placeholder'));

  // 1. Live Clerk token verification when Secret Key is available
  if (secretKey && !secretKey.includes('placeholder')) {
    try {
      const decoded: any = await verifyToken(token, {
        secretKey,
      });

      if (!decoded || !decoded.sub) {
        return null;
      }

      const clerkId = decoded.sub;
      let dbUser = await dbService.users.findByClerkId(clerkId);

      // Extract metadata or claims
      const email = decoded.email || decoded.email_addresses?.[0] || dbUser?.email || '';
      const fullName = decoded.name || [decoded.first_name, decoded.last_name].filter(Boolean).join(' ') || dbUser?.fullName || 'Valued Customer';
      
      // Determine role from metadata or DB (roles must only be assigned by server/admin)
      const claimRole = (decoded.metadata?.role || decoded.public_metadata?.role) as UserRole | undefined;
      const effectiveRole: UserRole = dbUser?.role || claimRole || 'customer';

      if (!dbUser && email) {
        // Auto-provision or sync database record
        dbUser = await dbService.users.upsertClerkUser({
          clerkId,
          email,
          fullName,
          role: effectiveRole,
        });
      }

      return {
        id: dbUser?.id || clerkId,
        clerkId,
        email: dbUser?.email || email,
        fullName: dbUser?.fullName || fullName,
        phone: dbUser?.phone || '',
        role: effectiveRole,
        avatarUrl: dbUser?.avatarUrl || decoded.image_url,
      };
    } catch (err) {
      // If token verification fails in live mode and we're not in demo mode, reject
      if (!isDemoMode) {
        return null;
      }
    }
  }

  // 2. Controlled Development / Demo Mode Mock Token Handling
  if (isDemoMode) {
    try {
      // Demo tokens format: demo_token_<role>_<base64_json> or demo_token_<role>
      if (token.startsWith('demo_token_')) {
        const parts = token.split('_');
        const rolePart = (parts[2] || 'customer') as UserRole;
        const validRoles: UserRole[] = ['customer', 'staff', 'admin'];
        const role: UserRole = validRoles.includes(rolePart) ? rolePart : 'customer';

        let email = `demo.${role}@shabaautos.com`;
        let fullName = role === 'admin' ? 'Shaba Dealership Admin' : role === 'staff' ? 'Shaba Operations Staff' : 'Oluwasegun Adeleke';
        let phone = '+2348031234567';
        const clerkId = `user_demo_${role}_2026`;

        if (parts[3]) {
          try {
            const parsed = JSON.parse(Buffer.from(parts[3], 'base64url').toString('utf8'));
            if (parsed.email) email = parsed.email;
            if (parsed.fullName) fullName = parsed.fullName;
            if (parsed.phone) phone = parsed.phone;
          } catch {}
        }

        let dbUser = await dbService.users.findByClerkId(clerkId);
        if (!dbUser) {
          dbUser = await dbService.users.upsertClerkUser({
            clerkId,
            email,
            fullName,
            phone,
            role,
          });
        }

        return {
          id: dbUser.id,
          clerkId,
          email: dbUser.email,
          fullName: dbUser.fullName,
          phone: dbUser.phone,
          role: dbUser.role,
          avatarUrl: dbUser.avatarUrl,
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Express middleware requiring a valid authenticated Clerk session.
 * Rejects missing or invalid sessions with HTTP 401.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedClerkUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in to access this ShabaAutos service.',
        code: 'UNAUTHORIZED',
      });
    }

    req.user = user;
    req.auth = {
      userId: user.clerkId,
      role: user.role,
    };
    next();
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Authentication verification encountered an error.',
      code: 'AUTH_ERROR',
      error: err.message,
    });
  }
}

/**
 * Express middleware checking user role authorization.
 * Rejects unauthorized roles with HTTP 403.
 */
export function requireRole(allowed: UserRole | UserRole[]) {
  const allowedList = Array.isArray(allowed) ? allowed : [allowed];

  return async (req: Request, res: Response, next: NextFunction) => {
    // If user is not yet populated, run requireAuth first
    if (!req.user) {
      const user = await getAuthenticatedClerkUser(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'UNAUTHORIZED',
        });
      }
      req.user = user;
      req.auth = {
        userId: user.clerkId,
        role: user.role,
      };
    }

    const currentRole = req.user.role;

    // Admin has access to all staff and customer operations
    if (currentRole === 'admin') {
      return next();
    }

    if (!allowedList.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This operation requires ${allowedList.join(' or ')} privileges.`,
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}
