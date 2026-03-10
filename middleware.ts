import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas: siempre accesibles
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // La autenticación real la maneja el cliente con Zustand + localStorage.
  // Aquí solo redirigimos si no hay cookie de token (opcional, para SSR).
  // En producción, si usás httpOnly cookies, acá verificarías el token.

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};

