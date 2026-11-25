import Link from 'next/link';

import { CheckCircle } from 'lucide-react';

import { AuthShell } from '@/components/common/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { navigate } from '@/lib/routes/routes.util';

export default function Page() {
  return (
    <AuthShell>
      <Card className="w-100">
        <CardHeader className="text-center">
          <div className="flex justify-center">
            <div className="bg-success/10 flex size-16 items-center justify-center rounded-full">
              <CheckCircle className="text-success size-8" />
            </div>
          </div>
          <CardTitle className="mt-3 text-lg">初回ログインが完了しました</CardTitle>
          <CardDescription>JOYFIT CRM をご利用いただけます</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Button
            className="w-full"
            size="lg"
            nativeButton={false}
            render={<Link href={navigate('/')}>ダッシュボードへ進む</Link>}
          />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
