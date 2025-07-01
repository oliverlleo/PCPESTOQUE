/**
 * recebimento.js
 * Módulo responsável pelo controle de recebimento de materiais
 * 
 * MIGRADO PARA FIRESTORE: Este arquivo agora usa APENAS Firestore
 */

let todosItens = []; // Array com todos os itens comprados (a visualização será filtrada com base neste array)
let tabelaItens;
let filtroSelecionado = 'pendentes'; // pendentes, recebidos, todos (padrão: pendentes)
let itensSelecionadosParaRecebimento = []; // Array com os itens selecionados para recebimento
let eventosSelecionados = []; // Array com os eventos selecionados no calendário
let calendarioInicializado = false;
let codigosMateriaisRegistrados = new Set(); // Conjunto para armazenar códigos de materiais únicos
let fornecedores = new Map(); // Map para armazenar fornecedores únicos
let calendario;

// Inicialização dos componentes ao carregar o documento
document.addEventListener("DOMContentLoaded", function() {
    console.log("Inicializando recebimento.js...");
    
    inicializarComponentesBasicos();
    
    // Verifica se Firebase e Firestore estão disponíveis
    if (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') {
        console.log('Firestore detectado. Iniciando config e carregamento...');
        if (!window.db || !window.dbRef) {
            console.warn('db ou dbRef não definidos globalmente. Tentando inicializar.');
            try {
                const db = firebase.firestore();
                window.db = db;
                window.dbRef = {
                    clientes: db.collection('clientes'),
                    fornecedores: db.collection('fornecedores'),
                    usuarios: db.collection('usuarios'),
                    separacaoProd: db.collection('SeparacaoProd'),
                    correcaoFinal: db.collection('CorrecaoFinal')
                };
                console.log('Firestore inicializado localmente em recebimento.js');
            } catch (e) {
                console.error('Falha ao inicializar Firestore localmente:', e);
                mostrarNotificacao('Erro crítico: Falha ao conectar com Firestore.', 'danger');
                return;
            }
        }
        inicializarCalendario();
        carregarItensComprados(); // Carrega inicialmente os pendentes
        configurarEventListeners();
        configurarListenerBotaoAlternarVisao(); // Chama a configuração do novo listener
    } else {
        console.error('Firebase não está disponível ou firebase.firestore não é uma função.');
        mostrarNotificacao('Erro crítico: Firestore não carregado.', 'danger');
    }
});

function inicializarComponentesBasicos() {
    console.log('Inicializando componentes básicos...');
    
    // Inicializar UI
    document.getElementById('buscaItem').addEventListener('input', function() {
        filtrarTabelaPorTexto(this.value);
    });
    
    // Inicializar botão de receber
    document.getElementById('btnReceberSelecionados').addEventListener('click', function() {
        if (itensSelecionadosParaRecebimento.length > 0) {
            // Preenche os itens selecionados no modal
            preencherModalRecebimento();
            // Mostra o modal
            new bootstrap.Modal(document.getElementById('modalRecebimento')).show();
        } else {
            mostrarNotificacao('Selecione pelo menos um item para receber.', 'warning');
        }
    });
    
    // Inicializar filtros de visão
    document.getElementById('filtroTodos').addEventListener('click', function() {
        alternarVisao('todos');
    });
    document.getElementById('filtroPendentes').addEventListener('click', function() {
        alternarVisao('pendentes');
    });
    document.getElementById('filtroRecebidos').addEventListener('click', function() {
        alternarVisao('recebidos');
    });
    
    // Inicializar botão de submit do modal de recebimento
    document.getElementById('formRecebimento').addEventListener('submit', function(e) {
        e.preventDefault();
        processarRecebimentoItens();
    });
    
    // Inicializar botão de reset do formulário do modal
    document.getElementById('btnResetFormRecebimento').addEventListener('click', function() {
        document.getElementById('formRecebimento').reset();
    });
    
    // Inicialização da Data Table (vazia inicialmente)
    inicializarTabelaItens([]);
}

