"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CurrencyDollar,
  FloppyDiskBack,
  Plus,
  Trash,
  X,
  Palette,
  Warning,
  Wrench,
  Ruler,
  Info,
  CheckCircle,
  PencilSimple,
  Blinds
} from "@phosphor-icons/react";

export default function GestorPrecos() {
  const [materiais, setMateriais] = useState<any[]>([]);
  const [taxas, setTaxas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de Abas
  const [activeTab, setActiveTab] = useState('tecidos');

  // Estados para o Modal de Cadastro
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("tecido");
  const [novoPreco, setNovoPreco] = useState("");
  const [novoFator, setNovoFator] = useState("3");

  // Estados para o Modal de Edição de Nome
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<{id: string, nome: string} | null>(null);
  const [editNome, setEditNome] = useState("");

  // Estados para Modais de Exclusão e Toast
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: mat } = await supabase.from('materiais').select('*').order('nome');
    const { data: tax } = await supabase.from('configuracoes_globais').select('*');
    setMateriais(mat || []);
    setTaxas(tax || []);
    setLoading(false);
  }

  // FUNÇÃO QUE MOSTRA O AVISO NO CANTO DA TELA
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('materiais').insert([
      { 
        nome: novoNome, 
        categoria: novaCategoria, 
        preco: Number(novoPreco),
        fator: Number(novoFator) 
      }
    ]);

    if (!error) {
      setIsAddModalOpen(false);
      setNovoNome("");
      setNovoPreco("");
      fetchData();
      showToast('Item cadastrado com sucesso!');
    } else {
      showToast("Erro ao salvar: " + error.message, 'error');
    }
  };

  // FUNÇÃO PARA ATUALIZAR APENAS O NOME
  const handleEditName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit) return;

    const { error } = await supabase.from('materiais').update({ nome: editNome }).eq('id', itemToEdit.id);
    
    if (!error) {
      setIsEditModalOpen(false);
      setItemToEdit(null);
      setEditNome("");
      fetchData();
      showToast('Nome atualizado com sucesso!');
    } else {
      showToast('Erro ao atualizar nome.', 'error');
    }
  };

  // FUNÇÃO ATUALIZADA: AGORA COM AVISO DE FEEDBACK
  const updateCampoMaterial = async (id: string, campo: string, novoValor: number) => {
    const { error } = await supabase.from('materiais').update({ [campo]: novoValor }).eq('id', id);
    if (!error) {
      showToast('Valor atualizado e salvo!');
    } else {
      showToast('Erro ao atualizar banco de dados.', 'error');
    }
  };

  const updateTaxaGlobal = async (chave: string, novoValor: number) => {
    const { error } = await supabase.from('configuracoes_globais').update({ valor: novoValor }).eq('chave', chave);
    if (!error) {
      showToast('Taxa global atualizada!');
    } else {
      showToast('Erro ao atualizar taxa.', 'error');
    }
  };

  const executeDelete = async () => {
    if (!idToDelete) return;
    const { error } = await supabase.from('materiais').delete().eq('id', idToDelete);
    if (!error) {
      setMateriais(materiais.filter(m => m.id !== idToDelete));
      showToast('Item excluído com sucesso!');
    } else {
      showToast('Erro ao excluir item.', 'error');
    }
    setIsDeleteModalOpen(false);
  };

  const filterByTab = (cat: string) => {
    if (activeTab === 'tecidos')    return ['tecido', 'forro'].includes(cat);
    if (activeTab === 'ferragens')  return ['modelo', 'ferragem'].includes(cat);
    if (activeTab === 'servicos')   return ['servico_fixo', 'servico_metro'].includes(cat);
    if (activeTab === 'persianas')  return cat.startsWith('persiana_');
    return false;
  };

  // MAPA DE CORES PARA AS CATEGORIAS
  const coresCategoria: any = {
    tecido:              'bg-blue-100 text-blue-700 border-blue-200',
    forro:               'bg-purple-100 text-purple-700 border-purple-200',
    modelo:              'bg-amber-100 text-amber-700 border-amber-200',
    ferragem:            'bg-slate-100 text-slate-700 border-slate-200',
    servico_fixo:        'bg-emerald-100 text-emerald-700 border-emerald-200',
    servico_metro:       'bg-teal-100 text-teal-700 border-teal-200',
    persiana_rolo:       'bg-teal-100 text-teal-700 border-teal-200',
    persiana_vertical:   'bg-cyan-100 text-cyan-700 border-cyan-200',
    persiana_horizontal: 'bg-sky-100 text-sky-700 border-sky-200',
    persiana_romana:     'bg-indigo-100 text-indigo-700 border-indigo-200',
    persiana_painel:     'bg-violet-100 text-violet-700 border-violet-200',
    persiana_acessorio:  'bg-pink-100 text-pink-700 border-pink-200',
  };

  const labelCategoria: any = {
    persiana_rolo:       'Persiana Rolo',
    persiana_vertical:   'Persiana Vertical',
    persiana_horizontal: 'Persiana Horizontal',
    persiana_romana:     'Persiana Romana',
    persiana_painel:     'Persiana Painel',
    persiana_acessorio:  'Acessório Persiana',
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Sincronizando tabelas...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 relative">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg">
            <CurrencyDollar size={32} weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Gestor de Preços</h1>
            <p className="text-sm text-gray-500">Controle o catálogo e os valores da JC Cortinas</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 w-full md:w-auto justify-center"
        >
          <Plus size={20} weight="bold" /> Novo Item
        </button>
      </header>

      {/* Navegação de Abas */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-gray-100 rounded-xl">
        <TabButton active={activeTab === 'tecidos'}   onClick={() => setActiveTab('tecidos')}   icon={<Palette/>} label="Tecidos e Forros" />
        <TabButton active={activeTab === 'ferragens'} onClick={() => setActiveTab('ferragens')} icon={<Ruler/>}   label="Modelos e Ferragens" />
        <TabButton active={activeTab === 'servicos'}  onClick={() => setActiveTab('servicos')}  icon={<Wrench/>}  label="Serviços Dinâmicos" />
        <TabButton active={activeTab === 'persianas'} onClick={() => setActiveTab('persianas')} icon={<Blinds/>}  label="Persianas" />
        <TabButton active={activeTab === 'taxas'}     onClick={() => setActiveTab('taxas')}     icon={<Info/>}    label="Taxas Globais" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[400px]">
        {activeTab !== 'taxas' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materiais.filter(m => filterByTab(m.categoria)).map(m => {
              
              const isProtegido = [
                'Taxa de retirada de cortina antiga',
                'Taxa fixa para pendurar em pedido misto',
                'Instalação Padrão',
                'Instalação Pé Direito Alto',
                'Pendurar (Acima do mínimo)'
              ].includes(m.nome);

              // Pega a cor correspondente ou uma cor padrão se não achar
              const corTag = coresCategoria[m.categoria] || 'bg-gray-100 text-gray-600 border-gray-200';

              return (
                <div key={m.id} className="relative p-5 border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all group bg-gray-50/50">
                  
                  {/* BOTOES DE AÇÃO: EDITAR E EXCLUIR */}
                  {!isProtegido && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => { 
                          setItemToEdit({ id: m.id, nome: m.nome }); 
                          setEditNome(m.nome);
                          setIsEditModalOpen(true); 
                        }}
                        className="bg-white p-1.5 rounded-md shadow-sm text-gray-300 hover:text-blue-600 transition-colors"
                        title="Editar nome"
                      >
                        <PencilSimple size={16} weight="bold" />
                      </button>
                      <button 
                        onClick={() => { setIdToDelete(m.id); setIsDeleteModalOpen(true); }}
                        className="bg-white p-1.5 rounded-md shadow-sm text-gray-300 hover:text-red-500 transition-colors"
                        title="Excluir item"
                      >
                        <Trash size={16} weight="bold" />
                      </button>
                    </div>
                  )}

                  <div className="mb-4 pr-16">
                    <h3 className="font-bold text-gray-800 text-lg truncate" title={m.nome}>{m.nome}</h3>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md mt-1 inline-block border ${corTag}`}>
                      {labelCategoria[m.categoria] || m.categoria.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
                      <span className="text-xs font-bold text-gray-400">VALOR (R$)</span>
                      <input 
                        type="number" step="0.01" defaultValue={m.preco} 
                        onBlur={(e) => updateCampoMaterial(m.id, 'preco', Number(e.target.value))}
                        className="w-24 text-right bg-transparent font-bold text-gray-800 outline-none focus:text-blue-600"
                      />
                    </div>

                    {/* FATOR MULT. liberado para forro */}
                    {!['servico_fixo', 'ferragem', 'servico_metro'].includes(m.categoria) && (
                      <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
                        <span className="text-xs font-bold text-gray-400">FATOR MULT.</span>
                        <input 
                          type="number" step="0.1" defaultValue={m.fator} 
                          onBlur={(e) => updateCampoMaterial(m.id, 'fator', Number(e.target.value))}
                          className="w-20 text-right bg-transparent font-bold text-gray-800 outline-none focus:text-blue-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {materiais.filter(m => filterByTab(m.categoria)).length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-400 font-medium">
                Nenhum item cadastrado nesta categoria.
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
             {taxas.map(t => (
                <div key={t.chave} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50">
                  <label className="text-sm font-bold text-gray-700">{t.descricao}</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      defaultValue={t.valor}
                      id={`taxa-${t.chave}`}
                      className="w-32 p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-600 font-bold text-gray-800 text-right"
                    />
                    <button 
                      onClick={() => {
                        const val = (document.getElementById(`taxa-${t.chave}`) as HTMLInputElement).value;
                        updateTaxaGlobal(t.chave, Number(val));
                      }}
                      className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                      title="Salvar"
                    >
                      <FloppyDiskBack size={20} weight="bold" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* COMPONENTE TOAST (Aviso de Sucesso/Erro flutuante) */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 z-[100] border ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={24} weight="fill" className="text-emerald-500" /> : <Warning size={24} weight="fill" className="text-red-500" />}
          <span className="font-bold text-sm pr-4">{toast.message}</span>
        </div>
      )}

      {/* --- MODAL DE CADASTRO --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
              <h2 className="text-xl font-black flex items-center gap-2"><Palette size={24} weight="bold" /> Novo Item</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleAddMaterial} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase">Nome / Descrição</label>
                <input 
                  autoFocus
                  type="text" 
                  value={novoNome} 
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Linho Nobre ou Prega Fêmea"
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-blue-600 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Categoria</label>
                  <select 
                    value={novaCategoria} 
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-blue-600 font-bold text-sm"
                  >
                    <option value="tecido">Tecido</option>
                    <option value="forro">Forro</option>
                    <option value="modelo">Modelo de Prega</option>
                    <option value="ferragem">Ferragem</option>
                    <option value="servico_fixo">Serviço (Fixo)</option>
                    <option value="servico_metro">Serviço (por Metro)</option>
                    <optgroup label="── Persianas ──">
                      <option value="persiana_rolo">Persiana Rolo (coleção/m²)</option>
                      <option value="persiana_vertical">Persiana Vertical (coleção/m²)</option>
                      <option value="persiana_horizontal">Persiana Horizontal (coleção/m²)</option>
                      <option value="persiana_romana">Persiana Romana (coleção/m²)</option>
                      <option value="persiana_painel">Persiana Painel (coleção/m²)</option>
                      <option value="persiana_acessorio">Acessório (Bandô/Sanefa/Motorização)</option>
                    </optgroup>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Preço / Conf. (R$)</label>
                  <input 
                    type="number" 
                    value={novoPreco} 
                    onChange={(e) => setNovoPreco(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-blue-600 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase">Fator (Deixe 1 se não usar)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={novoFator} 
                  onChange={(e) => setNovoFator(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-blue-600 font-bold"
                  required
                />
              </div>

              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all">
                Salvar no Banco
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE EDIÇÃO DE NOME --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
              <h2 className="text-xl font-black flex items-center gap-2"><PencilSimple size={24} weight="bold" /> Editar Nome</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleEditName} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase">Novo Nome / Descrição</label>
                <input 
                  autoFocus
                  type="text" 
                  value={editNome} 
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-blue-600 font-bold"
                  required
                />
              </div>

              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all">
                Salvar Alteração
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE EXCLUSÃO --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-xs w-full text-center space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Warning size={32} weight="bold" />
            </div>
            <h2 className="text-xl font-black text-gray-800">Remover Item?</h2>
            <p className="text-gray-500 text-xs">Isso pode afetar orçamentos futuros que usem este item.</p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition">Não</button>
              <button onClick={executeDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition">Sim, Sair</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap flex-1 justify-center ${
        active ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:bg-gray-200/50'
      }`}
    >
      {icon} {label}
    </button>
  );
}