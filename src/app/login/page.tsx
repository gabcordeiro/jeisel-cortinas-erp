"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SignIn, Lock, Envelope, CheckCircle, Warning } from "@phosphor-icons/react";

// --- COMPONENTE PARA LER O ERRO DA URL ---
function MensagemErroSessao() {
  const searchParams = useSearchParams();
  const erroSessao = searchParams.get('erro');

  if (erroSessao === 'sessao_expirada') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl mb-6 text-sm text-center font-medium animate-in fade-in zoom-in duration-300 shadow-sm">
        Sua sessão expirou ou você não possui acesso. Por favor, faça o login novamente.
      </div>
    );
  }
  return null;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [feedback, setFeedback] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const msg = error.message || '';
      let title = 'Acesso Negado';
      let mensagem = 'E-mail ou senha incorretos. Verifique e tente novamente.';

      if (error.status === 429 || /rate limit|too many/i.test(msg)) {
        title = 'Muitas Tentativas';
        mensagem = 'Foram feitas várias tentativas seguidas. Aguarde alguns minutos antes de tentar novamente.';
      } else if (/email not confirmed/i.test(msg)) {
        title = 'E-mail Não Confirmado';
        mensagem = 'Este e-mail ainda não foi confirmado. Fale com o administrador do sistema.';
      } else if (/failed to fetch|network/i.test(msg)) {
        title = 'Sem Conexão';
        mensagem = 'Não foi possível falar com o servidor. Verifique sua internet e tente novamente.';
      }

      setFeedback({ isOpen: true, type: 'error', title, message: mensagem });
      setLoading(false);
      return;
    }

    if (data.session) {
      setFeedback({ 
        isOpen: true, 
        type: 'success', 
        title: 'Acesso Liberado!', 
        message: 'Preparando seu ambiente de trabalho...' 
      });
      
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
  };

  // --- FUNÇÃO: RECUPERAR SENHA ---
  const handleResetPassword = async () => {
    if (!email) {
      setFeedback({ 
        isOpen: true, 
        type: 'error', 
        title: 'E-mail Necessário', 
        message: 'Por favor, digite seu e-mail no campo acima antes de clicar em recuperar senha.' 
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`, // Leva à tela de definir a nova senha
    });

    if (error) {
      setFeedback({ 
        isOpen: true, 
        type: 'error', 
        title: 'Erro ao Enviar', 
        message: error.message 
      });
    } else {
      setFeedback({ 
        isOpen: true, 
        type: 'success', 
        title: 'E-mail Enviado!', 
        message: 'Verifique sua caixa de entrada (e o spam) para redefinir sua senha.' 
      });
    }
    setLoading(false);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-gray-200 p-4 z-50 overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/50 w-full max-w-md z-10 animate-in zoom-in duration-500">
<div className="text-center mb-8 flex flex-col items-center">
          {/* Efeito de Borda Gradiente com Transparência */}
          <div className="relative p-[3px] rounded-2xl max-w-[280px] mx-auto mb-3 hover:scale-105 transition-transform duration-300">
            {/* Fundo interno da imagem (branco levemente transparente) */}
            <div className="p-0 flex items-center justify-center">
              <img 
                src="/bannerWhite.png" 
                alt="JC Cortinas Logo" 
                className="w-full h-auto object-contain rounded-lg "
              />
            </div>
          </div>
          <p className="text-gray-500 font-medium mt-1 text-sm">Sistema de orçamentos</p>
        </div>

        {/* COMPONENTE QUE MOSTRA O AVISO DE SESSÃO EXPIRADA (Envolvido no Suspense pro Vercel não chiar) */}
        <Suspense fallback={null}>
          <MensagemErroSessao />
        </Suspense>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Envelope size={18} /> E-mail
            </label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-3.5 bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-bold text-gray-800"
              placeholder="seu@email.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between gap-2">
              <div className="flex items-center gap-2"><Lock size={18} /> Senha</div>
            </label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-3.5 bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-bold text-gray-800"
              placeholder="••••••••"
            />
            <div className="flex justify-end">
              <button 
                type="button" 
                onClick={handleResetPassword}
                disabled={loading}
                className="mt-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          </div>

          <button 
            disabled={loading}
            type="submit" 
            className="w-full mt-4 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:bg-gray-300 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? "Processando..." : <><SignIn size={20} weight="bold" /> Entrar no Sistema</>}
          </button>
        </form>
      </div>

      {/* MODAL DE FEEDBACK */}
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
            
            {feedback.type === 'error' && (
              <button 
                onClick={() => setFeedback({ ...feedback, isOpen: false })} 
                className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg bg-red-500 text-white hover:bg-red-600 shadow-red-200"
              >
                Tentar Novamente
              </button>
            )}
            
            {feedback.type === 'success' && (
              <button 
                onClick={() => setFeedback({ ...feedback, isOpen: false })} 
                className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg bg-emerald-500 text-white shadow-emerald-200"
              >
                Entendido
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}