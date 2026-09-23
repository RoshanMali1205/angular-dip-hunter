/**
 * Turn raw Supabase / fetch failures into a short message for the auth screens.
 * A 504 from the Supabase gateway arrives as the status text "Gateway Timeout".
 */
export function toUserAuthMessage(message: string): string {
  const lower = message.toLowerCase();

  if (isAccountServiceUnavailable(lower)) {
    return 'The account service is not responding. It may be paused or offline. Try again shortly.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox for the Dip Hunter link.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Please login instead.';
  }
  return message;
}

function isAccountServiceUnavailable(lower: string): boolean {
  return (
    lower.includes('gateway timeout') ||
    lower.includes('failed to fetch') ||
    lower.includes('load failed') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('err_name_not_resolved') ||
    lower.includes('name not resolved') ||
    lower.includes('project is paused') ||
    lower.includes('project paused') ||
    /\bhttp 50[234]\b/.test(lower) ||
    /\b544\b/.test(lower)
  );
}
