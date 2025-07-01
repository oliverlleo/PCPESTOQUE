/**
 * recebimento.js
 * Módulo de recebimento de materiais usando APENAS Cloud Firestore
 * 
 * MIGRAÇÃO COMPLETA: Realtime Database removido completamente
 */

console.log('📦 recebimento.js carregado - FIRESTORE EXCLUSIVO');

// Variáveis globais
let todosItens = [];
let tabelaItens;
let filtroSelecionado = 'pendentes';
let itensSelecionadosParaRecebimento = [];
let eventosSelecionados = [];
let calendarioInicializado = false;
let codigosMateriaisRegistrados = new Set();
let fornecedores = new Map();
let calendario;

// Inicialização
document.addEventListener("DOMContentLoaded", function() {
    console.log('🚀 Inicializando página de recebimento...');
    
    if (window.db) {
        inicializarPagina();
    } else {
        window.addEventListener('firebaseReady', inicializarPagina);
    }
});

/**
 * Inicializar página
 */
function inicializarPagina() {
    console.log('📦 Configurando página de recebimento...');
    
    inicializarComponentesBasicos();
    carregarItensComprados();
    configurarEventListeners();
    inicializarCalendario();
}

/**
 * Inicializar componentes básicos
 */
function inicializarComponentesBasicos() {
    console.log('🔧 Inicializando componentes básicos...');
    
    // Inicializar filtros
    if (typeof $ !== 'undefined' && $.fn.select2) {
        $("#filtroFornecedor").select2({
            placeholder: "Filtrar por fornecedor",
            allowClear: true
        });
        
        $("#filtroStatus").select2({
            placeholder: "Filtrar por status",
            allowClear: true
        });
    }
    
    // Configurar tabs
    configurarTabs();
}

/**
 * Configurar event listeners
 */
function configurarEventListeners() {
    // Filtros
    document.getElementById('filtroStatus')?.addEventListener('change', aplicarFiltros);
    document.getElementById('filtroFornecedor')?.addEventListener('change', aplicarFiltros);
    
    // Botões de ação
    document.getElementById('btnConfirmarRecebimento')?.addEventListener('click', confirmarRecebimento);
    document.getElementById('btnSelecionarTodos')?.addEventListener('click', selecionarTodosItens);
    document.getElementById('btnLimparSelecao')?.addEventListener('click', limparSelecao);
    document.getElementById('btnExportarRecebimento')?.addEventListener('click', exportarRecebimento);
    
    // Tabs
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            const target = event.target.getAttribute('data-bs-target');
            if (target === '#calendario-tab') {
                inicializarCalendario();
            }
        });
    });
}

/**
 * Carregar itens comprados
 */
async function carregarItensComprados() {
    try {
        console.log('📥 Carregando itens comprados...');
        
        mostrarCarregamento(true);
        
        // Buscar itens comprados
        const itensComprados = await window.FirestoreAPI.buscarItensPorStatus('Comprado');
        
        console.log(`✅ ${itensComprados.length} itens comprados carregados`);
        
        // Processar itens para recebimento
        todosItens = processarItensParaRecebimento(itensComprados);
        
        // Atualizar filtros
        atualizarFiltrosFornecedores();
        
        // Exibir na tabela
        exibirItensNaTabela();
        
        mostrarCarregamento(false);
        
    } catch (error) {
        console.error('❌ Erro ao carregar itens:', error);
        mostrarNotificacao('Erro ao carregar itens comprados', 'danger');
        mostrarCarregamento(false);
    }
}

/**
 * Processar itens para recebimento
 */
function processarItensParaRecebimento(itens) {
    return itens.map(item => {
        // Calcular status de recebimento
        let statusRecebimento = item.statusRecebimento || 'Pendente';
        
        // Verificar se já foi recebido
        if (item.dataRecebimento || item.quantidadeRecebida > 0) {
            statusRecebimento = 'Recebido';
        }
        
        // Calcular quantidade pendente
        const quantidadePendente = (item.quantidadeComprada || item.quantidade || 0) - (item.quantidadeRecebida || 0);
        
        return {
            ...item,
            statusRecebimento: statusRecebimento,
            quantidadePendente: quantidadePendente,
            localEstoque: item.localEstoque || '',
            observacoesRecebimento: item.observacoesRecebimento || '',
            responsavelRecebimento: item.responsavelRecebimento || ''
        };
    });
}