// Inicializa a tabela de itens
function inicializarTabelaItens(dados) {
    console.log(`Inicializando tabela com ${dados.length} itens...`);
    
    if (tabelaItens) {
        console.log('Destruindo tabela existente...');
        tabelaItens.destroy();
    }
    
    const colunas = [
        {
            title: '<input type="checkbox" id="checkTodos">',
            data: null,
            width: '30px',
            render: function(data, type, row) {
                if (type === 'display') {
                    const disabled = row.statusRecebimento === 'recebido' ? 'disabled' : '';
                    return `<input type="checkbox" class="check-item" data-id="${row._fb_itemKey}" ${disabled}>`;
                }
                return null;
            },
            orderable: false
        },
        {
            title: 'Cliente',
            data: '_fb_clienteNome',
            render: function(data, type, row) {
                return `<span class="badge bg-secondary">${data || row._fb_clienteId}</span>`;
            }
        },
        {
            title: 'Material',
            data: 'descricao',
            render: function(data, type, row) {
                return `<div class="d-flex flex-column">
                    <span class="fw-bold">${data || 'Sem descrição'}</span>
                    <small class="text-muted">${row.codigoMaterial || 'Sem código'}</small>
                </div>`;
            }
        },
        {
            title: 'Fornecedor',
            data: 'fornecedor',
            render: function(data, type, row) {
                if (data) {
                    return `<span class="badge bg-info text-dark">${data}</span>`;
                }
                return `<span class="badge bg-secondary">Não informado</span>`;
            }
        },
        {
            title: 'Quantidade',
            data: 'quantidade',
            render: function(data, type, row) {
                return `${parseFloat(data).toFixed(2)} ${row.unidade || 'un'}`;
            }
        },
        {
            title: 'Compra',
            data: 'dataStatusCompra',
            render: function(data, type, row) {
                const statusCompra = row.statusCompra || 'pendente';
                let badgeClass = 'bg-secondary';
                
                if (statusCompra === 'comprado') badgeClass = 'bg-success';
                if (statusCompra === 'pendente') badgeClass = 'bg-warning text-dark';
                
                const dataFormatada = data ? new Date(data).toLocaleDateString('pt-BR') : 'N/D';
                
                return `<div class="d-flex flex-column">
                    <span class="badge ${badgeClass} mb-1">${statusCompra}</span>
                    <small>${dataFormatada}</small>
                </div>`;
            }
        },
        {
            title: 'Previsão Entrega',
            data: 'prazoEntrega',
            render: function(data, type, row) {
                if (!data) return '<span class="text-muted">Não informado</span>';
                
                const hoje = new Date();
                const dataPrazo = new Date(data);
                let badgeClass = 'bg-info text-dark';
                
                if (dataPrazo < hoje) {
                    badgeClass = 'bg-danger';
                }
                
                return `<span class="badge ${badgeClass}">${new Date(data).toLocaleDateString('pt-BR')}</span>`;
            }
        },
        {
            title: 'Recebimento',
            data: 'dataRecebimento',
            render: function(data, type, row) {
                const statusRecebimento = row.statusRecebimento || 'pendente';
                let badgeClass = 'bg-secondary';
                
                if (statusRecebimento === 'recebido') badgeClass = 'bg-success';
                if (statusRecebimento === 'pendente') badgeClass = 'bg-warning text-dark';
                if (statusRecebimento === 'parcial') badgeClass = 'bg-info text-dark';
                
                const dataFormatada = data ? new Date(data).toLocaleDateString('pt-BR') : 'N/D';
                
                return `<div class="d-flex flex-column">
                    <span class="badge ${badgeClass} mb-1">${statusRecebimento}</span>
                    <small>${dataFormatada}</small>
                </div>`;
            }
        },
        {
            title: 'Ações',
            data: null,
            render: function(data, type, row) {
                return `<div class="btn-group">
                    <button class="btn btn-sm btn-info btn-detalhes" data-id="${row._fb_itemKey}" title="Detalhes">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-success btn-receber" data-id="${row._fb_itemKey}" title="Receber" 
                        ${row.statusRecebimento === 'recebido' ? 'disabled' : ''}>
                        <i class="fas fa-check-circle"></i>
                    </button>
                </div>`;
            },
            orderable: false
        }
    ];
    
    tabelaItens = new DataTable('#tabelaItens', {
        data: dados,
        columns: colunas,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.1/i18n/pt-BR.json'
        },
        order: [[6, 'asc']], // Ordena por prazo de entrega
        responsive: true,
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excel',
                text: '<i class="fas fa-file-excel"></i> Excel',
                className: 'btn btn-success',
                exportOptions: {
                    columns: [1, 2, 3, 4, 5, 6, 7]
                }
            },
            {
                extend: 'pdf',
                text: '<i class="fas fa-file-pdf"></i> PDF',
                className: 'btn btn-danger',
                exportOptions: {
                    columns: [1, 2, 3, 4, 5, 6, 7]
                }
            },
            {
                extend: 'print',
                text: '<i class="fas fa-print"></i> Imprimir',
                className: 'btn btn-primary',
                exportOptions: {
                    columns: [1, 2, 3, 4, 5, 6, 7]
                }
            }
        ]
    });
    
    // Após criar a tabela, configurar os event listeners para os botões
    document.querySelector('#tabelaItens').addEventListener('click', function(e) {
        const botaoDetalhes = e.target.closest('.btn-detalhes');
        const botaoReceber = e.target.closest('.btn-receber');
        
        if (botaoDetalhes) {
            const itemId = botaoDetalhes.dataset.id;
            mostrarDetalhesItem(itemId);
        } else if (botaoReceber) {
            const itemId = botaoReceber.dataset.id;
            receberItem(itemId);
        }
    });
    
    // Configurar o checkbox de selecionar todos
    document.getElementById('checkTodos').addEventListener('click', function() {
        const checkboxes = document.querySelectorAll('.check-item:not(:disabled)');
        const isChecked = this.checked;
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
            const itemId = checkbox.dataset.id;
            
            if (isChecked) {
                if (!itensSelecionadosParaRecebimento.includes(itemId)) {
                    itensSelecionadosParaRecebimento.push(itemId);
                }
            } else {
                const index = itensSelecionadosParaRecebimento.indexOf(itemId);
                if (index !== -1) {
                    itensSelecionadosParaRecebimento.splice(index, 1);
                }
            }
        });
        
        atualizarContadorEBotaoReceber();
    });
    
    // Configurar os checkboxes de selecionar item
    document.querySelector('#tabelaItens').addEventListener('change', function(e) {
        if (e.target.classList.contains('check-item')) {
            const itemId = e.target.dataset.id;
            
            if (e.target.checked) {
                if (!itensSelecionadosParaRecebimento.includes(itemId)) {
                    itensSelecionadosParaRecebimento.push(itemId);
                }
            } else {
                const index = itensSelecionadosParaRecebimento.indexOf(itemId);
                if (index !== -1) {
                    itensSelecionadosParaRecebimento.splice(index, 1);
                }
            }
            
            atualizarContadorEBotaoReceber();
        }
    });
}

