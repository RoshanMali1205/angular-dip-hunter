import { buildBuyExecuteTable } from './buy-execute-table';

describe('buildBuyExecuteTable', () => {
  it('builds ranked rows plus a totals footer', () => {
    const table = buildBuyExecuteTable(
      [
        { symbol: 'HDFCBANK', targetQty: 11, plannedPrice: 725.4 },
        { symbol: 'ITC', targetQty: 30, plannedPrice: 271.6 },
      ],
      { stock: 'Stock', qty: 'Qty', price: 'Price', amount: 'Amount', total: 'Total' },
      (value) => `₹${value.toFixed(2)}`
    );

    expect(table.columns.map((c) => c.key)).toEqual(['stock', 'qty', 'price', 'amount']);
    expect(table.rows).toEqual([
      { stock: 'HDFCBANK', qty: '11', price: '₹725.40', amount: '₹7979.40' },
      { stock: 'ITC', qty: '30', price: '₹271.60', amount: '₹8148.00' },
    ]);
    expect(table.footer).toEqual({
      stock: 'Total',
      qty: '41',
      price: '',
      amount: '₹16127.40',
    });
  });
});
