import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "SistemaPJ — Mesa de Ayuda & Inventario IT",
  description: "Sistema de gestión de tickets, inventario y contratos para el Poder Judicial",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
            },
            classNames: {
              toast: "!bg-card !border-border !text-foreground",
              title: "!text-foreground",
              description: "!text-muted-foreground",
              success: "!border-success/30",
              error: "!border-danger/30",
              warning: "!border-warning/30",
            },
          }}
        />
      </body>
    </html>
  );
}
