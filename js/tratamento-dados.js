/**
 * tratamento-dados.js
 * 
 * Lógica específica da tela de tratamento de dados
 * Este arquivo contém todas as funções relacionadas à tela de tratamento de dados
 * do Sistema de Controle de Compras e Recebimento
 */

// Variáveis globais do módulo
let clienteAtual = null;
let tabelaItens = null;
let itensSelecionados = [];
let dadosEstoque = {};
let colunasOcultas = true; // Estado inicial: colunas ocultas

// Aguarda o carregamento completo do DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado na página de tratamento de dados');
    
    // Inicializa os componentes da página
    inicializarComponentes();
    
    // Verifica se o dbRef está disponível antes de carregar os clientes
    console.log('Verificando disponibilidade de dbRef...');
    
    // Função para tentar carregar clientes com retry
    function tentarCarregarClientes(tentativas = 0, maxTentativas = 5) {
        console.log(`Tentativa ${tentativas + 1} de ${maxTentativas} para carregar clientes`);
        
        if (typeof window.dbRef !== 'undefined' && window.dbRef.clientes) {
            console.log('dbRef disponível, carregando clientes...');
            // Carrega a lista de clientes cadastrados
            carregarClientes();
        } else {
            console.log('dbRef não disponível ainda, aguardando...');
            
            if (tentativas < maxTentativas) {
                // Aguarda um momento para garantir que o Firebase esteja inicializado
                setTimeout(function() {
                    tentarCarregarClientes(tentativas + 1, maxTentativas);
                }, 1000);
            } else {
                console.error('dbRef ainda não disponível após várias tentativas');
                mostrarNotificacao('Erro ao conectar ao banco de dados. Por favor, recarregue a página.', 'danger');
                
                // Tenta criar manualmente a referência como último recurso
                try {
                    console.log('Tentando criar referência manualmente...');
                    if (firebase && firebase.database) {
                        window.dbRef = {
                            clientes: firebase.database().ref('clientes'),
                            projetos: firebase.database().ref('projetos')
                        };
                        console.log('Referência criada manualmente, tentando carregar clientes...');
                        carregarClientes();
                    }
                } catch (error) {
                    console.error('Erro ao criar referência manualmente:', error);
                }
            }
        }
    }
    
    // Inicia o processo de carregamento com retry
    tentarCarregarClientes();
    
    // Configura os listeners de eventos
    configurarEventListeners();
});

/**
 * Inicializa os componentes da interface
 * Configura DataTables e outros elementos
 */
function inicializarComponentes() {
    // Inicializa a tabela de clientes com DataTables
    $('#tabelaClientes').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json'
        },
        responsive: true,
        order: [[2, 'desc']] // Ordena por data de criação (decrescente)
    });
    
    // Configura o botão de toggle para mostrar/ocultar colunas
    const btnToggleColunas = document.getElementById('btnToggleColunas');
    if (btnToggleColunas) {
        btnToggleColunas.addEventListener('click', function() {
            toggleColunas();
        });
    }
}

/**
 * Alterna a visibilidade das colunas ocultas (Medida, Altura, Largura, Cor)
 */
function toggleColunas() {
    // Obtém todas as colunas ocultas
    const colunasOcultasElements = document.querySelectorAll('.coluna-oculta');
    const btnToggle = document.getElementById('btnToggleColunas');
    
    // Alterna o estado
    colunasOcultas = !colunasOcultas;
    
    // Atualiza o texto do botão
    if (btnToggle) {
        btnToggle.textContent = colunasOcultas ? '+' : '-';
    }
    
    // Atualiza a visibilidade das colunas
    colunasOcultasElements.forEach(coluna => {
        if (colunasOcultas) {
            coluna.style.display = 'none';
        } else {
            coluna.style.display = 'table-cell';
        }
    });
}

/**
 * Configura os listeners de eventos para os elementos da página
 */
