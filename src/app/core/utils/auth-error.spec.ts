import { toUserAuthMessage } from './auth-error';

describe('toUserAuthMessage', () => {
  it('explains a Supabase gateway timeout', () => {
    expect(toUserAuthMessage('Gateway Timeout')).toBe(
      'The account service is not responding. It may be paused or offline. Try again shortly.'
    );
  });

  it('explains a browser network failure when the project host does not resolve', () => {
    expect(toUserAuthMessage('Failed to fetch')).toContain('account service is not responding');
    expect(toUserAuthMessage('Load failed')).toContain('account service is not responding');
    expect(toUserAuthMessage('HTTP 504')).toContain('account service is not responding');
  });

  it('keeps credential errors specific', () => {
    expect(toUserAuthMessage('Invalid login credentials')).toBe('Invalid email or password.');
    expect(toUserAuthMessage('Email not confirmed')).toContain('confirm your email');
    expect(toUserAuthMessage('User already registered')).toContain('already exists');
  });

  it('passes through unrecognized messages', () => {
    expect(toUserAuthMessage('Password is too short')).toBe('Password is too short');
  });
});
