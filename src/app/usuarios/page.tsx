"use client";

import { useState, useEffect, useMemo } from "react";
import { UserPlus, ShieldCheck, UserGear, Eye, Trash, CheckCircle, Warning, X, Key } from "@phosphor-icons/react";

export default function GerenciarUsuarios() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(false);

  // Estados para Lista de Usuários
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserDeleteModalOpen, setIsUserDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Estados para Redefinir Senha
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<{ id: string; email: string } | null>(null);
  const [novaSenhaAdmin, setNovaSenhaAdmin] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // NOVO: Estado para o Modal Bonito de Feedback (Substitui o alert)
  const [feedback, setFeedback] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "created_at",
    direction: "desc",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (error) {
      console.error(error);
    }
    setUsersLoading(false);
  }

  const usersProcessados = useMemo(() => {
    let result = users.filter((u) => u.email?.toLowerCase().includes(userSearch.toLowerCase()));
    result.sort((a, b) => {
      const v1 = a[sortConfig.key];
      const v2 = b[sortConfig.key];
      if (v1 < v2) return sortConfig.direction === "asc" ? -1 : 1;
      if (v1 > v2) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [userSearch, users, sortConfig]);

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch('/api/usuarios', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userToDelete })
      });
      
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete));
        setIsUserDeleteModalOpen(false);
        setFeedback({ isOpen: true, type: 'success', title: 'Usuário Excluído', message: 'O acesso deste usuário foi revogado com sucesso.' });
      } else {
        const err = await res.json();
        setFeedback({ isOpen: true, type: 'error', title: 'Erro ao Excluir', message: err.error });
      }
    } catch (error) {
      setFeedback({ isOpen: true, type: 'error', title: 'Erro de Conexão', message: 'Não foi possível se comunicar com o servidor.' });
    }
  };

  const executeResetPassword = async () => {
    if (!userToReset) return;
    if (novaSenhaAdmin.length < 6) {
      setFeedback({ isOpen: true, type: 'error', title: 'Senha Curta', message: 'A senha precisa ter no mínimo 6 caracteres.' });
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userToReset.id, password: novaSenhaAdmin })
      });

      if (res.ok) {
        setIsResetPasswordModalOpen(false);
        setNovaSenhaAdmin("");
        setFeedback({ isOpen: true, type: 'success', title: 'Senha Redefinida', message: `A senha de ${userToReset.email} foi alterada com sucesso.` });
        setUserToReset(null);
      } else {
        const err = await res.json();
        setFeedback({ isOpen: true, type: 'error', title: 'Erro ao Redefinir', message: err.error });
      }
    } catch (error) {
      setFeedback({ isOpen: true, type: 'error', title: 'Erro de Conexão', message: 'Não foi possível se comunicar com o servidor.' });
    }
    setResetLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      if (!res.ok) {
        const err = await res.json();
        setFeedback({ isOpen: true, type: 'error', title: 'Erro no Cadastro', message: err.error });
      } else {
        setFeedback({ isOpen: true, type: 'success', title: 'Cadastro Realizado!', message: `O funcionário ${email} agora tem acesso como ${role}.` });
        setEmail("");
        setPassword("");
        fetchUsers();
      }
    } catch (error) {
      setFeedback({ isOpen: true, type: 'error', title: 'Erro de Conexão', message: 'Verifique sua internet ou tente novamente.' });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg">
          <UserGear size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Controle de Acesso</h1>
          <p className="text-gray-500 text-sm">Gerencie a equipe da JC Cortinas.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-8">
        {/* Formulário de Cadastro */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-gray-700 text-lg">
            <UserPlus size={24} className="text-blue-600" /> Novo Cadastro
          </h3>
          <form onSubmit={handleCreateUser} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail Corporativo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-bold"
                placeholder="exemplo@jeisel.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Senha Provisória</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-bold"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nível de Permissão</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-blue-600 font-bold text-gray-700 cursor-pointer"
              >
                <option value="USER">Vendedor (Básico)</option>
                <option value="RH">Gestor (Acesso ao BI)</option>
                <option value="ADMIN">Administrador (Total)</option>
              </select>
            </div>

            <button
              disabled={loading}
              className="w-full mt-4 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:bg-gray-300 disabled:shadow-none"
            >
              {loading ? "Processando..." : "Finalizar Cadastro"}
            </button>
          </form>
        </div>

        {/* Guia de Permissões */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-center">
          <ShieldCheck size={180} className="absolute -right-10 -bottom-10 opacity-10" />
          <h4 className="font-black text-2xl mb-8 flex items-center gap-2 tracking-tight">Níveis de Segurança</h4>
          <div className="space-y-4 relative z-10">
            <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/5 hover:bg-white/20 transition-colors">
              <p className="font-black text-blue-200 text-[10px] uppercase tracking-widest mb-1">Vendedor</p>
              <p className="text-sm font-medium">Faz orçamentos e visualiza apenas o próprio histórico de vendas.</p>
            </div>
            <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/5 hover:bg-white/20 transition-colors">
              <p className="font-black text-amber-300 text-[10px] uppercase tracking-widest mb-1">Gestor (RH)</p>
              <p className="text-sm font-medium">Acesso liberado ao Dashboard BI para análise de faturamento global.</p>
            </div>
            <div className="bg-white/20 p-5 rounded-2xl backdrop-blur-md border border-white/40 shadow-lg">
              <p className="font-black text-emerald-300 text-[10px] uppercase tracking-widest mb-1">Administrador</p>
              <p className="text-sm font-medium">Mestre do sistema. Altera preços, gerencia a equipe e exclui registros.</p>
            </div>
          </div>
        </div>
      </div>

      {/* LISTA DE USUÁRIOS */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-xl font-black text-gray-800 tracking-tight">Equipe Cadastrada</h2>
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Pesquisar por e-mail..."
              className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
        </div>

        {usersLoading ? (
          <div className="p-10 text-center text-gray-400 font-bold animate-pulse">Sincronizando equipe...</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-50">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                <tr>
                  <th className="p-5">E-mail</th>
                  <th className="p-5">Permissão</th>
                  <th className="p-5">Data de Entrada</th>
                  <th className="p-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usersProcessados.map((u) => (
                  <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-5 font-bold text-gray-800">{u.email}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                        ${u.user_metadata?.role === 'ADMIN' ? 'bg-emerald-100 text-emerald-700' : 
                          u.user_metadata?.role === 'RH' ? 'bg-amber-100 text-amber-700' : 
                          'bg-blue-100 text-blue-700'}`}>
                        {u.user_metadata?.role || "USER"}
                      </span>
                    </td>
                    <td className="p-5 text-xs font-bold text-gray-400">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="p-5">
                      <div className="flex justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setSelectedUser(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Eye size={20} weight="bold"/></button>
                        <button onClick={() => { setUserToReset({ id: u.id, email: u.email }); setNovaSenhaAdmin(""); setIsResetPasswordModalOpen(true); }} title="Redefinir senha" className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"><Key size={20} weight="bold"/></button>
                        <button onClick={() => { setUserToDelete(u.id); setIsUserDeleteModalOpen(true); }} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"><Trash size={20} weight="bold"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {usersProcessados.length === 0 && (
                  <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic font-medium">Nenhum funcionário encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL DETALHES DE USUÁRIO --- */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
              <h2 className="text-xl font-black flex items-center gap-2"><Eye size={24} weight="bold"/> Ficha do Usuário</h2>
              <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-white/20 rounded-full transition"><X size={20} weight="bold"/></button>
            </div>
            <div className="p-8 space-y-5">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-1">E-mail Corporativo</p>
                <p className="text-gray-800 font-bold">{selectedUser.email}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-1">Nível de Acesso</p>
                <p className="text-blue-600 font-black uppercase">{selectedUser.user_metadata?.role || "USER"}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-1">Cadastrado em</p>
                <p className="text-gray-800 font-bold">{new Date(selectedUser.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL REDEFINIR SENHA --- */}
      {isResetPasswordModalOpen && userToReset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-amber-500 text-white flex justify-between items-center">
              <h2 className="text-xl font-black flex items-center gap-2"><Key size={24} weight="bold"/> Redefinir Senha</h2>
              <button onClick={() => setIsResetPasswordModalOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition"><X size={20} weight="bold"/></button>
            </div>
            <div className="p-8 space-y-5">
              <p className="text-sm text-gray-500">
                Defina uma senha nova para <strong className="text-gray-800">{userToReset.email}</strong>. Avise o funcionário sobre a nova senha por fora do sistema.
              </p>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Senha Nova</label>
                <input
                  type="password"
                  autoFocus
                  value={novaSenhaAdmin}
                  onChange={(e) => setNovaSenhaAdmin(e.target.value)}
                  className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all font-bold"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsResetPasswordModalOpen(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-black hover:bg-gray-200 transition">Cancelar</button>
                <button disabled={resetLoading} onClick={executeResetPassword} className="flex-1 py-3.5 bg-amber-500 text-white rounded-xl font-black hover:bg-amber-600 shadow-lg shadow-amber-200 transition disabled:bg-gray-300 disabled:shadow-none">
                  {resetLoading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DELETAR USUÁRIO --- */}
      {isUserDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-xs w-full text-center space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
              <ShieldCheck size={40} weight="duotone" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Revogar Acesso?</h2>
            <p className="text-sm font-medium text-gray-500">
              O usuário perderá o acesso ao sistema da JC Cortinas imediatamente.
            </p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsUserDeleteModalOpen(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-black hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={executeDeleteUser} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-black hover:bg-red-600 shadow-lg shadow-red-200 transition">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE FEEDBACK (O SUCESSO/ERRO BONITÃO) --- */}
      {feedback.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-5 animate-in zoom-in duration-200 border border-gray-50">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
              {feedback.type === 'success' ? <CheckCircle size={40} weight="duotone" /> : <Warning size={40} weight="duotone" />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">{feedback.title}</h2>
              <p className="text-gray-500 font-medium mt-2">{feedback.message}</p>
            </div>
            <button 
              onClick={() => setFeedback({ ...feedback, isOpen: false })} 
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg ${
                feedback.type === 'success' ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200' : 'bg-red-500 text-white hover:bg-red-600 shadow-red-200'
              }`}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}