function configurarEventListeners() {
    // Formulário de upload de arquivo de estoque
    document.getElementById('formEstoque').addEventListener('submit', function(e) {
        e.preventDefault();
        processarArquivoEstoque();
    });
    
    // Checkbox para selecionar/deselecionar todos os itens
    document.getElementById('checkTodos').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.check-item');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        
        atualizarSelecao();
    });
    
    // Botão para atualizar itens em lote
    document.getElementById('btnAtualizarLote').addEventListener('click', function() {
        // Atualiza a contagem de itens selecionados no modal
        document.getElementById('quantidadeItensSelecionados').textContent = itensSelecionados.length;
        
        // Exibe o modal
        const modalAtualizacaoLote = new bootstrap.Modal(document.getElementById('modalAtualizacaoLote'));
        modalAtualizacaoLote.show();
    });
    
    // Listener para mostrar/ocultar campos de edição manual
    document.querySelectorAll('input[name="statusLote"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const camposEdicaoManual = document.getElementById('camposEdicaoManual');
            if (this.value === 'Empenho/Compras') {
                camposEdicaoManual.classList.remove('d-none');
                
                // Preenche os campos com valores padrão baseados no primeiro item selecionado
                if (itensSelecionados.length > 0) {
                    const primeiroItem = window.todosItens[itensSelecionados[0]];
                    const quantidade = parseInt(primeiroItem.quantidade) || 0;
                    
                    // Define valores padrão
                    document.getElementById('inputEmpenho').value = Math.floor(quantidade / 2);
                    document.getElementById('inputNecessidade').value = Math.ceil(quantidade / 2);
                }
            } else {
                camposEdicaoManual.classList.add('d-none');
            }
        });
    });
    
    // Botão para confirmar atualização em lote
    document.getElementById('btnConfirmarAtualizacao').addEventListener('click', function() {
        const status = document.querySelector('input[name="statusLote"]:checked').value;
        
        // Verifica se é o status misto que requer valores manuais
        if (status === 'Empenho/Compras') {
            const empenho = parseInt(document.getElementById('inputEmpenho').value) || 0;
            const necessidade = parseInt(document.getElementById('inputNecessidade').value) || 0;
            atualizarStatusEmLote(status, empenho, necessidade);
        } else {
            atualizarStatusEmLote(status);
        }
        
        // Fecha o modal
        const modalAtualizacaoLote = bootstrap.Modal.getInstance(document.getElementById('modalAtualizacaoLote'));
        modalAtualizacaoLote.hide();
    });
    
    // Botão para marcar cliente como concluído
    document.getElementById('btnConcluir').addEventListener('click', function() {
        // Exibe o modal de confirmação
        const modalConfirmacao = new bootstrap.Modal(document.getElementById('modalConfirmacao'));
        modalConfirmacao.show();
    });
    
    // Botão para confirmar conclusão
    document.getElementById('btnConfirmarConclusao').addEventListener('click', function() {
        concluirCliente();
        
        // Fecha o modal
        const modalConfirmacao = bootstrap.Modal.getInstance(document.getElementById('modalConfirmacao'));
        modalConfirmacao.hide();
    });
}

/**
 * Carrega a lista de clientes cadastrados do Firebase
 * e atualiza a tabela na interface
 */
