'use client';

import { type ReactNode, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useCurrentStoreBrand } from '@/hooks/use-current-store-brand.hook';

import { Loading } from '@/components/common/data-state-boundary/loading';

import { navigate } from '@/lib/routes/routes.util';

/**
 * G-02 FR-006: the set discount screens (G-02-02) are FIT365-only and are not shown in a
 * JOYFIT-family store context, so a store of any other brand is sent back to the option list.
 * "全店舗（本部）" has no single brand and stays allowed.
 */
export default function OptionDiscountLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { brand, isLoading } = useCurrentStoreBrand();
  const isBlocked = brand !== null && brand !== 'Fit365';

  useEffect(() => {
    if (isBlocked) router.replace(navigate('/options'));
  }, [isBlocked, router]);

  if (isLoading || isBlocked) return <Loading />;
  return children;
}
