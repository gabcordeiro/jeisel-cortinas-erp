"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShieldWarning } from "@phosphor-icons/react";

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isPublicPage = pathname === '/login' || pathname === '/redefinir-senha';

      // 1. Não está logado e não está numa tela pública? Rua.
      if (!session && !isPublicPage) {
        router.push('/login');
        return;
      }

      // 2. Já está logado e tentou acessar a tela de login? Manda pro Início.
      // (redefinir-senha fica de fora: quem clicou no link pode já ter uma sessão temporária)
      if (session && pathname === '/login') {
        router.push('/');
        return;
      }

      // 3. O Leão de Chácara (Verificação de Permissões)
      if (session) {
        const role = session.user.user_metadata?.role || 'USER';

        const rotasAdmin = ['/usuarios', '/precos'];
        const rotasGestao = ['/bi']; // Admin e RH acessam

        // Bloqueia vendedor de entrar na área de Admin
        if (rotasAdmin.includes(pathname) && role !== 'ADMIN') {
          setBloqueado(true);
          setTimeout(() => router.push('/'), 2500); // Mostra aviso e expulsa em 2.5s
          return;
        }

        // Bloqueia vendedor de entrar no BI
        if (rotasGestao.includes(pathname) && role === 'USER') {
          setBloqueado(true);
          setTimeout(() => router.push('/'), 2500);
          return;
        }
      }

      setAuthorized(true);
    };

    checkAuth();
  }, [pathname, router]);

  // Tela de "Acesso Negado" caso ele tente dar um espertinho pela URL
  if (bloqueado) {
    return (
      <div className="h-screen w-full bg-[#0F172A] flex flex-col items-center justify-center text-white space-y-4 z-[100] absolute inset-0">
        <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center animate-pulse">
          <ShieldWarning size={48} weight="duotone" />
        </div>
        <h1 className="text-3xl font-black tracking-widest text-red-500 uppercase">Acesso Restrito</h1>
        <p className="text-gray-400 font-medium">Você não tem nível de segurança para acessar esta área.</p>
        <p className="text-sm text-gray-500 animate-bounce mt-4">Redirecionando de volta ao início...</p>
      </div>
    );
  }

  // Enquanto verifica no banco, não renderiza a tela protegida (evita o piscar da tela proibida)
  if (!authorized && pathname !== '/login') {
    return <div className="h-screen w-full bg-[#0F172A] flex items-center justify-center text-blue-500 font-bold tracking-widest uppercase">Verificando Credenciais...</div>;
  }

  return <>{children}</>;
}