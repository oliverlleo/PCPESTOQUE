/**
 * compras.js
 * Lógica de compras usando APENAS Cloud Firestore
 * 
 * MIGRAÇÃO COMPLETA: Realtime Database removido completamente
 */

console.log('🛒 compras.js carregado - FIRESTORE EXCLUSIVO');

// Variáveis globais
let clienteAtual = null;
let itensSelecionados = [];
let colunasOcultas = true;
let filtroListaAtual = 'todas';
let tabelaItens = null;
let itemIdParaEditarPrazo = null;
let todosItens = [];
let filtroListaPendente = null;
let inicializacaoEmProgresso = false;

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando página de compras...');
    
    // Aguardar Firebase estar pronto
    if (window.db) {
        inicializarPagina();
    } else {
        window.addEventListener('firebaseReady', inicializarPagina);
    }
});

/**
 * Inicializar página após Firebase estar pronto
 */
function inicializarPagina() {
    console.log('🛒 Configurando página de compras...');
    
    inicializarComponentesBasicos();
    carregarClientes();
    configurarEventListeners();
}

/**
 * Inicializar componentes básicos
 */
function inicializarComponentesBasicos() {
    console.log('🔧 Inicializando componentes básicos...');
    
    // Inicializar Select2 quando disponível
    if (typeof $ !== 'undefined' && $.fn.select2) {
        $("#clienteSelect").select2({
            placeholder: "Selecione um cliente",
            allowClear: true
        });
        
        $("#filtroStatus").select2({
            placeholder: "Filtrar por status",
            allowClear: true
        });
        
        $("#filtroLista").select2({
            placeholder: "Filtrar por lista",
            allowClear: true
        });
    }
    
    // Configurar botões de ação
    configurarBotoes();
    
    console.log('✅ Componentes básicos inicializados');
}

/**
 * Configurar botões da interface
 */
function configurarBotoes() {
    // Botão de carregar itens
    const btnCarregarItens = document.getElementById('btnCarregarItens');
    if (btnCarregarItens) {
        btnCarregarItens.addEventListener('click', carregarItensCliente);
    }
    
    // Botão de marcar comprado
    const btnMarcarComprado = document.getElementById('btnMarcarComprado');
    if (btnMarcarComprado) {
        btnMarcarComprado.addEventListener('click', marcarItensComoComprados);
    }
    
    // Botão de exportar
    const btnExportar = document.getElementById('btnExportar');
    if (btnExportar) {
        btnExportar.addEventListener('click', exportarItens);
    }
}

/**
 * Configurar event listeners
 */
function configurarEventListeners() {
    // Seleção de cliente
    document.getElementById('clienteSelect')?.addEventListener('change', function() {
        const clienteId = this.value;
        if (clienteId) {
            selecionarCliente(clienteId);
        } else {
            clienteAtual = null;
            limparTabelaItens();
        }
    });
    
    // Filtros
    document.getElementById('filtroStatus')?.addEventListener('change', aplicarFiltros);
    document.getElementById('filtroLista')?.addEventListener('change', aplicarFiltros);
    
    // Botão selecionar todos
    document.getElementById('btnSelecionarTodos')?.addEventListener('click', selecionarTodosItens);
    
    // Botão limpar seleção
    document.getElementById('btnLimparSelecao')?.addEventListener('click', limparSelecao);
}

/**
 * Carregar clientes do Firestore
 */
async function carregarClientes() {
    try {
        console.log('📥 Carregando clientes...');
        
        const clientes = await window.FirestoreAPI.buscarTodosClientes();
        
        console.log(`✅ ${clientes.length} clientes carregados`);
        
        // Atualizar select de clientes
        atualizarSelectClientes(clientes);
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        mostrarNotificacao('Erro ao carregar clientes: ' + error.message, 'danger');
    }
}

/**
 * Atualizar select de clientes
 */
function atualizarSelectClientes(clientes) {
    const selectCliente = document.getElementById('clienteSelect');
    if (!selectCliente) return;
    
    // Limpar opções existentes
    selectCliente.innerHTML = '<option value="">Selecione um cliente</option>';
    
    // Adicionar clientes
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nome || cliente.id;
        selectCliente.appendChild(option);
    });
    
    // Atualizar Select2
    if (typeof $ !== 'undefined' && $.fn.select2) {
        $("#clienteSelect").trigger('change');
    }
}

