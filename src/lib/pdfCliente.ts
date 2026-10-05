import type { jsPDF } from "jspdf";
import { descricaoItemCliente } from "./descricaoItem";

// Medidas espelhadas no Word da via do cliente (A4, margens e entrelinha 1,5 em 14pt)
const LARGURA_PAGINA = 210;
const MARGEM_X = 31.75;
const LARGURA_TEXTO = LARGURA_PAGINA - 2 * MARGEM_X;
const INICIO_Y = 56;
const LIMITE_Y = 257;
const ENTRELINHA = 8.8;
const COR_RODAPE: [number, number, number] = [124, 136, 102];
const COR_FAIXA: [number, number, number] = [212, 216, 202];

type Trecho = { texto: string; sublinhado?: boolean };

export function desenharPdfCliente(
  doc: jsPDF,
  p: any,
  formatBRL: (v: number) => string,
  logo: string | Uint8Array,
) {
  let y = INICIO_Y;

  const moldura = () => {
    try { doc.addImage(logo, 'JPEG', 0, 0, LARGURA_PAGINA, 42); } catch (e) { console.error("Logo não encontrada."); }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...COR_RODAPE);
    doc.text("WhatsApp: (27) 99316-3890 | Instagram: @cortinas.jc", LARGURA_PAGINA / 2, 272, { align: "center" });
    doc.text("Endereço: Rua Felicidade Siqueira, 198 - A Jardim Marilândia - Vila Velha - ES", LARGURA_PAGINA / 2, 277, { align: "center" });
    doc.setFillColor(...COR_FAIXA);
    doc.rect(0, 287, LARGURA_PAGINA, 10, 'F');
    doc.setTextColor(0, 0, 0);
  };

  const fonteCorpo = () => {
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(14);
  };

  const garantirEspaco = () => {
    if (y > LIMITE_Y) {
      doc.addPage();
      moldura();
      fonteCorpo();
      y = INICIO_Y;
    }
  };

  const linhaEmBranco = () => {
    y += ENTRELINHA;
    garantirEspaco();
  };

  // Parágrafo justificado (a última linha fica alinhada à esquerda), com trechos sublinhados
  const paragrafo = (trechos: Trecho[]) => {
    fonteCorpo();
    const palavras = trechos.flatMap(t =>
      t.texto.split(' ').filter(Boolean).map(w => ({ w, sublinhado: !!t.sublinhado, largura: doc.getTextWidth(w) }))
    );
    const espaco = doc.getTextWidth(' ');

    const linhas: typeof palavras[] = [];
    let atual: typeof palavras = [];
    let larguraAtual = 0;
    palavras.forEach(pal => {
      const extra = atual.length ? espaco + pal.largura : pal.largura;
      if (atual.length && larguraAtual + extra > LARGURA_TEXTO) {
        linhas.push(atual);
        atual = [pal];
        larguraAtual = pal.largura;
      } else {
        atual.push(pal);
        larguraAtual += extra;
      }
    });
    if (atual.length) linhas.push(atual);

    // Igual ao Word: nunca deixa uma linha sozinha no fim ou no início de uma página
    const cabemAqui = Math.floor((LIMITE_Y - y) / ENTRELINHA) + 1;
    if (linhas.length > cabemAqui && (cabemAqui < 2 || linhas.length - cabemAqui < 2)) {
      y = LIMITE_Y + 1;
    }

    linhas.forEach((linha, idx) => {
      garantirEspaco();
      const ultima = idx === linhas.length - 1;
      const somaPalavras = linha.reduce((acc, pal) => acc + pal.largura, 0);
      const vao = !ultima && linha.length > 1 ? (LARGURA_TEXTO - somaPalavras) / (linha.length - 1) : espaco;

      let x = MARGEM_X;
      linha.forEach((pal, i) => {
        doc.text(pal.w, x, y);
        if (pal.sublinhado) {
          const proxSublinhada = linha[i + 1]?.sublinhado;
          doc.setLineWidth(0.3);
          doc.line(x, y + 1.2, x + pal.largura + (proxSublinhada ? vao : 0), y + 1.2);
        }
        x += pal.largura + vao;
      });
      y += ENTRELINHA;
    });
  };

  moldura();

  doc.setFont("Montserrat", "bold");
  doc.setFontSize(16);
  doc.text("Orçamento", LARGURA_PAGINA / 2, 53, { align: "center" });
  y = 72;

  // Instalação distribuída proporcionalmente entre os ambientes
  const matSum = p.itens?.reduce((acc: number, item: any) => acc + (item.mat_cost || 0), 0) || 0;
  const instDesl = (p.total || 0) - matSum;
  const totalVista = (p.total || 0) * 0.9;

  p.itens?.forEach((item: any) => {
    const proporcao = matSum > 0 ? (item.mat_cost || 0) / matSum : 0;
    const valorPrazo = (item.mat_cost || 0) + (instDesl * proporcao);

    linhaEmBranco();
    paragrafo([{ texto: `${item.nome}:`, sublinhado: true }]);
    linhaEmBranco();
    paragrafo([{ texto: descricaoItemCliente(item) }]);
    linhaEmBranco();
    paragrafo([{ texto: `VALOR: ${formatBRL(valorPrazo)} a prazo ou ${formatBRL(valorPrazo * 0.9)} à vista.` }]);
  });

  linhaEmBranco();
  paragrafo([{ texto: `VALOR TOTAL: ${formatBRL(p.total)} a prazo ou ${formatBRL(totalVista)} à vista.` }]);
  linhaEmBranco();
  linhaEmBranco();
  paragrafo([{ texto: "FORMAS DE PAGAMENTO:", sublinhado: true }, { texto: "a prazo em até 10x sem juros ou à vista com 10% de desconto (50% de entrada e restante até o dia da instalação)." }]);
  linhaEmBranco();
  paragrafo([{ texto: "PRAZO DE ENTREGA:", sublinhado: true }, { texto: "10 dias úteis." }]);
  linhaEmBranco();
  paragrafo([{ texto: "CHAVE PIX:", sublinhado: true }, { texto: "293956360001-61 Jeisel Almeida Rodrigues de Melo" }]);
  linhaEmBranco();
  paragrafo([{ texto: "*Observação: Nosso horário padrão para instalações é de segunda a sexta-feira, até as 18h. Para instalações realizadas após esse horário ou aos sábados, será aplicada uma taxa adicional de R$ 100,00." }]);
  linhaEmBranco();
  paragrafo([{ texto: "Agradecemos a compreensão e ficamos à disposição para melhor atendê-lo!" }]);
}
