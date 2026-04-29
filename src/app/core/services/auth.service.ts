import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { 
  AuthUser, 
  AuthState, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse,
  DEFAULT_AUTH_STATE,
  validatePassword
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly AUTH_TOKEN_KEY = 'dh_auth_token';
  private readonly AUTH_USER_KEY = 'dh_auth_user';
  private readonly REMEMBER_KEY = 'dh_remember_me';
  private readonly REGISTERED_USERS_KEY = 'dh_registered_users';
  private readonly LOGIN_ATTEMPTS_KEY = 'dh_login_attempts';
  private readonly RESET_TOKEN_VERSION = 'v1';
  private readonly RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
  private readonly RESET_TOKEN_PEPPER = 'dh_reset_pepper_v1';
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 min
  private readonly LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 min

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

  private readonly PASSWORD_ITERATIONS = 120000;
  private readonly PASSWORD_HASH_VERSION = 'pbkdf2_sha256_v1';

  constructor() {
    // Cleanup for older builds that stored reset tokens in localStorage.
    localStorage.removeItem('dh_reset_tokens');
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

      const normalizedEmail = request.email.toLowerCase();
      if (this.isLoginLockedOut(normalizedEmail)) {
        throw new Error('Too many failed attempts. Please try again in a few minutes.');
      }

      // Get registered users from localStorage
      const registeredUsers = this.getRegisteredUsers();
      
      // Find user by email
      const storedUser = registeredUsers.find(
        u => u.email.toLowerCase() === normalizedEmail
      );

      if (!storedUser) {
        this.recordFailedLoginAttempt(normalizedEmail);
        throw new Error('No account found with this email. Please register first.');
      }

      // Validate password using secure hash. For legacy plaintext entries,
      // compare once and migrate to hashed credentials on successful login.
      const isValidPassword = await this.verifyPassword(request.password, storedUser);
      if (!isValidPassword) {
        this.recordFailedLoginAttempt(normalizedEmail);
        throw new Error('Invalid password. Please try again.');
      }

      this.clearLoginAttemptState(normalizedEmail);

      if (!storedUser.passwordHash || !storedUser.passwordSalt) {
        const migration = await this.createPasswordRecord(request.password);
        const userIndex = registeredUsers.findIndex(u => u.id === storedUser.id);
        if (userIndex !== -1) {
          registeredUsers[userIndex] = {
            ...registeredUsers[userIndex],
            ...migration,
            password: undefined
          };
          this.saveRegisteredUsers(registeredUsers);
        }
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

      const passwordValidation = validatePassword(request.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors[0] ?? 'Password does not meet policy requirements');
      }

      // Check if email already exists
      const registeredUsers = this.getRegisteredUsers();
      const existingUser = registeredUsers.find(
        u => u.email.toLowerCase() === request.email.toLowerCase()
      );

      if (existingUser) {
        throw new Error('An account with this email already exists. Please login instead.');
      }

      const passwordRecord = await this.createPasswordRecord(request.password);

      // Create new user with hashed password credentials
      const newUser = {
        id: this.generateId(),
        name: request.name,
        email: request.email,
        passwordHash: passwordRecord.passwordHash,
        passwordSalt: passwordRecord.passwordSalt,
        passwordVersion: passwordRecord.passwordVersion,
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

  /**
   * Request a password reset token for the given email.
   * Returns a stateless signed token if the email exists, null otherwise.
   */
  async requestPasswordReset(email: string): Promise<string | null> {
    const users = this.getRegisteredUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;

    const payload = {
      v: this.RESET_TOKEN_VERSION,
      e: user.email.toLowerCase(),
      exp: Date.now() + this.RESET_TOKEN_TTL_MS,
      n: this.generateSalt(8)
    };

    const payloadEncoded = this.toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
    const signature = await this.signResetPayload(payloadEncoded, user);
    return `${payloadEncoded}.${signature}`;
  }

  /**
   * Validate a stateless reset token.
   * Returns the associated email if valid, null if invalid/expired.
   */
  async validateResetToken(token: string): Promise<string | null> {
    const [payloadEncoded, signature] = token.split('.');
    if (!payloadEncoded || !signature) return null;

    const payload = this.parseResetPayload(payloadEncoded);
    if (!payload) return null;

    if (payload.v !== this.RESET_TOKEN_VERSION) return null;
    if (payload.exp <= Date.now()) return null;

    const users = this.getRegisteredUsers();
    const user = users.find(u => u.email.toLowerCase() === payload.e.toLowerCase());
    if (!user) return null;

    const expectedSignature = await this.signResetPayload(payloadEncoded, user);
    if (!this.constantTimeEqual(signature, expectedSignature)) return null;

    return user.email;
  }

  /**
   * Reset the user's password using a valid reset token.
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    this._state.update(s => ({ ...s, isLoading: true, error: null }));
    try {
      await this.delay(800);

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors[0] ?? 'Password does not meet policy requirements');
      }

      const email = await this.validateResetToken(token);
      if (!email) throw new Error('Reset link is invalid or has expired. Please request a new one.');

      const users = this.getRegisteredUsers();
      const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (idx === -1) throw new Error('Account not found.');

      const passwordRecord = await this.createPasswordRecord(newPassword);
      users[idx].passwordHash = passwordRecord.passwordHash;
      users[idx].passwordSalt = passwordRecord.passwordSalt;
      users[idx].passwordVersion = passwordRecord.passwordVersion;
      users[idx].password = undefined;
      this.saveRegisteredUsers(users);

      this._state.update(s => ({ ...s, isLoading: false }));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password reset failed.';
      this._state.update(s => ({ ...s, isLoading: false, error: message }));
      return false;
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

  private parseResetPayload(payloadEncoded: string): {
    v: string;
    e: string;
    exp: number;
    n: string;
  } | null {
    try {
      const raw = this.fromBase64Url(payloadEncoded);
      const parsed = JSON.parse(new TextDecoder().decode(raw)) as {
        v?: unknown;
        e?: unknown;
        exp?: unknown;
        n?: unknown;
      };

      if (
        typeof parsed.v !== 'string' ||
        typeof parsed.e !== 'string' ||
        typeof parsed.exp !== 'number' ||
        typeof parsed.n !== 'string'
      ) {
        return null;
      }

      return {
        v: parsed.v,
        e: parsed.e,
        exp: parsed.exp,
        n: parsed.n
      };
    } catch {
      return null;
    }
  }

  private async signResetPayload(payloadEncoded: string, user: RegisteredUser): Promise<string> {
    const encoder = new TextEncoder();
    const secretMaterial = `${this.RESET_TOKEN_PEPPER}:${user.passwordHash ?? user.password ?? ''}:${user.createdAt}`;
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      encoder.encode(secretMaterial),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sig = await globalThis.crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payloadEncoded)
    );
    return this.toBase64Url(new Uint8Array(sig));
  }

  private getLoginAttempts(): Record<string, { count: number; firstAt: number; lockedUntil?: number }> {
    try {
      const json = localStorage.getItem(this.LOGIN_ATTEMPTS_KEY);
      return json ? JSON.parse(json) : {};
    } catch {
      return {};
    }
  }

  private saveLoginAttempts(attempts: Record<string, { count: number; firstAt: number; lockedUntil?: number }>): void {
    localStorage.setItem(this.LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
  }

  private isLoginLockedOut(email: string): boolean {
    const attempts = this.getLoginAttempts();
    const state = attempts[email];
    if (!state?.lockedUntil) return false;

    if (state.lockedUntil > Date.now()) {
      return true;
    }

    // Lockout expired, clear state.
    delete attempts[email];
    this.saveLoginAttempts(attempts);
    return false;
  }

  private recordFailedLoginAttempt(email: string): void {
    if (!email) return;

    const now = Date.now();
    const attempts = this.getLoginAttempts();
    const current = attempts[email];

    if (!current || now - current.firstAt > this.LOGIN_ATTEMPT_WINDOW_MS) {
      attempts[email] = { count: 1, firstAt: now };
      this.saveLoginAttempts(attempts);
      return;
    }

    const nextCount = current.count + 1;
    const nextState = { ...current, count: nextCount };
    if (nextCount >= this.MAX_FAILED_ATTEMPTS) {
      nextState.lockedUntil = now + this.LOGIN_LOCKOUT_MS;
    }
    attempts[email] = nextState;
    this.saveLoginAttempts(attempts);
  }

  private clearLoginAttemptState(email: string): void {
    if (!email) return;
    const attempts = this.getLoginAttempts();
    if (attempts[email]) {
      delete attempts[email];
      this.saveLoginAttempts(attempts);
    }
  }

  private toBase64Url(bytes: Uint8Array): string {
    const binary = String.fromCharCode(...bytes);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private fromBase64Url(base64Url: string): Uint8Array {
    const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(normalized + padding);
    return Uint8Array.from(binary, c => c.charCodeAt(0));
  }

  private constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
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
  private getRegisteredUsers(): RegisteredUser[] {
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
  private saveRegisteredUsers(users: RegisteredUser[]): void {
    localStorage.setItem(this.REGISTERED_USERS_KEY, JSON.stringify(users));
  }

  private async createPasswordRecord(password: string): Promise<{
    passwordHash: string;
    passwordSalt: string;
    passwordVersion: string;
  }> {
    const passwordSalt = this.generateSalt();
    const passwordHash = await this.hashPassword(password, passwordSalt);

    return {
      passwordHash,
      passwordSalt,
      passwordVersion: this.PASSWORD_HASH_VERSION
    };
  }

  private async verifyPassword(password: string, user: RegisteredUser): Promise<boolean> {
    if (user.passwordHash && user.passwordSalt) {
      const computed = await this.hashPassword(password, user.passwordSalt);
      return computed === user.passwordHash;
    }

    // Backward compatibility for older plaintext records.
    return typeof user.password === 'string' && user.password === password;
  }

  private generateSalt(byteLength = 16): string {
    const bytes = new Uint8Array(byteLength);
    globalThis.crypto.getRandomValues(bytes);
    return this.toHex(bytes);
  }

  private async hashPassword(password: string, saltHex: string): Promise<string> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = this.fromHexToArrayBuffer(saltHex);

    const keyMaterial = await globalThis.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits = await globalThis.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: this.PASSWORD_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return this.toHex(new Uint8Array(bits));
  }

  private toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private fromHexToArrayBuffer(hex: string): ArrayBuffer {
    const pairs = hex.match(/.{1,2}/g) ?? [];
    const bytes = Uint8Array.from(pairs.map(byte => Number.parseInt(byte, 16)));
    const buffer = new ArrayBuffer(bytes.length);
    new Uint8Array(buffer).set(bytes);
    return buffer;
  }
}

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  passwordVersion?: string;
}
