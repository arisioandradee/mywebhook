const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json());

// --- CONFIGURAÇÃO (Via Variáveis de Ambiente no Render) ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT || 3000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ ERRO: Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas!');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

app.post('/webhook-zapi', async (req, res) => {
    try {
        const payload = req.body;
        console.log('--- Novo Webhook Z-API ---');
        console.log('Telefone:', payload.phone);
        console.log('Mensagem:', payload.text?.message);

        // Salva apenas se for mensagem RECEBIDA (fromMe: false)
        if (payload.fromMe === false && payload.text?.message) {
            const { error } = await supabase
                .from('respostas')
                .insert({
                    instance_id: payload.instanceId,
                    phone: payload.phone.replace(/\D/g, ''),
                    message_id: payload.messageId,
                    text_content: payload.text.message,
                    raw_payload: payload
                })
                .schema('whatsapp_disparo');

            if (error) {
                console.error('Erro no Supabase:', error.message);
            } else {
                console.log('✅ Resposta salva com sucesso no banco!');
            }
        }

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Erro ao processar webhook:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor Webhook Z-API rodando na porta ${PORT}`);
    console.log(`URL do Webhook para o painel Z-API: http://SEU_IP_DO_SERVIDOR:${PORT}/webhook-zapi`);
});
