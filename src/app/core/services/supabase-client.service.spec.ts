import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';

describe('SupabaseClientService', () => {
  it('stays disabled when environment keys are empty', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(SupabaseClientService);
    expect(service.isEnabled).toBe(false);
    expect(service.client).toBeNull();
  });
});