/**
 * Selecionar cliente
 */
async function selecionarCliente(clienteId) {
    try {
        console.log('👤 Selecionando cliente:', clienteId);
        
        const cliente = await window.FirestoreAPI.buscarCliente(clienteId);
        
        if (!cliente) {
            mostrarNotificacao('Cliente não encontrado', 'danger');
            return;
        }
        
        clienteAtual = cliente;
        clienteAtual.id = clienteId;
        
        console.log('✅ Cliente selecionado:', cliente.nome);
        
        // Habilitar botão de carregar itens
        const btnCarregarItens = document.getElementById('btnCarregarItens');
        if (btnCarregarItens) {
            btnCarregarItens.disabled = false;
        }
        
        // Carregar itens automaticamente
        await carregarItensCliente();
        
    } catch (error) {
        console.error('❌ Erro ao selecionar cliente:', error);
        mostrarNotificacao('Erro ao selecionar cliente: ' + error.message, 'danger');
    }
}

/**
 * Carregar itens do cliente
 */
async function carregarItensCliente() {
    if (!clienteAtual) {
        mostrarNotificacao('Selecione um cliente primeiro', 'warning');
        return;
    }
    
    try {
        console.log('📦 Carregando itens do cliente:', clienteAtual.id);
        
        mostrarCarregamento(true);
        
        // Buscar todos os itens do cliente
        const itens = await window.FirestoreAPI.buscarItensCliente(clienteAtual.id);
        
        console.log(`✅ ${itens.length} itens carregados`);
        
        todosItens = itens;
        
        // Processar itens para exibição
        const itensProcessados = processarItensParaCompras(itens);
        
        // Exibir na tabela
        exibirItensNaTabela(itensProcessados);
        
        // Atualizar filtros
        atualizarFiltrosListas(itens);
        
        mostrarCarregamento(false);
        
    } catch (error) {
        console.error('❌ Erro ao carregar itens:', error);
        mostrarNotificacao('Erro ao carregar itens: ' + error.message, 'danger');
        mostrarCarregamento(false);
    }
}

/**
 * Processar itens para compras
 */
function processarItensParaCompras(itens) {
    return itens.map(item => {
        // Calcular status de compra
        let statusCompra = item.statusCompra || 'Aguardando Compra';
        
        // Verificar se possui fornecedor
        if (!item.fornecedor) {
            statusCompra = 'Sem Fornecedor';
        }
        
        // Verificar se está comprado
        if (item.statusCompra === 'Comprado' || item.dataCompra) {
            statusCompra = 'Comprado';
        }
        
        return {
            ...item,
            statusCompra: statusCompra,
            quantidadeComprada: item.quantidadeComprada || 0,
            valorUnitario: item.valorUnitario || 0,
            valorTotal: (item.quantidadeComprada || 0) * (item.valorUnitario || 0),
            prazoEntrega: item.prazoEntrega || '',
            observacoes: item.observacoes || ''
        };
    });
}

/**
 * Exibir itens na tabela
 */
