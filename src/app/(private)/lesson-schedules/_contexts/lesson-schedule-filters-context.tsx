'use client';

import { type ReactNode, createContext, useContext } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';

import { UserRole } from '@/types/permission.type';

import { useLessonScheduleFilters } from '../_hooks/use-lesson-schedule-filters.hook';

type LessonScheduleFiltersContextValue = ReturnType<typeof useLessonScheduleFilters>;

const LessonScheduleFiltersContext = createContext<LessonScheduleFiltersContextValue | null>(null);

export function LessonScheduleFiltersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthUser();
  const value = useLessonScheduleFilters({ isTrainer: user?.role === UserRole.Trainer });
  return (
    <LessonScheduleFiltersContext.Provider value={value}>
      {children}
    </LessonScheduleFiltersContext.Provider>
  );
}

export function useLessonScheduleFiltersContext(): LessonScheduleFiltersContextValue {
  const ctx = useContext(LessonScheduleFiltersContext);
  if (!ctx) {
    throw new Error(
      'useLessonScheduleFiltersContext must be used inside LessonScheduleFiltersProvider',
    );
  }
  return ctx;
}