// Função para carregar todos os itens comprados e popular 'todosItens'
function carregarItensComprados() {
    console.log("Iniciando: carregarItensComprados (Carrega TODOS os itens comprados)");
    todosItens = [];
    fornecedores.clear();
    codigosMateriaisRegistrados.clear();
    
    // Mostra um indicador de carregamento
    mostrarLoadingTabela(true);
    
    // Verificar se dbRef está configurado
    if (!window.db || !window.dbRef || !window.dbRef.clientes) {
        console.error("Firestore não está configurado para carregarItensComprados.");
        mostrarNotificacao("Erro de conexão com Firestore (Cód: R01).", "danger");
        inicializarTabelaItens([]);
        mostrarLoadingTabela(false);
        return;
    }
    
    // Buscar todos os clientes no Firestore
    window.db.collection('clientes').get()
        .then(snapshotClientes => {
            if (snapshotClientes.empty) {
                console.warn('Nenhum cliente encontrado no Firestore.');
                inicializarTabelaItens([]);
                carregarEventosCalendario();
                mostrarLoadingTabela(false);
                return;
            }
            
            // Criar um array de promessas para buscar os projetos de cada cliente
            const promessasClientesEProjetos = [];
            
            snapshotClientes.forEach(clienteDoc => {
                const clienteId = clienteDoc.id;
                const clienteData = clienteDoc.data();
                
                // Para cada cliente, buscar todos os seus projetos
                const promessaProjetos = window.db.collection('clientes')
                    .doc(clienteId)
                    .collection('projetos')
                    .get()
                    .then(snapshotProjetos => {
                        const promessasListas = [];
                        
                        snapshotProjetos.forEach(projetoDoc => {
                            const tipoProjeto = projetoDoc.id;
                            const projetoData = projetoDoc.data();
                            
                            // Pular projetos de terceiros ou tratamento
                            if (projetoData.terceirizado || tipoProjeto.toLowerCase() === 'tratamento') {
                                return;
                            }
                            
                            // Para cada projeto, buscar todas as listas
                            const promessaListas = window.db.collection('clientes')
                                .doc(clienteId)
                                .collection('projetos')
                                .doc(tipoProjeto)
                                .collection('listas')
                                .get()
                                .then(snapshotListas => {
                                    const promessasItens = [];
                                    
                                    snapshotListas.forEach(listaDoc => {
                                        const nomeLista = listaDoc.id;
                                        
                                        // Para cada lista, buscar todos os itens
                                        const promessaItens = window.db.collection('clientes')
                                            .doc(clienteId)
                                            .collection('projetos')
                                            .doc(tipoProjeto)
                                            .collection('listas')
                                            .doc(nomeLista)
                                            .collection('itens')
                                            .get()
                                            .then(snapshotItens => {
                                                const itens = [];
                                                
                                                snapshotItens.forEach(itemDoc => {
                                                    const itemId = itemDoc.id;
                                                    const itemData = itemDoc.data();
                                                    
                                                    // Filtrar apenas itens comprados
                                                    if (itemData.statusCompra === 'comprado') {
                                                        // Adicionar metadados úteis para referenciar o item
                                                        const itemEnriquecido = {
                                                            ...itemData,
                                                            _fb_itemKey: itemId,
                                                            _fb_clienteId: clienteId,
                                                            _fb_clienteNome: clienteData.nome || clienteId,
                                                            _fb_tipoProjeto: tipoProjeto,
                                                            _fb_nomeLista: nomeLista,
                                                            _fb_caminhoItem: `clientes/${clienteId}/projetos/${tipoProjeto}/listas/${nomeLista}/itens/${itemId}`
                                                        };
                                                        
                                                        // Registrar código de material e fornecedor para filtros
                                                        if (itemData.codigoMaterial) {
                                                            codigosMateriaisRegistrados.add(itemData.codigoMaterial);
                                                        }
                                                        if (itemData.fornecedor) {
                                                            fornecedores.set(itemData.fornecedor, true);
                                                        }
                                                        
                                                        itens.push(itemEnriquecido);
                                                    }
                                                });
                                                
                                                return itens;
                                            });
                                        
                                        promessasItens.push(promessaItens);
                                    });
                                    
                                    return Promise.all(promessasItens);
                                });
                            
                            promessasListas.push(promessaListas);
                        });
                        
                        return Promise.all(promessasListas);
                    });
                
                promessasClientesEProjetos.push(promessaProjetos);
            });
            
            // Processar todas as promessas
            return Promise.all(promessasClientesEProjetos)
                .then(resultadosClientes => {
                    // Achatar arrays aninhados
                    resultadosClientes.forEach(resultadoCliente => {
                        resultadoCliente.forEach(resultadoProjetos => {
                            resultadoProjetos.forEach(itensLista => {
                                todosItens = [...todosItens, ...itensLista];
                            });
                        });
                    });
                    
                    console.log(`Carregados ${todosItens.length} itens comprados no total.`);
                    
                    // Aplicar filtro atual e atualizar a tabela
                    aplicarFiltroAtual();
                    
                    // Carregar eventos do calendário
                    carregarEventosCalendario();
                    
                    // Esconder loading
                    mostrarLoadingTabela(false);
                });
        })
        .catch(error => {
            console.error('Erro ao carregar itens comprados:', error);
            mostrarNotificacao('Erro ao carregar dados do Firestore.', 'danger');
            inicializarTabelaItens([]);
            mostrarLoadingTabela(false);
        });
}

