-- 1. Criar o Schema dedicado
CREATE SCHEMA IF NOT EXISTS whatsapp_disparo;

-- 2. Criar a tabela de respostas
CREATE TABLE IF NOT EXISTS whatsapp_disparo.respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    message_id TEXT UNIQUE,
    text_content TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    raw_payload JSONB -- Para guardar o JSON completo caso precise de mais infos
);

-- 3. Índices para busca rápida por telefone (usado no Sync)
CREATE INDEX IF NOT EXISTS idx_respostas_phone ON whatsapp_disparo.respostas(phone);
CREATE INDEX IF NOT EXISTS idx_respostas_received_at ON whatsapp_disparo.respostas(received_at);

-- 4. Permissões (Ajuste conforme necessário para seu usuário da API)
-- Se estiver usando Edge Functions, a service_role terá acesso total.
GRANT USAGE ON SCHEMA whatsapp_disparo TO authenticated;
GRANT USAGE ON SCHEMA whatsapp_disparo TO service_role;
GRANT ALL ON TABLE whatsapp_disparo.respostas TO authenticated;
GRANT ALL ON TABLE whatsapp_disparo.respostas TO service_role;

-- 5. Comentário explicativo
COMMENT ON TABLE whatsapp_disparo.respostas IS 'Tabela para armazenar respostas do Z-API via Webhook (Multi-dispositivo).';
