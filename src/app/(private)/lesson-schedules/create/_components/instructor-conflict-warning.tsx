'use client';

import { AlertTriangle } from 'lucide-react';

/** One banner however many of the picked trainers' schedules overlap the new slot (D-01 No3). */
export function InstructorConflictWarning() {
  return (
    <div className="border-warning/30 bg-warning/10 mt-2 flex items-start gap-2 rounded-md border px-3 py-2">
      <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
      <p className="text-warning text-xs">この時間帯にすでに枠があります</p>
    </div>
  );
}
