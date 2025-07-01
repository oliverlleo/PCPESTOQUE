/**
 * separacao.js
 * Módulo de separação de materiais usando APENAS Cloud Firestore
 * 
 * MIGRAÇÃO COMPLETA: Realtime Database removido completamente
 */

console.log('📦 separacao.js carregado - FIRESTORE EXCLUSIVO');

// Variáveis globais
let clienteAtual = null;
let projetoAtual = null;
let listaOriginal = null;
let itensOriginais = [];
let itensNovos = [];
let resultadoComparacao = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando página de separação...');
    
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
    console.log('📦 Configurando página de separação...');
    
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
        
        $("#listaSelect").select2({
            placeholder: "Selecione uma lista",
            allowClear: true
        });
    }
}

/**
 * Configurar event listeners
 */
function configurarEventListeners() {
    // Seleções
    document.getElementById('clienteSelect')?.addEventListener('change', function() {
        const clienteId = this.value;
        if (clienteId) {
            selecionarCliente(clienteId);
        } else {
            limparProjetos();
        }
    });
    
    document.getElementById('projetoSelect')?.addEventListener('change', function() {
        const projetoId = this.value;
        if (projetoId) {
            selecionarProjeto(projetoId);
        } else {
            limparListas();
        }
    });
    
    document.getElementById('listaSelect')?.addEventListener('change', function() {
        const listaId = this.value;
        if (listaId) {
            selecionarLista(listaId);
        }
    });
    
    // Upload de arquivo
    document.getElementById('arquivoSeparacao')?.addEventListener('change', processarArquivoSeparacao);
    
    // Botões
    document.getElementById('btnCompararListas')?.addEventListener('click', compararListas);
    document.getElementById('btnGerarCorrecao')?.addEventListener('click', gerarCorrecaoFinal);
    document.getElementById('btnExportarResultado')?.addEventListener('click', exportarResultado);
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
        
        // Carregar projetos
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
        
        // Carregar listas do projeto
        await carregarListas(clienteAtual.id, projetoId);
        
        console.log('✅ Projeto selecionado');
        
    } catch (error) {
        console.error('❌ Erro ao selecionar projeto:', error);
        mostrarNotificacao('Erro ao selecionar projeto', 'danger');
    }
}

/**
 * Carregar listas do projeto
 */
async function carregarListas(clienteId, projetoId) {
    try {
        const snapshot = await window.db
            .collection('clientes')
            .doc(clienteId)
            .collection('projetos')
            .doc(projetoId)
            .collection('listas')
            .get();
        
        const listas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        const selectLista = document.getElementById('listaSelect');
        if (selectLista) {
            selectLista.innerHTML = '<option value="">Selecione uma lista</option>';
            
            listas.forEach(lista => {
                const option = document.createElement('option');
                option.value = lista.id;
                option.textContent = lista.nome || lista.id;
                selectLista.appendChild(option);
            });
            
            selectLista.disabled = false;
            
            if (typeof $ !== 'undefined' && $.fn.select2) {
                $("#listaSelect").trigger('change');
            }
        }
        
        console.log(`✅ ${listas.length} listas carregadas`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar listas:', error);
        mostrarNotificacao('Erro ao carregar listas', 'danger');
    }
}

/**
 * Selecionar lista original
 */
async function selecionarLista(listaId) {
    try {
        console.log('📋 Selecionando lista:', listaId);
        
        listaOriginal = { id: listaId };
        
        // Carregar itens da lista
        await carregarItensLista(clienteAtual.id, projetoAtual.id, listaId);
        
        // Habilitar upload de arquivo
        document.getElementById('arquivoSeparacao').disabled = false;
        document.getElementById('btnCompararListas').disabled = false;
        
        console.log('✅ Lista selecionada');
        
    } catch (error) {
        console.error('❌ Erro ao selecionar lista:', error);
        mostrarNotificacao('Erro ao selecionar lista', 'danger');
    }
}

/**
 * Carregar itens da lista
 */
async function carregarItensLista(clienteId, projetoId, listaId) {
    try {
        const snapshot = await window.db
            .collection('clientes')
            .doc(clienteId)
            .collection('projetos')
            .doc(projetoId)
            .collection('listas')
            .doc(listaId)
            .collection('itens')
            .get();
        
        itensOriginais = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`✅ ${itensOriginais.length} itens da lista original carregados`);
        
        // Exibir resumo
        exibirResumoListaOriginal();
        
    } catch (error) {
        console.error('❌ Erro ao carregar itens da lista:', error);
        throw error;
    }
}