function carregarClientes() {
    console.log('Iniciando carregamento de clientes...');
    
    // Referência à tabela de clientes
    const tabelaClientes = document.querySelector('#tabelaClientes tbody');
    const nenhumCliente = document.getElementById('nenhumCliente');
    
    if (!tabelaClientes) {
        console.error('Elemento tbody da tabela de clientes não encontrado!');
        return;
    }
    
    if (!nenhumCliente) {
        console.error('Elemento nenhumCliente não encontrado!');
        return;
    }
    
    // Limpa a tabela
    tabelaClientes.innerHTML = '';
    
    // Verifica se dbRef está disponível
    if (!window.dbRef || !window.dbRef.clientes) {
        console.error('dbRef ou dbRef.clientes não está definido!');
        mostrarNotificacao('Erro ao acessar o banco de dados. Por favor, recarregue a página.', 'danger');
        return;
    }
    
    console.log('Buscando clientes no Firebase...');
    
    // Busca os clientes no Firebase
    window.dbRef.clientes.once('value')
        .then(snapshot => {
            console.log('Resposta do Firebase recebida:', snapshot.exists());
            
            const clientes = snapshot.val();
            console.log('Dados de clientes:', clientes);
            
            // Verifica se existem clientes cadastrados
            if (objetoVazio(clientes)) {
                console.log('Nenhum cliente encontrado. Criando cliente de teste para diagnóstico...');
                
                // Criar um cliente de teste para diagnóstico
                const clienteTeste = {
                    nome: "Cliente Teste",
                    dataCriacao: Date.now(),
                    prazoEntrega: Date.now() + 7*24*60*60*1000, // 7 dias a partir de agora
                    status: "Não iniciado"
                };
                
                // Salvar cliente de teste no Firebase
                window.dbRef.clientes.child('cliente_teste').set(clienteTeste)
                    .then(() => {
                        console.log('Cliente de teste criado com sucesso');
                        // Recarregar a página para mostrar o cliente de teste
                        setTimeout(() => {
                            location.reload();
                        }, 2000);
                    })
                    .catch(error => {
                        console.error('Erro ao criar cliente de teste:', error);
                    });
                
                nenhumCliente.classList.remove('d-none');
                
                // Destrói a instância do DataTable se existir
                if ($.fn.DataTable.isDataTable('#tabelaClientes')) {
                    $('#tabelaClientes').DataTable().destroy();
                }
                
                return;
            }
            
            console.log('Clientes encontrados:', Object.keys(clientes).length);
            nenhumCliente.classList.add('d-none');
            
            // Preparar dados para DataTables
            console.log('Preparando dados para DataTables...');
            let dataSet = [];
            
            // Iterando sobre as chaves do objeto clientes (primeiro nível)
            console.log('Iterando sobre clientes para renderização na tabela...');
            Object.keys(clientes).forEach(clienteKey => {
                console.log('Processando cliente com chave:', clienteKey);
                // Verifica se o valor é um objeto que contém as propriedades esperadas
                const clienteObj = clientes[clienteKey];
                if (clienteObj && typeof clienteObj === 'object' && clienteObj.nome) {
                    console.log('Cliente válido encontrado:', clienteObj.nome);
                    const cliente = clienteObj;
                    
                    // Formata as datas
                    const dataCriacao = formatarData(cliente.dataCriacao);
                    const prazoEntrega = formatarData(cliente.prazoEntrega);
                    
                    // Prepara os botões de ação
                    const botoes = `
                        <button class="btn btn-sm btn-primary me-1 ${cliente.status === 'Concluído' ? 'd-none' : ''}" onclick="iniciarTratamento('${clienteKey}')">
                            <i class="fas fa-play"></i> ${cliente.status === 'Em andamento' ? 'Continuar' : 'Iniciar'}
                        </button>
                        <button class="btn btn-sm btn-info" onclick="visualizarCliente('${clienteKey}')">
                            <i class="fas fa-eye"></i> Visualizar
                        </button>
                    `;
                    
                    // Prepara o status com badge
                    const statusHtml = `<span class="badge ${getBadgeClass(cliente.StatusTratamento)}">${cliente.StatusTratamento || 'Não iniciado'}</span>`;
                    
                    // Adiciona ao conjunto de dados
                    dataSet.push([
                        cliente.nome,
                        statusHtml,
                        dataCriacao,
                        prazoEntrega,
                        botoes
                    ]);
                    
                    console.log('Cliente adicionado ao dataset para DataTables:', cliente.nome);
                }
            });
            
            // Inicializa ou atualiza o DataTable
            console.log('Inicializando DataTable com', dataSet.length, 'clientes');
            
            // Destrói a tabela existente se já estiver inicializada
            if ($.fn.DataTable.isDataTable('#tabelaClientes')) {
                $('#tabelaClientes').DataTable().destroy();
            }
            
            // Inicializa o DataTable com os novos dados
            $('#tabelaClientes').DataTable({
                data: dataSet,
                columns: [
                    { title: "Cliente" },
                    { title: "Status" },
                    { title: "Data Criação" },
                    { title: "Prazo de Entrega" },
                    { title: "Ações" }
                ],
                language: {
                    url: "//cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json"
                },
                responsive: true,
                columnDefs: [
                    { className: "align-middle", targets: "_all" }
                ],
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                order: [[2, 'desc']], // Ordena por data de criação (decrescente)
                drawCallback: function() {
                    // Adiciona animações aos elementos da tabela
                    $('.dataTable tbody tr').addClass('animate__animated animate__fadeIn');
                    
                    // Verifica se há dados na tabela
                    if (dataSet.length > 0) {
                        nenhumCliente.classList.add('d-none');
                    } else {
                        nenhumCliente.classList.remove('d-none');
                    }
                    
                    console.log('DataTable inicializado e renderizado com sucesso');
                }
            });
        })
        .catch(error => {
            console.error('Erro ao carregar clientes:', error);
            mostrarNotificacao('Erro ao carregar clientes. Tente novamente.', 'danger');
        });
}

