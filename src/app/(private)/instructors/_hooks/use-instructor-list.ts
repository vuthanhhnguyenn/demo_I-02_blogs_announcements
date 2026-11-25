'use client';

import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

export function useInstructorList() {
  const [params, setParams] = useQueryStates({
    tab: parseAsStringEnum(['studio', 'pt']).withDefault('studio'),
    search: parseAsString.withDefault(''),
    role: parseAsString.withDefault(''),
    brand: parseAsString.withDefault(''),
    status: parseAsString.withDefault(''),
    sort_by: parseAsString.withDefault('id'),
    sort_order: parseAsString.withDefault('asc'),
    page: parseAsInteger.withDefault(1),
  });

  const resetFilters = () => {
    void setParams({ search: '', role: '', brand: '', status: '', page: 1 });
  };

  return { params, setParams, resetFilters };
}
