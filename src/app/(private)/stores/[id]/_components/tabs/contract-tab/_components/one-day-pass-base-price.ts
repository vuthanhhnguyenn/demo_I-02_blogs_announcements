export type OneDayPassBasePrice = {
  /** The price every day without its own price sells at, or `null` while the store has none */
  price: number | null;
  /** `store` when the store has its own default; `null` when it is unset */
  source: 'store' | null;
};

/**
 * The 1DayPass 基準価格 (Y-02 FR-050a): the store's own default.
 *
 * FR-050a also wants a fallback to the 1Day利用 plan master price when the store has none, but no
 * endpoint exposes that price: the one-day-pass-price response carries only the store default, and
 * the store-plans list has no field that identifies the 1Day利用 master (picking a `oneDay`
 * contract type surfaced an unrelated plan's price). Until the BE returns it, an unset default
 * stays 未設定 rather than showing a guessed price (BUG-U6-02 → BE-API).
 *
 * @param storeDefault the response's `default.price`; `undefined` while that response is pending
 */
export function getOneDayPassBasePrice(
  storeDefault: number | null | undefined,
): OneDayPassBasePrice {
  return typeof storeDefault === 'number'
    ? { price: storeDefault, source: 'store' }
    : { price: null, source: null };
}
