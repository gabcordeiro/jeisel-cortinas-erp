const medidas = (item: any) =>
  `${item.largura.toFixed(2).replace('.', ',')}x${item.altura.toFixed(2).replace('.', ',')}m`;

const textoInstalacao: Record<string, string> = {
  Teto: 'instalação teto',
  Parede: 'instalação parede',
  'Vão': 'instalação no vão',
};

// Texto do item na via do cliente (PDF e Word)
export function descricaoItemCliente(item: any): string {
  if (item.servico === 'persiana') {
    const partes = [
      `coleção ${String(item.colecaoNome || '').toLowerCase()}`,
      `cor ${(item.cor || 'A definir').toLowerCase()}`,
      textoInstalacao[item.instalacao],
      item.bando && 'com bandô',
      item.sanefa && 'com sanefa',
      item.motorizada && 'motorizada',
    ].filter(Boolean);
    return `- Persiana ${String(item.modelo || '').toLowerCase()}, ${partes.join(', ')}. Medidas: ${medidas(item)}.`;
  }

  const arrDesc = item.desc.split(' | ');
  const modelo = arrDesc[0] || '';
  const tecido = arrDesc[1] || 'Sem tecido';
  const forro = arrDesc[2] || 'Sem forro';
  // O "(2 Vias)" do nome da ferragem é detalhe interno de cálculo, não vai pro cliente
  const ferragemName = (item.detalhes_array?.find((d: any) => d.tipo === 'Ferragem')?.nome || 'Sem trilho extra')
    .replace(/\s*\(\s*\d+\s*vias?\s*\)/gi, '');
  return `- Cortina modelo ${modelo.toLowerCase()}, tecido ${tecido.toLowerCase()}, cor a definir, forro em ${forro.toLowerCase()}, instalação teto, ${ferragemName.toLowerCase()}. Medidas: ${medidas(item)}.`;
}
