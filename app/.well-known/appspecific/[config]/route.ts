import { NextResponse } from 'next/server';

// Chrome DevTools solicita /.well-known/appspecific/com.chrome.devtools.json
// Responder con 200 evita el 404 en consola.
export function GET() {
  return NextResponse.json({});
}
