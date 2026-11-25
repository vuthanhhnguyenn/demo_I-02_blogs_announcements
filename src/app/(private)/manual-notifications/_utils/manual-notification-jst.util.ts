const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** End of the selected calendar day in JST, independent of the browser timezone. */
export function endOfJstDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate() + 1) - JST_OFFSET_MS - 1,
  );
}

/** Calendar day in JST, represented with local Date fields for the date picker. */
export function toJstCalendarDate(instant: Date): Date {
  const jst = new Date(instant.getTime() + JST_OFFSET_MS);
  return new Date(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
}
