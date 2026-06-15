"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Trash, MagnifyingGlass, Eye, X, Ruler, MathOperations, 
  CheckCircle, Clock, Prohibit, FilePdf, FileDoc,
  CaretDown, Warning, FileXls, PencilSimple, User, Wrench,
  ListChecks, CheckSquareOffset
} from "@phosphor-icons/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx"; 
// IMPORTANTE: Adicionado o ImageRun aqui
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, ImageRun } from "docx";

export default function Historico() {
  
  const router = useRouter();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(true);
  
  // Estados para Modais
  const [selectedPedido, setSelectedPedido] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  
  // Estado para o Modal de Escolha de PDF/DOCX
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pedidoParaPdf, setPedidoParaPdf] = useState<any>(null);

  // === EXCLUSÃO EM MASSA ===
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc'
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setRole(user?.user_metadata?.role || "USER");
      fetchPedidos();
    };
    init();
  }, []);

  async function fetchPedidos() {
    const { data } = await supabase.from('pedidos').select('*').order('created_at', { ascending: false });
    setPedidos(data || []);
    setLoading(false);
  }

  // --- FUNÇÃO DE EXPORTAR EXCEL ---
  const exportarExcel = () => {
    const dadosExcel = pedidosProcessados.map(p => ({
      ID: p.id,
      Data: p.data || new Date(p.created_at).toLocaleDateString('pt-BR'),
      Cliente: p.cliente,
      Vendedor: p.vendedor || "Sistema",
      Qtd_Janelas: p.qtd_janelas,
      Status: p.status.toUpperCase(),
      Valor_Total: p.total
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");

    const dataAtual = new Date();
    const nomeArquivo = `Fechamento_Jeisel_${dataAtual.getMonth() + 1}_${dataAtual.getFullYear()}.xlsx`;

    XLSX.writeFile(wb, nomeArquivo);
  };

  const formatBRL = (v: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(Number(v));

  // =========================================================================
  // FUNÇÕES DE PDF
  // =========================================================================
  const gerarPdfCliente = async (p: any) => {
    const doc = new jsPDF();
    doc.setLineHeightFactor(1.35); 
    
    try {
      const loadFont = async (path: string, name: string, weight: string) => {
        const res = await fetch(path);
        const buffer = await res.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        doc.addFileToVFS(path, btoa(binary));
        doc.addFont(path, name, weight);
      };

      await loadFont('/Montserrat-Regular.ttf', 'Montserrat', 'normal');
      await loadFont('/Montserrat-Bold.ttf', 'Montserrat', 'bold');
      doc.setFont('Montserrat');
    } catch (error) {
      console.warn("Fontes não encontradas. Usando helvetica.");
      doc.setFont('helvetica');
    }

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    try { doc.addImage('/logo.jpg', 'JPEG', 0, 0, 210, 42); } catch (e) { console.error("Logo não encontrada."); }

    doc.setFontSize(20); 
    doc.setFont("Montserrat", "bold");
    doc.setLineWidth(0.2);
    doc.text("Orçamento", 105, 58, { align: "center", renderingMode: 'fillThenStroke' });

    let y = 75;
    doc.setFontSize(14); 
    
    p.itens?.forEach((item: any) => {
      if (y > 220) { doc.addPage(); y = 25; }

      doc.setFont("Montserrat", "bold");
      doc.setLineWidth(0.2); 
      const ambienteTexto = `${item.nome}:`;
      doc.text(ambienteTexto, 14, y, { renderingMode: 'fillThenStroke' });
      
      y += 8; 
      
      doc.setFont("Montserrat", "normal");
      doc.setLineWidth(0.1); 
      const arrDesc = item.desc.split(' | '); 
      const modelo = arrDesc[0] || '';
      const tecido = arrDesc[1] || 'Sem tecido';
      const forro = arrDesc[2] || 'Sem forro';
      const ferragemName = item.detalhes_array?.find((d: any) => d.tipo === 'Ferragem')?.nome || 'Sem trilho extra';

      const textoCortina = `- Cortina modelo ${modelo.toLowerCase()}, tecido ${tecido.toLowerCase()}, cor a definir, forro em ${forro.toLowerCase()}, instalação teto, ${ferragemName.toLowerCase()}.\nMedidas: ${item.largura.toFixed(2).replace('.',',')}x${item.altura.toFixed(2).replace('.',',')}m.`;
      
      const splitTexto = doc.splitTextToSize(textoCortina, 180);
      doc.text(splitTexto, 14, y, { renderingMode: 'fillThenStroke' });
      
      y += (splitTexto.length * 7.5) + 4; 

      const valorAmbientePrazo = item.mat_cost || 0;
      const valorAmbienteVista = valorAmbientePrazo * 0.9; 

      doc.setFont("Montserrat", "bold");
      doc.setLineWidth(0.2);
      doc.text(`VALOR: ${formatBRL(valorAmbientePrazo)} a prazo ou ${formatBRL(valorAmbienteVista)} à vista.`, 14, y, { renderingMode: 'fillThenStroke' });
      
      y += 18; 
    });

    // Instalação, deslocamento e total
    const matSumPdfCliente = p.itens?.reduce((acc: number, item: any) => acc + (item.mat_cost || 0), 0) || 0;
    const instDeslPdfCliente = (p.total || 0) - matSumPdfCliente;
    const totalVistaPdfCliente = (p.total || 0) * 0.9;

    if (y > 200) { doc.addPage(); y = 30; }

    if (instDeslPdfCliente > 0.01) {
      if (y > 260) { doc.addPage(); y = 30; }
      doc.setFontSize(14);
      doc.setFont("Montserrat", "bold");
      doc.setLineWidth(0.2);
      doc.text(`INSTALAÇÃO E DESLOCAMENTO: ${formatBRL(instDeslPdfCliente)}`, 14, y, { renderingMode: 'fillThenStroke' });
      y += 10;
    }

    if (y > 260) { doc.addPage(); y = 30; }
    doc.setFontSize(14);
    doc.setFont("Montserrat", "bold");
    doc.setLineWidth(0.2);
    doc.text(`VALOR TOTAL: ${formatBRL(p.total)} a prazo ou ${formatBRL(totalVistaPdfCliente)} à vista.`, 14, y, { renderingMode: 'fillThenStroke' });
    y += 18;

    const infoInline = (titulo: string, texto: string, posY: number) => {
      doc.setFontSize(14);
      doc.setFont("Montserrat", "bold");
      doc.setLineWidth(0.2);
      doc.text(titulo, 14, posY, { renderingMode: 'fillThenStroke' });
      
      const titleWidth = doc.getTextWidth(titulo + " "); 
      
      doc.setFont("Montserrat", "normal");
      doc.setLineWidth(0.1); 
      const maxWidth = 196 - (14 + titleWidth); 
      const textoSplit = doc.splitTextToSize(texto, maxWidth); 
      
      doc.text(textoSplit, 14 + titleWidth, posY, { renderingMode: 'fillThenStroke' });
      
      return (textoSplit.length * 7.5) + 6; 
    };

    y += infoInline("FORMAS DE PAGAMENTO:", "a prazo em até 10x sem juros ou à vista com 10% de desconto (30% de entrada e restante até o dia da instalação).", y);
    y += infoInline("PRAZO DE ENTREGA:", "10 dias úteis.", y);
    y += infoInline("CHAVE PIX:", "293956360001-61 Jeisel Almeida Rodrigues de Melo", y);

    y += 10;
    doc.setFont("Montserrat", "bold"); 
    doc.text("*Observação: não trabalhamos aos sábados. Instalações aos sábados têm acréscimo de R$ 100,00.", 14, y, { maxWidth: 180, renderingMode: 'fillThenStroke' });

    doc.setFontSize(11); 
    doc.setFont("Montserrat", "bold");
    doc.setTextColor(50, 50, 50);
    doc.setLineWidth(0);
    doc.text("WhatsApp: (27) 99316-3890 | Instagram: @cortinas.jc", 105, 275, { align: "center" });
    doc.text("Endereço: Rua Felicidade Siqueira, 198 - A Jardim Marilândia - Vila Velha - ES", 105, 281, { align: "center" });
    
    doc.setFillColor(220, 224, 212);
    doc.rect(0, 286, 210, 11, 'F');

    doc.save(`JC_Cortinas_Orcamento_${p.cliente.replace(/\s+/g, '_')}.pdf`);
    setIsPdfModalOpen(false);
  };

  const gerarPdfInterno = (p: any) => {
    const doc = new jsPDF();
    
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 15, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(37, 99, 235);
    doc.text("JC CORTINAS", 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Orçamento Interno Analítico", 14, 36);
    
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 42, 196, 42);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("DADOS DO CLIENTE", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${p.cliente}`, 14, 58);
    doc.text(`Data de Emissão: ${p.data}`, 14, 64);

    doc.setFont("helvetica", "bold");
    doc.text("INFORMAÇÕES DO PEDIDO", 120, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`Código do Pedido: #${p.id}`, 120, 58);
    
    const tableBody: any[] = [];

    p.itens?.forEach((item: any, index: number) => {
      tableBody.push([
        { 
          content: `AMBIENTE ${index + 1}: ${item.nome.toUpperCase()} (${item.largura}m larg. x ${item.altura}m alt.)`, 
          colSpan: 3, 
          styles: { fillColor: [240, 245, 255], textColor: [37, 99, 235], fontStyle: 'bold' } 
        }
      ]);
      
      item.detalhes_array?.forEach((det: any) => {
        tableBody.push([det.tipo, det.nome, formatBRL(det.valor)]);
      });
      
      tableBody.push([
        { content: 'Subtotal do Ambiente:', colSpan: 2, styles: { halign: 'right', fontStyle: 'italic', textColor: [100, 100, 100] } }, 
        { content: formatBRL(item.mat_cost), styles: { fontStyle: 'bold', textColor: [50, 50, 50] } }
      ]);
    });

    const matSumPdf = p.itens?.reduce((acc: number, item: any) => acc + (item.mat_cost || 0), 0) || 0;
    const instDeslFallback = (p.total || 0) - matSumPdf;
    const temInstPdf = p.totais_data?.taxaMinimaAplicada
      ? (p.totais_data.inst > 0 || p.totais_data.desl > 0)
      : (p.totais_data?.globalDetalhes?.length > 0 || instDeslFallback > 0.01);

    if (temInstPdf) {
      tableBody.push([
        {
          content: `MÃO DE OBRA E DESLOCAMENTO`,
          colSpan: 3,
          styles: { fillColor: [236, 253, 245], textColor: [5, 150, 105], fontStyle: 'bold' }
        }
      ]);

      if (p.totais_data?.taxaMinimaAplicada) {
        if (p.totais_data.inst > 0) {
          tableBody.push(['Instalação (Mínimo Residencial)', 'Taxa mínima residencial', formatBRL(p.totais_data.inst)]);
        }
        p.totais_data.globalDetalhes
          ?.filter((serv: any) => serv.nome === 'Deslocamento Extra')
          .forEach((serv: any) => {
            tableBody.push([serv.nome, serv.desc || 'Serviço Adicional', formatBRL(serv.valor)]);
          });
      } else if (p.totais_data?.globalDetalhes?.length > 0) {
        p.totais_data.globalDetalhes.forEach((serv: any) => {
          tableBody.push([serv.nome, serv.desc || 'Serviço Adicional', formatBRL(serv.valor)]);
        });
      } else {
        tableBody.push(['Instalação e Deslocamento', '', formatBRL(instDeslFallback)]);
      }
    }

    autoTable(doc, {
      startY: 72,
      head: [['Item / Serviço', 'Descrição Técnica', 'Valor']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35, halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(16, 185, 129);
    doc.rect(110, finalY - 8, 86, 20, 'FD');
    
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL GERAL:", 115, finalY + 4);
    
    doc.setFontSize(16);
    doc.setTextColor(5, 150, 105);
    doc.text(formatBRL(p.total), 190, finalY + 5, { align: "right" });

    doc.save(`Interno_Jeisel_${p.id}_${p.cliente.replace(/\s+/g, '_')}.pdf`);
    setIsPdfModalOpen(false); 
  };

  // =========================================================================
  // NOVAS FUNÇÕES: GERAR DOCX (WORD)
  // =========================================================================
  
  const downloadDocx = async (doc: Document, fileName: string) => {
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    setIsPdfModalOpen(false);
  };

  const gerarDocxCliente = async (p: any) => {
    const childrenElements: any[] = [];

    // Tenta buscar a logo.jpg da pasta public
    let logoBuffer: ArrayBuffer | null = null;
    try {
      const response = await fetch('/logo.jpg');
      if (response.ok) {
        logoBuffer = await response.arrayBuffer();
      }
    } catch (e) {
      console.warn("Logo não encontrada para o DOCX.");
    }

    // Se a logo for encontrada, injeta ela no Word mantendo as proporções do PDF (210x42 ~ 5:1)
    if (logoBuffer) {
      childrenElements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: {
                width: 700, // Largura padrão em pixels para o documento
                height: 140, // Proporção da altura
              },
              type: "jpg", // <-- ESSA É A LINHA QUE CORRIGE O ERRO DO VERCEL
            }),
          ],
        })
      );
    }

    // Título
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 600 },
        children: [new TextRun({ text: "Orçamento", bold: true, size: 36 })], // size em half-points (36 = 18pt)
      })
    );

    // Iterando os ambientes
    p.itens?.forEach((item: any) => {
      const arrDesc = item.desc.split(' | '); 
      const modelo = arrDesc[0] || '';
      const tecido = arrDesc[1] || 'Sem tecido';
      const forro = arrDesc[2] || 'Sem forro';
      const ferragemName = item.detalhes_array?.find((d: any) => d.tipo === 'Ferragem')?.nome || 'Sem trilho extra';

      const textoCortina = `- Cortina modelo ${modelo.toLowerCase()}, tecido ${tecido.toLowerCase()}, cor a definir, forro em ${forro.toLowerCase()}, instalação teto, ${ferragemName.toLowerCase()}.\nMedidas: ${item.largura.toFixed(2).replace('.',',')}x${item.altura.toFixed(2).replace('.',',')}m.`;
      
      const valorAmbientePrazo = item.mat_cost || 0;
      const valorAmbienteVista = valorAmbientePrazo * 0.9; 

      // Nome do Ambiente
      childrenElements.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: `${item.nome}:`, bold: true, size: 28 })], // 28 = 14pt
        })
      );

      // Texto Descritivo
      childrenElements.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: textoCortina, size: 28 })],
        })
      );

      // Valor
      childrenElements.push(
        new Paragraph({
          spacing: { after: 400 },
          children: [new TextRun({ text: `VALOR: ${formatBRL(valorAmbientePrazo)} a prazo ou ${formatBRL(valorAmbienteVista)} à vista.`, bold: true, size: 28 })],
        })
      );
    });

    // Instalação, deslocamento e total
    const matSumDocxCliente = p.itens?.reduce((acc: number, item: any) => acc + (item.mat_cost || 0), 0) || 0;
    const instDeslDocxCliente = (p.total || 0) - matSumDocxCliente;
    const totalVistaDocxCliente = (p.total || 0) * 0.9;

    if (instDeslDocxCliente > 0.01) {
      childrenElements.push(
        new Paragraph({
          spacing: { before: 100, after: 100 },
          children: [new TextRun({ text: `INSTALAÇÃO E DESLOCAMENTO: ${formatBRL(instDeslDocxCliente)}`, bold: true, size: 28 })],
        })
      );
    }

    childrenElements.push(
      new Paragraph({
        spacing: { after: 400 },
        children: [new TextRun({ text: `VALOR TOTAL: ${formatBRL(p.total)} a prazo ou ${formatBRL(totalVistaDocxCliente)} à vista.`, bold: true, size: 28 })],
      })
    );

    // Rodapé de Informações Financeiras
    childrenElements.push(
      new Paragraph({
        spacing: { before: 400, after: 100 },
        children: [
          new TextRun({ text: "FORMAS DE PAGAMENTO: ", bold: true, size: 28 }),
          new TextRun({ text: "a prazo em até 10x sem juros ou à vista com 10% de desconto (30% de entrada e restante até o dia da instalação).", size: 28 })
        ],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: "PRAZO DE ENTREGA: ", bold: true, size: 28 }),
          new TextRun({ text: "10 dias úteis.", size: 28 })
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: "CHAVE PIX: ", bold: true, size: 28 }),
          new TextRun({ text: "293956360001-61 Jeisel Almeida Rodrigues de Melo", size: 28 })
        ],
      }),
      new Paragraph({
        spacing: { after: 400 },
        children: [
          new TextRun({ text: "*Observação: não trabalhamos aos sábados. Instalações aos sábados têm acréscimo de R$ 100,00.", bold: true, size: 28 })
        ],
      })
    );

    // Documento
    const doc = new Document({
      sections: [{
        properties: {},
        children: childrenElements,
      }]
    });

    downloadDocx(doc, `JC_Cortinas_Orcamento_${p.cliente.replace(/\s+/g, '_')}.docx`);
  };

  const gerarDocxInterno = async (p: any) => {
    const childrenElements: any[] = [];

    childrenElements.push(
      new Paragraph({
        children: [new TextRun({ text: "JC CORTINAS", bold: true, size: 40, color: "2563eb" })],
      }),
      new Paragraph({
        spacing: { after: 400 },
        children: [new TextRun({ text: "Orçamento Interno Analítico", size: 24, color: "6b7280" })],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: "DADOS DO CLIENTE", bold: true, size: 24 })],
      }),
      new Paragraph({
        children: [new TextRun({ text: `Nome: ${p.cliente}`, size: 24 })],
      }),
      new Paragraph({
        spacing: { after: 300 },
        children: [new TextRun({ text: `Data de Emissão: ${p.data}`, size: 24 })],
      })
    );

    // Montando as linhas da tabela
    const tableRows: TableRow[] = [];
    
    // Cabeçalho da Tabela
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Item / Serviço", bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Descrição Técnica", bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true })] })] }), // <-- CORRIGIDO AQUI
        ],
      })
    );

    p.itens?.forEach((item: any, index: number) => {
      // Linha do Ambiente
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({ children: [new TextRun({ text: `AMBIENTE ${index + 1}: ${item.nome.toUpperCase()} (${item.largura}m x ${item.altura}m)`, bold: true })] })],
            })
          ],
        })
      );
      
      // Detalhes do ambiente
      item.detalhes_array?.forEach((det: any) => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(det.tipo)] }),
              new TableCell({ children: [new Paragraph(det.nome)] }),
              new TableCell({ children: [new Paragraph(formatBRL(det.valor))] }),
            ],
          })
        );
      });

      // Subtotal
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ columnSpan: 2, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Subtotal do Ambiente:", italics: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatBRL(item.mat_cost), bold: true })] })] }),
          ],
        })
      );
    });

    // MÃO DE OBRA E DESLOCAMENTO (INSTALAÇÃO)
    const matSumDocx = p.itens?.reduce((acc: number, item: any) => acc + (item.mat_cost || 0), 0) || 0;
    const instDeslDocxFallback = (p.total || 0) - matSumDocx;
    const temInstDocx = p.totais_data?.taxaMinimaAplicada
      ? (p.totais_data.inst > 0 || p.totais_data.desl > 0)
      : (p.totais_data?.globalDetalhes?.length > 0 || instDeslDocxFallback > 0.01);

    if (temInstDocx) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({ children: [new TextRun({ text: "MÃO DE OBRA E DESLOCAMENTO (INSTALAÇÃO)", bold: true, color: "059669" })] })],
            })
          ],
        })
      );

      if (p.totais_data?.taxaMinimaAplicada) {
        if (p.totais_data.inst > 0) {
          tableRows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Instalação (Mínimo Residencial)")] }),
                new TableCell({ children: [new Paragraph("Taxa mínima residencial")] }),
                new TableCell({ children: [new Paragraph(formatBRL(p.totais_data.inst))] }),
              ],
            })
          );
        }
        p.totais_data.globalDetalhes
          ?.filter((serv: any) => serv.nome === 'Deslocamento Extra')
          .forEach((serv: any) => {
            tableRows.push(
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(serv.nome)] }),
                  new TableCell({ children: [new Paragraph(serv.desc || 'Serviço Adicional')] }),
                  new TableCell({ children: [new Paragraph(formatBRL(serv.valor))] }),
                ],
              })
            );
          });
      } else if (p.totais_data?.globalDetalhes?.length > 0) {
        p.totais_data.globalDetalhes.forEach((serv: any) => {
          tableRows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(serv.nome)] }),
                new TableCell({ children: [new Paragraph(serv.desc || 'Serviço Adicional')] }),
                new TableCell({ children: [new Paragraph(formatBRL(serv.valor))] }),
              ],
            })
          );
        });
      } else {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Instalação e Deslocamento")] }),
              new TableCell({ children: [new Paragraph("")] }),
              new TableCell({ children: [new Paragraph(formatBRL(instDeslDocxFallback))] }),
            ],
          })
        );
      }
    }

    childrenElements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      })
    );

    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 400 },
        children: [new TextRun({ text: `TOTAL GERAL: ${formatBRL(p.total)}`, bold: true, size: 32, color: "059669" })],
      })
    );

    const doc = new Document({
      sections: [{ properties: {}, children: childrenElements }]
    });

    downloadDocx(doc, `Interno_Jeisel_${p.id}_${p.cliente.replace(/\s+/g, '_')}.docx`);
  };

  // --- FUNÇÕES DE EXCLUSÃO ---
  const executeDelete = async () => {
    if (!idToDelete) return;
    const { error } = await supabase.from('pedidos').delete().eq('id', idToDelete);
    if (!error) setPedidos(pedidos.filter(p => p.id !== idToDelete));
    setIsDeleteModalOpen(false);
  };

  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase.from('pedidos').delete().in('id', selectedIds);
    if (!error) {
      setPedidos(pedidos.filter(p => !selectedIds.includes(p.id)));
      setIsSelectMode(false);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
    }
  };

  const toggleRowSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pedidosProcessados.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pedidosProcessados.map(p => p.id));
    }
  };

  async function updateStatus(id: number, newStatus: string) {
    const { error } = await supabase.from('pedidos').update({ status: newStatus }).eq('id', id);
    if (!error) setPedidos(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
  }

  const carregarParaEdicao = (pedido: any) => {
    localStorage.setItem('jeisel_edit_pedido', JSON.stringify(pedido));
    router.push('/');
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const pedidosProcessados = useMemo(() => {
    let result = pedidos.filter(p => 
      p.cliente.toLowerCase().includes(search.toLowerCase()) || 
      p.id.toString().includes(search) ||
      (p.vendedor && p.vendedor.toLowerCase().includes(search.toLowerCase()))
    );
    result.sort((a, b) => {
      const v1 = a[sortConfig.key];
      const v2 = b[sortConfig.key];
      if (v1 < v2) return sortConfig.direction === 'asc' ? -1 : 1;
      if (v1 > v2) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [search, pedidos, sortConfig]);

  const totalFiltrado = useMemo(() => {
    return pedidosProcessados.reduce((acc, p) => acc + (p.total || 0), 0);
  }, [pedidosProcessados]);

  if (loading) return <div className="p-10 text-center text-gray-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <h3 className="text-xl font-bold text-gray-800 whitespace-nowrap">Histórico</h3>
          <button 
            onClick={exportarExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition shadow-sm"
          >
            <FileXls size={20} /> Excel
          </button>
          
          {role === "ADMIN" && (
            <button 
              onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm ${isSelectMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
            >
              <ListChecks size={20} /> {isSelectMode ? 'Cancelar' : 'Selecionar'}
            </button>
          )}

          {isSelectMode && selectedIds.length > 0 && (
            <button 
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition shadow-sm animate-in fade-in"
            >
              <Trash size={20} /> Apagar ({selectedIds.length})
            </button>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-right w-full md:w-auto">
            <span className="block text-[10px] font-black text-emerald-600 uppercase tracking-wider">Total em Tela</span>
            <span className="block text-lg font-black text-emerald-700 leading-none">{formatBRL(totalFiltrado)}</span>
          </div>

          <div className="relative w-full md:w-72">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar cliente..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <span className="text-xs font-black text-gray-400 uppercase flex items-center px-2">Filtrar por:</span>
        <SortButton label="Data" active={sortConfig.key === 'created_at'} onClick={() => handleSort('created_at')} />
        <SortButton label="Código" active={sortConfig.key === 'id'} onClick={() => handleSort('id')} />
        <SortButton label="Nome" active={sortConfig.key === 'cliente'} onClick={() => handleSort('cliente')} />
        <SortButton label="Valor" active={sortConfig.key === 'total'} onClick={() => handleSort('total')} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-gray-50/50 text-xs uppercase text-gray-400 font-black">
            <tr>
              <th className={`transition-all duration-300 py-5 pl-5 ${isSelectMode ? 'w-14 opacity-100' : 'w-0 p-0 opacity-0 overflow-hidden'}`}>
                <div className={`${isSelectMode ? 'block' : 'hidden'}`}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === pedidosProcessados.length && pedidosProcessados.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </th>
              <th className="p-5">Cód</th>
              <th className="p-5">Data</th>
              <th className="p-5">Status</th>
              <th className="p-5">Cliente</th>
              {role === "ADMIN" ? <th className="p-5">Vendedor</th> : null}
              <th className="p-5">Total</th>
              <th className="p-5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pedidosProcessados.map(p => (
              <tr 
                key={p.id} 
                className={`transition-colors cursor-default ${selectedIds.includes(p.id) ? 'bg-indigo-50/50' : 'hover:bg-blue-50/20'}`}
                onClick={() => { if (isSelectMode) toggleRowSelection(p.id); }}
              >
                <td className={`transition-all duration-300 py-5 pl-5 ${isSelectMode ? 'w-14 opacity-100' : 'w-0 p-0 opacity-0 overflow-hidden'}`}>
                   <div className={`${isSelectMode ? 'block' : 'hidden'}`}>
                     <input 
                        type="checkbox" 
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleRowSelection(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                   </div>
                </td>
                <td className="p-5 font-mono text-gray-400 text-xs">#{p.id}</td>
                <td className="p-5 text-sm font-medium text-gray-500 whitespace-nowrap">
                  {new Date(p.created_at || p.data).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-5" onClick={(e) => isSelectMode && e.stopPropagation()}>
                  <StatusDropdown status={p.status} onUpdate={(val) => updateStatus(p.id, val)} />
                </td>
                <td className="p-5 font-bold text-gray-800">{p.cliente}</td>
                {role === "ADMIN" ? <td className="p-5 text-xs text-blue-500 font-bold">{p.vendedor || 'Padrão'}</td> : null}
                <td className="p-5 font-black text-emerald-600">{formatBRL(p.total)}</td>
                <td className="p-5" onClick={(e) => isSelectMode && e.stopPropagation()}>
                  <div className="flex justify-center gap-2">
                    <button onClick={() => setSelectedPedido(p)} title="Ver Detalhes" className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Eye size={18} /></button>
                    
                    <button onClick={() => { setPedidoParaPdf(p); setIsPdfModalOpen(true); }} title="Baixar Orçamento" className="p-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-600 hover:text-white transition-all"><FilePdf size={18} /></button>
                    
                    <button onClick={() => carregarParaEdicao(p)} title="Editar Pedido" className="p-2 text-indigo-500 bg-indigo-50 hover:bg-indigo-500 hover:text-white rounded-lg transition-all"><PencilSimple size={18} /></button>
                    
                    {role === "ADMIN" && !isSelectMode ? (
                      <button onClick={() => { setIdToDelete(p.id); setIsDeleteModalOpen(true); }} title="Excluir" className="p-2 text-red-400 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg transition-all"><Trash size={18} /></button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE ESCOLHA DE PDF E WORD REESTRUTURADO */}
      {isPdfModalOpen && pedidoParaPdf && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-2xl w-full relative animate-in zoom-in duration-200">
            <button onClick={() => setIsPdfModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full transition-colors"><X size={20} weight="bold" /></button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <FilePdf size={32} weight="duotone" />
              </div>
              <h2 className="text-2xl font-black text-gray-800">Baixar Orçamento</h2>
              <p className="text-gray-500 text-sm mt-1">Escolha o formato que deseja baixar (PDF ou Word Editável)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* CARD: Via do Cliente */}
              <div className="flex flex-col items-center p-6 border-2 border-indigo-100 bg-indigo-50/30 rounded-xl hover:border-indigo-300 transition-all">
                <User size={32} className="text-indigo-500 mb-3" weight="duotone" />
                <span className="font-bold text-gray-800 text-lg">Via do Cliente</span>
                <span className="text-xs text-gray-500 mt-2 text-center mb-5">Modelo limpo com PIX para enviar ao cliente.</span>
                
                <div className="flex w-full gap-2 mt-auto">
                  <button 
                    onClick={() => gerarPdfCliente(pedidoParaPdf)}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition"
                  >
                    <FilePdf size={18} /> PDF
                  </button>
                  <button 
                    onClick={() => gerarDocxCliente(pedidoParaPdf)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm py-2.5 rounded-lg font-bold hover:bg-blue-700 transition"
                  >
                    <FileDoc size={18} /> Word
                  </button>
                </div>
              </div>

              {/* CARD: Via do Orçador */}
              <div className="flex flex-col items-center p-6 border-2 border-amber-100 bg-amber-50/30 rounded-xl hover:border-amber-300 transition-all">
                <Wrench size={32} className="text-amber-500 mb-3" weight="duotone" />
                <span className="font-bold text-gray-800 text-lg">Via do Orçador</span>
                <span className="text-xs text-gray-500 mt-2 text-center mb-5">Tabela completa com a memória de cálculo.</span>
                
                <div className="flex w-full gap-2 mt-auto">
                  <button 
                    onClick={() => gerarPdfInterno(pedidoParaPdf)}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-600 text-white text-sm py-2.5 rounded-lg font-bold hover:bg-amber-700 transition"
                  >
                    <FilePdf size={18} /> PDF
                  </button>
                  <button 
                    onClick={() => gerarDocxInterno(pedidoParaPdf)}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-600 text-white text-sm py-2.5 rounded-lg font-bold hover:bg-orange-700 transition"
                  >
                    <FileDoc size={18} /> Word
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES (Mantido) */}
      {selectedPedido && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2"><MathOperations size={24}/> Memória #{selectedPedido.id}</h2>
              <button onClick={() => setSelectedPedido(null)} className="p-1 hover:bg-white/20 rounded"><X size={24}/></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {selectedPedido.itens?.map((it: any, i: number) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                  <p className="font-bold text-blue-600 mb-2">{it.nome}</p>
                  <div className="space-y-1">
                    {it.detalhes_array?.map((d: any, di: number) => (
                      <div key={di} className="flex justify-between text-xs text-gray-600">
                        <span>{d.tipo}: {d.nome}</span>
                        <span className="font-bold">{formatBRL(d.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t flex justify-between items-center font-black">
                <span className="text-gray-400 uppercase text-xs">Total</span>
                <span className="text-2xl text-emerald-600">{formatBRL(selectedPedido.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETAR ÚNICO */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-4 animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><Warning size={32} weight="duotone" /></div>
            <h2 className="text-xl font-bold text-gray-800">Excluir Registro?</h2>
            <p className="text-sm text-gray-500">Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 rounded-xl font-bold">Cancelar</button>
              <button onClick={executeDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-700 transition-colors text-white rounded-xl font-bold shadow-lg shadow-red-200">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* NOVO MODAL: DELETAR EM MASSA */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-4 animate-in zoom-in duration-200 border-t-8 border-red-600">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckSquareOffset size={32} weight="duotone" />
            </div>
            <h2 className="text-2xl font-black text-gray-800">Atenção!</h2>
            <p className="text-gray-500">Você está prestes a apagar <b>{selectedIds.length} pedidos</b>. Tem certeza que deseja limpar esses registros?</p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsBulkDeleteModalOpen(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 rounded-xl font-bold">Cancelar</button>
              <button onClick={executeBulkDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-700 transition-colors text-white rounded-xl font-black shadow-lg shadow-red-200 uppercase text-sm">Apagar Tudo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortButton({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all border ${active ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"}`}>
      {label}
    </button>
  );
}

function StatusDropdown({ status, onUpdate }: { status: string, onUpdate: (val: string) => void }) {
  const configs: any = { andamento: "bg-blue-100 text-blue-700 border-blue-200", finalizado: "bg-emerald-100 text-emerald-700 border-emerald-200", cancelado: "bg-red-100 text-red-700 border-red-200" };
  return (
    <div className="relative">
      <select value={status} onChange={(e) => onUpdate(e.target.value)} className={`appearance-none pl-3 pr-8 py-1.5 rounded-full border text-[10px] font-black uppercase outline-none cursor-pointer transition-colors ${configs[status]}`}>
        <option value="andamento">Aberto</option>
        <option value="finalizado">Finalizado</option>
        <option value="cancelado">Cancelado</option>
      </select>
      <CaretDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
    </div>
  );
}