/**
 * Retorna a classe do badge de acordo com o status
 * 
 * @param {string} status - Status do cliente
 * @returns {string} - Classe CSS para o badge
 */
function getBadgeClass(status) {
    switch (status) {
        case 'Em andamento':
            return 'bg-warning';
        case 'Concluído':
            return 'bg-success';
        default:
            return 'bg-secondary';
    }
}

/**
 * Inicia o tratamento de dados para um cliente
 * 
 * @param {string} clienteId - ID do cliente
 */
function iniciarTratamento(clienteId) {
    // Armazena o ID do cliente atual
    clienteAtual = clienteId;
    
    // Busca os dados do cliente
    dbRef.clientes.child(clienteId).once('value')
        .then(snapshot => {
            const cliente = snapshot.val();
            
            if (!cliente) {
                mostrarNotificacao('Cliente não encontrado.', 'warning');
                return;
            }
            
            // Atualiza o status do cliente para "Em andamento" se ainda não estiver
            if (cliente.StatusTratamento !== 'Em andamento') { // Verifica o campo correto
                dbRef.clientes.child(clienteId).update({
                    StatusTratamento: 'Em andamento', // Salva no campo correto
                    ultimaAtualizacao: Date.now()
                });
            }
            
            // Atualiza o título com o nome do cliente
            document.querySelector('#tituloCliente span').textContent = cliente.nome;
            
            // Exibe a área de tratamento de dados
            document.getElementById('areaTratamentoDados').classList.remove('d-none');
            
            // Carrega os itens do cliente
            carregarItensCliente(clienteId);
            
            // Rola a página para a área de tratamento
            document.getElementById('areaTratamentoDados').scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            console.error('Erro ao iniciar tratamento:', error);
            mostrarNotificacao('Erro ao iniciar tratamento. Tente novamente.', 'danger');
        });
}

/**
 * Carrega os itens de um cliente do Firebase
 * 
 * @param {string} clienteId - ID do cliente
 */
