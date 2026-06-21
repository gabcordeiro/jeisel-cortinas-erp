-- ============================================================
-- MIGRAÇÃO: Adiciona categorias de persiana à tabela materiais
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Remove a constraint antiga que só permite as categorias de cortina
ALTER TABLE materiais DROP CONSTRAINT IF EXISTS materiais_categoria_check;

-- 2. Cria nova constraint incluindo todas as categorias de persiana
ALTER TABLE materiais ADD CONSTRAINT materiais_categoria_check
CHECK (categoria IN (
  'tecido',
  'forro',
  'modelo',
  'ferragem',
  'servico_fixo',
  'servico_metro',
  'persiana_rolo',
  'persiana_vertical',
  'persiana_horizontal',
  'persiana_romana',
  'persiana_painel',
  'persiana_acessorio'
));

-- 3. Insere as taxas de cálculo de persiana (se não existirem)
INSERT INTO configuracoes_globais (chave, valor, descricao)
VALUES
  ('persiana_margem', 0.115, 'Margem sobre o preço de fábrica da persiana (11,5%)'),
  ('persiana_lucio',  1.5,   'Multiplicador Lúcio para persiana (×1,5)')
ON CONFLICT (chave) DO NOTHING;