// Atualiza o contador de itens selecionados e o estado do botão de receber
function atualizarContadorEBotaoReceber() {
    const contador = document.getElementById('contadorItensSelecionados');
    const botaoReceber = document.getElementById('btnReceberSelecionados');
    
    contador.textContent = itensSelecionadosParaRecebimento.length;
    
    if (itensSelecionadosParaRecebimento.length > 0) {
        botaoReceber.disabled = false;
        contador.parentElement.classList.add('badge-animada');
    } else {
        botaoReceber.disabled = true;
        contador.parentElement.classList.remove('badge-animada');
    }
}

// Configura os event listeners necessários
function configurarEventListeners() {
    console.log('Configurando event listeners...');
    
    // Event listener para o dropdown de fornecedores
    document.getElementById('filtroFornecedor').addEventListener('change', function() {
        const fornecedorSelecionado = this.value;
        filtrarTabelaPorFornecedor(fornecedorSelecionado);
    });
    
    // Event listener para o dropdown de códigos de material
    document.getElementById('filtroCodigoMaterial').addEventListener('change', function() {
        const codigoSelecionado = this.value;
        filtrarTabelaPorCodigoMaterial(codigoSelecionado);
    });
    
    // Event listener para o botão de limpar filtros
    document.getElementById('btnLimparFiltros').addEventListener('click', function() {
        limparFiltros();
    });
}

// Configura o listener para o botão de alternar visão
function configurarListenerBotaoAlternarVisao() {
    // Event listeners para os botões de filtro
    document.querySelectorAll('[data-filter-recebimento]').forEach(botao => {
        botao.addEventListener('click', function() {
            const filtro = this.dataset.filterRecebimento;
            alternarVisao(filtro);
        });
    });
}

// Alterna a visão entre pendentes, recebidos e todos
function alternarVisao(tipoVisao) {
    console.log(`Alternando visão para: ${tipoVisao}`);
    
    // Atualiza o filtro selecionado
    filtroSelecionado = tipoVisao;
    
    // Atualiza a aparência dos botões
    document.querySelectorAll('[data-filter-recebimento]').forEach(botao => {
        if (botao.dataset.filterRecebimento === tipoVisao) {
            botao.classList.add('active');
        } else {
            botao.classList.remove('active');
        }
    });
    
    // Aplica o filtro
    aplicarFiltroAtual();
}