function carregarItensCliente(clienteId) {
    // Referência à tabela de itens
    const tabelaItensBody = document.querySelector('#tabelaItens tbody');
    const nenhumItem = document.getElementById('nenhumItem');
    
    // Limpa a tabela
    tabelaItensBody.innerHTML = '';
    
    // Mostra indicador de carregamento
    const loadingIndicator = document.createElement('tr');
    loadingIndicator.id = 'loadingIndicator';
    loadingIndicator.innerHTML = `
        <td colspan="12" class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
            </div>
            <p class="mt-2">Carregando itens...</p>
        </td>
    `;
    tabelaItensBody.appendChild(loadingIndicator);
    
    // Busca os projetos do cliente
    dbRef.projetos.child(clienteId).once('value')
        .then(snapshot => {
            // Remove o indicador de carregamento
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
            
            const projetos = snapshot.val();
            
            // Verifica se existem projetos cadastrados
            if (objetoVazio(projetos)) {
                nenhumItem.classList.remove('d-none');
                
                // Destrói a instância do DataTable se existir
                if ($.fn.DataTable.isDataTable('#tabelaItens')) {
                    $('#tabelaItens').DataTable().destroy();
                }
                
                return;
            }
            
            nenhumItem.classList.add('d-none');
            
            // Array para armazenar todos os itens
            const todosItens = [];
            
            // Para cada tipo de projeto
            Object.keys(projetos).forEach(tipo => {
                // Pula o tipo "Tratamento" para evitar duplicação
                if (tipo === 'Tratamento') {
                    return;
                }
                
                const projeto = projetos[tipo];
                
                // Pula projetos terceirizados
                if (projeto.terceirizado) {
                    return;
                }
                
                // Verifica se há listas
                if (projeto.listas && !objetoVazio(projeto.listas)) {
                    // Para cada lista
                    Object.keys(projeto.listas).forEach(nomeLista => {
                        const itens = projeto.listas[nomeLista];
                        
                        if (Array.isArray(itens) && itens.length > 0) {
                            // Adiciona cada item ao array com informações adicionais
                            itens.forEach((item, index) => {
                                todosItens.push({
                                    ...item,
                                    tipo: tipo,
                                    lista: nomeLista,
                                    caminho: `${tipo}/listas/${nomeLista}/${index}`
                                });
                            });
                        }
                    });
                }
            });
            
            // Verifica se há itens após processar
            if (todosItens.length === 0) {
                nenhumItem.classList.remove('d-none');
                
                // Destrói a instância do DataTable se existir
                if ($.fn.DataTable.isDataTable('#tabelaItens')) {
                    $('#tabelaItens').DataTable().destroy();
                }
                
                return;
            }
            
            // Adiciona os itens à tabela
            todosItens.forEach((item, index) => {
                // Cria a linha da tabela
                const tr = document.createElement('tr');
                
                // Define a classe de acordo com o status
                if (item.status === 'Em Estoque' || item.status === 'Separação do estoque' || item.status === 'Empenho') {
                    tr.classList.add('table-success');
                } else if (item.status === 'Necessidade de compra' || item.status === 'Comprar' || 
                           item.status === 'Compras' || item.status === 'Empenho/Compras') {
                    tr.classList.add('table-danger');
                }
                
                // Conteúdo da linha
                tr.innerHTML = `
                    <td>
                        <div class="form-check">
                            <input class="form-check-input check-item" type="checkbox" data-index="${index}">
                        </div>
                    </td>
                    <td>${item.codigo}</td>
                    <td>${item.descricao}</td>
                    <td></td>
                    <td class="coluna-oculta">${item.medida || '-'}</td>
                    <td class="coluna-oculta">${item.altura || '-'}</td>
                    <td class="coluna-oculta">${item.largura || '-'}</td>
                    <td class="coluna-oculta">${item.cor || '-'}</td>
                    <td>${item.quantidade}</td>
                    <td>${item.lista}</td>
                    <td>${item.empenho || 0}</td>
                    <td>${item.necessidade || 0}</td>
                    <td>
                        <span class="badge ${getBadgeStatusClass(item.status)}">
                            ${item.status || 'Compras'}
                        </span>
                    </td>
                `;
                
                tabelaItensBody.appendChild(tr);
            });
            
            // Armazena os itens para referência
            window.todosItens = todosItens;
            
            // Reinicializa o DataTable
            if ($.fn.DataTable.isDataTable('#tabelaItens')) {
                $('#tabelaItens').DataTable().destroy();
            }
            
            // Inicializa o DataTable
            tabelaItens = $('#tabelaItens').DataTable({
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json'
                },
                columnDefs: [
                    { orderable: false, targets: [0, 3] } // Desativa ordenação na coluna de checkbox e na coluna do botão +
                ]
            });
            
            // Configura os listeners para os checkboxes dos itens
            document.querySelectorAll('.check-item').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    atualizarSelecao();
                });
            });
        })
        .catch(error => {
            console.error('Erro ao carregar itens:', error);
            mostrarNotificacao('Erro ao carregar itens. Tente novamente.', 'danger');
            
            // Remove o indicador de carregamento em caso de erro
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        });
}

