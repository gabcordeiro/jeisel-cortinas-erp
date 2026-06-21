"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, MagnifyingGlass, Check, XCircle, X, MathOperations, Palette, Scissors, Wrench, Ruler, HardHat, PencilSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

// --- Funções Auxiliares de Cálculo ---
function calcularConsumoBK(largura: number) {
  if (largura <= 5.0) return largura + 0.90;
  if (largura <= 6.0) return largura + 1.00;
  return largura + 1.80; // Acima de 6 metros
}

function calcularConsumoWave(larguraMetros: number) {
  const larguraParte = (larguraMetros + 0.40) / 2;
  const ondasBruto = (larguraParte * 100) / 4.6;
  let ondasPar = Math.round(ondasBruto);
  
  if (ondasPar % 2 !== 0) {
    ondasPar += 1; 
  }
  
  const tecidoOndasMetros = (ondasPar * 10.3) / 100;
  const tecidoParteComBainha = tecidoOndasMetros + 0.30;
  return tecidoParteComBainha * 2;
}

// NOVA FUNÇÃO MESTRE: Unifica todos os modelos (Wave, Pregas e Ilhós)
function calcularMetragemPorModelo(larguraMetros: number, nomeModelo: string, fatorBanco: number) {
  const nomeLower = nomeModelo.toLowerCase();
  
  // 1. Regra WAVE
  if (nomeLower.includes('wave')) {
    const metragem = calcularConsumoWave(larguraMetros);
    const largParte = (larguraMetros + 0.40) / 2;
    let ondas = Math.round((largParte * 100) / 4.6);
    if (ondas % 2 !== 0) ondas += 1;
    return { metragem, equacao: `Regra Wave: ${ondas} ondas/parte × 10.3cm + 30cm (Bainha) = ${metragem.toFixed(2)}m` };
  } 
  
  // 2. Regra ILHÓS
  if (nomeLower.includes('ilhós') || nomeLower.includes('ilhos')) {
    const metragem = (larguraMetros * 3) + 0.40;
    return { metragem, equacao: `Regra Ilhós: (${larguraMetros.toFixed(2)}m × 3) + 40cm (Bainha) = ${metragem.toFixed(2)}m` };
  }
  
  // 3. Regra das PREGAS (Dupla, Americana, Macho, Única)
  if (nomeLower.includes('dupla') || nomeLower.includes('americana') || nomeLower.includes('macho') || nomeLower.includes('única') || nomeLower.includes('unica')) {
    let tamanhoPrega = 0.10;
    let nomeRegra = "";
    
    // Identifica o Tamanho da Prega (TP)
    if (nomeLower.includes('dupla')) { tamanhoPrega = 0.14; nomeRegra = "Pregas Duplas"; }
    else if (nomeLower.includes('americana')) { tamanhoPrega = 0.16; nomeRegra = "Prega Americana"; }
    else if (nomeLower.includes('macho')) { tamanhoPrega = 0.16; nomeRegra = "Prega Macho"; }
    else if (nomeLower.includes('única') || nomeLower.includes('unica')) { tamanhoPrega = 0.08; nomeRegra = "Prega Única"; }

    const parteBase = (larguraMetros + 0.20) / 2;
    
    // O Jeisel trunca a terceira casa decimal na calculadora (ex: 1.225 vira 1.22)
    const parteBaseTruncada = Math.floor(parteBase * 100) / 100; 
    
    const qtdPregas = Math.floor(parteBase / 0.11);
    const consumoPregas = qtdPregas * tamanhoPrega;
    const tamanhoBanda = consumoPregas + parteBaseTruncada + 0.20; // 0.20 é a bainha
    const metragem = tamanhoBanda * 2;
    
    return { 
      metragem, 
      equacao: `Regra ${nomeRegra}: ${qtdPregas} pregas/parte × ${tamanhoPrega * 100}cm = ${metragem.toFixed(2)}m` 
    };
  }

  // 4. Regra Padrão (Fallback para o fator do banco caso seja um modelo liso ou não cadastrado)
  const fatorFinal = fatorBanco || 1;
  const metragem = larguraMetros * fatorFinal;
  return { 
    metragem, 
    equacao: `Linear: (${larguraMetros.toFixed(2)}m × fator ${fatorFinal}) = ${metragem.toFixed(2)}m` 
  };
}

