# JC Cortinas — Sistema de Gestão Comercial

Plataforma full-stack de orçamentos desenvolvida para uma empresa real de cortinas e persianas. **Em produção, em uso diário pelo cliente.**

🔗 https://jeiselcortinas.vercel.app

## O problema

Orçamentos eram feitos manualmente em planilha, com alta chance de erro no cálculo de metragem e retrabalho na hora de gerar o documento para o cliente.

## Decisões técnicas

**Motor de cálculo desacoplado da UI**
A lógica de precificação vive em uma camada de serviço isolada, não nos componentes. Processa múltiplas variáveis (fator de franzimento do tecido, desperdício de forro, mão de obra, metragem linear) e distribui a instalação proporcionalmente entre ambientes. Isolar isso permitiu evoluir regras de negócio sem tocar na interface.

**Segurança em nível de banco**
Supabase Auth com RBAC e PostgreSQL Row Level Security: o isolamento de dados é garantido pelo banco, não pelo frontend. Mesmo com acesso direto à API, um usuário não alcança dados de outro.

**Geração de documentos**
Exportação de orçamentos em PDF e DOCX a partir dos dados estruturados, eliminando a formatação manual.

**Estado complexo**
React + TypeScript gerenciando estados aninhados para orçamentos multi-item sem perda de performance.

## Stack

Next.js · TypeScript · Supabase (PostgreSQL, Auth, RLS) · Tailwind CSS · Vercel
