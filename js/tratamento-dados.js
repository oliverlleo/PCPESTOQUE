/**
 * tratamento-dados.js
 * Módulo de tratamento de dados usando APENAS Cloud Firestore
 * 
 * MIGRAÇÃO COMPLETA: Realtime Database removido completamente
 */

console.log('🔄 tratamento-dados.js carregado - FIRESTORE EXCLUSIVO');

// Variáveis globais
let clienteAtual = null;
let dadosProcessados = [];
let arquivoAtual = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando página de tratamento de dados...');
    
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
    console.log('🔄 Configurando página de tratamento de dados...');
    
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
        
        $("#tipoProjetoSelect").select2({
            placeholder: "Selecione o tipo de projeto",
            allowClear: true
        });
    }
    
    // Configurar área de drag and drop
    configurarDragAndDrop();
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
        }
    });
    
    // Upload de arquivo
    document.getElementById('arquivoTratamento')?.addEventListener('change', function(e) {
        const arquivo = e.target.files[0];
        if (arquivo) {
            processarArquivo(arquivo);
        }
    });
    
    // Botões
    document.getElementById('btnProcessarArquivo')?.addEventListener('click', processarArquivoManual);
    document.getElementById('btnSalvarDados')?.addEventListener('click', salvarDadosProcessados);
    document.getElementById('btnLimparDados')?.addEventListener('click', limparDados);
    document.getElementById('btnExportarDados')?.addEventListener('click', exportarDados);
}

/**
 * Configurar drag and drop
 */
function configurarDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;
    
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const arquivo = files[0];
            document.getElementById('arquivoTratamento').files = files;
            processarArquivo(arquivo);
        }
    });
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
        
        // Habilitar upload de arquivo
        document.getElementById('arquivoTratamento').disabled = false;
        
        console.log('✅ Cliente selecionado:', cliente.nome);
        
    } catch (error) {
        console.error('❌ Erro ao selecionar cliente:', error);
        mostrarNotificacao('Erro ao selecionar cliente', 'danger');
    }
}

/**
 * Processar arquivo
 */