/**
 * Exibir resumo da lista original
 */
function exibirResumoListaOriginal() {
    const resumo = document.getElementById('resumoListaOriginal');
    if (resumo) {
        resumo.innerHTML = `
            <div class="alert alert-info">
                <strong>Lista Original Carregada:</strong><br>
                Total de itens: ${itensOriginais.length}<br>
                Cliente: ${clienteAtual.nome}<br>
                Projeto: ${projetoAtual.id}
            </div>
        `;
    }
}

/**
 * Processar arquivo de separação
 */
async function processarArquivoSeparacao(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    
    try {
        console.log('📄 Processando arquivo de separação...');
        
        mostrarNotificacao('Processando arquivo...', 'info');
        
        // Processar arquivo usando a função existente
        const resultado = await window.processarArquivo(arquivo, clienteAtual.id, projetoAtual.id, 'separacao');
        
        itensNovos = resultado.dados;
        
        console.log(`✅ ${itensNovos.length} itens processados do arquivo`);
        
        // Exibir resumo
        exibirResumoArquivoNovo();
        
        // Habilitar comparação
        document.getElementById('btnCompararListas').disabled = false;
        
        mostrarNotificacao('Arquivo processado com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao processar arquivo:', error);
        mostrarNotificacao('Erro ao processar arquivo: ' + error.message, 'danger');
    }
}

/**
 * Exibir resumo do arquivo novo
 */
function exibirResumoArquivoNovo() {
    const resumo = document.getElementById('resumoArquivoNovo');
    if (resumo) {
        resumo.innerHTML = `
            <div class="alert alert-success">
                <strong>Arquivo Processado:</strong><br>
                Total de itens: ${itensNovos.length}<br>
                Pronto para comparação
            </div>
        `;
    }
}

/**
 * Comparar listas
 */
function compararListas() {
    if (!itensOriginais.length || !itensNovos.length) {
        mostrarNotificacao('Selecione uma lista original e carregue um arquivo novo', 'warning');
        return;
    }
    
    console.log('⚖️ Comparando listas...');
    
    // Criar mapas para comparação eficiente
    const mapaOriginal = new Map();
    itensOriginais.forEach(item => {
        const chave = (item.codigo || '').toLowerCase().trim();
        if (chave) {
            mapaOriginal.set(chave, item);
        }
    });
    
    const mapaNovo = new Map();
    itensNovos.forEach(item => {
        const chave = (item.codigo || '').toLowerCase().trim();
        if (chave) {
            mapaNovo.set(chave, item);
        }
    });
    
    // Realizar comparação
    const itensLiberados = [];
    const itensDevolvidos = [];
    const itensParaComprar = [];
    
    // Itens da lista nova
    for (const [codigo, itemNovo] of mapaNovo) {
        const itemOriginal = mapaOriginal.get(codigo);
        
        if (itemOriginal) {
            const qtdOriginal = itemOriginal.quantidade || 0;
            const qtdNova = itemNovo.quantidade || 0;
            
            if (qtdNova <= qtdOriginal) {
                // Pode ser liberado
                itensLiberados.push({
                    ...itemNovo,
                    quantidadeOriginal: qtdOriginal,
                    quantidadeLiberada: qtdNova,
                    status: 'Liberado'
                });
                
                // Se sobrou, vai para devolução
                if (qtdNova < qtdOriginal) {
                    itensDevolvidos.push({
                        ...itemOriginal,
                        quantidadeOriginal: qtdOriginal,
                        quantidadeDevolvida: qtdOriginal - qtdNova,
                        status: 'Devolver ao Estoque'
                    });
                }
            } else {
                // Liberar o que tem e comprar a diferença
                itensLiberados.push({
                    ...itemOriginal,
                    quantidadeOriginal: qtdOriginal,
                    quantidadeLiberada: qtdOriginal,
                    status: 'Liberado (Parcial)'
                });
                
                itensParaComprar.push({
                    ...itemNovo,
                    quantidadeOriginal: qtdOriginal,
                    quantidadeComprar: qtdNova - qtdOriginal,
                    status: 'Comprar'
                });
            }
        } else {
            // Item novo, precisa comprar
            itensParaComprar.push({
                ...itemNovo,
                quantidadeOriginal: 0,
                quantidadeComprar: itemNovo.quantidade,
                status: 'Comprar (Novo)'
            });
        }
    }
    
    // Itens que sobram na lista original (não estão na nova)
    for (const [codigo, itemOriginal] of mapaOriginal) {
        if (!mapaNovo.has(codigo)) {
            itensDevolvidos.push({
                ...itemOriginal,
                quantidadeOriginal: itemOriginal.quantidade,
                quantidadeDevolvida: itemOriginal.quantidade,
                status: 'Devolver ao Estoque (Não Usado)'
            });
        }
    }
    
    resultadoComparacao = {
        itensLiberados,
        itensDevolvidos,
        itensParaComprar,
        resumo: {
            totalLiberados: itensLiberados.length,
            totalDevolvidos: itensDevolvidos.length,
            totalParaComprar: itensParaComprar.length
        }
    };
    
    console.log('✅ Comparação concluída:', resultadoComparacao.resumo);
    
    // Exibir resultado
    exibirResultadoComparacao();
    
    // Habilitar geração de correção
    document.getElementById('btnGerarCorrecao').disabled = false;
    document.getElementById('btnExportarResultado').disabled = false;
}

