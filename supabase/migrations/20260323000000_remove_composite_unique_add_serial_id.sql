-- Migration: Remove composite unique constraints from recebimentos, pagamentos, lancamentos
-- and add serial id as primary key. This allows multiple partial payments per parcela.

-- ============================================================
-- RECEBIMENTOS
-- ============================================================

-- Drop existing primary key / unique constraint on (id_faturamento, numero_parcela)
ALTER TABLE recebimentos DROP CONSTRAINT IF EXISTS recebimentos_pkey;
ALTER TABLE recebimentos DROP CONSTRAINT IF EXISTS recebimentos_id_faturamento_numero_parcela_key;

-- Add serial id as primary key
ALTER TABLE recebimentos ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE recebimentos ADD PRIMARY KEY (id);

-- ============================================================
-- PAGAMENTOS
-- ============================================================

-- Drop existing primary key / unique constraint on (id_lancamento, numero_parcela)
ALTER TABLE pagamentos DROP CONSTRAINT IF EXISTS pagamentos_pkey;
ALTER TABLE pagamentos DROP CONSTRAINT IF EXISTS pagamentos_id_lancamento_numero_parcela_key;

-- Add serial id as primary key
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE pagamentos ADD PRIMARY KEY (id);

-- ============================================================
-- LANCAMENTOS
-- ============================================================

-- Drop existing primary key / unique constraint on (id_lancamento, numero_parcela)
ALTER TABLE lancamentos DROP CONSTRAINT IF EXISTS lancamentos_pkey;
ALTER TABLE lancamentos DROP CONSTRAINT IF EXISTS lancamentos_id_lancamento_numero_parcela_key;

-- Add serial id as primary key
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE lancamentos ADD PRIMARY KEY (id);