async function processarArquivo(arquivo) {
    if (!clienteAtual) {
        mostrarNotificacao('Selecione um cliente primeiro', 'warning');
        return;
    }
    
    if (!arquivo) {
        mostrarNotificacao('Selecione um arquivo', 'warning');
        return;
    }
    
    try {
        console.log('📄 Processando arquivo:', arquivo.name);
        
        mostrarCarregamento(true);
        mostrarNotificacao('Processando arquivo...', 'info');
        
        arquivoAtual = arquivo;
        
        // Usar a função de processamento existente
        const resultado = await window.processarArquivo(
            arquivo, 
            clienteAtual.id, 
            'tratamento', 
            'dados_tratados'
        );
        
        dadosProcessados = resultado.dados;
        
        console.log(`✅ ${dadosProcessados.length} itens processados`);
        
        // Exibir dados processados
        exibirDadosProcessados();
        
        // Habilitar botões
        document.getElementById('btnSalvarDados').disabled = false;
        document.getElementById('btnExportarDados').disabled = false;
        
        mostrarCarregamento(false);
        mostrarNotificacao(`Arquivo processado: ${dadosProcessados.length} itens encontrados`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao processar arquivo:', error);
        mostrarNotificacao('Erro ao processar arquivo: ' + error.message, 'danger');
        mostrarCarregamento(false);
    }
}

/**
 * Processar arquivo manual (botão)
 */
function processarArquivoManual() {
    const arquivoInput = document.getElementById('arquivoTratamento');
    const arquivo = arquivoInput.files[0];
    
    if (arquivo) {
        processarArquivo(arquivo);
    } else {
        mostrarNotificacao('Selecione um arquivo primeiro', 'warning');
    }
}

/**
 * Exibir dados processados
 */
function exibirDadosProcessados() {
    const container = document.getElementById('dadosProcessados');
    if (!container) return;
    
    // Criar tabela
    let html = `
        <div class="card">
            <div class="card-header">
                <h5>Dados Processados (${dadosProcessados.length} itens)</h5>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-success" onclick="validarTodosDados()">
                        <i class="fas fa-check"></i> Validar Todos
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editarDadosLote()">
                        <i class="fas fa-edit"></i> Editar em Lote
                    </button>
                </div>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive" style="max-height: 500px;">
                    <table class="table table-sm table-striped mb-0">
                        <thead class="table-dark sticky-top">
                            <tr>
                                <th>Status</th>
                                <th>Código</th>
                                <th>Descrição</th>
                                <th>Quantidade</th>
                                <th>Unidade</th>
                                <th>Observações</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    dadosProcessados.forEach((item, index) => {
        const statusClass = item.validado ? 'bg-success' : 'bg-warning';
        const statusText = item.validado ? 'Validado' : 'Pendente';
        
        html += `
            <tr data-index="${index}">
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <input type="text" class="form-control form-control-sm" 
                           value="${item.codigo || ''}" 
                           onchange="atualizarCampo(${index}, 'codigo', this.value)">
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm" 
                           value="${item.descricao || ''}" 
                           onchange="atualizarCampo(${index}, 'descricao', this.value)">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           value="${item.quantidade || 1}" min="1"
                           onchange="atualizarCampo(${index}, 'quantidade', parseFloat(this.value))">
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm" 
                           value="${item.unidade || 'UN'}" 
                           onchange="atualizarCampo(${index}, 'unidade', this.value)">
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm" 
                           value="${item.observacoes || ''}" 
                           onchange="atualizarCampo(${index}, 'observacoes', this.value)">
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-success" onclick="validarItem(${index})" 
                                title="Validar item">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="removerItem(${index})" 
                                title="Remover item">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    container.style.display = 'block';
}

/**
 * Atualizar campo de um item
 */
function atualizarCampo(index, campo, valor) {
    if (dadosProcessados[index]) {
        dadosProcessados[index][campo] = valor;
        dadosProcessados[index].validado = false; // Marcar como não validado após alteração
        console.log(`📝 Campo ${campo} atualizado para item ${index}:`, valor);
    }
}

/**
 * Validar item individual
 */
function validarItem(index) {
    if (dadosProcessados[index]) {
        const item = dadosProcessados[index];
        
        // Validações básicas
        if (!item.codigo || !item.descricao) {
            mostrarNotificacao('Código e descrição são obrigatórios', 'warning');
            return;
        }
        
        item.validado = true;
        
        // Atualizar status na tabela
        const row = document.querySelector(`tr[data-index="${index}"]`);
        if (row) {
            const statusCell = row.querySelector('.badge');
            statusCell.className = 'badge bg-success';
            statusCell.textContent = 'Validado';
        }
        
        console.log(`✅ Item ${index} validado`);
    }
}

/**
 * Validar todos os dados
 */
function validarTodosDados() {
    let validados = 0;
    let erros = 0;
    
    dadosProcessados.forEach((item, index) => {
        if (item.codigo && item.descricao) {
            item.validado = true;
            validados++;
        } else {
            erros++;
        }
    });
    
    // Atualizar exibição
    exibirDadosProcessados();
    
    if (erros > 0) {
        mostrarNotificacao(`${validados} itens validados, ${erros} com erros`, 'warning');
    } else {
        mostrarNotificacao(`Todos os ${validados} itens foram validados!`, 'success');
    }
}

/**
 * Remover item
 */
function removerItem(index) {
    if (confirm('Confirma a remoção deste item?')) {
        dadosProcessados.splice(index, 1);
        exibirDadosProcessados();
        mostrarNotificacao('Item removido', 'info');
    }
}

/**
 * Salvar dados processados
 */
async function salvarDadosProcessados() {
    if (!clienteAtual) {
        mostrarNotificacao('Selecione um cliente', 'warning');
        return;
    }
    
    if (!dadosProcessados.length) {
        mostrarNotificacao('Nenhum dado para salvar', 'warning');
        return;
    }
    
    // Verificar se há itens não validados
    const itensNaoValidados = dadosProcessados.filter(item => !item.validado);
    if (itensNaoValidados.length > 0) {
        if (!confirm(`Existem ${itensNaoValidados.length} itens não validados. Continuar mesmo assim?`)) {
            return;
        }
    }
    
    try {
        console.log('💾 Salvando dados processados...');
        
        mostrarCarregamento(true);
        
        const tipoProjeto = document.getElementById('tipoProjetoSelect')?.value || 'tratamento';
        const nomeLista = `Tratamento_${arquivoAtual?.name || 'dados'}_${new Date().toISOString().split('T')[0]}`;
        
        const resultado = await window.salvarItensNoFirebase(
            dadosProcessados,
            clienteAtual.id,
            tipoProjeto,
            nomeLista
        );
        
        console.log('✅ Dados salvos:', resultado);
        
        mostrarCarregamento(false);
        mostrarNotificacao(`${resultado.totalItens} itens salvos com sucesso!`, 'success');
        
        // Limpar dados após salvar
        setTimeout(() => {
            limparDados();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        mostrarNotificacao('Erro ao salvar dados: ' + error.message, 'danger');
        mostrarCarregamento(false);
    }
}

/**
 * Limpar dados
 */
function limparDados() {
    dadosProcessados = [];
    arquivoAtual = null;
    
    // Limpar formulário
    document.getElementById('arquivoTratamento').value = '';
    document.getElementById('dadosProcessados').style.display = 'none';
    
    // Desabilitar botões
    document.getElementById('btnSalvarDados').disabled = true;
    document.getElementById('btnExportarDados').disabled = true;
    
    mostrarNotificacao('Dados limpos', 'info');
}

/**
 * Exportar dados
 */
function exportarDados() {
    if (!dadosProcessados.length) {
        mostrarNotificacao('Nenhum dado para exportar', 'warning');
        return;
    }
    
    console.log('📤 Exportando dados...');
    
    // Criar CSV
    const headers = ['Código', 'Descrição', 'Quantidade', 'Unidade', 'Observações', 'Status'];
    const csvContent = [
        headers.join(','),
        ...dadosProcessados.map(item => [
            item.codigo || '',
            `"${(item.descricao || '').replace(/"/g, '""')}"`,
            item.quantidade || 1,
            item.unidade || 'UN',
            `"${(item.observacoes || '').replace(/"/g, '""')}"`,
            item.validado ? 'Validado' : 'Pendente'
        ].join(','))
    ].join('\n');
    
    // Download do arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dados_tratados_${clienteAtual?.nome || 'cliente'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    mostrarNotificacao('Dados exportados com sucesso!', 'success');
}

/**
 * Mostrar/ocultar carregamento
 */
function mostrarCarregamento(mostrar) {
    const loading = document.getElementById('loadingTratamento');
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

console.log('✅ tratamento-dados.js carregado - FIRESTORE EXCLUSIVO');