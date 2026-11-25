const CIRCLED_NUMERALS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'] as const;

export function toCircledNumeral(value: number): string {
  return CIRCLED_NUMERALS[value - 1] ?? `${value}`;
}

export function formatYen(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`;
}
