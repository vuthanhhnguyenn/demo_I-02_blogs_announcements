import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 姓 名 joined with a space; empty when neither part is present. */
export function formatFullName(
  lastName: string | null | undefined,
  firstName: string | null | undefined,
): string {
  return [lastName, firstName].filter(Boolean).join(' ');
}