/**
 * Exibir resultado da comparação
 */
function exibirResultadoComparacao() {
    const container = document.getElementById('resultadoComparacao');
    if (!container) return;
    
    container.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <div class="card border-success">
                    <div class="card-header bg-success text-white">
                        <h6>Itens Liberados (${resultadoComparacao.resumo.totalLiberados})</h6>
                    </div>
                    <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                        ${resultadoComparacao.itensLiberados.map(item => `
                            <div class="border-bottom py-2">
                                <strong>${item.codigo}</strong><br>
                                <small>${item.descricao}</small><br>
                                <span class="badge bg-success">${item.quantidadeLiberada} liberados</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card border-warning">
                    <div class="card-header bg-warning text-dark">
                        <h6>Devolver ao Estoque (${resultadoComparacao.resumo.totalDevolvidos})</h6>
                    </div>
                    <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                        ${resultadoComparacao.itensDevolvidos.map(item => `
                            <div class="border-bottom py-2">
                                <strong>${item.codigo}</strong><br>
                                <small>${item.descricao}</small><br>
                                <span class="badge bg-warning">${item.quantidadeDevolvida} devolver</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card border-danger">
                    <div class="card-header bg-danger text-white">
                        <h6>Comprar (${resultadoComparacao.resumo.totalParaComprar})</h6>
                    </div>
                    <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                        ${resultadoComparacao.itensParaComprar.map(item => `
                            <div class="border-bottom py-2">
                                <strong>${item.codigo}</strong><br>
                                <small>${item.descricao}</small><br>
                                <span class="badge bg-danger">${item.quantidadeComprar} comprar</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="alert alert-info mt-3">
            <h6>Resumo da Comparação:</h6>
            <ul>
                <li><strong>${resultadoComparacao.resumo.totalLiberados}</strong> itens podem ser liberados</li>
                <li><strong>${resultadoComparacao.resumo.totalDevolvidos}</strong> itens devem ser devolvidos ao estoque</li>
                <li><strong>${resultadoComparacao.resumo.totalParaComprar}</strong> itens precisam ser comprados</li>
            </ul>
        </div>
    `;
    
    container.style.display = 'block';
}

/**
 * Gerar correção final
 */
async function gerarCorrecaoFinal() {
    if (!resultadoComparacao) {
        mostrarNotificacao('Execute a comparação primeiro', 'warning');
        return;
    }
    
    try {
        console.log('🔧 Gerando correção final...');
        
        const dataCorrecao = new Date().toISOString().split('T')[0];
        
        // Salvar na coleção CorrecaoFinal
        const correcaoRef = window.db
            .collection('CorrecaoFinal')
            .doc(clienteAtual.id)
            .collection('projetos')
            .doc(projetoAtual.id)
            .collection('listas')
            .doc(listaOriginal.id);
        
        const batch = window.db.batch();
        
        // Salvar itens para correção
        const todosItensCorrecao = [
            ...resultadoComparacao.itensLiberados,
            ...resultadoComparacao.itensDevolvidos,
            ...resultadoComparacao.itensParaComprar
        ];
        
        todosItensCorrecao.forEach(item => {
            const itemRef = correcaoRef.collection('itensParaCorrecao').doc();
            batch.set(itemRef, {
                ...item,
                clienteId: clienteAtual.id,
                projetoId: projetoAtual.id,
                listaId: listaOriginal.id,
                dataCorrecao: dataCorrecao,
                usuarioCorrecao: 'Sistema',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        // Salvar resumo da correção
        batch.set(correcaoRef, {
            clienteId: clienteAtual.id,
            projetoId: projetoAtual.id,
            listaId: listaOriginal.id,
            dataCorrecao: dataCorrecao,
            resumo: resultadoComparacao.resumo,
            totalItens: todosItensCorrecao.length,
            status: 'Gerada',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await batch.commit();
        
        console.log('✅ Correção final gerada');
        mostrarNotificacao('Correção final gerada com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao gerar correção:', error);
        mostrarNotificacao('Erro ao gerar correção final', 'danger');
    }
}

/**
 * Exportar resultado
 */
function exportarResultado() {
    if (!resultadoComparacao) {
        mostrarNotificacao('Execute a comparação primeiro', 'warning');
        return;
    }
    
    console.log('📤 Exportando resultado...');
    
    // Criar CSV com todos os itens
    const headers = ['Código', 'Descrição', 'Quantidade', 'Status', 'Ação'];
    const linhas = [];
    
    // Adicionar itens liberados
    resultadoComparacao.itensLiberados.forEach(item => {
        linhas.push([
            item.codigo || '',
            `"${(item.descricao || '').replace(/"/g, '""')}"`,
            item.quantidadeLiberada || 0,
            'Liberado',
            'Usar na produção'
        ]);
    });
    
    // Adicionar itens devolvidos
    resultadoComparacao.itensDevolvidos.forEach(item => {
        linhas.push([
            item.codigo || '',
            `"${(item.descricao || '').replace(/"/g, '""')}"`,
            item.quantidadeDevolvida || 0,
            'Devolver',
            'Retornar ao estoque'
        ]);
    });
    
    // Adicionar itens para comprar
    resultadoComparacao.itensParaComprar.forEach(item => {
        linhas.push([
            item.codigo || '',
            `"${(item.descricao || '').replace(/"/g, '""')}"`,
            item.quantidadeComprar || 0,
            'Comprar',
            'Incluir em nova compra'
        ]);
    });
    
    const csvContent = [
        headers.join(','),
        ...linhas.map(linha => linha.join(','))
    ].join('\n');
    
    // Download do arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `separacao_${clienteAtual.nome}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    mostrarNotificacao('Resultado exportado com sucesso!', 'success');
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
    limparListas();
}

function limparListas() {
    const selectLista = document.getElementById('listaSelect');
    if (selectLista) {
        selectLista.innerHTML = '<option value="">Selecione uma lista</option>';
        selectLista.disabled = true;
    }
    
    listaOriginal = null;
    itensOriginais = [];
    
    // Desabilitar upload e comparação
    document.getElementById('arquivoSeparacao').disabled = true;
    document.getElementById('btnCompararListas').disabled = true;
    document.getElementById('btnGerarCorrecao').disabled = true;
    document.getElementById('btnExportarResultado').disabled = true;
    
    // Limpar resumos
    document.getElementById('resumoListaOriginal').innerHTML = '';
    document.getElementById('resumoArquivoNovo').innerHTML = '';
    document.getElementById('resultadoComparacao').style.display = 'none';
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

console.log('✅ separacao.js carregado - FIRESTORE EXCLUSIVO');