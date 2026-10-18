import { apiClient } from './api-client';
import { AdminUser, LoginCredentials, LoginResponse, MeResponse } from '@/types/auth';

const STORAGE_KEY = 'admin_user';

export const authService = {
  /**
   * Submit credentials to obtain a JWT token
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Get authenticated admin profile using JWT token
   */
  async getMe(token: string): Promise<MeResponse> {
    return apiClient<MeResponse>('/auth/me', {
      method: 'GET',
      token,
    });
  },

  /**
   * Full login flow: authenticates credentials, fetches profile, and returns AdminUser
   */
  async authenticate(credentials: LoginCredentials): Promise<AdminUser> {
    const loginRes = await this.login(credentials);
    const token = loginRes.accessToken;

    let profile: MeResponse = {
      id: '',
      email: credentials.email,
      name: credentials.email.split('@')[0] || 'Administrator',
    };

    try {
      profile = await this.getMe(token);
    } catch {
      // If /auth/me fails, fall back to email username
    }

    const adminUser: AdminUser = {
      id: profile.id,
      email: profile.email || credentials.email,
      name: profile.name || credentials.email.split('@')[0] || 'Administrator',
      token,
    };

    this.setStoredUser(adminUser);
    return adminUser;
  },

  /**
   * Retrieve cached admin user from browser storage
   */
  getStoredUser(): AdminUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as AdminUser) : null;
    } catch {
      return null;
    }
  },

  /**
   * Save admin user to browser storage
   */
  setStoredUser(user: AdminUser): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // ignore storage error
    }
  },

  /**
   * Clear admin user from browser storage
   */
  clearStoredUser(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage error
    }
  },
};
