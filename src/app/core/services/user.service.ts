/**
 * User Service - User profile management
 */

import { Injectable, signal } from '@angular/core';
import { User, DEFAULT_USER } from '../models/user.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly STORAGE_KEY = 'dh_user';
  
  private readonly _user = signal<User>(DEFAULT_USER);
  readonly user = this._user.asReadonly();

  constructor(private storage: StorageService) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const stored = this.storage.get<User>(this.STORAGE_KEY);
    if (stored) {
      this._user.set(stored);
    }
  }

  private saveToStorage(): void {
    this.storage.set(this.STORAGE_KEY, this._user());
  }

  updateUser(updates: Partial<User>): void {
    this._user.update(current => {
      const updated = { ...current, ...updates };
      // Auto-generate initials if name changed
      if (updates.name) {
        updated.initials = this.generateInitials(updates.name);
      }
      return updated;
    });
    this.saveToStorage();
  }

  setAvatar(avatarDataUrl: string): void {
    this._user.update(current => ({ ...current, avatar: avatarDataUrl }));
    this.saveToStorage();
  }

  removeAvatar(): void {
    this._user.update(current => ({ ...current, avatar: undefined }));
    this.saveToStorage();
  }

  private generateInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
