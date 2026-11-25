/**
 * Tax price conversion for option and plan masters: the tax-exclusive price is the source of
 * truth.
 */

/** taxInclusive = floor(taxExclusive × (1 + taxRate/100)) */
export function toTaxIncludedPrice(priceExcludingTax: number, taxRate: number): number {
  return Math.floor(priceExcludingTax * (1 + taxRate / 100));
}

/** Reverse direction rounds UP: taxExclusive = ceil(taxInclusive / (1 + taxRate/100)) */
export function toTaxExcludedPrice(priceIncludingTax: number, taxRate: number): number {
  return Math.ceil(priceIncludingTax / (1 + taxRate / 100));
}

/** `toTaxIncludedPrice` for an optional amount: a blank (`null` / `undefined`) stays blank. */
export function toTaxIncludedPriceOrNull(
  priceExcludingTax: number | null | undefined,
  taxRate: number,
): number | null {
  return priceExcludingTax == null ? null : toTaxIncludedPrice(priceExcludingTax, taxRate);
}

/** `toTaxExcludedPrice` for an optional amount: a blank (`null` / `undefined`) stays blank. */
export function toTaxExcludedPriceOrNull(
  priceIncludingTax: number | null | undefined,
  taxRate: number,
): number | null | undefined {
  return priceIncludingTax == null
    ? priceIncludingTax
    : toTaxExcludedPrice(priceIncludingTax, taxRate);
}
