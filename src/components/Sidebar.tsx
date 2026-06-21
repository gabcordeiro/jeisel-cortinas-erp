"use client";

import { useState, useEffect } from "react";
import Link from "next/link"; // Tem que ser de "next/link"
import { usePathname, useRouter } from "next/navigation";
import {
  Calculator,
  ListBullets,
  ChartBar,
  SignOut,
  CaretLeft,
  CaretRight,
  UsersThree,
  UserCircle,
  CurrencyDollar,
  Rows
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState("USER");

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        setUserEmail(user.email || "");
        setRole(user.user_metadata?.role || "USER");
      }
    };
    getSession();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login"; // Uso bruto para limpar cache
  };
  if (pathname === '/login') return null;
  return (
    <aside className={`${isCollapsed ? "w-20" : "w-64"} bg-[#0F172A] text-white transition-all duration-300 relative flex flex-col h-screen shadow-2xl z-40`}>
      {/* Botão de Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-12 bg-blue-600 p-1 rounded-full border-2 border-[#0F172A] hover:bg-blue-500 transition-transform active:scale-90"
      >
        {isCollapsed ? <CaretRight size={14} weight="bold" /> : <CaretLeft size={14} weight="bold" />}
      </button>

{/* Logo Area com Imagens */}
      <div className={`px-4 py-8 flex items-center transition-all duration-300 ${isCollapsed ? "justify-center" : "justify-start px-6"}`}>
        {isCollapsed ? (
          <img 
            src="/icon.png" // Nome da sua imagem para quando estiver fechado
            alt="JC Icon"
            className="w-10 h-10 object-contain animate-in fade-in zoom-in duration-500"
          />
        ) : (
          <img 
            src="/banner.png" // Nome da sua imagem para quando estiver aberto
            alt="JC Cortinas"
            className="h-12 w-auto object-contain animate-in fade-in slide-in-from-left-5 duration-500"
          />
        )}
      </div>

      {/* Menu Principal */}
      <nav className="flex-1 flex flex-col gap-1 px-3">
        <SidebarLink href="/" icon={Calculator} label="Orçamentos" active={pathname === "/"} collapsed={isCollapsed} />
        <SidebarLink href="/persianas" icon={Rows} label="Persianas" active={pathname === "/persianas"} collapsed={isCollapsed} />
        <SidebarLink href="/historico" icon={ListBullets} label="Histórico" active={pathname === "/historico"} collapsed={isCollapsed} />
        
        {(role === "ADMIN" || role === "RH") && (
          <SidebarLink href="/bi" icon={ChartBar} label="Dashboard BI" active={pathname === "/bi"} collapsed={isCollapsed} />
        )}
        
        {role === "ADMIN" && (
          <SidebarLink href="/usuarios" icon={UsersThree} label="Gerenciar Equipe" active={pathname === "/usuarios"} collapsed={isCollapsed} />
        )}
        {/* Dentro do nav da Sidebar */}
        {role === "ADMIN" && (
          <SidebarLink 
            href="/precos" 
            icon={CurrencyDollar} 
            label="Gestor de Preços" 
            active={pathname === "/precos"} 
            collapsed={isCollapsed} 
          />
        )}
      </nav>

      {/* Perfil e Sair */}
      <div className="p-4 border-t border-white/5 space-y-2">
        {!isCollapsed && (
          <div className="flex items-center gap-3 px-3 py-2 text-xs text-gray-400">
            <UserCircle size={20} />
            <span className="truncate">{userEmail}</span>
          </div>
        )}
        <button 
          onClick={handleLogout}
          className={`w-full flex items-center gap-4 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
            isCollapsed ? "justify-center text-red-400" : "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          }`}
        >
          <SignOut size={24} weight="bold" />
          {!isCollapsed && <span>Sair do Sistema</span>}
        </button>
      </div>
    </aside>
  );
}

// Subcomponente de Link para organização
function SidebarLink({ href, icon: Icon, label, active, collapsed }: any) {
  return (
    <Link 
      href={href} 
      className={`px-4 py-3.5 flex items-center gap-4 rounded-xl transition-all duration-200 group ${
        active 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
          : "text-gray-400 hover:bg-white/5 hover:text-white"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <Icon size={24} weight={active ? "fill" : "regular"} />
      {!collapsed && <span className="font-semibold">{label}</span>}
      {collapsed && !active && (
        <div className="absolute left-20 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {label}
        </div>
      )}
    </Link>
  );
}