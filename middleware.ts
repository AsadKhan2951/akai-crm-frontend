import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);
const PROTECTED_PATH = /^\/(en|ur)\/(admin|sales|vendor)(\/|$)/;

/** Locale routing plus Supabase session refresh, so expired access tokens are renewed and saved as cookies. */
export default async function middleware(request: NextRequest) {
  const hasSession = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
  const protectedMatch = PROTECTED_PATH.exec(request.nextUrl.pathname);
  if (protectedMatch && !hasSession) {
    // Signed-out users never render portal pages; send them to login and come back afterwards.
    const login = new URL(`/${protectedMatch[1]}/auth/login`, request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  const response = handleI18nRouting(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !hasSession) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"]
};