/**
 * Retorna a classe do badge de acordo com o status do item
 * 
 * @param {string} status - Status do item
 * @returns {string} - Classe CSS para o badge
 */
function getBadgeStatusClass(status) {
    switch (status) {
        case 'Em Estoque':
        case 'Separação do estoque':
        case 'Empenho':
        case 'Empenho de Material':
            return 'bg-success';
        case 'Necessidade de compra':
        case 'Comprar':
        case 'Compras':
        case 'Sol. Compras':
            return 'bg-danger';
        case 'Empenho/Compras':
        case 'Empenho de Material/Sol. Compras':
            return 'bg-warning';
        default:
            return 'bg-secondary';
    }
}

/**
 * Atualiza a seleção de itens
 */
function atualizarSelecao() {
    // Limpa o array de itens selecionados
    itensSelecionados = [];
    
    // Verifica quais checkboxes estão marcados
    document.querySelectorAll('.check-item:checked').forEach(checkbox => {
        const index = parseInt(checkbox.dataset.index);
        itensSelecionados.push(index);
    });
    
    // Atualiza o estado do botão de atualização em lote
    const btnAtualizarLote = document.getElementById('btnAtualizarLote');
    btnAtualizarLote.disabled = itensSelecionados.length === 0;
}

/**
 * Processa o arquivo de estoque
 * Versão atualizada para usar a nova função processarArquivoTratamento
 */
function processarArquivoEstoque() {
    // Verifica se há um cliente selecionado
    if (!clienteAtual) {
        mostrarNotificacao('Nenhum cliente selecionado.', 'warning');
        return;
    }
    
    // Referência ao input de arquivo
    const inputFile = document.getElementById('arquivoEstoque');
    
    // Verifica se há arquivo selecionado
    if (!inputFile.files.length) {
        mostrarNotificacao('Selecione um arquivo de estoque.', 'warning');
        return;
    }
    
    // Obtém o arquivo
    const arquivo = inputFile.files[0];
    
    // Mostra notificação de processamento
    mostrarNotificacao('Processando arquivo de estoque...', 'info');
    
    // Desabilita o botão de processamento para evitar cliques múltiplos
    const btnProcessar = document.getElementById('btnProcessarEstoque');
    btnProcessar.disabled = true;
    btnProcessar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    
    // Adiciona indicador de processamento na tabela
    const tabelaItensBody = document.querySelector('#tabelaItens tbody');
    if (tabelaItensBody) {
        // Limpa a tabela
        tabelaItensBody.innerHTML = '';
        
        // Adiciona indicador de processamento
        const loadingRow = document.createElement('tr');
        loadingRow.id = 'processingIndicator';
        loadingRow.innerHTML = `
            <td colspan="12" class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Processando...</span>
                </div>
                <p class="mt-2">Processando arquivo e atualizando dados...</p>
            </td>
        `;
        tabelaItensBody.appendChild(loadingRow);
    }
    
    // Processa o arquivo usando a nova função
    processarArquivoTratamento(arquivo, clienteAtual)
        .then(resultado => {
            console.log('Arquivo processado com sucesso:', resultado);
            mostrarNotificacao(`Arquivo processado com sucesso. ${resultado.itens} itens encontrados.`, 'success');
            
            // Compara com os itens do cliente
            return compararComListaTratamento(clienteAtual);
        })
        .then(() => {
            console.log('Comparação concluída com sucesso');
            mostrarNotificacao('Comparação concluída com sucesso.', 'success');
            
            // Configura um listener para detectar mudanças nos dados
            const projetosRef = dbRef.projetos.child(clienteAtual);
            
            // Primeiro, carrega os itens para atualizar a tabela com os dados mais recentes
            carregarItensCliente(clienteAtual);
            
            // Reabilita o botão de processamento
            btnProcessar.disabled = false;
            btnProcessar.innerHTML = '<i class="fas fa-file-import"></i> Processar Arquivo';
            
            // Remove o indicador de processamento
            const processingIndicator = document.getElementById('processingIndicator');
            if (processingIndicator) {
                processingIndicator.remove();
            }
        })
        .catch(error => {
            console.error('Erro ao processar arquivo:', error);
            mostrarNotificacao(`Erro ao processar arquivo: ${error.message}`, 'danger');
            
            // Reabilita o botão de processamento
            btnProcessar.disabled = false;
            btnProcessar.innerHTML = '<i class="fas fa-file-import"></i> Processar Arquivo';
            
            // Remove o indicador de processamento
            const processingIndicator = document.getElementById('processingIndicator');
            if (processingIndicator) {
                processingIndicator.remove();
            }
        });
}

