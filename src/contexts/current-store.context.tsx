'use client';

import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

import Cookies from 'universal-cookie';

import type { CrmMeStoreDto, StoreSummaryDto } from '@/lib/api-real/types.gen';

import { CookieNames } from '@/types/global.enum';
import { type AuthUser, UserRole } from '@/types/permission.type';

import { useAuthUser } from './auth-user.context';

export const ALL_STORES = 'all';

/** One store row, in the shape of `GET /api/v1/admin/stores` (API-083) the pickers already read. */
type StoreItem = StoreSummaryDto;

/**
 * Lifts a `/crm/me` store onto the store-master row shape. Fields `/crm/me` does not carry stay
 * `null` — no consumer of `restrictedStores` reads them. A store whose directory lookup failed
 * (name / code / brand all `null`) cannot be shown, so it is left out.
 */
function toStoreItem(store: CrmMeStoreDto, user: AuthUser | null | undefined): StoreItem[] {
  if (store.storeName == null || store.storeCode == null || store.brandEnum == null) return [];
  return [
    {
      id: store.storeId,
      code: store.storeCode,
      clubCode: store.clubCode ?? '',
      name: store.storeName,
      brandEnum: store.brandEnum,
      prefecture: null,
      fcCompanyId: user?.fcCompanyId ?? null,
      fcCompanyName: null,
      territoryId: store.territoryId,
      territoryName: null,
      areaName: null,
      status: store.status ?? 'operating',
      createdAt: '',
    },
  ];
}

/**
 * Mirrors the server-side `getAllowedStoreIds()` unrestricted-role list (src/app/api/_lib/auth.ts).
 * Manager is intentionally excluded: B-01 権限マトリクスでは Manager は所轄店舗のみ (managed stores only),
 * so a Manager must not be able to pick "全店舗" / out-of-territory stores from the header switcher —
 * they browse their managed-store list instead (see `restrictedStores`).
 */
function canRoleSelectAllStores(role: UserRole | undefined): boolean {
  return role === UserRole.System || role === UserRole.Headquarter;
}

/**
 * API-083 lets only system / headquarter / manager / staff read the store master; Trainer and
 * Observer get 403. They have a single home store, named by `/crm/me` (API-069, BE !834).
 */
export function canRoleReadStoreMaster(role: UserRole | undefined): boolean {
  return role !== UserRole.Trainer && role !== UserRole.Observer;
}

interface CurrentStoreContextValue {
  /** "all" (全店舗/本部) or a specific store id. */
  currentStoreId: string;
  setCurrentStoreId: (id: string) => void;
  /** Populated for roles restricted to specific stores (Manager/Staff/Trainer/Observer): `/crm/me` `stores`, home store first. Empty for System/Headquarter. */
  restrictedStores: StoreItem[];
  canSelectAllStores: boolean;
  isLoading: boolean;
}

const CurrentStoreContext = createContext<CurrentStoreContextValue | null>(null);

interface CurrentStoreProviderProps {
  children: ReactNode;
  /** Cookie value read server-side (see `(private)/layout.tsx`), so the first client render already matches the server-rendered HTML instead of re-deriving it from `document.cookie`. */
  initialStoreId?: string;
}

/**
 * App-wide "which store am I working in" selector, backed by the header store switcher.
 * Persists to a cookie so the selection survives reloads/navigation without living in the URL.
 */
export function CurrentStoreProvider({ children, initialStoreId }: CurrentStoreProviderProps) {
  const { user, isLoading: userLoading } = useAuthUser();
  const canSelectAll = canRoleSelectAllStores(user?.role);

  // A restricted user's stores come straight from `/crm/me` (`stores`): the 所属店舗 plus, for
  // FC-company staff, every store of the company. No need to page the whole store master
  // (`GET /admin/stores`, not scoped to the caller) and filter it down any more.
  // System / headquarter browse the full catalog via search + infinite scroll instead
  // (see StoreSelector), so they carry no list here.
  const restrictedStores = useMemo<StoreItem[]>(
    () => (canSelectAll ? [] : (user?.stores ?? []).flatMap((store) => toStoreItem(store, user))),
    [canSelectAll, user],
  );

  const [storedStoreId, setStoredStoreId] = useState<string>(initialStoreId ?? ALL_STORES);

  // `/crm/me` names the caller's home store directly (scope pattern A), so a
  // store-scoped user's effective store is known before the store list arrives.
  const homeStoreId = user?.storeId ?? null;

  const setCurrentStoreId = useCallback((id: string) => {
    setStoredStoreId(id);
    new Cookies().set(CookieNames.CurrentStore, id, { path: '/' });
  }, []);

  // Roles restricted to a single store can't select "all" — derive their effective store
  // from the accessible list during render instead of syncing it back via an effect.
  const currentStoreId = useMemo(() => {
    if (canSelectAll) return storedStoreId;
    if (restrictedStores.length === 0) {
      // No list: fall back to the home store from /crm/me rather than leaving
      // a scoped user on "全店舗", which they are not allowed to see.
      return homeStoreId ?? storedStoreId;
    }
    const stillValid = restrictedStores.some((store) => store.id === storedStoreId);
    return stillValid && storedStoreId !== ALL_STORES ? storedStoreId : restrictedStores[0]!.id;
  }, [canSelectAll, restrictedStores, storedStoreId, homeStoreId]);

  const value = useMemo<CurrentStoreContextValue>(
    () => ({
      currentStoreId,
      setCurrentStoreId,
      restrictedStores,
      canSelectAllStores: canSelectAll,
      isLoading: userLoading,
    }),
    [currentStoreId, setCurrentStoreId, restrictedStores, canSelectAll, userLoading],
  );

  return <CurrentStoreContext.Provider value={value}>{children}</CurrentStoreContext.Provider>;
}

export function useCurrentStore() {
  const ctx = useContext(CurrentStoreContext);
  if (!ctx) throw new Error('useCurrentStore must be used within <CurrentStoreProvider>');
  return ctx;
}
