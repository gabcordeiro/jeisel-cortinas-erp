import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// IMPORTANTE: Importe o seu novo guardião e a Sidebar aqui
import RouteGuard from "@/components/RouteGuard";
import Sidebar from "@/components/Sidebar";
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JC Cortinas - Sistema",
  description: "Gestão inteligente de orçamentos e vendas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50 text-gray-900 flex h-screen overflow-hidden`}>
        {/* O Guardião abraça toda a aplicação */}
        <RouteGuard>
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
        </RouteGuard>
        <Analytics />
      </body>
    </html>
  );
}