export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCurrencyDetailed(value) {
  if (value == null || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatPercent(value) {
  if (value == null || isNaN(value)) return '0%';
  return `${Number(value).toFixed(1)}%`;
}

export function formatNumber(value) {
  if (value == null || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatMultiple(value) {
  if (value == null || isNaN(value)) return '0.0x';
  return `${Number(value).toFixed(2)}x`;
}
