import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Public routes that don't require auth
  const publicPaths = ['/login', '/signup', '/auth/callback', '/api/', '/privacy', '/support'];
  const isPublic = publicPaths.some(p => path.startsWith(p));

  // Redirect unauthenticated users to login (except public pages)
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && path === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/browse';
    return NextResponse.redirect(url);
  }

  // Role-based access control
  if (user && (path.startsWith('/admin') || path.startsWith('/upload'))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (path.startsWith('/admin') && profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/browse';
      return NextResponse.redirect(url);
    }

    if (path.startsWith('/upload') && (!profile || !['producer', 'admin'].includes(profile.role))) {
      const url = request.nextUrl.clone();
      url.pathname = '/browse';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
