import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { StorageService } from './storage.service';
import { DEFAULT_USER, User } from '../models/user.model';

function makeStorageMock(initial: User | null = null) {
  return {
    get: vi.fn().mockReturnValue(initial),
    set: vi.fn().mockReturnValue(true),
    remove: vi.fn(),
  };
}

describe('UserService', () => {
  describe('initialisation', () => {
    it('uses DEFAULT_USER when no data is stored', () => {
      TestBed.configureTestingModule({
        providers: [
          UserService,
          { provide: StorageService, useValue: makeStorageMock(null) },
        ],
      });

      const service = TestBed.inject(UserService);

      expect(service.user()).toEqual(DEFAULT_USER);
    });

    it('loads user from storage when data exists', () => {
      const stored: User = {
        ...DEFAULT_USER,
        id: 'u1',
        name: 'John Doe',
        initials: 'JD',
      };
      TestBed.configureTestingModule({
        providers: [
          UserService,
          { provide: StorageService, useValue: makeStorageMock(stored) },
        ],
      });

      const service = TestBed.inject(UserService);

      expect(service.user()).toEqual(stored);
    });
  });

  describe('updateUser()', () => {
    let service: UserService;
    let storage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      storage = makeStorageMock(null);
      TestBed.configureTestingModule({
        providers: [
          UserService,
          { provide: StorageService, useValue: storage },
        ],
      });
      service = TestBed.inject(UserService);
    });

    it('merges partial updates into the current user', () => {
      service.updateUser({ email: 'alice@example.com' });

      expect(service.user().email).toBe('alice@example.com');
      // other fields are preserved
      expect(service.user().id).toBe(DEFAULT_USER.id);
    });

    it('auto-generates initials from a two-word name', () => {
      service.updateUser({ name: 'John Doe' });

      expect(service.user().initials).toBe('JD');
    });

    it('auto-generates initials from a multi-word name using first and last', () => {
      service.updateUser({ name: 'Mary Ann Smith' });

      expect(service.user().initials).toBe('MS');
    });

    it('fallback initials are first two chars for a single-word name', () => {
      service.updateUser({ name: 'Alice' });

      expect(service.user().initials).toBe('AL');
    });

    it('persists the updated user to storage', () => {
      service.updateUser({ name: 'Bob Smith' });

      expect(storage.set).toHaveBeenCalledWith(
        'dh_user',
        expect.objectContaining({ name: 'Bob Smith', initials: 'BS' })
      );
    });
  });

  describe('setAvatar()', () => {
    let service: UserService;
    let storage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      storage = makeStorageMock(null);
      TestBed.configureTestingModule({
        providers: [
          UserService,
          { provide: StorageService, useValue: storage },
        ],
      });
      service = TestBed.inject(UserService);
    });

    it('updates the avatar signal', () => {
      service.setAvatar('data:image/png;base64,abc==');

      expect(service.user().avatar).toBe('data:image/png;base64,abc==');
    });

    it('persists the avatar to storage', () => {
      service.setAvatar('data:image/png;base64,abc==');

      expect(storage.set).toHaveBeenCalledWith(
        'dh_user',
        expect.objectContaining({ avatar: 'data:image/png;base64,abc==' })
      );
    });
  });

  describe('removeAvatar()', () => {
    let service: UserService;
    let storage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      storage = makeStorageMock(null);
      TestBed.configureTestingModule({
        providers: [
          UserService,
          { provide: StorageService, useValue: storage },
        ],
      });
      service = TestBed.inject(UserService);
      service.setAvatar('data:image/png;base64,abc==');
      storage.set.mockClear();
    });

    it('clears the avatar from the signal', () => {
      service.removeAvatar();

      expect(service.user().avatar).toBeUndefined();
    });

    it('persists the updated user without avatar', () => {
      service.removeAvatar();

      expect(storage.set).toHaveBeenCalledWith(
        'dh_user',
        expect.not.objectContaining({ avatar: expect.anything() })
      );
    });
  });
});
