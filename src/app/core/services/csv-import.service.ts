/**
 * CSV Import Service
 * Parses broker trade-book CSV files and converts them to ImportRow objects.
 * Supports: Zerodha, Groww, Angel One, and a Generic format.
 */

import { Injectable } from '@angular/core';
import { Stock } from '../models/stock.model';

export type BrokerFormat = 'zerodha' | 'groww' | 'angel' | 'generic' | 'unknown';

export interface ImportRow {
  rowIndex: number;
  date: string;          // YYYY-MM-DD
  symbol: string;        // resolved NSE symbol
  rawSymbol: string;     // original symbol/name from CSV
  qty: number;
  price: number;
  charges: number;
  type: 'BUY' | 'DIVIDEND';
  stockId: string;       // resolved stockId (empty = unresolved)
  valid: boolean;
  errors: string[];
}

export interface ParseResult {
  broker: BrokerFormat;
  brokerLabel: string;
  rows: ImportRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  unmappedSymbols: string[];
}

// ─── Groww company-name → NSE symbol lookup ───────────────────────────────
const GROWW_NAME_MAP: Record<string, string> = {
  'RELIANCE INDUSTRIES': 'RELIANCE',
  'RELIANCE INDUSTRIES LIMITED': 'RELIANCE',
  'HDFC BANK': 'HDFCBANK',
  'HDFC BANK LIMITED': 'HDFCBANK',
  'ICICI BANK': 'ICICIBANK',
  'ICICI BANK LIMITED': 'ICICIBANK',
  'TATA CONSULTANCY SERVICES': 'TCS',
  'TATA CONSULTANCY SERVICES LIMITED': 'TCS',
  'INFOSYS': 'INFY',
  'INFOSYS LIMITED': 'INFY',
  'BHARTI AIRTEL': 'BHARTIARTL',
  'BHARTI AIRTEL LIMITED': 'BHARTIARTL',
  'HINDUSTAN AERONAUTICS': 'HAL',
  'HINDUSTAN AERONAUTICS LIMITED': 'HAL',
  'LARSEN & TOUBRO': 'LT',
  'LARSEN AND TOUBRO': 'LT',
  'ADANI PORTS': 'ADANIPORTS',
  'ADANI PORTS AND SPECIAL ECONOMIC ZONE': 'ADANIPORTS',
  'ITC': 'ITC',
  'ITC LIMITED': 'ITC',
  'BAJAJ FINANCE': 'BAJFINANCE',
  'BAJAJ FINANCE LIMITED': 'BAJFINANCE',
  'SUN PHARMACEUTICAL': 'SUNPHARMA',
  'SUN PHARMACEUTICAL INDUSTRIES': 'SUNPHARMA',
  'TITAN COMPANY': 'TITAN',
  'TITAN COMPANY LIMITED': 'TITAN',
  'NTPC': 'NTPC',
  'NTPC LIMITED': 'NTPC',
  'ULTRATECH CEMENT': 'ULTRACEMCO',
  'ULTRATECH CEMENT LIMITED': 'ULTRACEMCO',
  'ASIAN PAINTS': 'ASIANPAINT',
  'ASIAN PAINTS LIMITED': 'ASIANPAINT',
  'MARUTI SUZUKI': 'MARUTI',
  'MARUTI SUZUKI INDIA LIMITED': 'MARUTI',
  'MAHINDRA & MAHINDRA': 'M&M',
  'MAHINDRA AND MAHINDRA': 'M&M',
  'PERSISTENT SYSTEMS': 'PERSISTENT',
  'PERSISTENT SYSTEMS LIMITED': 'PERSISTENT',
  'AFFLE': 'AFFLE',
  'AFFLE INDIA': 'AFFLE',
  'AFFLE INDIA LIMITED': 'AFFLE',
  'VEDANTA': 'VEDL',
  'VEDANTA LIMITED': 'VEDL',
  'COAL INDIA': 'COALINDIA',
  'COAL INDIA LIMITED': 'COALINDIA',
  'CASTROL INDIA': 'CASTROLIND',
  'CASTROL INDIA LIMITED': 'CASTROLIND',
  'OIL AND NATURAL GAS': 'ONGC',
  'OIL AND NATURAL GAS CORPORATION': 'ONGC',
  'ONGC': 'ONGC',
  'POWER GRID': 'POWERGRID',
  'POWER GRID CORPORATION OF INDIA': 'POWERGRID',
  'REC': 'RECLTD',
  'REC LIMITED': 'RECLTD',
  'POWER FINANCE CORPORATION': 'PFC',
  'WIPRO': 'WIPRO',
  'WIPRO LIMITED': 'WIPRO',
};

@Injectable({ providedIn: 'root' })
export class CsvImportService {

  /**
   * Parse a CSV file text and return structured ImportRow objects.
   * @param text   Raw CSV text content
   * @param stocks All portfolio stocks (for symbol → stockId resolution)
   */
  parse(text: string, stocks: Stock[]): ParseResult {
    // Strip BOM if present
    const clean = text.replace(/^\uFEFF/, '').trim();
    const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0);