// Aplica o filtro atual aos dados e atualiza a tabela
function aplicarFiltroAtual() {
    console.log(`Aplicando filtro: ${filtroSelecionado}`);
    
    if (!todosItens || todosItens.length === 0) {
        inicializarTabelaItens([]);
        atualizarDropdownsFiltros();
        return;
    }
    
    let dadosFiltrados = [];
    
    switch (filtroSelecionado) {
        case 'pendentes':
            dadosFiltrados = todosItens.filter(item => 
                item.statusRecebimento !== 'recebido' && item.statusCompra === 'comprado');
            break;
        case 'recebidos':
            dadosFiltrados = todosItens.filter(item => 
                item.statusRecebimento === 'recebido');
            break;
        case 'todos':
        default:
            dadosFiltrados = [...todosItens];
            break;
    }
    
    console.log(`Filtro aplicado: ${dadosFiltrados.length} itens de ${todosItens.length} total`);
    
    // Atualiza a tabela com os dados filtrados
    inicializarTabelaItens(dadosFiltrados);
    
    // Atualiza os dropdowns de filtros
    atualizarDropdownsFiltros();
    
    // Marca os checkboxes dos itens selecionados
    marcarCheckboxesItensSelecionados();
}

// Atualiza os dropdowns de filtros com os dados disponíveis
function atualizarDropdownsFiltros() {
    // Dropdown de fornecedores
    const dropdownFornecedor = document.getElementById('filtroFornecedor');
    dropdownFornecedor.innerHTML = '<option value="">Todos os fornecedores</option>';
    
    fornecedores.forEach((valor, fornecedor) => {
        const option = document.createElement('option');
        option.value = fornecedor;
        option.textContent = fornecedor;
        dropdownFornecedor.appendChild(option);
    });
    
    // Dropdown de códigos de material
    const dropdownCodigo = document.getElementById('filtroCodigoMaterial');
    dropdownCodigo.innerHTML = '<option value="">Todos os códigos</option>';
    
    codigosMateriaisRegistrados.forEach(codigo => {
        const option = document.createElement('option');
        option.value = codigo;
        option.textContent = codigo;
        dropdownCodigo.appendChild(option);
    });
}

// Filtra a tabela por texto de busca
function filtrarTabelaPorTexto(texto) {
    if (!tabelaItens) return;
    
    console.log(`Filtrando tabela por texto: "${texto}"`);
    tabelaItens.search(texto).draw();
}

// Filtra a tabela por fornecedor
function filtrarTabelaPorFornecedor(fornecedor) {
    if (!tabelaItens) return;
    
    console.log(`Filtrando tabela por fornecedor: "${fornecedor}"`);
    
    if (!fornecedor) {
        tabelaItens.column(3).search('').draw();
    } else {
        tabelaItens.column(3).search(fornecedor, true, false).draw();
    }
}

// Filtra a tabela por código de material
function filtrarTabelaPorCodigoMaterial(codigo) {
    if (!tabelaItens) return;
    
    console.log(`Filtrando tabela por código de material: "${codigo}"`);
    
    if (!codigo) {
        tabelaItens.column(2).search('').draw();
    } else {
        tabelaItens.column(2).search(codigo, true, false).draw();
    }
}

// Limpa todos os filtros aplicados
function limparFiltros() {
    console.log('Limpando todos os filtros...');
    
    document.getElementById('buscaItem').value = '';
    document.getElementById('filtroFornecedor').value = '';
    document.getElementById('filtroCodigoMaterial').value = '';
    
    if (tabelaItens) {
        tabelaItens.search('').columns().search('').draw();
    }
}