/**
 * Exibir itens na tabela
 */
function exibirItensNaTabela() {
    const tbody = document.querySelector('#tabelaRecebimento tbody');
    if (!tbody) return;
    
    // Filtrar itens baseado no filtro selecionado
    let itensFiltrados = [...todosItens];
    
    switch (filtroSelecionado) {
        case 'pendentes':
            itensFiltrados = todosItens.filter(item => item.statusRecebimento === 'Pendente');
            break;
        case 'recebidos':
            itensFiltrados = todosItens.filter(item => item.statusRecebimento === 'Recebido');
            break;
        case 'todos':
            // Manter todos os itens
            break;
    }
    
    tbody.innerHTML = '';
    
    if (itensFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Nenhum item encontrado</td></tr>';
        return;
    }
    
    itensFiltrados.forEach(item => {
        const row = document.createElement('tr');
        
        const statusClass = getStatusRecebimentoClass(item.statusRecebimento);
        const isPendente = item.statusRecebimento === 'Pendente';
        
        row.innerHTML = `
            <td>
                ${isPendente ? `<input type="checkbox" class="form-check-input item-checkbox" 
                                     data-item-id="${item.id}" data-item-path="${item.path}">` : ''}
            </td>
            <td>${item.codigo || 'N/A'}</td>
            <td>${item.descricao || 'N/A'}</td>
            <td>${item.quantidadeComprada || 0}</td>
            <td>${item.quantidadeRecebida || 0}</td>
            <td>${item.quantidadePendente}</td>
            <td>
                ${isPendente ? `<input type="number" class="form-control form-control-sm quantidade-receber" 
                                     min="1" max="${item.quantidadePendente}" value="${item.quantidadePendente}"
                                     data-item-path="${item.path}">` : (item.quantidadeRecebida || 0)}
            </td>
            <td>
                <input type="text" class="form-control form-control-sm local-estoque" 
                       value="${item.localEstoque || ''}" placeholder="Local"
                       data-item-path="${item.path}" ${!isPendente ? 'readonly' : ''}>
            </td>
            <td>${item.fornecedor || 'N/A'}</td>
            <td><span class="badge ${statusClass}">${item.statusRecebimento}</span></td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`✅ ${itensFiltrados.length} itens exibidos na tabela`);
}

/**
 * Obter classe CSS para status de recebimento
 */
function getStatusRecebimentoClass(status) {
    switch (status) {
        case 'Pendente': return 'bg-warning';
        case 'Recebido': return 'bg-success';
        case 'Parcial': return 'bg-info';
        default: return 'bg-secondary';
    }
}

/**
 * Confirmar recebimento dos itens selecionados
 */
async function confirmarRecebimento() {
    const itensSelecionados = obterItensSelecionados();
    
    if (itensSelecionados.length === 0) {
        mostrarNotificacao('Selecione ao menos um item para receber', 'warning');
        return;
    }
    
    if (!confirm(`Confirma o recebimento de ${itensSelecionados.length} itens?`)) {
        return;
    }
    
    try {
        console.log(`📦 Confirmando recebimento de ${itensSelecionados.length} itens...`);
        
        const dataRecebimento = new Date().toISOString().split('T')[0];
        
        const atualizacoes = itensSelecionados.map(item => ({
            path: item.path,
            dados: {
                statusRecebimento: 'Recebido',
                quantidadeRecebida: (item.quantidadeRecebida || 0) + item.quantidadeReceber,
                dataRecebimento: dataRecebimento,
                localEstoque: item.localEstoque,
                responsavelRecebimento: 'Sistema', // TODO: Implementar autenticação
                observacoesRecebimento: 'Recebido via sistema'
            }
        }));
        
        await window.FirestoreAPI.atualizarItensLote(atualizacoes);
        
        console.log('✅ Recebimento confirmado');
        mostrarNotificacao(`${itensSelecionados.length} itens recebidos!`, 'success');
        
        // Recarregar itens
        await carregarItensComprados();
        
        // Atualizar calendário
        if (calendarioInicializado) {
            atualizarEventosCalendario();
        }
        
    } catch (error) {
        console.error('❌ Erro ao confirmar recebimento:', error);
        mostrarNotificacao('Erro ao confirmar recebimento', 'danger');
    }
}

/**
 * Obter itens selecionados com dados de recebimento
 */
function obterItensSelecionados() {
    const checkboxes = document.querySelectorAll('.item-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => {
        const row = checkbox.closest('tr');
        const quantidadeInput = row.querySelector('.quantidade-receber');
        const localInput = row.querySelector('.local-estoque');
        
        return {
            id: checkbox.dataset.itemId,
            path: checkbox.dataset.itemPath,
            quantidadeReceber: parseInt(quantidadeInput?.value) || 1,
            localEstoque: localInput?.value || ''
        };
    });
}

/**
 * Selecionar todos os itens
 */
function selecionarTodosItens() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    
    mostrarNotificacao(`${checkboxes.length} itens selecionados`, 'info');
}

/**
 * Limpar seleção
 */
function limparSelecao() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    mostrarNotificacao('Seleção limpa', 'info');
}

/**
 * Aplicar filtros
 */
function aplicarFiltros() {
    const filtroStatus = document.getElementById('filtroStatus')?.value;
    const filtroFornecedor = document.getElementById('filtroFornecedor')?.value;
    
    console.log('🔍 Aplicando filtros:', { status: filtroStatus, fornecedor: filtroFornecedor });
    
    let itensFiltrados = [...todosItens];
    
    // Filtrar por status
    if (filtroStatus) {
        itensFiltrados = itensFiltrados.filter(item => item.statusRecebimento === filtroStatus);
    }
    
    // Filtrar por fornecedor
    if (filtroFornecedor) {
        itensFiltrados = itensFiltrados.filter(item => item.fornecedor === filtroFornecedor);
    }
    
    // Atualizar filtro selecionado
    if (filtroStatus) {
        filtroSelecionado = filtroStatus.toLowerCase();
    }
    
    // Exibir itens filtrados
    exibirItensNaTabela();
}

/**
 * Atualizar filtros de fornecedores
 */
function atualizarFiltrosFornecedores() {
    const filtroFornecedor = document.getElementById('filtroFornecedor');
    if (!filtroFornecedor) return;
    
    // Obter fornecedores únicos
    const fornecedores = [...new Set(todosItens.map(item => item.fornecedor))].filter(Boolean);
    
    // Limpar e popular select
    filtroFornecedor.innerHTML = '<option value="">Todos os fornecedores</option>';
    
    fornecedores.forEach(fornecedor => {
        const option = document.createElement('option');
        option.value = fornecedor;
        option.textContent = fornecedor;
        filtroFornecedor.appendChild(option);
    });
    
    // Atualizar Select2
    if (typeof $ !== 'undefined' && $.fn.select2) {
        $("#filtroFornecedor").trigger('change');
    }
}

/**
 * Configurar tabs
 */
function configurarTabs() {
    // Tab de itens pendentes
    document.getElementById('pendentes-tab')?.addEventListener('click', function() {
        filtroSelecionado = 'pendentes';
        exibirItensNaTabela();
    });
    
    // Tab de itens recebidos
    document.getElementById('recebidos-tab')?.addEventListener('click', function() {
        filtroSelecionado = 'recebidos';
        exibirItensNaTabela();
    });
    
    // Tab de todos os itens
    document.getElementById('todos-tab')?.addEventListener('click', function() {
        filtroSelecionado = 'todos';
        exibirItensNaTabela();
    });
}

/**
 * Inicializar calendário
 */
function inicializarCalendario() {
    if (calendarioInicializado) return;
    
    const calendarEl = document.getElementById('calendario');
    if (!calendarEl) return;
    
    try {
        if (typeof FullCalendar !== 'undefined') {
            calendario = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                },
                locale: 'pt-br',
                events: [],
                eventClick: function(info) {
                    mostrarDetalhesEvento(info.event);
                }
            });
            
            calendario.render();
            calendarioInicializado = true;
            
            // Carregar eventos
            atualizarEventosCalendario();
            
            console.log('✅ Calendário inicializado');
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar calendário:', error);
    }
}

/**
 * Atualizar eventos do calendário
 */
function atualizarEventosCalendario() {
    if (!calendarioInicializado || !calendario) return;
    
    const eventos = [];
    
    // Adicionar eventos de recebimento
    todosItens.forEach(item => {
        if (item.dataRecebimento) {
            eventos.push({
                title: `Recebido: ${item.codigo}`,
                date: item.dataRecebimento,
                color: '#28a745',
                extendedProps: {
                    tipo: 'recebimento',
                    item: item
                }
            });
        }
        
        if (item.prazoEntrega && item.statusRecebimento === 'Pendente') {
            eventos.push({
                title: `Prazo: ${item.codigo}`,
                date: item.prazoEntrega,
                color: '#ffc107',
                extendedProps: {
                    tipo: 'prazo',
                    item: item
                }
            });
        }
    });
    
    // Remover eventos existentes e adicionar novos
    calendario.removeAllEvents();
    calendario.addEventSource(eventos);
    
    console.log(`✅ ${eventos.length} eventos adicionados ao calendário`);
}

/**
 * Mostrar detalhes do evento
 */
function mostrarDetalhesEvento(event) {
    const item = event.extendedProps.item;
    const tipo = event.extendedProps.tipo;
    
    let conteudo = `
        <h6>${event.title}</h6>
        <hr>
        <p><strong>Código:</strong> ${item.codigo}</p>
        <p><strong>Descrição:</strong> ${item.descricao}</p>
        <p><strong>Fornecedor:</strong> ${item.fornecedor}</p>
    `;
    
    if (tipo === 'recebimento') {
        conteudo += `
            <p><strong>Quantidade Recebida:</strong> ${item.quantidadeRecebida}</p>
            <p><strong>Local:</strong> ${item.localEstoque}</p>
        `;
    } else if (tipo === 'prazo') {
        conteudo += `
            <p><strong>Quantidade Pendente:</strong> ${item.quantidadePendente}</p>
            <p><strong>Status:</strong> ${item.statusRecebimento}</p>
        `;
    }
    
    // Mostrar em modal (implementação dependente do sistema de modais)
    mostrarModal('Detalhes do Item', conteudo);
}

/**
 * Exportar recebimento
 */
function exportarRecebimento() {
    if (!todosItens || todosItens.length === 0) {
        mostrarNotificacao('Nenhum item para exportar', 'warning');
        return;
    }
    
    console.log('📤 Exportando recebimento...');
    
    // Criar CSV
    const headers = ['Código', 'Descrição', 'Qtd Comprada', 'Qtd Recebida', 'Qtd Pendente', 'Fornecedor', 'Status', 'Data Recebimento', 'Local'];
    const csvContent = [
        headers.join(','),
        ...todosItens.map(item => [
            item.codigo || '',
            `"${(item.descricao || '').replace(/"/g, '""')}"`,
            item.quantidadeComprada || 0,
            item.quantidadeRecebida || 0,
            item.quantidadePendente || 0,
            `"${(item.fornecedor || '').replace(/"/g, '""')}"`,
            item.statusRecebimento || '',
            item.dataRecebimento || '',
            `"${(item.localEstoque || '').replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');
    
    // Download do arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `recebimento_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    mostrarNotificacao('Arquivo exportado com sucesso!', 'success');
}

/**
 * Mostrar/ocultar carregamento
 */
function mostrarCarregamento(mostrar) {
    const loading = document.getElementById('loadingRecebimento');
    if (loading) {
        loading.style.display = mostrar ? 'block' : 'none';
    }
}

/**
 * Mostrar notificação
 */
function mostrarNotificacao(mensagem, tipo = 'info') {
    console.log(`📢 ${tipo.toUpperCase()}: ${mensagem}`);
    
    if (typeof window.mostrarNotificacao === 'function') {
        window.mostrarNotificacao(mensagem, tipo);
    } else {
        alert(mensagem);
    }
}

/**
 * Mostrar modal
 */
function mostrarModal(titulo, conteudo) {
    console.log(`📱 Modal: ${titulo}`);
    
    if (typeof window.mostrarModal === 'function') {
        window.mostrarModal(titulo, conteudo);
    } else {
        alert(titulo + '\n\n' + conteudo.replace(/<[^>]*>/g, ''));
    }
}

console.log('✅ recebimento.js carregado - FIRESTORE EXCLUSIVO');