/**
 * Atualiza o status de múltiplos itens em lote
 * 
 * @param {string} status - Novo status para os itens
 * @param {number} empenhoManual - Valor manual para empenho (opcional)
 * @param {number} necessidadeManual - Valor manual para necessidade (opcional)
 */
function atualizarStatusEmLote(status, empenhoManual, necessidadeManual) {
    // Verifica se há itens selecionados
    if (itensSelecionados.length === 0) {
        mostrarNotificacao('Nenhum item selecionado.', 'warning');
        return;
    }
    
    // Mostra notificação de processamento
    mostrarNotificacao('Atualizando itens...', 'info');
    
    // Adiciona indicador de atualização na tabela
    const tabelaItensBody = document.querySelector('#tabelaItens tbody');
    if (tabelaItensBody) {
        // Adiciona classe de processamento às linhas selecionadas
        itensSelecionados.forEach(index => {
            const checkboxes = document.querySelectorAll('.check-item');
            if (checkboxes[index]) {
                const row = checkboxes[index].closest('tr');
                if (row) {
                    row.classList.add('updating');
                    row.style.opacity = '0.5';
                }
            }
        });
    }
    
    // Array para armazenar as promessas de atualização
    const promessasAtualizacao = [];
    
    // Para cada item selecionado
    itensSelecionados.forEach(index => {
        const item = window.todosItens[index];
        
        if (item) {
            // Atualiza o status
            item.status = status;
            
            // Define os valores de empenho e necessidade com base no status
            if (status === 'Empenho') {
                item.empenho = item.quantidade;
                item.necessidade = 0;
            } else if (status === 'Compras') {
                item.empenho = 0;
                item.necessidade = item.quantidade;
            } else if (status === 'Empenho/Compras') {
                // Usa os valores manuais se fornecidos
                if (empenhoManual !== undefined && necessidadeManual !== undefined) {
                    item.empenho = empenhoManual;
                    item.necessidade = necessidadeManual;
                } else {
                    // Valores padrão se não fornecidos
                    const quantidade = parseInt(item.quantidade) || 0;
                    item.empenho = Math.floor(quantidade / 2);
                    item.necessidade = Math.ceil(quantidade / 2);
                }
            }
            
            // Adiciona a promessa de atualização
            promessasAtualizacao.push(atualizarItemNoFirebase(item));
        }
    });
    
    // Aguarda todas as atualizações serem concluídas
    Promise.all(promessasAtualizacao)
        .then(() => {
            // Recarrega os itens para atualizar a tabela
            carregarItensCliente(clienteAtual);
            mostrarNotificacao(`${itensSelecionados.length} itens atualizados com sucesso.`, 'success');
        })
        .catch(error => {
            console.error('Erro ao atualizar itens:', error);
            mostrarNotificacao('Erro ao atualizar itens. Tente novamente.', 'danger');
            
            // Remove classe de processamento das linhas selecionadas
            itensSelecionados.forEach(index => {
                const checkboxes = document.querySelectorAll('.check-item');
                if (checkboxes[index]) {
                    const row = checkboxes[index].closest('tr');
                    if (row) {
                        row.classList.remove('updating');
                        row.style.opacity = '1';
                    }
                }
            });
        });
}

