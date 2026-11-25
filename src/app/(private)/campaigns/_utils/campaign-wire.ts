/**
 * Nullable enums (`planDiscountType`, `enrollmentFeeDiscountType`) are typed without `null` by the
 * generator although Swagger marks them `nullable: true` and the server accepts `null` to clear them.
 */
export const asNullableEnum = <T extends string>(value: T | null): T | undefined =>
  value as T | undefined;