// Marca os checkboxes dos itens que estão na lista de selecionados
function marcarCheckboxesItensSelecionados() {
    if (itensSelecionadosParaRecebimento.length === 0) return;
    
    setTimeout(() => {
        itensSelecionadosParaRecebimento.forEach(itemId => {
            const checkbox = document.querySelector(`.check-item[data-id="${itemId}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }, 100);
}

// Mostra ou esconde o indicador de carregamento da tabela
function mostrarLoadingTabela(mostrar) {
    const loading = document.getElementById('loadingTabela');
    if (loading) {
        loading.style.display = mostrar ? 'flex' : 'none';
    }
}

// Mostrar detalhes de um item específico
function mostrarDetalhesItem(itemId) {
    console.log(`Mostrando detalhes do item: ${itemId}`);
    
    const item = todosItens.find(i => i._fb_itemKey === itemId);
    
    if (!item) {
        console.error(`Item não encontrado: ${itemId}`);
        mostrarNotificacao('Item não encontrado.', 'danger');
        return;
    }
    
    // Preenche o modal com os detalhes do item
    const modalBody = document.querySelector('#modalDetalhes .modal-body');
    
    modalBody.innerHTML = `
        <div class="card mb-3">
            <div class="card-header bg-primary text-white">
                <h5 class="m-0">Detalhes do Item</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Cliente:</strong> ${item._fb_clienteNome || item._fb_clienteId}</p>
                        <p><strong>Projeto:</strong> ${item._fb_tipoProjeto}</p>
                        <p><strong>Lista:</strong> ${item._fb_nomeLista}</p>
                        <p><strong>ID do Item:</strong> ${item._fb_itemKey}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Descrição:</strong> ${item.descricao || 'Não informado'}</p>
                        <p><strong>Código Material:</strong> ${item.codigoMaterial || 'Não informado'}</p>
                        <p><strong>Quantidade:</strong> ${parseFloat(item.quantidade).toFixed(2)} ${item.unidade || 'un'}</p>
                        <p><strong>Fornecedor:</strong> ${item.fornecedor || 'Não informado'}</p>
                    </div>
                </div>
                <hr>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Status Compra:</strong> <span class="badge ${item.statusCompra === 'comprado' ? 'bg-success' : 'bg-warning text-dark'}">${item.statusCompra || 'pendente'}</span></p>
                        <p><strong>Data Status Compra:</strong> ${item.dataStatusCompra ? new Date(item.dataStatusCompra).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Status Recebimento:</strong> <span class="badge ${item.statusRecebimento === 'recebido' ? 'bg-success' : 'bg-warning text-dark'}">${item.statusRecebimento || 'pendente'}</span></p>
                        <p><strong>Data Recebimento:</strong> ${item.dataRecebimento ? new Date(item.dataRecebimento).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    </div>
                </div>
                <hr>
                <div class="row">
                    <div class="col-12">
                        <p><strong>Prazo Entrega:</strong> ${item.prazoEntrega ? new Date(item.prazoEntrega).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                        <p><strong>Observações:</strong> ${item.observacoes || 'Não informado'}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header bg-info text-white">
                <h5 class="m-0">Histórico de Recebimentos</h5>
            </div>
            <div class="card-body">
                <div id="historicoRecebimentos">
                    ${renderizarHistoricoRecebimentos(item.historicoRecebimentos)}
                </div>
            </div>
        </div>
    `;
    
    // Exibe o modal
    const modal = new bootstrap.Modal(document.getElementById('modalDetalhes'));
    modal.show();
}

// Renderiza o histórico de recebimentos
function renderizarHistoricoRecebimentos(historico) {
    if (!historico || Object.keys(historico).length === 0) {
        return `<div class="alert alert-info">Nenhum recebimento registrado.</div>`;
    }
    
    let html = `<div class="table-responsive"><table class="table table-striped table-sm">
        <thead>
            <tr>
                <th>Data</th>
                <th>Quantidade</th>
                <th>NF</th>
                <th>Observações</th>
            </tr>
        </thead>
        <tbody>`;
    
    // Converter o objeto para array e ordenar por timestamp
    const historicoArray = Object.entries(historico).map(([key, value]) => ({
        ...value,
        id: key
    })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    historicoArray.forEach(registro => {
        html += `<tr>
            <td>${registro.dataRecebimento || 'N/D'}</td>
            <td>${parseFloat(registro.quantidadeRecebida).toFixed(2) || '0'}</td>
            <td>${registro.notaFiscal || 'N/D'}</td>
            <td>${registro.observacoes || '-'}</td>
        </tr>`;
    });
    
    html += `</tbody></table></div>`;
    
    return html;
}

// Seleciona um item para recebimento
function receberItem(itemId) {
    console.log(`Selecionando item para recebimento: ${itemId}`);
    
    if (!itensSelecionadosParaRecebimento.includes(itemId)) {
        itensSelecionadosParaRecebimento.push(itemId);
        
        // Marca o checkbox do item
        const checkbox = document.querySelector(`.check-item[data-id="${itemId}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
        
        atualizarContadorEBotaoReceber();
    }
    
    // Mostra o modal de recebimento
    preencherModalRecebimento();
    const modal = new bootstrap.Modal(document.getElementById('modalRecebimento'));
    modal.show();
}

// Preenche o modal de recebimento com os itens selecionados
function preencherModalRecebimento() {
    console.log(`Preenchendo modal com ${itensSelecionadosParaRecebimento.length} itens selecionados`);
    
    const tabelaItensModal = document.getElementById('tabelaItensRecebimento');
    let html = '';
    
    if (itensSelecionadosParaRecebimento.length === 0) {
        html = '<tr><td colspan="5" class="text-center">Nenhum item selecionado para recebimento.</td></tr>';
    } else {
        itensSelecionadosParaRecebimento.forEach(itemId => {
            const item = todosItens.find(i => i._fb_itemKey === itemId);
            
            if (item) {
                html += `<tr>
                    <td><span class="badge bg-secondary">${item._fb_clienteNome || item._fb_clienteId}</span></td>
                    <td>${item.descricao || 'Sem descrição'}</td>
                    <td>${item.codigoMaterial || 'Sem código'}</td>
                    <td>${parseFloat(item.quantidade).toFixed(2)} ${item.unidade || 'un'}</td>
                    <td>
                        <input type="number" class="form-control form-control-sm input-quantidade-recebida" 
                            value="${parseFloat(item.quantidade).toFixed(2)}" min="0" max="${parseFloat(item.quantidade).toFixed(2)}" 
                            data-id="${itemId}" required>
                    </td>
                </tr>`;
            }
        });
    }
    
    tabelaItensModal.innerHTML = html;
    
    // Configura a data de recebimento para hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataRecebimento').value = hoje;
}

// Processa o recebimento dos itens selecionados
function processarRecebimentoItens() {
    console.log(`Processando recebimento de ${itensSelecionadosParaRecebimento.length} itens`);
    
    if (itensSelecionadosParaRecebimento.length === 0) {
        mostrarNotificacao('Nenhum item selecionado para recebimento.', 'warning');
        return;
    }
    
    // Obtém os dados do formulário
    const dataRecebimento = document.getElementById('dataRecebimento').value;
    const notaFiscal = document.getElementById('notaFiscal').value;
    const observacoes = document.getElementById('observacoes').value;
    
    if (!dataRecebimento) {
        mostrarNotificacao('A data de recebimento é obrigatória.', 'warning');
        return;
    }
    
    // Formata a data para exibição
    const dataRecebimentoFormatada = new Date(dataRecebimento).toLocaleDateString('pt-BR');
    
    // Processa cada item selecionado
    const promessasAtualizacao = [];
    
    itensSelecionadosParaRecebimento.forEach(itemId => {
        const item = todosItens.find(i => i._fb_itemKey === itemId);
        
        if (!item) {
            console.error(`Item não encontrado: ${itemId}`);
            return;
        }
        
        // Obtém a quantidade recebida do input
        const inputQuantidade = document.querySelector(`.input-quantidade-recebida[data-id="${itemId}"]`);
        const quantidadeRecebida = parseFloat(inputQuantidade.value) || 0;
        
        if (quantidadeRecebida <= 0) {
            console.warn(`Quantidade recebida inválida para o item ${itemId}: ${quantidadeRecebida}`);
            return;
        }
        
        // Determina o status de recebimento baseado na quantidade
        const quantidadeOriginal = parseFloat(item.quantidade) || 0;
        let statusRecebimento = 'recebido';
        
        if (quantidadeRecebida < quantidadeOriginal) {
            statusRecebimento = 'parcial';
        }
        
        // Busca a referência do item no Firestore
        const itemRef = window.db.doc(item._fb_caminhoItem);
        
        // Preparar atualizações
        const updates = {
            statusRecebimento: statusRecebimento,
            dataRecebimento: dataRecebimento,
            quantidadeRecebida: quantidadeRecebida,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Adicionar uma entrada no histórico de recebimentos
        const promiseAtualizacao = itemRef.get()
            .then(doc => {
                if (!doc.exists) {
                    throw new Error(`Item ${itemId} não encontrado no Firestore`);
                }
                
                // Criar o histórico de recebimentos se não existir
                let historicoRecebimentos = doc.data().historicoRecebimentos || {};
                
                // Gerar um ID único para o novo registro
                const novoHistoricoId = window.db.collection('_temp').doc().id;
                
                // Criar o novo registro
                historicoRecebimentos[novoHistoricoId] = {
                    dataRecebimento: dataRecebimentoFormatada,
                    quantidadeRecebida: quantidadeRecebida,
                    notaFiscal: notaFiscal || null,
                    observacoes: observacoes || null,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Atualizar o item com o novo status e histórico
                updates.historicoRecebimentos = historicoRecebimentos;
                
                return itemRef.update(updates);
            });
        
        promessasAtualizacao.push(promiseAtualizacao);
    });
    
    // Aguarda todas as atualizações serem concluídas
    Promise.all(promessasAtualizacao)
        .then(() => {
            mostrarNotificacao(`${itensSelecionadosParaRecebimento.length} itens atualizados com sucesso!`, 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalRecebimento')).hide();
            carregarItensComprados(); // Recarrega a lista para refletir as mudanças
            itensSelecionadosParaRecebimento = []; // Limpa seleção
            atualizarContadorEBotaoReceber(); // Atualiza UI
        })
        .catch(error => {
            console.error('Erro ao processar recebimento:', error);
            mostrarNotificacao('Erro ao processar recebimento. Tente novamente.', 'danger');
        });
}

// Inicializa o calendário de previsões de entrega
function inicializarCalendario() {
    console.log('Inicializando calendário...');
    
    const calendarEl = document.getElementById('calendario');
    
    if (!calendarEl) {
        console.error('Elemento do calendário não encontrado');
        return;
    }
    
    calendario = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        buttonText: {
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            list: 'Lista'
        },
        events: [],
        eventClick: function(info) {
            // Ao clicar em um evento, filtra a tabela para mostrar apenas os itens desse evento
            const dataSelecionada = info.event.startStr;
            eventosSelecionados = [dataSelecionada];
            
            // Atualiza o filtro visual
            document.querySelectorAll('.fc-event').forEach(el => {
                el.classList.remove('evento-selecionado');
            });
            info.el.classList.add('evento-selecionado');
            
            // Aplica o filtro na tabela
            filtrarTabelaPorData(dataSelecionada);
            
            // Atualiza o texto do filtro ativo
            document.getElementById('filtroAtivo').textContent = `Filtrando por data: ${new Date(dataSelecionada).toLocaleDateString('pt-BR')}`;
            document.getElementById('boxFiltroAtivo').style.display = 'flex';
        }
    });
    
    calendario.render();
    calendarioInicializado = true;
    
    // Adiciona evento para o botão de limpar filtro de data
    document.getElementById('btnLimparFiltroData').addEventListener('click', function() {
        eventosSelecionados = [];
        document.querySelectorAll('.fc-event').forEach(el => {
            el.classList.remove('evento-selecionado');
        });
        
        if (tabelaItens) {
            tabelaItens.search('').columns().search('').draw();
        }
        
        document.getElementById('boxFiltroAtivo').style.display = 'none';
    });
}

// Carrega os eventos do calendário com base nos itens comprados
function carregarEventosCalendario() {
    console.log('Carregando eventos do calendário...');
    
    if (!calendarioInicializado || !calendario) {
        console.warn('Calendário não inicializado');
        return;
    }
    
    // Limpa eventos existentes
    calendario.removeAllEvents();
    
    // Estrutura para agrupar eventos por data
    const eventosPorData = {};
    
    // Itera sobre os itens para criar eventos
    todosItens.forEach(item => {
        if (item.prazoEntrega) {
            const dataPrazo = item.prazoEntrega.split('T')[0]; // Formato YYYY-MM-DD
            
            if (!eventosPorData[dataPrazo]) {
                eventosPorData[dataPrazo] = {
                    itens: [],
                    recebidos: 0,
                    pendentes: 0
                };
            }
            
            eventosPorData[dataPrazo].itens.push(item);
            
            if (item.statusRecebimento === 'recebido') {
                eventosPorData[dataPrazo].recebidos++;
            } else {
                eventosPorData[dataPrazo].pendentes++;
            }
        }
    });
    
    // Cria eventos para o calendário
    Object.entries(eventosPorData).forEach(([data, dados]) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const dataPrazo = new Date(data);
        dataPrazo.setHours(0, 0, 0, 0);
        
        let backgroundColor = '#28a745'; // Verde para futuro
        let borderColor = '#28a745';
        
        if (dataPrazo < hoje) {
            backgroundColor = '#dc3545'; // Vermelho para atrasado
            borderColor = '#dc3545';
        } else if (dataPrazo.getTime() === hoje.getTime()) {
            backgroundColor = '#ffc107'; // Amarelo para hoje
            borderColor = '#ffc107';
        }
        
        // Se todos os itens da data estão recebidos, muda para verde
        if (dados.pendentes === 0 && dados.recebidos > 0) {
            backgroundColor = '#28a745';
            borderColor = '#28a745';
        }
        
        calendario.addEvent({
            title: `${dados.itens.length} item(ns) - ${dados.recebidos} recebido(s)`,
            start: data,
            allDay: true,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            textColor: '#fff',
            extendedProps: {
                itens: dados.itens,
                recebidos: dados.recebidos,
                pendentes: dados.pendentes
            }
        });
    });
    
    console.log(`${Object.keys(eventosPorData).length} eventos adicionados ao calendário`);
}

// Filtra a tabela por data
function filtrarTabelaPorData(data) {
    if (!tabelaItens) return;
    
    console.log(`Filtrando tabela por data: ${data}`);
    
    // Formata a data para o formato do Brasil para filtrar
    const dataFormatada = new Date(data).toLocaleDateString('pt-BR');
    
    // Aplica o filtro na coluna de prazo de entrega
    tabelaItens.column(6).search(dataFormatada, true, false).draw();
}

// Exibe uma notificação na tela
function mostrarNotificacao(mensagem, tipo, tempo = 5000) {
    console.log(`Notificação: ${mensagem} (${tipo})`);
    
    // Cria o elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = `alert alert-${tipo} alert-dismissible fade show notificacao`;
    notificacao.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    // Adiciona ao container de notificações
    const container = document.getElementById('notificacoes');
    if (container) {
        container.appendChild(notificacao);
    } else {
        document.body.appendChild(notificacao);
    }
    
    // Configura o tempo para remover a notificação
    setTimeout(() => {
        notificacao.classList.remove('show');
        setTimeout(() => {
            notificacao.remove();
        }, 300);
    }, tempo);
}

// Verifica se um objeto está vazio
function objetoVazio(obj) {
    return obj === null || obj === undefined || Object.keys(obj).length === 0;
}