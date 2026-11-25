import { NextRequest, NextResponse } from 'next/server';

import { buildLoginUrl } from './lib/auth/login-url.util';
import { routes } from './lib/routes/routes.config';
import { RouteConfig } from './lib/routes/routes.type';
import { navigate } from './lib/routes/routes.util';
import { CookieNames } from './types/global.enum';
import { isPhase2Route } from './utils/phase.util';

/**
 * Edge routing guard.
 *
 * Scope note — this used to also enforce the page-level permission check by
 * decoding the role out of the session JWT. It no longer does, on purpose:
 * `GET /crm/me` states that the position permission flags "are deliberately not
 * JWT claims", so the token cannot answer whether a given staff member may open
 * a given page. Deciding it here from the role alone would contradict the real
 * gate (`PagePermissionGuard`, which evaluates role tier AND position flags) and
 * would send users to /403 for pages their 職位 does allow — or, worse, wave
 * through pages it does not.
 *
 * So this layer answers only what a cookie can answer:
 *   - private page without a session  → /login?redirect=…
 *   - public-only page with a session → /
 *
 * Page-level authorization lives in `PagePermissionGuard` (client, after /crm/me
 * resolves) and is enforced for real by the backend on every request.
 */

// Convert a route pattern (e.g. `/members/:id`) into a RegExp.
function patternToRegExp(pattern: string): RegExp {
  const source = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\/:[^/]+/g, '/[^/]+');
  return new RegExp(`^${source}/?$`);
}

const routerPatterns = Object.values(routes)
  .map((router: RouteConfig) => ({
    private: router.private,
    pattern: patternToRegExp(router.pattern),
    routePattern: router.pattern,
  }))
  // Sort so that static segments (no `:param`) are matched before parameterised ones.
  // This prevents /members/blacklist from being swallowed by /members/:id.
  .sort((a, b) => {
    const aParams = (a.routePattern.match(/:/g) ?? []).length;
    const bParams = (b.routePattern.match(/:/g) ?? []).length;
    return aParams - bParams;
  });

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const router = routerPatterns.find((r) => r.pattern.test(pathname));
  if (!router) return NextResponse.next();

  const session = request.cookies.get(CookieNames.Session)?.value;

  // Redirect unauthenticated users away from private pages
  if (router.private && !session) {
    // セッション Cookie 自体が無い状態。期限切れで消えた場合も未ログインの場合も
    // 区別できないため、断定しない文言 (`login-required`) を使う。
    const loginUrl = buildLoginUrl({
      redirectTo: request.nextUrl.href,
      variant: 'login-required',
    });
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  // Phase 2 screens are not released yet (scope 2026-10-23)
  if (isPhase2Route(pathname)) {
    return NextResponse.redirect(new URL(navigate('/todo'), request.url));
  }

  // Redirect authenticated users away from public-only pages (e.g. /login)
  if (router.private === false && session) {
    return NextResponse.redirect(new URL(navigate('/'), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|svg).*)'],
};
