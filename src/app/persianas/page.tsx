"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Trash, Plus, CheckCircle, ShoppingCart, Tag, X,
  MapPin, User, Warning, PencilSimple, Rows
} from "@phosphor-icons/react";

const MODELOS = ['Rolo', 'Vertical', 'Horizontal', 'Romana', 'Painel'] as const;

const categoriaModelo: Record<string, string> = {
  'Rolo':       'persiana_rolo',
  'Vertical':   'persiana_vertical',
  'Horizontal': 'persiana_horizontal',
  'Romana':     'persiana_romana',
  'Painel':     'persiana_painel',
};

export default function Persianas() {
  const router = useRouter();

  // ── DB ───────────────────────────────────────────────────
  const [materiais, setMateriais] = useState<any[]>([]);
  const [dbTaxas, setDbTaxas]     = useState<any>({});
  const [pricesLoaded, setPricesLoaded] = useState(false);

  // ── Ordem ────────────────────────────────────────────────
  const [cliente, setCliente] = useState("");
  const [km, setKm]           = useState("");
  const [cart, setCart]       = useState<any[]>([]);

  // ── Formulário ───────────────────────────────────────────
  const [nomeAmbiente, setNomeAmbiente] = useState("");
  const [largura, setLargura]           = useState("");
  const [altura, setAltura]             = useState("");
  const [valorFabrica, setValorFabrica] = useState("");
  const [modelo, setModelo]             = useState<string>("Rolo");
  const [colecaoId, setColecaoId]       = useState("");
  const [cor, setCor]                   = useState("");
  const [bando, setBando]               = useState(false);
  const [sanefa, setSanefa]             = useState(false);
  const [motorizada, setMotorizada]     = useState(false);
  const [editingId, setEditingId]       = useState<number | null>(null);

  // ── Carga inicial ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: mats }  = await supabase.from('materiais').select('*').order('nome');
      const { data: taxes } = await supabase.from('configuracoes_globais').select('*');
      setMateriais(mats || []);
      setDbTaxas((taxes || []).reduce((acc: any, t: any) => ({ ...acc, [t.chave]: Number(t.valor) }), {}));
      setPricesLoaded(true);
    };
    load();
  }, []);

  // ── Coleções disponíveis pelo modelo ─────────────────────
  const colecoesDisponiveis = useMemo(() =>
    materiais.filter(m => m.categoria === categoriaModelo[modelo]),
    [modelo, materiais]
  );

  // Quando o modelo muda, reseta campos dependentes
  useEffect(() => { setColecaoId(""); setBando(false); setSanefa(false); }, [modelo]);

  // ── Acessórios ───────────────────────────────────────────
  const dbBando       = useMemo(() => materiais.find(m => m.categoria === 'persiana_acessorio' && m.nome === 'Bandô'),       [materiais]);
  const dbSanefa      = useMemo(() => materiais.find(m => m.categoria === 'persiana_acessorio' && m.nome === 'Sanefa'),      [materiais]);
  const dbMotorizacao = useMemo(() => materiais.find(m => m.categoria === 'persiana_acessorio' && m.nome === 'Motorização'), [materiais]);

  // ── Preview do cálculo ───────────────────────────────────
  const preview = useMemo(() => {
    if (!pricesLoaded || !colecaoId || !largura || !altura || !valorFabrica) return null;
    const colecao = colecoesDisponiveis.find(c => c.id === colecaoId);
    if (!colecao) return null;

    const L = Number(largura), H = Number(altura), VF = Number(valorFabrica);
    if (L <= 0 || H <= 0 || VF <= 0) return null;

    const margem       = dbTaxas.persiana_margem ?? 0.115;
    const lucio        = dbTaxas.persiana_lucio  ?? 1.5;
    const valor_fab    = VF;                                  // valor TOTAL da fábrica (já no tamanho)
    const valor_prod   = valor_fab * (1 + margem) * lucio;
    const bando_price  = bando       && dbBando       ? dbBando.preco * L        : 0;
    const sanefa_price = sanefa      && dbSanefa      ? dbSanefa.preco * L       : 0;
    const motor_price  = motorizada  && dbMotorizacao ? dbMotorizacao.preco      : 0;
    const mat_cost     = valor_prod + bando_price + sanefa_price + motor_price;

    return { colecao, L, H, valor_fab, valor_prod, bando_price, sanefa_price, motor_price, mat_cost };
  }, [pricesLoaded, colecaoId, largura, altura, valorFabrica, bando, sanefa, motorizada,
      colecoesDisponiveis, dbTaxas, dbBando, dbSanefa, dbMotorizacao]);

  // ── Totais ───────────────────────────────────────────────
  const totais = useMemo(() => {
    if (!pricesLoaded || cart.length === 0) return { mat: 0, inst: 0, desl: 0, total: 0, globalDetalhes: [], taxaMinimaAplicada: false };

    const totalMat     = cart.reduce((a, i) => a + i.mat_cost, 0);
    const totalLargura = cart.reduce((a, i) => a + i.largura, 0);
    const globalDetalhes: any[] = [];
    let totalInst = 0, taxaMinimaAplicada = false;

    if (totalLargura > 0) {
      const calcInst = totalLargura * (dbTaxas.inst_padrao || 0);
      totalInst = calcInst;
      if (totalInst > 0 && totalInst < (dbTaxas.min_resid || 0)) {
        totalInst = dbTaxas.min_resid;
        taxaMinimaAplicada = true;
      }
      globalDetalhes.push({ nome: 'Instalação Persiana', desc: `${totalLargura.toFixed(2)}m`, valor: totalInst });
    }

    const kmTotal = (Number(km) || 0) * 2;
    let totalDesloc = 0;
    if (kmTotal > (dbTaxas.km_livre || 0)) {
      totalDesloc = (kmTotal - dbTaxas.km_livre) * dbTaxas.km_valor;
      globalDetalhes.push({ nome: 'Deslocamento Extra', desc: `${(kmTotal - dbTaxas.km_livre).toFixed(2)}km`, valor: totalDesloc });
    }

    return { mat: totalMat, inst: totalInst, desl: totalDesloc, total: totalMat + totalInst + totalDesloc, globalDetalhes, taxaMinimaAplicada };
  }, [cart, km, dbTaxas, pricesLoaded]);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));

  // ── Adicionar / Editar cart ──────────────────────────────
  const addToCart = () => {
    if (!preview || !nomeAmbiente.trim()) return alert("Preencha o nome do ambiente.");
    if (!colecaoId) return alert("Selecione uma coleção.");

    const { colecao, L, H, valor_fab, valor_prod, bando_price, sanefa_price, motor_price, mat_cost } = preview;
    const area = L * H;

    const detalhes_array: any[] = [
      { tipo: 'Persiana', nome: `${colecao.nome} (${area.toFixed(2)}m²)`, valor: valor_prod },
      ...(bando_price  > 0 ? [{ tipo: 'Acessório', nome: 'Bandô',         valor: bando_price  }] : []),
      ...(sanefa_price > 0 ? [{ tipo: 'Acessório', nome: 'Sanefa',        valor: sanefa_price }] : []),
      ...(motor_price  > 0 ? [{ tipo: 'Acessório', nome: 'Motorização',   valor: motor_price  }] : []),
    ];

    const item = {
      id:          editingId ?? Date.now(),
      nome:        nomeAmbiente.trim(),
      largura:     L,
      altura:      H,
      modelo,
      colecaoId,
      colecaoNome: colecao.nome,
      cor:         cor || 'A definir',
      valorFab:    valor_fab,
      bando,
      sanefa,
      motorizada,
      mat_cost,
      desc:           `${modelo} | ${colecao.nome} | ${cor || 'A definir'}`,
      detalhes_array,
      servico:     'persiana',
    };

    setCart(prev => editingId !== null ? prev.map(i => i.id === editingId ? item : i) : [...prev, item]);
    setEditingId(null);
    setNomeAmbiente(""); setLargura(""); setAltura(""); setValorFabrica(""); setCor(""); setBando(false); setSanefa(false); setMotorizada(false);
  };

  const carregarEdicao = (item: any) => {
    setNomeAmbiente(item.nome);
    setLargura(item.largura.toString());
    setAltura(item.altura.toString());
    setValorFabrica(item.valorFab != null ? item.valorFab.toString() : "");
    setModelo(item.modelo);
    // timeout para aguardar colecoesDisponiveis atualizar
    setTimeout(() => setColecaoId(item.colecaoId), 80);
    setCor(item.cor === 'A definir' ? '' : item.cor);
    setBando(item.bando);
    setSanefa(item.sanefa);
    setMotorizada(item.motorizada);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Finalizar ────────────────────────────────────────────
  const finalizarPedido = async () => {
    if (cart.length === 0) return alert("Adicione pelo menos um item.");
    if (!cliente.trim()) return alert("Informe o nome do cliente.");
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    const pedido = {
      cliente: cliente.trim(),
      total:   totais.total,
      vendedor: user?.email,
      status:  'andamento',
      qtd_janelas: cart.length,
      itens:   cart,
      totais_data: {
        mat: totais.mat, inst: totais.inst, desl: totais.desl,
        globalDetalhes: totais.globalDetalhes, taxaMinimaAplicada: totais.taxaMinimaAplicada,
        tipo: 'persiana',
      },
      data: new Date().toLocaleDateString('pt-BR'),
    };

    const { error } = await supabase.from('pedidos').insert([pedido]);
    if (!error) {
      setCart([]); setCliente(""); setKm("");
      router.push('/historico');
    } else {
      alert("Erro ao salvar: " + error.message);
    }
  };

  if (!pricesLoaded) return <div className="p-10 text-center text-gray-400">Carregando preços...</div>;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">

      {/* Header */}
      <header className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-3 bg-teal-600 text-white rounded-xl shadow-lg">
          <Rows size={32} weight="duotone" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Orçamento de Persianas</h1>
          <p className="text-sm text-gray-500">Versão teste — Rolo, Vertical, Horizontal, Romana, Painel</p>
        </div>
      </header>

      <div className="flex flex-col xl:flex-row gap-6 items-start">

        {/* ── COLUNA ESQUERDA ─────────────────────────────── */}
        <div className="flex-1 space-y-6">

          {/* Formulário */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-black text-gray-700 flex items-center gap-2">
              <Plus size={20} weight="bold" className="text-teal-600" />
              {editingId !== null ? 'Editar Item' : 'Adicionar Persiana'}
            </h2>

            {/* Ambiente */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase">Nome do Ambiente</label>
              <input
                type="text"
                value={nomeAmbiente}
                onChange={e => setNomeAmbiente(e.target.value)}
                placeholder="Ex: Sala, Quarto, Escritório"
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-teal-500 font-semibold"
              />
            </div>

            {/* Largura + Altura */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase">Largura (m)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={largura}
                  onChange={e => setLargura(e.target.value)}
                  placeholder="2.50"
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-teal-500 font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase">Altura (m)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={altura}
                  onChange={e => setAltura(e.target.value)}
                  placeholder="2.20"
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-teal-500 font-semibold"
                />
              </div>
            </div>

            {/* Modelo */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase">Modelo de Persiana</label>
              <div className="flex flex-wrap gap-2">
                {MODELOS.map(m => (
                  <button
                    key={m}
                    onClick={() => setModelo(m)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      modelo === m
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200'
                        : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-teal-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Coleção */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase">Coleção / Tecido</label>
              {colecoesDisponiveis.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium flex items-center gap-2">
                  <Warning size={16} />
                  Nenhuma coleção cadastrada para {modelo}. Adicione no Gestor de Preços.
                </div>
              ) : (
                <select
                  value={colecaoId}
                  onChange={e => {
                    setColecaoId(e.target.value);
                    const c = colecoesDisponiveis.find(x => x.id === e.target.value);
                    if (c && Number(c.preco) > 0) setValorFabrica(String(c.preco));
                  }}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-teal-500 font-semibold"
                >
                  <option value="">Selecione uma coleção...</option>
                  {colecoesDisponiveis.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Valor da Fábrica */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase">Valor da Fábrica (R$)</label>
              <input
                type="number" step="0.01" min="0"
                value={valorFabrica}
                onChange={e => setValorFabrica(e.target.value)}
                placeholder="Valor total que a fábrica passou para esta peça"
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-teal-500 font-semibold"
              />
              <p className="text-[10px] text-gray-400">Digite o valor total que a fábrica cobrou por esta persiana neste tamanho. O sistema aplica +11,5%, ×1,5 e a instalação.</p>
            </div>

            {/* Cor */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase">Cor</label>
              <input
                type="text"
                value={cor}
                onChange={e => setCor(e.target.value)}
                placeholder="Ex: Bege, Branco Gelo, Cinza"
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-teal-500 font-semibold"
              />
            </div>

            {/* Opcionais */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase">Opcionais</label>
              <div className="flex flex-wrap gap-3">

                {modelo === 'Rolo' && (
                  <button
                    onClick={() => setBando(!bando)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      bando ? 'bg-teal-50 border-teal-400 text-teal-700' : 'bg-gray-50 border-gray-100 text-gray-500'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${bando ? 'bg-teal-600 border-teal-600' : 'border-gray-300'}`}>
                      {bando && <CheckCircle size={12} weight="fill" className="text-white" />}
                    </div>
                    Bandô {dbBando ? `(+${fmt(dbBando.preco)}/m)` : ''}
                  </button>
                )}

                {modelo === 'Vertical' && (
                  <button
                    onClick={() => setSanefa(!sanefa)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      sanefa ? 'bg-teal-50 border-teal-400 text-teal-700' : 'bg-gray-50 border-gray-100 text-gray-500'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${sanefa ? 'bg-teal-600 border-teal-600' : 'border-gray-300'}`}>
                      {sanefa && <CheckCircle size={12} weight="fill" className="text-white" />}
                    </div>
                    Sanefa {dbSanefa ? `(+${fmt(dbSanefa.preco)}/m)` : ''}
                  </button>
                )}

                <button
                  onClick={() => setMotorizada(!motorizada)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                    motorizada ? 'bg-teal-50 border-teal-400 text-teal-700' : 'bg-gray-50 border-gray-100 text-gray-500'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${motorizada ? 'bg-teal-600 border-teal-600' : 'border-gray-300'}`}>
                    {motorizada && <CheckCircle size={12} weight="fill" className="text-white" />}
                  </div>
                  Motorizada {dbMotorizacao ? `(+${fmt(dbMotorizacao.preco)})` : ''}
                </button>
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-black text-teal-700 uppercase">Pré-visualização do cálculo</p>
                <div className="text-xs text-teal-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Área: {preview.L.toFixed(2)} × {preview.H.toFixed(2)} = {(preview.L * preview.H).toFixed(2)}m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor da Fábrica</span>
                    <span>{fmt(preview.valor_fab)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ 11,5% (margem) × 1,5 (Lúcio)</span>
                    <span>{fmt(preview.valor_prod)}</span>
                  </div>
                  {preview.bando_price > 0  && <div className="flex justify-between"><span>Bandô</span><span>{fmt(preview.bando_price)}</span></div>}
                  {preview.sanefa_price > 0 && <div className="flex justify-between"><span>Sanefa</span><span>{fmt(preview.sanefa_price)}</span></div>}
                  {preview.motor_price > 0  && <div className="flex justify-between"><span>Motorização</span><span>{fmt(preview.motor_price)}</span></div>}
                  <div className="border-t border-teal-300 pt-1 flex justify-between font-black text-teal-800 text-sm">
                    <span>Total do Produto</span>
                    <span>{fmt(preview.mat_cost)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Botão Adicionar */}
            <button
              onClick={addToCart}
              disabled={!preview || !nomeAmbiente.trim()}
              className="w-full py-3.5 bg-teal-600 text-white font-black rounded-xl hover:bg-teal-700 transition-all shadow-md shadow-teal-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={18} weight="bold" />
              {editingId !== null ? 'Salvar Alterações' : 'Adicionar ao Orçamento'}
            </button>

            {editingId !== null && (
              <button
                onClick={() => { setEditingId(null); setNomeAmbiente(""); setLargura(""); setAltura(""); setValorFabrica(""); setCor(""); setBando(false); setSanefa(false); setMotorizada(false); }}
                className="w-full py-2 text-gray-400 text-sm font-bold hover:text-gray-600 transition-colors"
              >
                Cancelar edição
              </button>
            )}
          </div>

          {/* Lista de itens no carrinho */}
          {cart.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                <h2 className="text-sm font-black text-gray-600 uppercase flex items-center gap-2">
                  <ShoppingCart size={16} weight="bold" /> Itens do Orçamento ({cart.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {cart.map((item, idx) => (
                  <div key={item.id} className="p-5 flex items-start justify-between gap-4 group hover:bg-gray-50/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">{idx + 1}</span>
                        <span className="font-bold text-gray-800 truncate">{item.nome}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {item.modelo} · {item.colecaoNome} · {item.cor} · {item.largura.toFixed(2)}×{item.altura.toFixed(2)}m
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.bando      && <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold">Bandô</span>}
                        {item.sanefa     && <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold">Sanefa</span>}
                        {item.motorizada && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">Motorizada</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-gray-800">{fmt(item.mat_cost)}</span>
                      <button onClick={() => carregarEdicao(item)} className="p-1.5 text-gray-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all bg-white rounded-lg shadow-sm">
                        <PencilSimple size={15} weight="bold" />
                      </button>
                      <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white rounded-lg shadow-sm">
                        <Trash size={15} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── SIDEBAR DIREITA ──────────────────────────────── */}
        <div className="xl:w-80 w-full space-y-4 xl:sticky xl:top-4">

          {/* Cliente + KM */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-black text-gray-600 uppercase">Dados do Pedido</h3>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><User size={10}/> Nome do Cliente</label>
              <input
                type="text"
                value={cliente}
                onChange={e => setCliente(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-teal-500 font-semibold text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><MapPin size={10}/> Distância (km)</label>
              <input
                type="number" min="0"
                value={km}
                onChange={e => setKm(e.target.value)}
                placeholder="0"
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-teal-500 font-semibold text-sm"
              />
            </div>
          </div>

          {/* Resumo financeiro */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-teal-600">
              <h3 className="text-sm font-black text-white uppercase">Resumo do Orçamento</h3>
            </div>
            <div className="p-5 space-y-3">

              {cart.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">Nenhum item adicionado</p>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal produtos</span>
                    <span className="font-bold text-gray-700">{fmt(totais.mat)}</span>
                  </div>

                  {totais.globalDetalhes.map((d: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-500">{d.nome} <span className="text-gray-400 text-xs">({d.desc})</span></span>
                      <span className="font-bold text-gray-700">{fmt(d.valor)}</span>
                    </div>
                  ))}

                  {totais.taxaMinimaAplicada && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 font-medium">
                      <Warning size={14} weight="fill" />
                      Piso mínimo residencial aplicado
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-3 flex justify-between">
                    <span className="font-black text-gray-800">TOTAL GERAL</span>
                    <span className="font-black text-teal-700 text-lg">{fmt(totais.total)}</span>
                  </div>

                  <div className="text-xs text-gray-400 text-right">
                    À vista: {fmt(totais.total * 0.9)}
                  </div>
                </>
              )}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={finalizarPedido}
                disabled={cart.length === 0}
                className="w-full py-3.5 bg-teal-600 text-white font-black rounded-xl hover:bg-teal-700 transition-all shadow-md shadow-teal-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} weight="bold" />
                Finalizar Orçamento
              </button>
            </div>
          </div>

          {/* Info de cálculo */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs text-gray-400 space-y-1">
            <p className="font-bold text-gray-500">Como é calculado:</p>
            <p>1. Valor da fábrica (total da peça)</p>
            <p>2. + 11,5% (margem)</p>
            <p>3. × 1,5 (Lúcio)</p>
            <p>4. + instalação (largura total × taxa, mín. residencial)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
