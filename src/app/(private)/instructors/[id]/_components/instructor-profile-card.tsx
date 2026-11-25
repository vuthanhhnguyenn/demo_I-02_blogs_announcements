import { Card, CardContent } from '@/components/ui/card';

import type { TrainerDetailDto } from '@/lib/api-real/types.gen';

export function InstructorProfileCard({ instructor }: { instructor: TrainerDetailDto }) {
  return (
    <Card>
      <CardContent className="px-4">
        <h2 className="mb-3 text-sm font-bold">プロフィール</h2>
        <div className="space-y-3">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">プロフィール文</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {instructor.bio || <span className="text-muted-foreground">未設定</span>}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">指導歴</p>
            <p className="text-sm whitespace-pre-wrap">
              {instructor.careerHistory || <span className="text-muted-foreground">未設定</span>}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
