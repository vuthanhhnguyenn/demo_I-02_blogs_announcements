'use client';

import { useState } from 'react';

/**
 * The latest defined `value`, or the last one seen while it is `undefined`.
 *
 * A failed page fetch leaves the list query with no data, so a pagination footer built from it
 * would vanish together with the way back to a page that loaded. Feeding the footer the last
 * known pagination keeps it usable next to the error's retry.
 */
export function useLastDefined<T>(value: T | undefined): T | undefined {
  const [last, setLast] = useState(value);
  if (value !== undefined && value !== last) setLast(value);
  return value ?? last;
}