/**
 * Atualiza um item no Firebase
 * 
 * @param {Object} item - Item a ser atualizado
 * @returns {Promise} - Promise que resolve quando o item for atualizado
 */
function atualizarItemNoFirebase(item) {
    return new Promise((resolve, reject) => {
        // Extrai o caminho do item
        const caminho = item.caminho;
        
        if (!caminho) {
            console.error('Caminho do item não definido:', item);
            reject(new Error('Caminho do item não definido'));
            return;
        }
        
        // Atualiza no Firebase
        dbRef.projetos.child(clienteAtual).child(caminho).update({
            empenho: item.empenho || 0,
            necessidade: item.necessidade || 0,
            status: item.status
        })
        .then(() => {
            resolve();
        })
        .catch(error => {
            console.error('Erro ao atualizar item no Firebase:', error);
            reject(error);
        });
    });
}

/**
 * Marca um cliente como concluído
 */
function concluirCliente() {
    // Verifica se há um cliente selecionado
    if (!clienteAtual) {
        mostrarNotificacao('Nenhum cliente selecionado.', 'warning');
        return;
    }
    
    // Atualiza o status do cliente para "Concluído"
    dbRef.clientes.child(clienteAtual).update({
        status: 'Concluído',
        dataConclusao: Date.now()
    })
    .then(() => {
        mostrarNotificacao('Cliente marcado como concluído com sucesso.', 'success');
        
        // Recarrega a lista de clientes
        carregarClientes();
        
        // Oculta a área de tratamento de dados
        document.getElementById('areaTratamentoDados').classList.add('d-none');
        
        // Limpa o cliente atual
        clienteAtual = null;
    })
    .catch(error => {
        console.error('Erro ao concluir cliente:', error);
        mostrarNotificacao('Erro ao concluir cliente. Tente novamente.', 'danger');
    });
}

/**
 * Exibe uma notificação na interface
 * 
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo da notificação (success, info, warning, danger)
 */
function mostrarNotificacao(mensagem, tipo) {
    // Cria o elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = `alert alert-${tipo} alert-dismissible fade show`;
    notificacao.role = 'alert';
    notificacao.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    // Adiciona a notificação ao topo da página
    const container = document.querySelector('main.container');
    container.insertBefore(notificacao, container.firstChild);
    
    // Remove a notificação após 5 segundos
    setTimeout(() => {
        notificacao.classList.remove('show');
        setTimeout(() => {
            notificacao.remove();
        }, 150);
    }, 5000);
}

/**
 * Verifica se um objeto está vazio
 * 
 * @param {Object} obj - Objeto a ser verificado
 * @returns {boolean} - true se o objeto estiver vazio, false caso contrário
 */
function objetoVazio(obj) {
    return obj === null || obj === undefined || (Object.keys(obj).length === 0 && obj.constructor === Object);
}

/**
 * Formata uma data timestamp para o formato dd/mm/aaaa
 * 
 * @param {number} timestamp - Timestamp da data
 * @returns {string} - Data formatada
 */
function formatarData(timestamp) {
    if (!timestamp) return '-';
    
    const data = new Date(timestamp);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    
    return `${dia}/${mes}/${ano}`;
}
