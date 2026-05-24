import { NextResponse } from 'next/server'

export function middleware(request) {
  const token = request.cookies.get('journals_token')
  const { pathname } = request.nextUrl

  const publicRoutes = ['/login']
  const isPublic = publicRoutes.some(r => pathname.startsWith(r))

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && isPublic) {
    return NextResponse.redirect(new URL('/trading/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