    if (lines.length < 2) {
      return this.emptyResult('unknown', 'Unknown', 'File has no data rows.');
    }

    const headers = this.parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    const broker = this.detectBroker(headers);
    const brokerLabel = this.brokerLabel(broker);

    const dataLines = lines.slice(1);
    const rows: ImportRow[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const cells = this.parseCsvLine(dataLines[i]);
      if (cells.every(c => c.trim() === '')) continue; // skip blank lines

      const row = this.mapRow(broker, headers, cells, i + 2, stocks);
      rows.push(row);
    }

    const validRows = rows.filter(r => r.valid).length;
    const unmapped = [...new Set(
      rows.filter(r => !r.stockId && r.rawSymbol).map(r => r.rawSymbol)
    )];

    return {
      broker,
      brokerLabel,
      rows,
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      unmappedSymbols: unmapped
    };
  }

  // ─── Broker Detection ───────────────────────────────────────────────────

  private detectBroker(headers: string[]): BrokerFormat {
    const has = (term: string) => headers.some(h => h.includes(term));

    if (has('tradingsymbol') || has('trade_type') || (has('trade date') && has('exchange'))) {
      return 'zerodha';
    }
    if (has('buy/sell') || (has('order date') && has('symbol'))) {
      return 'angel';
    }
    if (has('name') && (has('type') || has('trade type')) && !has('symbol')) {
      return 'groww';
    }
    if (has('symbol') || has('qty') || has('quantity')) {
      return 'generic';
    }
    return 'unknown';
  }

  private brokerLabel(broker: BrokerFormat): string {
    const labels: Record<BrokerFormat, string> = {
      zerodha: 'Zerodha',
      groww: 'Groww',
      angel: 'Angel One',
      generic: 'Generic',
      unknown: 'Unknown'
    };
    return labels[broker];
  }

  // ─── Row Mapping ─────────────────────────────────────────────────────────

  private mapRow(
    broker: BrokerFormat,
    headers: string[],
    cells: string[],
    lineNum: number,
    stocks: Stock[]
  ): ImportRow {
    const get = (key: string): string => {
      const idx = headers.findIndex(h => h.includes(key));
      return idx >= 0 ? (cells[idx] ?? '').trim() : '';
    };

    const base: ImportRow = {
      rowIndex: lineNum, date: '', symbol: '', rawSymbol: '',
      qty: 0, price: 0, charges: 0, type: 'BUY',
      stockId: '', valid: false, errors: []
    };

    try {
      switch (broker) {
        case 'zerodha':  return this.mapZerodha(base, get, stocks);
        case 'groww':    return this.mapGroww(base, get, stocks);
        case 'angel':    return this.mapAngel(base, get, stocks);
        default:         return this.mapGeneric(base, headers, cells, stocks);
      }
    } catch {
      return { ...base, errors: [`Row ${lineNum}: parse error`] };
    }
  }

  private mapZerodha(row: ImportRow, get: (k: string) => string, stocks: Stock[]): ImportRow {
    // Headers: trade_date / Trade Date, tradingsymbol / Tradingsymbol,
    //          trade_type / Trade Type, quantity / Quantity, price / Price
    const rawDate   = get('trade date') || get('trade_date');
    const rawSymbol = get('tradingsymbol');
    const tradeType = (get('trade type') || get('trade_type')).toLowerCase();
    const qtyStr    = get('quantity');
    const priceStr  = get('price');

    row.rawSymbol = rawSymbol;
    if (tradeType === 'sell') {
      row.errors.push('Sell trades are skipped — only BUY imports are supported');
      return row;
    }

    row.date   = this.parseDate(rawDate);
    row.symbol = rawSymbol.toUpperCase().replace(/-EQ$/i, '').trim();
    row.qty    = parseFloat(qtyStr) || 0;
    row.price  = parseFloat(priceStr) || 0;

    return this.finalizeRow(row, stocks);
  }

  private mapGroww(row: ImportRow, get: (k: string) => string, stocks: Stock[]): ImportRow {
    // Headers: Date, Type, Name (company name), Quantity, Price, Amount, Charges
    const rawDate = get('date');
    const type    = (get('type') || get('trade type')).toUpperCase();
    const name    = get('name');
    const qtyStr  = get('quantity') || get('qty');
    const priceStr = get('price');
    const chargesStr = get('charges') || get('brokerage');

    row.rawSymbol = name;
    if (type === 'SELL') {
      row.errors.push('Sell trades are skipped');
      return row;
    }
    if (type === 'DIVIDEND') {
      row.type = 'DIVIDEND';
    }
    row.date      = this.parseDate(rawDate);
    row.qty       = parseFloat(qtyStr) || 0;
    row.price     = parseFloat(priceStr) || 0;
    row.charges   = parseFloat(chargesStr) || 0;

    // Resolve company name → symbol
    const upperName = name.toUpperCase().trim();
    const mapped = GROWW_NAME_MAP[upperName];
    row.symbol = mapped ?? this.guessSymbol(upperName);

    if (!row.symbol) {
      row.errors.push(`Cannot map company name "${name}" to a symbol`);
    }

    return this.finalizeRow(row, stocks);
  }

  private mapAngel(row: ImportRow, get: (k: string) => string, stocks: Stock[]): ImportRow {
    // Headers: Order Date, Exchange, Symbol, Buy/Sell, Quantity, Price
    const rawDate   = get('order date') || get('date');
    const rawSymbol = get('symbol') || get('script name') || get('tradingsymbol');
    const buySell   = (get('buy/sell') || get('trade type') || 'B').toUpperCase();
    const qtyStr    = get('quantity') || get('qty');
    const priceStr  = get('price') || get('net price');

    row.rawSymbol = rawSymbol;
    if (buySell === 'S' || buySell === 'SELL') {
      row.errors.push('Sell trades are skipped');
      return row;
    }
    row.date   = this.parseDate(rawDate);
    // Strip -EQ, -BE, exchange suffixes
    row.symbol = rawSymbol.toUpperCase().replace(/-(?:EQ|BE|N1|N2|SM)$/i, '').trim();
    row.qty    = parseFloat(qtyStr) || 0;
    row.price  = parseFloat(priceStr) || 0;

    return this.finalizeRow(row, stocks);
  }

  private mapGeneric(
    row: ImportRow, headers: string[], cells: string[], stocks: Stock[]
  ): ImportRow {
    // Generic: date, symbol, qty/quantity, price, charges (optional), type (optional)
    const get = (keys: string[]): string => {
      for (const key of keys) {
        const idx = headers.findIndex(h => h.includes(key));
        if (idx >= 0) return (cells[idx] ?? '').trim();
      }
      return '';
    };

    const rawDate   = get(['date', 'trade date', 'order date']);
    const rawSymbol = get(['symbol', 'stock', 'scrip', 'instrument']);
    const qtyStr    = get(['qty', 'quantity']);
    const priceStr  = get(['price', 'rate']);
    const chargesStr = get(['charges', 'brokerage', 'fees']);
    const typeStr   = (get(['type', 'trade type', 'buy/sell']) || 'BUY').toUpperCase();

    if (typeStr === 'S' || typeStr === 'SELL') {
      row.errors.push('Sell trades are skipped');
      return row;
    }
    if (typeStr === 'DIVIDEND' || typeStr === 'DIV') {
      row.type = 'DIVIDEND';
    }

    row.rawSymbol = rawSymbol;
    row.date    = this.parseDate(rawDate);
    row.symbol  = rawSymbol.toUpperCase().replace(/-EQ$/i, '').trim();
    row.qty     = parseFloat(qtyStr) || 0;
    row.price   = parseFloat(priceStr) || 0;
    row.charges = parseFloat(chargesStr) || 0;

    return this.finalizeRow(row, stocks);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private finalizeRow(row: ImportRow, stocks: Stock[]): ImportRow {
    // Validate required fields
    if (!row.date)    row.errors.push('Invalid or missing date');
    if (!row.symbol)  row.errors.push('Missing symbol');
    if (row.qty <= 0) row.errors.push('Quantity must be > 0');
    if (row.price <= 0) row.errors.push('Price must be > 0');

    // Resolve stockId from symbol
    if (row.symbol) {
      const stock = stocks.find(s => s.symbol.toUpperCase() === row.symbol);
      row.stockId = stock?.id ?? '';
      if (!row.stockId) {
        row.errors.push(`Symbol "${row.symbol}" not found in your portfolio`);
      }
    }

    row.valid = row.errors.length === 0;
    return row;
  }

  /**
   * Parse a date string in multiple Indian broker formats → YYYY-MM-DD.
   * Returns empty string if unparseable.
   */
  parseDate(raw: string): string {
    if (!raw) return '';
    const s = raw.trim();

    // Already ISO: 2026-03-15
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // DD-MM-YYYY or DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (dmy) {
      const [, d, m, y] = dmy;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // DD-Mon-YYYY or DD Mon YYYY (e.g. 15-Mar-2026, 15 Mar 2026)
    const dMonY = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})$/);
    if (dMonY) {
      const [, d, mon, y] = dMonY;
      const date = new Date(`${mon} ${d}, ${y}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Fallback: let Date parse it
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return '';
  }

  /** Try to guess symbol from Groww company name by taking first meaningful word */
  private guessSymbol(upperName: string): string {
    // Check if the first part of the name matches any key prefix in the map
    for (const [key, sym] of Object.entries(GROWW_NAME_MAP)) {
      if (upperName.startsWith(key.split(' ')[0])) return sym;
    }
    return '';
  }

  /**
   * Parse a single CSV line, respecting quoted fields.
   */
  parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  private emptyResult(broker: BrokerFormat, label: string, _reason: string): ParseResult {
    return { broker, brokerLabel: label, rows: [], totalRows: 0, validRows: 0, invalidRows: 0, unmappedSymbols: [] };
  }
}
