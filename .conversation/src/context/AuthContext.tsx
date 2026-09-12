import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ClerkProvider, useUser, useAuth as useClerkAuth, useSignIn, useSignUp, useClerk } from '@clerk/clerk-react';
import { AppUser, AppUserRole } from '../types';
import { setAuthTokenGetter, syncUserProfile } from '../services/api';

export interface AuthContextType {
  user: AppUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  role: AppUserRole;
  token: string | null;
  getToken: () => Promise<string | null>;
  signInWithPassword: (email: string, pass: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean }>;
  signUpWithEmail: (data: { email: string; pass: string; fullName: string; phone: string }) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  verifyEmailOtp: (code: string) => Promise<{ success: boolean; error?: string }>;
  verifyPhoneOtp: (code: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  confirmPasswordReset: (code: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  switchDemoRole: (role: AppUserRole) => void;
  isDemoMode: boolean;
  pendingVerification: { type: 'email' | 'phone'; identifier: string } | null;
  clearPendingVerification: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthUser = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthUser must be used within an AuthProvider');
  }
  return context;
};

// Built-in Demo Personas for instant preview verification
const DEMO_PERSONAS: Record<AppUserRole, AppUser> = {
  customer: {
    id: 'usr_demo_cust_01',
    clerkId: 'user_demo_customer',
    email: 'babatunde.adeyemi@shabaautos.com',
    fullName: 'Babatunde Adeyemi',
    phone: '+234 803 456 7890',
    role: 'customer',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  staff: {
    id: 'usr_demo_staff_01',
    clerkId: 'user_demo_staff',
    email: 'chukwudi.okafor@shabaautos.com',
    fullName: 'Chukwudi Okafor',
    phone: '+234 812 987 6543',
    role: 'staff',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
  admin: {
    id: 'usr_demo_admin_01',
    clerkId: 'user_demo_admin',
    email: 'amina.bello@shabaautos.com',
    fullName: 'Amina Bello (GM)',
    phone: '+234 810 123 4567',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
  },
};

// -------------------------------------------------------------------
// 1. Fallback Demo Auth Component (used when Clerk keys not provided)
// -------------------------------------------------------------------
function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('shaba_demo_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEMO_PERSONAS.customer;
  });

  const [pendingVerification, setPendingVerification] = useState<{ type: 'email' | 'phone'; identifier: string } | null>(null);
  const [tempUserData, setTempUserData] = useState<{ email: string; fullName: string; phone: string } | null>(null);

  const token = currentUser ? `demo_token_${currentUser.role}` : null;

  const getToken = useCallback(async () => {
    return currentUser ? `demo_token_${currentUser.role}` : null;
  }, [currentUser]);

  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, [getToken]);

  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem('shaba_demo_user', JSON.stringify(currentUser));
      } catch {
        // ignore
      }
    } else {
      localStorage.removeItem('shaba_demo_user');
    }
  }, [currentUser]);

  const switchDemoRole = useCallback((role: AppUserRole) => {
    const selected = DEMO_PERSONAS[role];
    setCurrentUser(selected);
  }, []);

  const signInWithPassword = async (email: string, pass: string) => {
    // Check if email matches a demo persona
    const foundRole = (Object.keys(DEMO_PERSONAS) as AppUserRole[]).find(
      (r) => DEMO_PERSONAS[r].email.toLowerCase() === email.toLowerCase()
    );

    if (foundRole) {
      setCurrentUser(DEMO_PERSONAS[foundRole]);
      return { success: true };
    }

    // Default custom login in demo mode
    const customUser: AppUser = {
      id: `usr_${Date.now()}`,
      clerkId: `clerk_${Date.now()}`,
      email,
      fullName: email.split('@')[0].replace('.', ' ').toUpperCase(),
      phone: '+234 810 123 4567',
      role: 'customer',
    };
    setCurrentUser(customUser);
    return { success: true };
  };

  const signUpWithEmail = async (data: { email: string; pass: string; fullName: string; phone: string }) => {
    setTempUserData({
      email: data.email,
      fullName: data.fullName,
      phone: data.phone,
    });
    setPendingVerification({
      type: 'email',
      identifier: data.email,
    });
    return { success: true, requiresVerification: true };
  };

  const verifyEmailOtp = async (code: string) => {
    if (!code || code.trim().length < 4) {
      return { success: false, error: 'Please enter a valid 6-digit verification code' };
    }
    const createdUser: AppUser = {
      id: `usr_${Date.now()}`,
      clerkId: `clerk_${Date.now()}`,
      email: tempUserData?.email || 'customer@shabaautos.com',
      fullName: tempUserData?.fullName || 'Valued Customer',
      phone: tempUserData?.phone || '+234 810 123 4567',
      role: 'customer',
    };
    setCurrentUser(createdUser);
    setPendingVerification(null);
    setTempUserData(null);

    // Sync with server
    try {
      await syncUserProfile({
        clerkId: createdUser.clerkId,
        email: createdUser.email,
        fullName: createdUser.fullName,
        phone: createdUser.phone,
        role: createdUser.role,
      });
    } catch {
      // server sync error handled gracefully
    }

    return { success: true };
  };

  const verifyPhoneOtp = async (code: string) => {
    return verifyEmailOtp(code);
  };

  const requestPasswordReset = async (email: string) => {
    return { success: true };
  };

  const confirmPasswordReset = async (code: string, newPass: string) => {
    return { success: true };
  };

  const signOut = async () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        isSignedIn: Boolean(currentUser),
        isLoaded: true,
        role: currentUser?.role || 'customer',
        token,
        getToken,
        signInWithPassword,
        signUpWithEmail,
        verifyEmailOtp,
        verifyPhoneOtp,
        requestPasswordReset,
        confirmPasswordReset,
        signOut,
        switchDemoRole,
        isDemoMode: true,
        pendingVerification,
        clearPendingVerification: () => setPendingVerification(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// -------------------------------------------------------------------
// 2. Live Clerk Auth Inner Component (active when live Clerk keys configured)
// -------------------------------------------------------------------
function ClerkAuthInner({ children }: { children: ReactNode }) {
  const { isLoaded: userLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken: clerkGetToken, userId } = useClerkAuth();
  const { signIn, isLoaded: signInLoaded, setActive: setSignInActive } = useSignIn();
  const { signUp, isLoaded: signUpLoaded, setActive: setSignUpActive } = useSignUp();
  const clerk = useClerk();

  const [pendingVerification, setPendingVerification] = useState<{ type: 'email' | 'phone'; identifier: string } | null>(null);

  const getToken = useCallback(async () => {
    if (!isSignedIn) return null;
    try {
      return await clerkGetToken();
    } catch {
      return null;
    }
  }, [isSignedIn, clerkGetToken]);

  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, [getToken]);

  // Derive normalized app user from Clerk User object
  const userRole: AppUserRole =
    (clerkUser?.publicMetadata?.role as AppUserRole) || 'customer';

  const mappedUser: AppUser | null = clerkUser
    ? {
        id: clerkUser.id,
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        fullName: clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'ShabaAutos User',
        phone: clerkUser.primaryPhoneNumber?.phoneNumber,
        role: userRole,
        avatarUrl: clerkUser.imageUrl,
      }
    : null;

  // Sync profile with backend when user logs in
  useEffect(() => {
    if (mappedUser && isSignedIn) {
      syncUserProfile({
        clerkId: mappedUser.clerkId,
        email: mappedUser.email,
        fullName: mappedUser.fullName,
        phone: mappedUser.phone,
        role: mappedUser.role,
      }).catch(() => {
        // Handled silently
      });
    }
  }, [clerkUser?.id, isSignedIn]);

  const signInWithPassword = async (email: string, pass: string) => {
    if (!signInLoaded || !signIn) {
      return { success: false, error: 'Authentication service initializing...' };
    }
    try {
      const result = await signIn.create({
        identifier: email,
        password: pass,
      });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        return { success: true };
      } else if (result.status === 'needs_second_factor') {
        return { success: false, requires2FA: true, error: 'Additional verification required.' };
      }
      return { success: false, error: `Sign-in status: ${result.status}` };
    } catch (err: any) {
      const message = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Failed to sign in';
      return { success: false, error: message };
    }
  };

  const signUpWithEmail = async (data: { email: string; pass: string; fullName: string; phone: string }) => {
    if (!signUpLoaded || !signUp) {
      return { success: false, error: 'Registration service initializing...' };
    }
    try {
      const nameParts = data.fullName.trim().split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || '';

      await signUp.create({
        emailAddress: data.email,
        password: data.pass,
        firstName,
        lastName,
        phoneNumber: data.phone || undefined,
      });

      // Prepare email verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification({ type: 'email', identifier: data.email });

      return { success: true, requiresVerification: true };
    } catch (err: any) {
      const message = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const verifyEmailOtp = async (code: string) => {
    if (!signUpLoaded || !signUp) {
      return { success: false, error: 'Verification service initializing...' };
    }
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (completeSignUp.status === 'complete') {
        await setSignUpActive({ session: completeSignUp.createdSessionId });
        setPendingVerification(null);
        return { success: true };
      }
      return { success: false, error: `Verification status: ${completeSignUp.status}` };
    } catch (err: any) {
      const message = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Invalid verification code';
      return { success: false, error: message };
    }
  };

  const verifyPhoneOtp = async (code: string) => {
    if (!signUpLoaded || !signUp) {
      return { success: false, error: 'Verification service initializing...' };
    }
    try {
      const completeSignUp = await signUp.attemptPhoneNumberVerification({
        code: code.trim(),
      });
      if (completeSignUp.status === 'complete') {
        await setSignUpActive({ session: completeSignUp.createdSessionId });
        setPendingVerification(null);
        return { success: true };
      }
      return { success: false, error: `Verification status: ${completeSignUp.status}` };
    } catch (err: any) {
      const message = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Invalid code';
      return { success: false, error: message };
    }
  };

  const requestPasswordReset = async (email: string) => {
    if (!signInLoaded || !signIn) return { success: false, error: 'Service unavailable' };
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      return { success: true };
    } catch (err: any) {
      const message = err.errors?.[0]?.message || err.message || 'Could not send reset code';
      return { success: false, error: message };
    }
  };

  const confirmPasswordReset = async (code: string, newPass: string) => {
    if (!signInLoaded || !signIn) return { success: false, error: 'Service unavailable' };
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password: newPass,
      });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        return { success: true };
      }
      return { success: false, error: 'Could not complete password reset' };
    } catch (err: any) {
      const message = err.errors?.[0]?.message || err.message || 'Failed to reset password';
      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    await clerk.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user: mappedUser,
        isSignedIn: Boolean(isSignedIn),
        isLoaded: Boolean(userLoaded),
        role: userRole,
        token: null,
        getToken,
        signInWithPassword,
        signUpWithEmail,
        verifyEmailOtp,
        verifyPhoneOtp,
        requestPasswordReset,
        confirmPasswordReset,
        signOut,
        switchDemoRole: () => {}, // In live Clerk mode, roles are determined by Clerk metadata
        isDemoMode: false,
        pendingVerification,
        clearPendingVerification: () => setPendingVerification(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// -------------------------------------------------------------------
// 3. Top-Level Auth Provider that auto-detects Live Clerk vs Demo
// -------------------------------------------------------------------
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const publishableKey = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

  const isClerkConfigured = Boolean(
    publishableKey &&
      !publishableKey.includes('placeholder') &&
      !publishableKey.includes('your_') &&
      (publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_'))
  );

  if (isClerkConfigured && publishableKey) {
    return (
      <ClerkProvider publishableKey={publishableKey}>
        <ClerkAuthInner>{children}</ClerkAuthInner>
      </ClerkProvider>
    );
  }

  if ((import.meta as any).env?.PROD) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
          <h1 className="text-lg font-black text-amber-950">Authentication configuration required</h1>
          <p className="mt-2 text-sm text-amber-900">Set VITE_CLERK_PUBLISHABLE_KEY in the frontend deployment before using ShabaAutos in production.</p>
        </div>
      </div>
    );
  }

  return <DemoAuthProvider>{children}</DemoAuthProvider>;
};
