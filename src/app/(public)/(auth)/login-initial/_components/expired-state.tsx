import { AlertCircle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Reached whenever the invite token is missing, invalid, expired, revoked, or already
 * used — all four causes render this same message, no form, no retry action.
 */
export function ExpiredState() {
  return (
    <Card className="w-100">
      <CardHeader className="text-center">
        <div className="flex justify-center">
          <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-full">
            <AlertCircle className="text-destructive size-8" />
          </div>
        </div>
        <CardTitle className="mt-3 text-lg">招待リンクの有効期限が切れています</CardTitle>
        <CardDescription className="mt-4 text-sm">
          本部管理者に再度招待をご依頼ください
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
