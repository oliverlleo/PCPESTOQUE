/**
 * empenho.js
 * Lógica de empenho de materiais usando APENAS Cloud Firestore
 * 
 * MIGRAÇÃO COMPLETA: Realtime Database removido completamente
 */

console.log('📋 empenho.js carregado - FIRESTORE EXCLUSIVO');

// Variáveis globais
let clienteAtual = null;
let projetoAtual = null;
let itensDisponiveis = [];
let itensEmpenhados = [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando página de empenho...');
    
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
    console.log('📋 Configurando página de empenho...');
    
    inicializarComponentes();
    carregarClientes();
    configurarEventListeners();
}

/**
 * Inicializar componentes
 */
function inicializarComponentes() {
    // Inicializar Select2
    if (typeof $ !== 'undefined' && $.fn.select2) {
        $("#clienteSelect").select2({
            placeholder: "Selecione um cliente",
            allowClear: true
        });
        
        $("#projetoSelect").select2({
            placeholder: "Selecione um projeto",
            allowClear: true
        });
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
            limparProjetos();
        }
    });
    
    // Seleção de projeto
    document.getElementById('projetoSelect')?.addEventListener('change', function() {
        const projetoId = this.value;
        if (projetoId) {
            selecionarProjeto(projetoId);
        } else {
            limparItens();
        }
    });
    
    // Botões de ação
    document.getElementById('btnEmpenharSelecionados')?.addEventListener('click', empenharItensSelecionados);
    document.getElementById('btnLimparEmpenhos')?.addEventListener('click', limparEmpenhos);
    document.getElementById('btnExportarEmpenho')?.addEventListener('click', exportarEmpenho);
}

/**
 * Carregar clientes
 */
async function carregarClientes() {
    try {
        console.log('📥 Carregando clientes...');
        
        const clientes = await window.FirestoreAPI.buscarTodosClientes();
        
        const selectCliente = document.getElementById('clienteSelect');
        if (selectCliente) {
            selectCliente.innerHTML = '<option value="">Selecione um cliente</option>';
            
            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = cliente.nome || cliente.id;
                selectCliente.appendChild(option);
            });
            
            if (typeof $ !== 'undefined' && $.fn.select2) {
                $("#clienteSelect").trigger('change');
            }
        }
        
        console.log(`✅ ${clientes.length} clientes carregados`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        mostrarNotificacao('Erro ao carregar clientes', 'danger');
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
        
        clienteAtual = { ...cliente, id: clienteId };
        
        // Carregar projetos do cliente
        await carregarProjetos(clienteId);
        
        console.log('✅ Cliente selecionado:', cliente.nome);
        
    } catch (error) {
        console.error('❌ Erro ao selecionar cliente:', error);
        mostrarNotificacao('Erro ao selecionar cliente', 'danger');
    }
}

/**
 * Carregar projetos do cliente
 */
