import { DialogTable } from '../components/dialog/dialog.service';

export interface BuyExecuteLine {
  symbol: string;
  targetQty?: number | null;
  plannedPrice?: number | null;
}

export function buildBuyExecuteTable(
  items: BuyExecuteLine[],
  labels: { stock: string; qty: string; price: string; amount: string; total: string },
  formatMoney: (value: number) => string
): DialogTable {
  const rows = items.map((item) => {
    const qty = item.targetQty ?? 0;
    const price = item.plannedPrice ?? 0;
    return {
      stock: item.symbol,
      qty: String(qty),
      price: formatMoney(price),
      amount: formatMoney(qty * price),
    };
  });
  const totalQty = items.reduce((sum, item) => sum + (item.targetQty ?? 0), 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.targetQty ?? 0) * (item.plannedPrice ?? 0),
    0
  );
  return {
    columns: [
      { key: 'stock', label: labels.stock },
      { key: 'qty', label: labels.qty, align: 'right' },
      { key: 'price', label: labels.price, align: 'right' },
      { key: 'amount', label: labels.amount, align: 'right' },
    ],
    rows,
    footer: {
      stock: labels.total,
      qty: String(totalQty),
      price: '',
      amount: formatMoney(totalAmount),
    },
  };
}
