"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, CheckCircle, Warning, ShieldCheck } from "@phosphor-icons/react";

function FormularioNovaSenha() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verificando' | 'pronto' | 'invalido'>('verificando');
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    const validarLink = async () => {
      const code = searchParams.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        setStatus(error ? 'invalido' : 'pronto');
        return;
      }

      // Fluxo alternativo (hash com access_token): o client já processa sozinho ao carregar.
      const { data: { session } } = await supabase.auth.getSession();
      setStatus(session ? 'pronto' : 'invalido');
    };
    validarLink();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (senha.length < 6) {
      setFeedback({ isOpen: true, type: 'error', title: 'Senha Curta', message: 'A senha precisa ter no mínimo 6 caracteres.' });
      return;
    }
    if (senha !== confirmar) {
      setFeedback({ isOpen: true, type: 'error', title: 'Senhas Diferentes', message: 'As senhas digitadas não coincidem.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);

    if (error) {
      setFeedback({ isOpen: true, type: 'error', title: 'Erro ao Salvar', message: error.message });
      return;
    }

    setFeedback({ isOpen: true, type: 'success', title: 'Senha Atualizada!', message: 'Sua senha foi alterada com sucesso. Entrando no sistema...' });
    setTimeout(() => { window.location.href = "/"; }, 1800);
  };

  if (status === 'verificando') {
    return <p className="text-center text-gray-500 font-medium py-8">Verificando seu link...</p>;
  }

  if (status === 'invalido') {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <Warning size={32} weight="duotone" />
        </div>
        <p className="text-gray-600 font-medium text-sm">
          Este link de redefinição é inválido ou expirou. Volte para o login e clique em &quot;Esqueci minha senha&quot; novamente.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all"
        >
          Voltar ao Login
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Lock size={18} /> Nova Senha
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="p-3.5 bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-bold text-gray-800"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Lock size={18} /> Confirmar Senha
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="p-3.5 bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-bold text-gray-800"
            placeholder="••••••••"
          />
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full mt-4 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:bg-gray-300 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {loading ? "Salvando..." : <><ShieldCheck size={20} weight="bold" /> Salvar Nova Senha</>}
        </button>
      </form>

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
                Entendido
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function RedefinirSenha() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-gray-200 p-4 z-50 overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/50 w-full max-w-md z-10 animate-in zoom-in duration-500">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="relative p-[3px] rounded-2xl max-w-[280px] mx-auto mb-3">
            <img src="/bannerWhite.png" alt="JC Cortinas Logo" className="w-full h-auto object-contain rounded-lg" />
          </div>
          <p className="text-gray-500 font-medium mt-1 text-sm">Defina sua nova senha</p>
        </div>

        <Suspense fallback={<p className="text-center text-gray-500 font-medium py-8">Carregando...</p>}>
          <FormularioNovaSenha />
        </Suspense>
      </div>
    </div>
  );
}
