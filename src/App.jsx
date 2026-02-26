import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import {
    Upload,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Search,
    Users,
    Send,
    FileText,
    ArrowRight,
    Sparkles,
    History,
    Calendar,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';

const API_CHAT_MESSAGES_URL = (phone) => `https://api.z-api.io/instances/3EEA3D99189391BBC88ABED0B6A7ED81/token/6B110D271420AD0C3E76AA6E/chat-messages/${phone}?amount=10`;
const API_MESSAGES_MD_URL = (phone) => `https://api.z-api.io/instances/3EEA3D99189391BBC88ABED0B6A7ED81/token/6B110D271420AD0C3E76AA6E/messages?phone=${phone}&amount=10`;
const FIXED_CLIENT_TOKEN = '6B110D271420AD0C3E76AA6E'; // Token interno do client

// --- CONFIGURAÇÃO SUPABASE ---
// Substitua pelos dados do seu servidor próprio
const SUPABASE_URL = 'SUA_URL_DO_SUPABASE';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function App() {
    const [contacts, setContacts] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState('broadcast'); // 'broadcast' or 'history'
    const [history, setHistory] = useState([]);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [useButtons, setUseButtons] = useState(true);

    // Carregar histórico do localStorage
    useEffect(() => {
        const savedHistory = localStorage.getItem('disparo_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error('Erro ao carregar histórico:', e);
            }
        }
    }, []);

    // Salvar histórico no localStorage
    const saveToHistory = (newEntry) => {
        const updatedHistory = [newEntry, ...history];
        setHistory(updatedHistory);
        localStorage.setItem('disparo_history', JSON.stringify(updatedHistory));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setStatus({ type: '', message: '' });

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const mappedContacts = data.map((row, index) => ({
                    id: index,
                    nome_socio: row.whatsapp_socio_nome || row.nome_socio || 'N/A',
                    whatsapp_socio: row.whatsapp_socio || '',
                    nome_empresa: row.nome_fantasia || row.nome_empresa || row.razao_social || 'N/A',
                    status: 'pending',
                    response: null
                })).filter(c => c.whatsapp_socio);

                setContacts(mappedContacts);
                setSelectedIds(new Set(mappedContacts.map(c => c.id)));
                setStatus({ type: 'success', message: `${mappedContacts.length} contatos carregados.` });
            } catch (err) {
                setStatus({ type: 'error', message: 'Erro ao processar o arquivo Excel.' });
            } finally {
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredContacts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredContacts.map(c => c.id)));
        }
    };

    const toggleSelect = (id) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const sendMessages = async () => {
        const selectedContacts = contacts.filter(c => selectedIds.has(c.id));
        if (selectedContacts.length === 0) return;

        setSending(true);
        let successCount = 0;
        let errorCount = 0;
        const results = [];

        for (const contact of selectedContacts) {
            setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: 'sending' } : c));

            try {
                const message = `Olá, falo com ${contact.nome_socio}, da empresa ${contact.nome_empresa}?`;
                let phone = contact.whatsapp_socio.toString().replace(/\D/g, '');

                if (phone.length === 10 || phone.length === 11) {
                    phone = '55' + phone;
                }

                const endpoint = useButtons ? API_BUTTONS_URL : 'https://api.z-api.io/instances/3EEA3D99189391BBC88ABED0B6A7ED81/token/6B110D271420AD0C3E76AA6E/send-text';

                const body = useButtons ? {
                    phone: phone,
                    message: message,
                    buttonList: {
                        buttons: [
                            { id: 'btn_sim', label: 'Sim, sou eu' },
                            { id: 'btn_nao', label: 'Não, não sou' }
                        ]
                    }
                } : {
                    phone: phone,
                    message: message + "\n\nResponda *Sim* ou *Não*."
                };

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Client-Token': FIXED_CLIENT_TOKEN
                    },
                    body: JSON.stringify(body)
                });

                if (response.ok) {
                    successCount++;
                    const updatedContact = { ...contact, status: 'success' };
                    results.push(updatedContact);
                    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: 'success' } : c));
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Erro na API:', errorData);
                    errorCount++;
                    const updatedContact = { ...contact, status: 'error' };
                    results.push(updatedContact);
                    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: 'error' } : c));
                }
            } catch (err) {
                console.error('Erro no envio:', err);
                errorCount++;
                const updatedContact = { ...contact, status: 'error' };
                results.push(updatedContact);
                setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: 'error' } : c));
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Adicionar ao histórico
        saveToHistory({
            id: Date.now(),
            timestamp: new Date().toLocaleString(),
            total: selectedContacts.length,
            success: successCount,
            error: errorCount,
            contacts: results
        });

        setSending(false);
        setStatus({
            type: errorCount === 0 ? 'success' : 'warning',
            message: `Concluído. Sucesso: ${successCount}, Erros: ${errorCount}`
        });
    };

    const syncResponses = async () => {
        if (!selectedHistory || !SUPABASE_URL || SUPABASE_URL === 'SUA_URL_DO_SUPABASE') {
            if (SUPABASE_URL === 'SUA_URL_DO_SUPABASE') {
                setStatus({ type: 'error', message: 'Configure a URL e a KEY do Supabase no topo do código.' });
            }
            return;
        }

        setSyncing(true);
        const updatedContacts = [...selectedHistory.contacts];
        let hasChanges = false;

        try {
            // 1. Coletar todos os telefones do histórico para busca em lote
            const phones = updatedContacts.map(c => {
                let p = c.whatsapp_socio.toString().replace(/\D/g, '');
                return p.length <= 11 ? '55' + p : p;
            });

            // Também incluímos as versões sem o 9º dígito caso o Z-API tenha enviado assim
            const phones8 = phones
                .filter(p => p.startsWith('55') && p.length === 13)
                .map(p => p.replace(/^(55\d{2})9(\d{8})$/, '$1$2'));

            const allSearchPhones = [...new Set([...phones, ...phones8])];

            console.log('Sincronizando via Supabase para:', allSearchPhones);

            // 2. Buscar no Supabase todas as respostas desses números
            const { data: dbRespostas, error } = await supabase
                .from('respostas')
                .select('phone, text_content, received_at')
                .in('phone', allSearchPhones)
                .order('received_at', { ascending: false })
                .schema('whatsapp_disparo');

            if (error) throw error;

            if (dbRespostas && dbRespostas.length > 0) {
                console.log(`${dbRespostas.length} respostas encontradas no banco.`);

                for (let i = 0; i < updatedContacts.length; i++) {
                    const contact = updatedContacts[i];
                    if (contact.status !== 'success' && contact.status !== 'confirmed' && contact.status !== 'denied') continue;

                    let p9 = contact.whatsapp_socio.toString().replace(/\D/g, '');
                    if (p9.length <= 11) p9 = '55' + p9;
                    const p8 = p9.startsWith('55') && p9.length === 13 ? p9.replace(/^(55\d{2})9(\d{8})$/, '$1$2') : null;

                    // Encontra a resposta mais recente para este contato (p9 ou p8)
                    const resp = dbRespostas.find(r => r.phone === p9 || (p8 && r.phone === p8));

                    if (resp) {
                        const replyLower = resp.text_content.toLowerCase();
                        if (replyLower.includes('sim') || replyLower.includes('sou eu')) {
                            updatedContacts[i] = { ...contact, status: 'confirmed', response: resp.text_content };
                            hasChanges = true;
                        } else if (replyLower.includes('não') || replyLower.includes('nao') || replyLower.includes('não sou')) {
                            updatedContacts[i] = { ...contact, status: 'denied', response: resp.text_content };
                            hasChanges = true;
                        }
                    }
                }
            } else {
                console.log('Nenhuma resposta nova encontrada no Supabase.');
            }
        } catch (e) {
            console.error('Erro na sincronização via Supabase:', e);
            setStatus({ type: 'error', message: 'Erro ao conectar com o Supabase. Verifique os logs.' });
        }

        if (hasChanges) {
            const newHistory = history.map(h =>
                h.id === selectedHistory.id ? { ...h, contacts: updatedContacts } : h
            );
            setHistory(newHistory);
            setSelectedHistory({ ...selectedHistory, contacts: updatedContacts });
            localStorage.setItem('disparo_history', JSON.stringify(newHistory));
            setStatus({ type: 'success', message: 'Respostas atualizadas com sucesso!' });
        }

        setSyncing(false);
    };

    const filteredContacts = contacts.filter(c =>
        c.nome_socio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.nome_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.whatsapp_socio.toString().includes(searchTerm)
    );

    const renderBroadcastView = () => (
        <div className="w-full max-w-5xl mt-12 grid grid-cols-1 md:grid-cols-12 gap-8 fade-in-up" style={{ animationDelay: '0.2s' }}>
            {/* UI Actions Side */}
            <div className="md:col-span-4 space-y-6">
                <div className="content-box p-8 space-y-8">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight">Importação</h3>
                    </div>

                    <div className="upload-wrapper relative group">
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={loading || sending}
                        />
                        <div className="space-y-3">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">Upar Planilha</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Formatos: .xlsx / .xls</p>
                            </div>
                        </div>
                    </div>

                    {status.message && (
                        <div className={`text-xs p-4 rounded-xl flex items-center gap-3 font-bold text-center justify-center ${status.type === 'success' ? 'bg-emerald-500/5 text-emerald-400 border border-emerald-500/10' : 'bg-amber-500/5 text-amber-400 border border-amber-500/10'
                            }`}>
                            {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {status.message}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Modo Interativo</p>
                            <p className="text-[9px] text-slate-600 uppercase">Usa botões do WhatsApp</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useButtons}
                                onChange={(e) => setUseButtons(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                        </label>
                    </div>

                    <button
                        className="btn-acessar h-14 text-sm uppercase tracking-[0.2em]"
                        onClick={sendMessages}
                        disabled={selectedIds.size === 0 || sending}
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                        {sending ? 'Disparando...' : 'Fazer Disparos'}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Data List Side */}
            <div className="md:col-span-8">
                <div className="content-box">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center px-8 bg-slate-900/30">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Leads Detalhes</span>
                            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black">LIVE</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <button
                                className="flex items-center gap-2 group transition-all"
                                onClick={toggleSelectAll}
                            >
                                <input type="checkbox" checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0} readOnly className="cb-custom pointer-events-none" />
                                <span className="text-[10px] font-black text-slate-500 group-hover:text-white uppercase tracking-widest transition-colors">Marcar Todos</span>
                            </button>
                        </div>
                    </div>

                    {contacts.length > 0 ? (
                        <div className="max-h-[500px] overflow-y-auto">
                            <table className="dibai-table">
                                <thead>
                                    <tr>
                                        <th className="w-10"></th>
                                        <th>Nome</th>
                                        <th>WhatsApp</th>
                                        <th className="text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredContacts.map(c => (
                                        <tr key={c.id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(c.id)}
                                                    onChange={() => toggleSelect(c.id)}
                                                    className="cb-custom"
                                                />
                                            </td>
                                            <td>
                                                <div className="font-bold text-sm text-white">{c.nome_socio}</div>
                                                <div className="text-[10px] text-slate-600 uppercase tracking-widest mt-0.5">{c.nome_empresa}</div>
                                            </td>
                                            <td className="text-sm font-medium">{c.whatsapp_socio}</td>
                                            <td className="text-right">
                                                {c.status === 'success' && <span className="text-emerald-400 text-xs font-bold">✓ ENVIADO</span>}
                                                {c.status === 'error' && <span className="text-rose-400 text-xs font-bold">✗ FALHOU</span>}
                                                {c.status === 'sending' && <Loader2 className="w-4 h-4 animate-spin text-indigo-400 inline" />}
                                                {c.status === 'pending' && <span className="text-slate-600 text-xs font-bold">AGUARDANDO</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-20 text-center space-y-2 opacity-30">
                            <Users className="w-12 h-12 mx-auto text-slate-600" />
                            <p className="text-sm font-bold uppercase tracking-widest">Nenhum dado na lista</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderHistoryView = () => (
        <div className="w-full max-w-5xl mt-12 fade-in-up">
            {selectedHistory ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <button
                            onClick={() => setSelectedHistory(null)}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-widest">Voltar ao Histórico</span>
                        </button>

                        <button
                            onClick={syncResponses}
                            disabled={syncing}
                            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            {syncing ? 'Sincronizando...' : 'Sincronizar Respostas'}
                        </button>
                    </div>

                    <div className="content-box">
                        <div className="p-8 border-b border-white/5 bg-slate-900/30 flex justify-between items-end">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Relatório de Disparo</p>
                                <h3 className="text-2xl font-bold">{selectedHistory.timestamp}</h3>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sucesso</p>
                                    <p className="text-xl font-bold text-emerald-400">{selectedHistory.success}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Falhas</p>
                                    <p className="text-xl font-bold text-rose-400">{selectedHistory.error}</p>
                                </div>
                            </div>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto">
                            <table className="dibai-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>WhatsApp</th>
                                        <th className="text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedHistory.contacts.map((c, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div className="font-bold text-sm text-white">{c.nome_socio}</div>
                                                <div className="text-[10px] text-slate-600 uppercase tracking-widest mt-0.5">{c.nome_empresa}</div>
                                            </td>
                                            <td className="text-sm font-medium">{c.whatsapp_socio}</td>
                                            <td className="text-right">
                                                {c.status === 'success' && <span className="text-indigo-400 text-xs font-bold">✓ ENVIADO</span>}
                                                {c.status === 'confirmed' && <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-[9px] font-black">CONFIRMADO</span>}
                                                {c.status === 'denied' && <span className="bg-rose-500/10 text-rose-400 px-2 py-1 rounded text-[9px] font-black">NEGADO</span>}
                                                {c.status === 'error' && <span className="text-rose-400 text-xs font-bold">✗ FALHOU</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {history.length > 0 ? history.map((item) => (
                        <div
                            key={item.id}
                            className="content-box p-6 hover:border-indigo-500/50 transition-all cursor-pointer group"
                            onClick={() => setSelectedHistory(item)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div className="bg-slate-800 px-2 py-1 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    {item.total} envios
                                </div>
                            </div>

                            <h4 className="font-bold text-white mb-1">{item.timestamp}</h4>
                            <div className="flex gap-4 mt-4">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sucesso</p>
                                    <p className="text-sm font-bold text-emerald-400">{item.success}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Falhas</p>
                                    <p className="text-sm font-bold text-rose-400">{item.error}</p>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Ver Detalhes</span>
                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full content-box p-20 text-center space-y-2 opacity-30">
                            <History className="w-12 h-12 mx-auto text-slate-600" />
                            <p className="text-sm font-bold uppercase tracking-widest">Nenhum histórico encontrado</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen p-8 md:p-20 flex flex-col items-center">
            <div className="w-full max-w-4xl text-center space-y-6 fade-in-up">
                <h1 className="main-title">
                    Contact <span className="accent-title">Dibai Sales</span>
                </h1>

                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Envie mensagens personalizadas para seus leads via WhatsApp de forma massiva e profissional.
                </p>

                <div className="flex justify-center gap-4 mt-8">
                    <button
                        onClick={() => setView('broadcast')}
                        className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${view === 'broadcast' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                        Novo Disparo
                    </button>
                    <button
                        onClick={() => setView('history')}
                        className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${view === 'history' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                        Histórico
                    </button>
                </div>

                {view === 'broadcast' && (
                    <div className="search-container shadow-2xl shadow-indigo-500/10">
                        <Search className="w-5 h-5 text-slate-600" />
                        <input
                            type="text"
                            placeholder="O que você deseja buscar?"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                )}
            </div>

            {view === 'broadcast' ? renderBroadcastView() : renderHistoryView()}
        </div>
    );
}

export default App;