async function carregarProjetos(clienteId) {
    try {
        const projetos = await window.FirestoreAPI.buscarProjetosCliente(clienteId);
        
        const selectProjeto = document.getElementById('projetoSelect');
        if (selectProjeto) {
            selectProjeto.innerHTML = '<option value="">Selecione um projeto</option>';
            
            projetos.forEach(projeto => {
                const option = document.createElement('option');
                option.value = projeto.id;
                option.textContent = projeto.nome || projeto.tipo || projeto.id;
                selectProjeto.appendChild(option);
            });
            
            selectProjeto.disabled = false;
            
            if (typeof $ !== 'undefined' && $.fn.select2) {
                $("#projetoSelect").trigger('change');
            }
        }
        
        console.log(`✅ ${projetos.length} projetos carregados`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar projetos:', error);
        mostrarNotificacao('Erro ao carregar projetos', 'danger');
    }
}

/**
 * Selecionar projeto
 */
async function selecionarProjeto(projetoId) {
    try {
        console.log('📁 Selecionando projeto:', projetoId);
        
        projetoAtual = { id: projetoId };
        
        // Carregar itens disponíveis para empenho
        await carregarItensDisponiveis();
        
        console.log('✅ Projeto selecionado');
        
    } catch (error) {
        console.error('❌ Erro ao selecionar projeto:', error);
        mostrarNotificacao('Erro ao selecionar projeto', 'danger');
    }
}

/**
 * Carregar itens disponíveis para empenho
 */
async function carregarItensDisponiveis() {
    try {
        console.log('📦 Carregando itens disponíveis...');
        
        // Buscar itens comprados e recebidos
        const itensComprados = await window.FirestoreAPI.buscarItensPorStatus('Comprado');
        const itensRecebidos = await window.FirestoreAPI.buscarItensPorStatus('Recebido');
        
        // Combinar e filtrar por cliente
        const todosItens = [...itensComprados, ...itensRecebidos];
        const itensCliente = todosItens.filter(item => item.clienteId === clienteAtual.id);
        
        // Filtrar apenas itens não empenhados
        itensDisponiveis = itensCliente.filter(item => 
            !item.statusEmpenho || item.statusEmpenho === 'Disponível'
        );
        
        console.log(`✅ ${itensDisponiveis.length} itens disponíveis para empenho`);
        
        // Exibir na tabela
        exibirItensDisponiveis();
        
    } catch (error) {
        console.error('❌ Erro ao carregar itens:', error);
        mostrarNotificacao('Erro ao carregar itens disponíveis', 'danger');
    }
}

/**
 * Exibir itens disponíveis na tabela
 */
function exibirItensDisponiveis() {
    const tbody = document.querySelector('#tabelaItensDisponiveis tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (itensDisponiveis.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum item disponível para empenho</td></tr>';
        return;
    }
    
    itensDisponiveis.forEach(item => {
        const row = document.createElement('tr');
        
        const quantidadeDisponivel = (item.quantidadeRecebida || item.quantidadeComprada || item.quantidade) - (item.quantidadeEmpenhada || 0);
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="form-check-input item-checkbox" 
                       data-item-id="${item.id}" data-item-path="${item.path}">
            </td>
            <td>${item.codigo || 'N/A'}</td>
            <td>${item.descricao || 'N/A'}</td>
            <td>${quantidadeDisponivel}</td>
            <td>
                <input type="number" class="form-control form-control-sm quantidade-empenho" 
                       min="1" max="${quantidadeDisponivel}" value="1"
                       data-item-path="${item.path}">
            </td>
            <td>${item.fornecedor || 'N/A'}</td>
            <td>
                <span class="badge bg-success">Disponível</span>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

/**
 * Empenhar itens selecionados
 */
async function empenharItensSelecionados() {
    const itensSelecionados = obterItensSelecionados();
    
    if (itensSelecionados.length === 0) {
        mostrarNotificacao('Selecione ao menos um item para empenhar', 'warning');
        return;
    }
    
    if (!projetoAtual) {
        mostrarNotificacao('Selecione um projeto primeiro', 'warning');
        return;
    }
    
    try {
        console.log(`📋 Empenhando ${itensSelecionados.length} itens...`);
        
        const atualizacoes = itensSelecionados.map(item => ({
            path: item.path,
            dados: {
                statusEmpenho: 'Empenhado',
                quantidadeEmpenhada: (item.quantidadeEmpenhada || 0) + item.quantidadeEmpenhar,
                projetoEmpenho: projetoAtual.id,
                dataEmpenho: new Date().toISOString().split('T')[0],
                usuarioEmpenho: 'Sistema' // TODO: Implementar autenticação
            }
        }));
        
        await window.FirestoreAPI.atualizarItensLote(atualizacoes);
        
        console.log('✅ Itens empenhados com sucesso');
        mostrarNotificacao(`${itensSelecionados.length} itens empenhados!`, 'success');
        
        // Atualizar listas
        await carregarItensDisponiveis();
        await carregarItensEmpenhados();
        
    } catch (error) {
        console.error('❌ Erro ao empenhar itens:', error);
        mostrarNotificacao('Erro ao empenhar itens', 'danger');
    }
}

/**
 * Obter itens selecionados com quantidades
 */
function obterItensSelecionados() {
    const checkboxes = document.querySelectorAll('.item-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => {
        const row = checkbox.closest('tr');
        const quantidadeInput = row.querySelector('.quantidade-empenho');
        const quantidade = parseInt(quantidadeInput.value) || 1;
        
        return {
            id: checkbox.dataset.itemId,
            path: checkbox.dataset.itemPath,
            quantidadeEmpenhar: quantidade
        };
    });
}

/**
 * Carregar itens empenhados
 */
async function carregarItensEmpenhados() {
    try {
        console.log('📋 Carregando itens empenhados...');
        
        const itensEmpenhados = await window.db.collectionGroup('itens')
            .where('statusEmpenho', '==', 'Empenhado')
            .where('clienteId', '==', clienteAtual.id)
            .get();
        
        const itens = itensEmpenhados.docs.map(doc => ({
            id: doc.id,
            path: doc.ref.path,
            ...doc.data()
        }));
        
        console.log(`✅ ${itens.length} itens empenhados carregados`);
        
        // Exibir na tabela
        exibirItensEmpenhados(itens);
        
    } catch (error) {
        console.error('❌ Erro ao carregar itens empenhados:', error);
    }
}

/**
 * Exibir itens empenhados
 */
function exibirItensEmpenhados(itens) {
    const tbody = document.querySelector('#tabelaItensEmpenhados tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (itens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum item empenhado</td></tr>';
        return;
    }
    
    itens.forEach(item => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${item.codigo || 'N/A'}</td>
            <td>${item.descricao || 'N/A'}</td>
            <td>${item.quantidadeEmpenhada || 0}</td>
            <td>${item.projetoEmpenho || 'N/A'}</td>
            <td>${item.dataEmpenho || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="desempenharItem('${item.path}')">
                    <i class="fas fa-undo"></i> Desempenhar
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

/**
 * Desempenhar item
 */
async function desempenharItem(itemPath) {
    if (!confirm('Confirma o desempenho deste item?')) {
        return;
    }
    
    try {
        await window.FirestoreAPI.atualizarStatusItem(itemPath, null, {
            statusEmpenho: 'Disponível',
            quantidadeEmpenhada: 0,
            projetoEmpenho: null,
            dataEmpenho: null,
            usuarioEmpenho: null
        });
        
        console.log('✅ Item desempenhado');
        mostrarNotificacao('Item desempenhado com sucesso!', 'success');
        
        // Atualizar listas
        await carregarItensDisponiveis();
        await carregarItensEmpenhados();
        
    } catch (error) {
        console.error('❌ Erro ao desempenhar item:', error);
        mostrarNotificacao('Erro ao desempenhar item', 'danger');
    }
}

/**
 * Limpar empenhos
 */
async function limparEmpenhos() {
    if (!confirm('Confirma a liberação de TODOS os empenhos? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        console.log('🧹 Limpando todos os empenhos...');
        
        const itensEmpenhados = await window.db.collectionGroup('itens')
            .where('statusEmpenho', '==', 'Empenhado')
            .where('clienteId', '==', clienteAtual.id)
            .get();
        
        const atualizacoes = itensEmpenhados.docs.map(doc => ({
            path: doc.ref.path,
            dados: {
                statusEmpenho: 'Disponível',
                quantidadeEmpenhada: 0,
                projetoEmpenho: null,
                dataEmpenho: null,
                usuarioEmpenho: null
            }
        }));
        
        if (atualizacoes.length > 0) {
            await window.FirestoreAPI.atualizarItensLote(atualizacoes);
            console.log(`✅ ${atualizacoes.length} empenhos liberados`);
            mostrarNotificacao(`${atualizacoes.length} empenhos liberados!`, 'success');
        } else {
            mostrarNotificacao('Nenhum empenho encontrado', 'info');
        }
        
        // Atualizar listas
        await carregarItensDisponiveis();
        await carregarItensEmpenhados();
        
    } catch (error) {
        console.error('❌ Erro ao limpar empenhos:', error);
        mostrarNotificacao('Erro ao limpar empenhos', 'danger');
    }
}

/**
 * Exportar empenho
 */
function exportarEmpenho() {
    // TODO: Implementar exportação de relatório de empenho
    mostrarNotificacao('Funcionalidade de exportação em desenvolvimento', 'info');
}

/**
 * Limpar seleções
 */
function limparProjetos() {
    const selectProjeto = document.getElementById('projetoSelect');
    if (selectProjeto) {
        selectProjeto.innerHTML = '<option value="">Selecione um projeto</option>';
        selectProjeto.disabled = true;
    }
    
    projetoAtual = null;
    limparItens();
}

function limparItens() {
    itensDisponiveis = [];
    itensEmpenhados = [];
    
    // Limpar tabelas
    const tbodyDisponiveis = document.querySelector('#tabelaItensDisponiveis tbody');
    if (tbodyDisponiveis) {
        tbodyDisponiveis.innerHTML = '<tr><td colspan="7" class="text-center">Selecione um projeto</td></tr>';
    }
    
    const tbodyEmpenhados = document.querySelector('#tabelaItensEmpenhados tbody');
    if (tbodyEmpenhados) {
        tbodyEmpenhados.innerHTML = '<tr><td colspan="6" class="text-center">Selecione um projeto</td></tr>';
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

console.log('✅ empenho.js carregado - FIRESTORE EXCLUSIVO');