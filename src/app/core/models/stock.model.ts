/**
 * Stock Model - Represents a stock in a portfolio folder
 */

import { FolderId } from './folder.model';

export interface Stock {
  id: string;
  symbol: string;
  displayName: string;
  exchange: 'NSE' | 'BSE';
  folderId: FolderId;
  rank: number;
  isActive: boolean;
  sector?: string;
  createdAt: string;
  updatedAt: string;
}

// Growth Twenty - 20 stocks
export const GROWTH_20_STOCKS: Omit<Stock, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { symbol: 'RELIANCE', displayName: 'Reliance Industries', exchange: 'NSE', folderId: 'GROWTH_20', rank: 1, isActive: true, sector: 'Oil & Gas' },
  { symbol: 'HDFCBANK', displayName: 'HDFC Bank', exchange: 'NSE', folderId: 'GROWTH_20', rank: 2, isActive: true, sector: 'Banking' },
  { symbol: 'ICICIBANK', displayName: 'ICICI Bank', exchange: 'NSE', folderId: 'GROWTH_20', rank: 3, isActive: true, sector: 'Banking' },
  { symbol: 'TCS', displayName: 'Tata Consultancy Services', exchange: 'NSE', folderId: 'GROWTH_20', rank: 4, isActive: true, sector: 'IT' },
  { symbol: 'INFY', displayName: 'Infosys', exchange: 'NSE', folderId: 'GROWTH_20', rank: 5, isActive: true, sector: 'IT' },
  { symbol: 'BHARTIARTL', displayName: 'Bharti Airtel', exchange: 'NSE', folderId: 'GROWTH_20', rank: 6, isActive: true, sector: 'Telecom' },
  { symbol: 'HAL', displayName: 'Hindustan Aeronautics', exchange: 'NSE', folderId: 'GROWTH_20', rank: 7, isActive: true, sector: 'Defence' },
  { symbol: 'LT', displayName: 'Larsen & Toubro', exchange: 'NSE', folderId: 'GROWTH_20', rank: 8, isActive: true, sector: 'Infrastructure' },
  { symbol: 'ADANIPORTS', displayName: 'Adani Ports', exchange: 'NSE', folderId: 'GROWTH_20', rank: 9, isActive: true, sector: 'Infrastructure' },
  { symbol: 'ITC', displayName: 'ITC Limited', exchange: 'NSE', folderId: 'GROWTH_20', rank: 10, isActive: true, sector: 'FMCG' },
  { symbol: 'BAJFINANCE', displayName: 'Bajaj Finance', exchange: 'NSE', folderId: 'GROWTH_20', rank: 11, isActive: true, sector: 'NBFC' },
  { symbol: 'SUNPHARMA', displayName: 'Sun Pharma', exchange: 'NSE', folderId: 'GROWTH_20', rank: 12, isActive: true, sector: 'Pharma' },
  { symbol: 'TITAN', displayName: 'Titan Company', exchange: 'NSE', folderId: 'GROWTH_20', rank: 13, isActive: true, sector: 'Consumer' },
  { symbol: 'NTPC', displayName: 'NTPC Limited', exchange: 'NSE', folderId: 'GROWTH_20', rank: 14, isActive: true, sector: 'Power' },
  { symbol: 'ULTRACEMCO', displayName: 'UltraTech Cement', exchange: 'NSE', folderId: 'GROWTH_20', rank: 15, isActive: true, sector: 'Cement' },
  { symbol: 'ASIANPAINT', displayName: 'Asian Paints', exchange: 'NSE', folderId: 'GROWTH_20', rank: 16, isActive: true, sector: 'Consumer' },
  { symbol: 'MARUTI', displayName: 'Maruti Suzuki', exchange: 'NSE', folderId: 'GROWTH_20', rank: 17, isActive: true, sector: 'Auto' },
  { symbol: 'M&M', displayName: 'Mahindra & Mahindra', exchange: 'NSE', folderId: 'GROWTH_20', rank: 18, isActive: true, sector: 'Auto' },
  { symbol: 'PERSISTENT', displayName: 'Persistent Systems', exchange: 'NSE', folderId: 'GROWTH_20', rank: 19, isActive: true, sector: 'IT' },
  { symbol: 'AFFLE', displayName: 'Affle India', exchange: 'NSE', folderId: 'GROWTH_20', rank: 20, isActive: true, sector: 'IT' }
];

// Dividend Ten - 10 stocks
export const DIVIDEND_10_STOCKS: Omit<Stock, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { symbol: 'VEDL', displayName: 'Vedanta Limited', exchange: 'NSE', folderId: 'DIVIDEND_10', rank: 1, isActive: true, sector: 'Mining' },
  { symbol: 'COALINDIA', displayName: 'Coal India', exchange: 'NSE', folderId: 'DIVIDEND_10', rank: 2, isActive: true, sector: 'Mining' },
  { symbol: 'CASTROLIND', displayName: 'Castrol India', exchange: 'NSE', folderId: 'DIVIDEND_10', rank: 3, isActive: true, sector: 'Oil & Gas' },
  { symbol: 'ONGC', displayName: 'Oil & Natural Gas Corp', exchange: 'NSE', folderId: 'DIVIDEND_10', rank: 4, isActive: true, sector: 'Oil & Gas' },
  { symbol: 'POWERGRID', displayName: 'Power Grid Corp', exchange: 'NSE', folderId: 'DIVIDEND_10', rank: 5, isActive: true, sector: 'Power' },
  { symbol: 'RECLTD', displayName: 'REC Limited', exchange: 'NSE', folderId: 'DIVIDEND_10', rank: 6, isActive: true, sector: 'Finance' },
  { symbol: 'PFC', displayName: 'Power Finance Corp', exchange: 'NSE', folderId: 'DIVIDEND_10', rank: 7, isActive: true, sector: 'Finance' },
  { symbol: 'NTPC', displayName: 'NTPC Limited', exchange: 'NSE', folderId: 'DIVIDEND_10', rank: 8, isActive: true, sector: 'Power' },
  { symbol: 'ITC', displayName: 'ITC Limited', exchange: 'NSE', folderId: 'DIVIDEND_10', rank: 9, isActive: true, sector: 'FMCG' },
  { symbol: 'WIPRO', displayName: 'Wipro Limited', exchange: 'NSE', folderId: 'DIVIDEND_10', rank: 10, isActive: true, sector: 'IT' }
];
