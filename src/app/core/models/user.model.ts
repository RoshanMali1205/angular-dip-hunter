/**
 * User Model - User profile information
 */

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;  // URL or base64 image
  initials: string;
  createdAt: string;
}

export const DEFAULT_USER: User = {
  id: 'default',
  name: 'Investor',
  initials: 'IN',
  createdAt: new Date().toISOString()
};
