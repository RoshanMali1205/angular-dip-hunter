import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { 
  AuthUser, 
  AuthState, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse,
  DEFAULT_AUTH_STATE 
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly AUTH_TOKEN_KEY = 'dh_auth_token';
  private readonly AUTH_USER_KEY = 'dh_auth_user';
  private readonly REMEMBER_KEY = 'dh_remember_me';
  private readonly REGISTERED_USERS_KEY = 'dh_registered_users';

  private readonly router = inject(Router);

  // Private state signals
  private readonly _state = signal<AuthState>(DEFAULT_AUTH_STATE);
  private readonly _redirectUrl = signal<string | null>(null);

  // Public readonly accessors
  readonly state = this._state.asReadonly();
  readonly user = computed(() => this._state().user);
  readonly isAuthenticated = computed(() => this._state().isAuthenticated);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly error = computed(() => this._state().error);
  readonly redirectUrl = this._redirectUrl.asReadonly();

  constructor() {
    this.restoreSession();
  }

  /**
   * Restore session from storage on app initialization
   */
  private restoreSession(): void {
    try {
      const rememberMe = localStorage.getItem(this.REMEMBER_KEY) === 'true';
      const storage = rememberMe ? localStorage : sessionStorage;
      
      const token = storage.getItem(this.AUTH_TOKEN_KEY);
      const userJson = storage.getItem(this.AUTH_USER_KEY);

      if (token && userJson) {
        const user = JSON.parse(userJson) as AuthUser;
        this._state.set({
          user,
          accessToken: token,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Failed to restore auth session:', error);
      this.clearStorage();
    }
  }

  /**
   * Login with email and password
   * Validates against registered users stored in localStorage
   */
  async login(request: LoginRequest): Promise<boolean> {
    this._state.update(s => ({ ...s, isLoading: true, error: null }));

    try {
      // Simulate API call delay
      await this.delay(800);

      // Validation
      if (!request.email || !request.password) {
        throw new Error('Email and password are required');
      }

      // Get registered users from localStorage
      const registeredUsers = this.getRegisteredUsers();
      
      // Find user by email
      const storedUser = registeredUsers.find(
        u => u.email.toLowerCase() === request.email.toLowerCase()
      );

      if (!storedUser) {
        throw new Error('No account found with this email. Please register first.');
      }

      // Validate password
      if (storedUser.password !== request.password) {
        throw new Error('Invalid password. Please try again.');
      }

      // Create user object (without password)
      const mockUser: AuthUser = {
        id: storedUser.id,
        name: storedUser.name,
        email: storedUser.email,
        createdAt: storedUser.createdAt
      };

      const mockResponse: AuthResponse = {
        user: mockUser,
        accessToken: this.generateMockToken(),
        expiresIn: 3600
      };

      // Store in appropriate storage based on rememberMe
      const storage = request.rememberMe ? localStorage : sessionStorage;
      storage.setItem(this.AUTH_TOKEN_KEY, mockResponse.accessToken);
      storage.setItem(this.AUTH_USER_KEY, JSON.stringify(mockResponse.user));
      
      if (request.rememberMe) {
        localStorage.setItem(this.REMEMBER_KEY, 'true');
      } else {
        localStorage.removeItem(this.REMEMBER_KEY);
      }

      this._state.set({
        user: mockResponse.user,
        accessToken: mockResponse.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      // Navigate to redirect URL or dashboard
      const redirectTo = this._redirectUrl() || '/';
      this._redirectUrl.set(null);
      this.router.navigate([redirectTo]);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
      this._state.update(s => ({ 
        ...s, 
        isLoading: false, 
        error: message 
      }));
      return false;
    }
  }

  /**
   * Register new user
   * Stores user credentials in localStorage for validation during login
   */
  async register(request: RegisterRequest): Promise<boolean> {
    this._state.update(s => ({ ...s, isLoading: true, error: null }));

    try {
      // Simulate API call delay
      await this.delay(1000);

      // Validation
      if (!request.email || !request.password || !request.name) {
        throw new Error('All fields are required');
      }

      // Check if email already exists
      const registeredUsers = this.getRegisteredUsers();
      const existingUser = registeredUsers.find(
        u => u.email.toLowerCase() === request.email.toLowerCase()
      );

      if (existingUser) {
        throw new Error('An account with this email already exists. Please login instead.');
      }

      // Create new user with password
      const newUser = {
        id: this.generateId(),
        name: request.name,
        email: request.email,
        password: request.password, // In real app, this would be hashed on backend
        createdAt: new Date().toISOString()
      };

      // Save to registered users
      registeredUsers.push(newUser);
      this.saveRegisteredUsers(registeredUsers);

      this._state.update(s => ({ ...s, isLoading: false, error: null }));

      // Navigate to login page with success flag
      this.router.navigate(['/auth/login'], { 
        queryParams: { registered: 'true', email: request.email } 
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      this._state.update(s => ({ 
        ...s, 
        isLoading: false, 
        error: message 
      }));
      return false;
    }
  }

  /**
   * Logout user and clear session
   */
  logout(): void {
    this.clearStorage();
    this._state.set(DEFAULT_AUTH_STATE);
    this.router.navigate(['/auth/login']);
  }

  /**
   * Set redirect URL for post-login navigation
   */
  setRedirectUrl(url: string): void {
    this._redirectUrl.set(url);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._state.update(s => ({ ...s, error: null }));
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this._state().accessToken;
  }

  /**
   * Update user profile
   */
  updateUser(updates: Partial<AuthUser>): void {
    const currentUser = this._state().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      this._state.update(s => ({ ...s, user: updatedUser }));
      
      // Persist to storage
      const rememberMe = localStorage.getItem(this.REMEMBER_KEY) === 'true';
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem(this.AUTH_USER_KEY, JSON.stringify(updatedUser));
    }
  }

  // Helper methods
  private clearStorage(): void {
    sessionStorage.removeItem(this.AUTH_TOKEN_KEY);
    sessionStorage.removeItem(this.AUTH_USER_KEY);
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.AUTH_USER_KEY);
    localStorage.removeItem(this.REMEMBER_KEY);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return 'user_' + Math.random().toString(36).substring(2, 11);
  }

  private generateMockToken(): string {
    return 'mock_token_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private extractNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    return localPart
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Get registered users from localStorage
   */
  private getRegisteredUsers(): Array<{
    id: string;
    name: string;
    email: string;
    password: string;
    createdAt: string;
  }> {
    try {
      const usersJson = localStorage.getItem(this.REGISTERED_USERS_KEY);
      return usersJson ? JSON.parse(usersJson) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save registered users to localStorage
   */
  private saveRegisteredUsers(users: Array<{
    id: string;
    name: string;
    email: string;
    password: string;
    createdAt: string;
  }>): void {
    localStorage.setItem(this.REGISTERED_USERS_KEY, JSON.stringify(users));
  }
}
