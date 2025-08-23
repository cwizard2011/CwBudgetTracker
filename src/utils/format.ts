export function formatCurrency(amount: number, locale: string, currency: string): string {
  try {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' });
    const parts = formatter.formatToParts(amount || 0);
    const rendered = parts.map(p => {
      if (p.type === 'currency') {
        const symbolOnly = p.value.replace(/[A-Za-z]/g, '');
        return symbolOnly || p.value;
      }
      return p.value;
    }).join('');
    return rendered;
  } catch {
    const n = (amount || 0).toLocaleString(locale || undefined);
    const symbolMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', JPY: '¥' };
    const symbol = symbolMap[currency] || '';
    return symbol ? `${symbol}${n}` : `${n}`;
  }
}