const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export default function Orcamentos() {
  const router = useRouter();

  const [dbTecidos, setDbTecidos] = useState<any[]>([]);
  const [dbForros, setDbForros] = useState<any[]>([]);
  const [dbModelos, setDbModelos] = useState<any[]>([]);
  const [dbFerragens, setDbFerragens] = useState<any[]>([]);
  const [dbTaxas, setDbTaxas] = useState<any>({});
  const [pricesLoaded, setPricesLoaded] = useState(false);

  const [cliente, setCliente] = useState("");
  const [km, setKm] = useState<number | "">("");
  const [cart, setCart] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [editingCartItemId, setEditingCartItemId] = useState<number | null>(null);

  const [nomeAmbiente, setNomeAmbiente] = useState("");
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [modeloId, setModeloId] = useState("");
  const [tecidoId, setTecidoId] = useState("nenhum");
  const [forroId, setForroId] = useState("nenhum");
  const [ferragemId, setFerragemId] = useState("nenhum");
  const [servicoId, setServicoId] = useState("padrao"); 

  useEffect(() => {
    async function loadPrices() {
      const { data: mats } = await supabase.from('materiais').select('*').order('nome');
      const { data: taxes } = await supabase.from('configuracoes_globais').select('*');

      if (mats) {
        setDbTecidos([{ id: 'nenhum', nome: 'Sem Tecido', preco: 0 }, ...mats.filter(m => m.categoria === 'tecido')]);
        setDbForros([{ id: 'nenhum', nome: 'Sem Forro', preco: 0 }, ...mats.filter(m => m.categoria === 'forro')]);
        setDbFerragens([{ id: 'nenhum', nome: 'Cliente já possui trilho/varão', preco: 0 }, ...mats.filter(m => m.categoria === 'ferragem')]);

        const modelosBanco = mats.filter(m => m.categoria === 'modelo');
        setDbModelos(modelosBanco);
        if (modelosBanco.length > 0) setModeloId(modelosBanco[0].id);
      }

      if (taxes) {
        const taxObj = taxes.reduce((acc: any, t) => { acc[t.chave] = Number(t.valor); return acc; }, {});
        setDbTaxas(taxObj);
      }
      setPricesLoaded(true);
    }
    loadPrices();
  }, []);

  useEffect(() => {
    const editData = localStorage.getItem('jeisel_edit_pedido');
    if (editData) {
      const pedido = JSON.parse(editData);
      setCart(pedido.itens || []);
      setCliente(pedido.cliente || "");
      setEditId(pedido.id); 
      localStorage.removeItem('jeisel_edit_pedido'); 
    }
  }, []);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const largNum = parseFloat(largura);
    const altNum = parseFloat(altura);

    const consumoAltura = altNum + 0.30; 

    const modObj = dbModelos.find(m => m.id === modeloId);
    const tecObj = dbTecidos.find(t => t.id === tecidoId);
    const forObj = dbForros.find(f => f.id === forroId);

    if (!tecObj || !forObj || !modObj) return alert("Selecione os materiais e o modelo.");
    if (tecObj.id === 'nenhum' && forObj.id === 'nenhum') return alert("Selecione tecido ou forro.");

    let detalhes = [];
    
    // 1. Cálculo Tecido (Usando a Função Mestre)
    let custoTec = 0;
    if (tecObj.id !== 'nenhum') {
      const calcTecido = calcularMetragemPorModelo(largNum, modObj.nome, modObj.fator);
      custoTec = calcTecido.metragem * tecObj.preco;
      let areaTec = calcTecido.metragem * consumoAltura;

      detalhes.push({ 
        tipo: 'Tecido', 
        icon: <Palette size={20} className="text-blue-500" />, 
        nome: tecObj.nome, 
        equacao: `${calcTecido.equacao} | Área: ${areaTec.toFixed(2)}m²`, 
        valor: custoTec 
      });
    }

    // 2. Cálculo Forro (Isolado e Inteligente)
    let custoFor = 0;
    if (forObj.id !== 'nenhum') {
      let metragemLinearForro = 0;
      let areaForro = 0;
      let eqForro = "";
      
      if (forObj.tipo_bk) {
        // Se for blackout, ignora o modelo e aplica a regra cravada
        metragemLinearForro = calcularConsumoBK(largNum);
        areaForro = metragemLinearForro * consumoAltura;
        let adicionalBK = largNum <= 5.0 ? 0.90 : (largNum <= 6.0 ? 1.00 : 1.80);
        eqForro = `Regra BK: ${largNum.toFixed(2)}m + ${adicionalBK.toFixed(2)}m (Bainha) = ${metragemLinearForro.toFixed(2)}m | Área: ${areaForro.toFixed(2)}m²`;
      } else {
        // Se for forro comum, ele acompanha rigorosamente as pregas do tecido principal
        const calcForro = calcularMetragemPorModelo(largNum, modObj.nome, forObj.fator);
        metragemLinearForro = calcForro.metragem;
        areaForro = metragemLinearForro * consumoAltura;
        
        // Remove a duplicidade da palavra "Área" que já vem na função mestre, caso exista
        const equacaoLimpa = calcForro.equacao.split('|')[0].trim();
        eqForro = `Forro (${modObj.nome}): ${equacaoLimpa} | Área: ${areaForro.toFixed(2)}m²`;
      }
      
      custoFor = metragemLinearForro * forObj.preco;

      detalhes.push({ 
        tipo: 'Forro', 
        icon: <Palette size={20} className="text-purple-500" />, 
        nome: forObj.nome, 
        equacao: eqForro, 
        valor: custoFor 
      });
    }

    // 3. Cálculo Confecção 
    let custoCst = modObj.preco * largNum;
    detalhes.push({ 
      tipo: 'Confecção', 
      icon: <Scissors size={20} className="text-orange-500" />, 
      nome: modObj.nome, 
      equacao: `${largNum}m × ${formatBRL(modObj.preco)}/m`, 
      valor: custoCst 
    });

    // 4. Cálculo Ferragem 
    let custoFer = 0;
    const ferObj = dbFerragens.find(f => f.id === ferragemId);
    
    if (ferObj && ferObj.id !== 'nenhum') {
      custoFer = largNum * ferObj.preco;
      
      const metragemTotalTrilhos = largNum * 2;
      const precoUnitarioTrilho = ferObj.preco / 2;

      detalhes.push({ 
        tipo: 'Ferragem', 
        icon: <Wrench size={20} className="text-gray-500" />, 
        nome: `${ferObj.nome} (2 Vias)`, 
        equacao: `${metragemTotalTrilhos.toFixed(2)}m totais (${largNum.toFixed(2)}m x 2 trilhos) × ${formatBRL(precoUnitarioTrilho)}/m`, 
        valor: custoFer 
      });
    }

    const newItem = {
      id: editingCartItemId || Date.now(),
      nome: nomeAmbiente, largura: largNum, altura: altNum, servico: servicoId,
      desc: `${modObj.nome} | ${tecObj.nome} | ${forObj.nome}`,
      mat_cost: custoTec + custoFor + custoCst + custoFer,
      detalhes_array: detalhes,
      tecidoId: tecObj.id,
      forroId: forObj.id,
      modeloId: modObj.id,
      ferragemId: ferObj ? ferObj.id : 'nenhum'
    };

    if (editingCartItemId) {
      setCart(cart.map(i => i.id === editingCartItemId ? newItem : i));
      setEditingCartItemId(null);
    } else {
      setCart([...cart, newItem]);
    }
    
    setNomeAmbiente(""); setLargura(""); setAltura("");
  };

  const delItem = (id: number) => setCart(cart.filter(i => i.id !== id));

  const editCartItem = (item: any) => {
    setNomeAmbiente(item.nome);
    setLargura(item.largura.toString());
    setAltura(item.altura.toString());
    
    if (item.tecidoId) setTecidoId(item.tecidoId);
    if (item.forroId) setForroId(item.forroId);
    if (item.modeloId) setModeloId(item.modeloId);
    if (item.ferragemId) setFerragemId(item.ferragemId); 
    else setFerragemId('nenhum'); 

    setEditingCartItemId(item.id);
  };

  const cancelCartItemEdit = () => {
    setEditingCartItemId(null);
    setNomeAmbiente(""); setLargura(""); setAltura("");
  };

  const totais = useMemo(() => {
    if (!pricesLoaded) return { mat: 0, inst: 0, desl: 0, total: 0, globalDetalhes: [] };

    let totalMat = 0, mtPadrao = 0, mtAlta = 0, mtPendurar = 0, mtRetirada = 0;
    let globalDetalhes = [];

    cart.forEach(item => {
      totalMat += item.mat_cost;
      if (item.servico === 'padrao') { if (item.altura > 3.50) mtAlta += item.largura; else mtPadrao += item.largura; }
      if (item.servico === 'so_pendurar') mtPendurar += item.largura;
      if (item.servico === 'retirar') { mtPadrao += item.largura; mtRetirada += item.largura; }
    });

    let calcInst = (mtPadrao * dbTaxas.inst_padrao) + (mtAlta * dbTaxas.inst_alta) + (mtRetirada * dbTaxas.retirada);
    if (mtPadrao > 0) globalDetalhes.push({ nome: 'Instalação Padrão', desc: `${mtPadrao.toFixed(2)}m`, valor: mtPadrao * dbTaxas.inst_padrao });
    if (mtAlta > 0) globalDetalhes.push({ nome: 'Pé Direito Alto', desc: `${mtAlta.toFixed(2)}m`, valor: mtAlta * dbTaxas.inst_alta });
    if (mtRetirada > 0) globalDetalhes.push({ nome: 'Taxa de Retirada', desc: `${mtRetirada.toFixed(2)}m`, valor: mtRetirada * dbTaxas.retirada });

    let totalInst = calcInst;
    let taxaMinimaAplicada = false;
    if (totalInst > 0 && totalInst < dbTaxas.min_resid) {
      totalInst = dbTaxas.min_resid;
      taxaMinimaAplicada = true;
    }

    let totalDesloc = 0;
    let kmTotal = (Number(km) || 0) * 2;
    if (kmTotal > dbTaxas.km_livre) {
      totalDesloc = (kmTotal - dbTaxas.km_livre) * dbTaxas.km_valor;
      globalDetalhes.push({ nome: 'Deslocamento Extra', desc: `${(kmTotal - dbTaxas.km_livre).toFixed(2)}km`, valor: totalDesloc });
    }

    return { mat: totalMat, inst: totalInst, desl: totalDesloc, total: totalMat + totalInst + totalDesloc, globalDetalhes, taxaMinimaAplicada };
  }, [cart, km, dbTaxas, pricesLoaded]);

  const finalizarPedido = async () => {
    if (cart.length === 0) return alert("Adicione itens!");
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    const payload = {
      cliente: cliente || "Consumidor",
      total: totais.total,
      vendedor: user?.email,
      status: 'andamento',
      qtd_janelas: cart.length,
      itens: cart,
      totais_data: {
        mat: totais.mat, inst: totais.inst, desl: totais.desl,
        globalDetalhes: totais.globalDetalhes, taxaMinimaAplicada: totais.taxaMinimaAplicada
      },
      data: new Date().toLocaleDateString('pt-BR')
    };

    let error;

    if (editId) {
      const res = await supabase.from('pedidos').update(payload).eq('id', editId);
      error = res.error;
    } else {
      const res = await supabase.from('pedidos').insert([payload]);
      error = res.error;
    }

    if (!error) { 
      setCart([]); 
      setCliente(""); 
      setKm(""); 
      setEditId(null); 
      router.push('/historico'); 
    }
    else alert("Erro: " + error.message);
  };

  if (!pricesLoaded) return <div className="p-10 text-center animate-pulse text-blue-600 font-bold">Sincronizando preços com o banco...</div>;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
        <div className="space-y-6">
            
            {editId && (
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <strong className="block text-sm">Modo de Edição Ativo</strong>
                  <span className="text-xs">Você está editando o Pedido #{editId}. Suas alterações substituirão o pedido original.</span>
                </div>
                <button 
                  onClick={() => { setEditId(null); setCart([]); setCliente(""); }} 
                  className="px-3 py-1.5 bg-indigo-200 text-indigo-800 rounded-md text-xs font-bold hover:bg-indigo-300 transition whitespace-nowrap"
                >
                  Cancelar Edição
                </button>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-blue-600 mb-4 pb-2 border-b">Dados do Cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Nome do Cliente</label>
                  <input type="text" placeholder="Ex: João da Silva" value={cliente} onChange={(e) => setCliente(e.target.value)} className="w-full p-2.5 border rounded-md bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Distância (KM Ida)</label>
                  <input type="number" placeholder="Ex: 15" value={km} onChange={(e) => setKm(e.target.value ? Number(e.target.value) : "")} className="w-full p-2.5 border rounded-md bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition" />
                </div>
              </div>
            </div>

            <div className={`bg-white p-6 rounded-lg border shadow-sm transition-all duration-300 ${editingCartItemId ? 'border-indigo-400 ring-4 ring-indigo-50' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4 pb-2 border-b">
                <h3 className={`text-lg font-semibold ${editingCartItemId ? 'text-indigo-600' : 'text-blue-600'}`}>
                  {editingCartItemId ? 'Editando Ambiente...' : 'Montar Janela/Ambiente'}
                </h3>
                {editingCartItemId && (
                  <button onClick={cancelCartItemEdit} className="text-xs text-gray-400 hover:text-red-500 font-bold">
                    Cancelar Edição
                  </button>
                )}
              </div>

              <form onSubmit={handleAddItem} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Nome do Ambiente</label>
                    <input type="text" value={nomeAmbiente} onChange={(e)=>setNomeAmbiente(e.target.value)} placeholder="Ex: Sala de Estar" className="w-full p-2.5 border rounded-md bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Largura (Metros)</label>
                    <input type="number" step="0.01" value={largura} onChange={(e)=>setLargura(e.target.value)} placeholder="Ex: 2.50" className="w-full p-2.5 border rounded-md bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Altura (Metros)</label>
                    <input type="number" step="0.01" value={altura} onChange={(e)=>setAltura(e.target.value)} placeholder="Ex: 2.80" className="w-full p-2.5 border rounded-md bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Escolha o Tecido</label>
                    <select value={tecidoId} onChange={(e)=>setTecidoId(e.target.value)} className="w-full p-2.5 border rounded-md bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition">
                      {dbTecidos.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nome} {t.id !== 'nenhum' ? `(R$ ${t.preco}/m ${t.fator > 0 ? `| Fator: ${t.fator}` : ''})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Escolha o Forro</label>
                    <select value={forroId} onChange={(e)=>setForroId(e.target.value)} className="w-full p-2.5 border rounded-md bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition">
                      {dbForros.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.nome} {f.id !== 'nenhum' ? `(R$ ${f.preco}/m ${f.fator > 0 ? `| Fator: ${f.fator}` : ''})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Modelo / Confecção</label>
                    <select value={modeloId} onChange={(e)=>setModeloId(e.target.value)} className="w-full p-2.5 border rounded-md bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition">
                      {dbModelos.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nome} (R$ {m.preco}/m {m.fator > 0 ? `| Fator: ${m.fator}` : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Tipo de Ferragem</label>
                    <select value={ferragemId} onChange={(e)=>setFerragemId(e.target.value)} className="w-full p-2.5 border rounded-md bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition">
                      {dbFerragens.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.nome} {f.preco > 0 ? `(R$ ${f.preco.toFixed(2).replace('.', ',')}/m)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className={`w-full p-3.5 text-white rounded-md font-bold flex items-center justify-center gap-2 transition-colors shadow-md ${editingCartItemId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {editingCartItemId ? <><Check size={20} weight="bold" /> Atualizar Ambiente</> : <><Plus size={20} weight="bold" /> Adicionar ao Carrinho</>}
                </button>
              </form>
            </div>
        </div>

        {/* Resumo Lateral e Botão do Modal */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm sticky top-6 self-start">
          <h3 className="text-lg font-semibold text-blue-600 mb-4 border-b pb-2">Resumo do Pedido</h3>
          
          <div className="max-h-[300px] overflow-y-auto mb-4 space-y-3 px-1">
            {cart.length === 0 ? (
              <div className="text-sm text-gray-500 italic text-center py-4">Nenhum item adicionado ainda.</div>
            ) : (
              cart.map(item => (
                <div key={item.id} className={`border p-3 rounded-md relative group transition-colors ${editingCartItemId === item.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:bg-white'}`}>
                  <h4 className="font-semibold text-sm text-gray-800">{item.nome} ({item.largura}x{item.altura}m)</h4>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                  <p className="text-sm mt-1 text-gray-700">Materiais: <strong className="text-blue-600">{formatBRL(item.mat_cost)}</strong></p>
                  
                  <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <button type="button" onClick={() => editCartItem(item)} className="p-1 bg-white text-indigo-500 border border-indigo-200 rounded hover:bg-indigo-500 hover:text-white transition shadow-sm">
                      <PencilSimple size={16} weight="bold" />
                    </button>
                    <button type="button" onClick={() => delItem(item.id)} className="p-1 bg-white text-red-500 border border-red-200 rounded hover:bg-red-500 hover:text-white transition shadow-sm">
                      <X size={16} weight="bold" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 mb-6 text-sm text-gray-600">
            <div className="flex justify-between"><span>Materiais:</span> <span className="font-medium">{formatBRL(totais.mat)}</span></div>
            <div className="flex justify-between"><span>Instalação:</span> <span className="font-medium">{formatBRL(totais.inst)}</span></div>
            <div className="flex justify-between"><span>Deslocamento:</span> <span className="font-medium">{formatBRL(totais.desl)}</span></div>
            <div className="flex justify-between text-xl font-bold text-emerald-600 pt-4 border-t border-dashed">
              <span>Total Geral</span> <span>{formatBRL(totais.total)}</span>
            </div>
          </div>

          <button onClick={() => { if (cart.length === 0) return alert("Adicione itens primeiro!"); setIsModalOpen(true); }} className="w-full mt-6 p-3 bg-transparent border border-gray-300 text-gray-700 rounded-md font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition">
            <MagnifyingGlass size={20} /> Ver Detalhes do Cálculo
          </button>
          
          <button onClick={finalizarPedido} className={`w-full mt-3 p-3 text-white rounded-md font-bold shadow-md transition flex items-center justify-center gap-2 ${editId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
            <Check size={20} weight="bold" /> {editId ? `Salvar Alterações (#${editId})` : "Finalizar Pedido"}
          </button>
        </div>
      </div>

      {/* --- MODAL MEMÓRIA DE CÁLCULO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl relative">
            <div className="sticky top-0 bg-white px-8 py-6 border-b flex justify-between items-center z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <MathOperations size={28} className="text-blue-600" /> Memória de Cálculo
                </h2>
                <p className="text-sm text-gray-500 mt-1">Detalhamento completo de materiais e serviços.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:text-red-500 transition"><X size={20} weight="bold" /></button>
            </div>

            <div className="p-8 space-y-8">
              {cart.map((item, idx) => (
                <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b flex justify-between items-center">
                    <strong className="text-blue-700 flex items-center gap-2"><Ruler size={20} /> [Janela {idx + 1}] {item.nome}</strong>
                    <span className="text-sm text-gray-500 font-medium">{item.largura}m Largura × {item.altura}m Altura</span>
                  </div>
                  
                  <div className="divide-y divide-gray-100">
                    {item.detalhes_array?.map((det: any, i: number) => (
                      <div key={i} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-4 hover:bg-gray-50 transition">
                        <div className="hidden sm:block p-2 bg-white border border-gray-100 rounded-md shadow-sm">{det.icon}</div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-gray-800">{det.tipo}: <span className="font-normal text-gray-600">{det.nome}</span></h4>
                          <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-100 inline-block px-2 py-1 rounded break-all">{det.equacao}</p>
                        </div>
                        <div className="text-sm font-semibold text-gray-800 sm:text-right mt-2 sm:mt-0">{formatBRL(det.valor)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50/50 px-5 py-3 border-t flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-4">
                    <span className="text-sm text-gray-600">Subtotal Materiais:</span>
                    <strong className="text-lg text-blue-700">{formatBRL(item.mat_cost)}</strong>
                  </div>
                </div>
              ))}

              <div className="border border-emerald-200 rounded-lg overflow-hidden">
                <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-200">
                  <strong className="text-emerald-800 flex items-center gap-2"><HardHat size={20} /> Mão de Obra e Deslocamento</strong>
                </div>
                
                <div className="divide-y divide-emerald-100 bg-white">
                  {totais.globalDetalhes.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-gray-500 italic">Nenhum serviço extra acionado.</div>
                  ) : (
                    totais.globalDetalhes.map((serv: any, i: number) => (
                      <div key={i} className="px-5 py-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-gray-800">{serv.nome}</h4>
                          <p className="text-xs text-gray-500 mt-1">{serv.desc}</p>
                        </div>
                        <div className="text-sm font-semibold text-gray-800">{formatBRL(serv.valor)}</div>
                      </div>
                    ))
                  )}
                  
                  {totais.taxaMinimaAplicada && (
                    <div className="px-5 py-3 bg-amber-50 text-amber-800 text-xs font-medium flex items-center gap-2">
                        ⚠️ Valor ajustado para o Piso Mínimo Residencial ({formatBRL(dbTaxas.min_resid)}).
                    </div>
                  )}
                </div>

                <div className="bg-emerald-50/50 px-5 py-3 border-t border-emerald-200 flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-4">
                  <span className="text-sm text-gray-600">Subtotal Serviços:</span>
                  <strong className="text-lg text-emerald-700">{formatBRL(totais.inst + totais.desl)}</strong>
                </div>
              </div>  
            </div>
          </div>
        </div>
      )}
    </>
  );
}