function exibirItensNaTabela(itens) {
    const tbody = document.querySelector('#tabelaItens tbody');
    if (!tbody) {
        console.error('Tabela de itens não encontrada');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (itens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Nenhum item encontrado</td></tr>';
        return;
    }
    
    itens.forEach((item, index) => {
        const row = document.createElement('tr');
        
        const statusClass = getStatusCompraClass(item.statusCompra);
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="form-check-input item-checkbox" 
                       data-item-id="${item.id}" data-item-path="${item.path}">
            </td>
            <td>${item.codigo || 'N/A'}</td>
            <td>${item.descricao || 'N/A'}</td>
            <td>${item.quantidade || 0}</td>
            <td>
                <input type="number" class="form-control form-control-sm" 
                       value="${item.quantidadeComprada || 0}" min="0"
                       onchange="atualizarQuantidadeComprada('${item.path}', this.value)">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm" 
                       value="${item.fornecedor || ''}" placeholder="Fornecedor"
                       onchange="atualizarFornecedor('${item.path}', this.value)">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm" 
                       value="${item.valorUnitario || 0}" min="0" step="0.01"
                       onchange="atualizarValorUnitario('${item.path}', this.value)">
            </td>
            <td class="valor-total">R$ ${item.valorTotal.toFixed(2)}</td>
            <td>
                <input type="date" class="form-control form-control-sm" 
                       value="${item.prazoEntrega || ''}"
                       onchange="atualizarPrazoEntrega('${item.path}', this.value)">
            </td>
            <td><span class="badge ${statusClass}">${item.statusCompra}</span></td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`✅ ${itens.length} itens exibidos na tabela`);
}

/**
 * Obter classe CSS para status de compra
 */
function getStatusCompraClass(status) {
    switch (status) {
        case 'Aguardando Compra': return 'bg-warning';
        case 'Comprado': return 'bg-success';
        case 'Sem Fornecedor': return 'bg-danger';
        case 'Em Cotação': return 'bg-info';
        default: return 'bg-secondary';
    }
}

/**
 * Atualizar quantidade comprada
 */
async function atualizarQuantidadeComprada(itemPath, quantidade) {
    try {
        const quantidadeNum = parseFloat(quantidade) || 0;
        
        await window.FirestoreAPI.atualizarStatusItem(itemPath, null, {
            quantidadeComprada: quantidadeNum
        });
        
        // Recalcular valor total na linha
        recalcularValorTotalLinha(itemPath);
        
        console.log('✅ Quantidade comprada atualizada:', quantidadeNum);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar quantidade:', error);
        mostrarNotificacao('Erro ao atualizar quantidade', 'danger');
    }
}

/**
 * Atualizar fornecedor
 */
async function atualizarFornecedor(itemPath, fornecedor) {
    try {
        await window.FirestoreAPI.atualizarStatusItem(itemPath, null, {
            fornecedor: fornecedor.trim()
        });
        
        console.log('✅ Fornecedor atualizado:', fornecedor);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar fornecedor:', error);
        mostrarNotificacao('Erro ao atualizar fornecedor', 'danger');
    }
}

/**
 * Atualizar valor unitário
 */
async function atualizarValorUnitario(itemPath, valor) {
    try {
        const valorNum = parseFloat(valor) || 0;
        
        await window.FirestoreAPI.atualizarStatusItem(itemPath, null, {
            valorUnitario: valorNum
        });
        
        // Recalcular valor total na linha
        recalcularValorTotalLinha(itemPath);
        
        console.log('✅ Valor unitário atualizado:', valorNum);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar valor:', error);
        mostrarNotificacao('Erro ao atualizar valor', 'danger');
    }
}

/**
 * Atualizar prazo de entrega
 */
async function atualizarPrazoEntrega(itemPath, prazo) {
    try {
        await window.FirestoreAPI.atualizarStatusItem(itemPath, null, {
            prazoEntrega: prazo
        });
        
        console.log('✅ Prazo atualizado:', prazo);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar prazo:', error);
        mostrarNotificacao('Erro ao atualizar prazo', 'danger');
    }
}

/**
 * Recalcular valor total da linha
 */
function recalcularValorTotalLinha(itemPath) {
    // Encontrar a linha da tabela
    const checkbox = document.querySelector(`[data-item-path="${itemPath}"]`);
    if (!checkbox) return;
    
    const row = checkbox.closest('tr');
    if (!row) return;
    
    const quantidadeInput = row.querySelector('input[type="number"]:nth-of-type(1)');
    const valorInput = row.querySelector('input[type="number"]:nth-of-type(2)');
    const valorTotalCell = row.querySelector('.valor-total');
    
    if (quantidadeInput && valorInput && valorTotalCell) {
        const quantidade = parseFloat(quantidadeInput.value) || 0;
        const valor = parseFloat(valorInput.value) || 0;
        const total = quantidade * valor;
        
        valorTotalCell.textContent = `R$ ${total.toFixed(2)}`;
    }
}

/**
 * Marcar itens selecionados como comprados
 */
async function marcarItensComoComprados() {
    const itensSelecionados = obterItensSelecionados();
    
    if (itensSelecionados.length === 0) {
        mostrarNotificacao('Selecione ao menos um item', 'warning');
        return;
    }
    
    if (!confirm(`Confirma a compra de ${itensSelecionados.length} itens?`)) {
        return;
    }
    
    try {
        console.log(`🛒 Marcando ${itensSelecionados.length} itens como comprados...`);
        
        const atualizacoes = itensSelecionados.map(item => ({
            path: item.path,
            dados: {
                statusCompra: 'Comprado',
                dataCompra: new Date().toISOString().split('T')[0]
            }
        }));
        
        await window.FirestoreAPI.atualizarItensLote(atualizacoes);
        
        console.log('✅ Itens marcados como comprados');
        mostrarNotificacao(`${itensSelecionados.length} itens marcados como comprados!`, 'success');
        
        // Recarregar itens
        await carregarItensCliente();
        
    } catch (error) {
        console.error('❌ Erro ao marcar itens como comprados:', error);
        mostrarNotificacao('Erro ao marcar itens como comprados', 'danger');
    }
}

/**
 * Obter itens selecionados
 */
function obterItensSelecionados() {
    const checkboxes = document.querySelectorAll('.item-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => ({
        id: checkbox.dataset.itemId,
        path: checkbox.dataset.itemPath
    }));
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
 * Aplicar filtros na tabela
 */
function aplicarFiltros() {
    const filtroStatus = document.getElementById('filtroStatus')?.value;
    const filtroLista = document.getElementById('filtroLista')?.value;
    
    console.log('🔍 Aplicando filtros:', { status: filtroStatus, lista: filtroLista });
    
    let itensFiltrados = [...todosItens];
    
    // Filtrar por status
    if (filtroStatus) {
        itensFiltrados = itensFiltrados.filter(item => 
            (item.statusCompra || 'Aguardando Compra') === filtroStatus
        );
    }
    
    // Filtrar por lista
    if (filtroLista) {
        itensFiltrados = itensFiltrados.filter(item => 
            item.listaId === filtroLista
        );
    }
    
    // Processar e exibir itens filtrados
    const itensProcessados = processarItensParaCompras(itensFiltrados);
    exibirItensNaTabela(itensProcessados);
    
    console.log(`✅ ${itensFiltrados.length} itens após filtros`);
}

/**
 * Atualizar filtros de listas
 */
function atualizarFiltrosListas(itens) {
    const filtroLista = document.getElementById('filtroLista');
    if (!filtroLista) return;
    
    // Obter listas únicas
    const listas = [...new Set(itens.map(item => item.listaId))].filter(Boolean);
    
    // Limpar e popular select
    filtroLista.innerHTML = '<option value="">Todas as listas</option>';
    
    listas.forEach(listaId => {
        const option = document.createElement('option');
        option.value = listaId;
        option.textContent = `Lista ${listaId}`;
        filtroLista.appendChild(option);
    });
    
    // Atualizar Select2
    if (typeof $ !== 'undefined' && $.fn.select2) {
        $("#filtroLista").trigger('change');
    }
}

/**
 * Exportar itens
 */
function exportarItens() {
    if (!todosItens || todosItens.length === 0) {
        mostrarNotificacao('Nenhum item para exportar', 'warning');
        return;
    }
    
    console.log('📤 Exportando itens...');
    
    // Criar CSV
    const headers = ['Código', 'Descrição', 'Quantidade', 'Qtd Comprada', 'Fornecedor', 'Valor Unitário', 'Valor Total', 'Prazo', 'Status'];
    const csvContent = [
        headers.join(','),
        ...todosItens.map(item => [
            item.codigo || '',
            `"${(item.descricao || '').replace(/"/g, '""')}"`,
            item.quantidade || 0,
            item.quantidadeComprada || 0,
            `"${(item.fornecedor || '').replace(/"/g, '""')}"`,
            item.valorUnitario || 0,
            (item.quantidadeComprada || 0) * (item.valorUnitario || 0),
            item.prazoEntrega || '',
            item.statusCompra || 'Aguardando Compra'
        ].join(','))
    ].join('\n');
    
    // Download do arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compras_${clienteAtual?.nome || 'cliente'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    mostrarNotificacao('Arquivo exportado com sucesso!', 'success');
}

/**
 * Limpar tabela de itens
 */
function limparTabelaItens() {
    const tbody = document.querySelector('#tabelaItens tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Selecione um cliente</td></tr>';
    }
    
    todosItens = [];
}

/**
 * Mostrar/ocultar carregamento
 */
function mostrarCarregamento(mostrar) {
    const loading = document.getElementById('loadingCompras');
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

console.log('✅ compras.js carregado - FIRESTORE EXCLUSIVO');