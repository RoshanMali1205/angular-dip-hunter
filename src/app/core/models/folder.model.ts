/**
 * Folder Model - Represents a portfolio folder (Growth Twenty / Dividend Ten)
 */

export type FolderId = 'GROWTH_20' | 'DIVIDEND_10';

export interface Folder {
  id: FolderId;
  name: string;
  description: string;
  stockCount: number;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_FOLDERS: Folder[] = [
  {
    id: 'GROWTH_20',
    name: 'Growth Twenty',
    description: 'Long-term growth focused portfolio with 20 high-potential stocks',
    stockCount: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'DIVIDEND_10',
    name: 'Dividend Ten',
    description: 'Dividend focused portfolio with 10 stable dividend-paying stocks',
    stockCount: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
