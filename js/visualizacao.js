/**
 * visualizacao.js
 * 
 * Lógica específica para visualização de clientes e seus projetos
 * Este arquivo contém todas as funções relacionadas à visualização detalhada
 * dos dados de clientes no Sistema de Controle de Compras e Recebimento
 */

/**
 * Abre o modal de visualização de cliente com os dados carregados
 * 
 * @param {string} clienteId - ID do cliente a ser visualizado
 */
function visualizarCliente(clienteId) {
    console.log('=== INÍCIO DA FUNÇÃO VISUALIZAR CLIENTE ===');
    console.log('Iniciando visualização do cliente com ID:', clienteId);
    console.log('dbRef disponível:', dbRef ? 'Sim' : 'Não');
    
    if (!dbRef) {
        console.error('ERRO CRÍTICO: dbRef não está definido!');
        mostrarNotificacao('Erro de conexão com o banco de dados. Recarregue a página.', 'danger');
        return;
    }
    
    // Mostra o indicador de carregamento
    document.getElementById('loadingVisualizacao').classList.remove('d-none');
    document.getElementById('conteudoVisualizacao').classList.add('d-none');
    
    // Limpa o conteúdo anterior
    document.getElementById('listasProjetos').innerHTML = '';
    document.getElementById('detalhesLista').innerHTML = '';
    
    // Armazena o ID do cliente para uso em outras funções
    document.getElementById('modalVisualizacao').dataset.clienteId = clienteId;
    
    console.log('Preparando para buscar dados do cliente:', clienteId);
    console.log('Caminho da consulta:', `clientes/${clienteId}`);
    
    try {
        // Busca os dados do cliente no Firebase
        console.log('Iniciando consulta ao Firebase para dados do cliente');
        dbRef.clientes.child(clienteId).once('value')
            .then(snapshotCliente => {
                console.log('Resposta recebida do Firebase para dados do cliente');
                console.log('Snapshot existe:', snapshotCliente ? 'Sim' : 'Não');
                console.log('Snapshot válido:', snapshotCliente.exists() ? 'Sim' : 'Não');
                
                const cliente = snapshotCliente.val();
                console.log('Dados do cliente:', cliente);
                
                if (!cliente) {
                    console.error('Cliente não encontrado no Firebase');
                    throw new Error('Cliente não encontrado');
                }
                
                console.log('Dados do cliente carregados com sucesso:', cliente);
                
                // Preenche os dados do cliente no modal
                document.getElementById('visualizacaoTitulo').textContent = cliente.nome || 'Cliente sem nome';
                document.getElementById('visualizacaoStatus').textContent = cliente.status || 'Não iniciado';
                document.getElementById('visualizacaoStatus').className = `badge ${getBadgeClass(cliente.status)}`;
                
                // Formata as datas
                const dataCriacao = formatarData(cliente.dataCriacao);
                const prazoEntrega = formatarData(cliente.prazoEntrega);
                
                document.getElementById('visualizacaoDataCriacao').textContent = dataCriacao;
                document.getElementById('visualizacaoPrazoEntrega').textContent = prazoEntrega;
                
                // Busca os projetos do cliente
                console.log('Preparando para buscar projetos do cliente');
                console.log('Caminho da consulta de projetos:', `projetos/${clienteId}`);
                return dbRef.projetos.child(clienteId).once('value');
            })
            .then(snapshotProjetos => {
                console.log('Resposta recebida do Firebase para projetos');
                console.log('Snapshot de projetos existe:', snapshotProjetos ? 'Sim' : 'Não');
                console.log('Snapshot de projetos válido:', snapshotProjetos.exists() ? 'Sim' : 'Não');
                
                const projetos = snapshotProjetos.val();
                console.log('Dados dos projetos:', projetos);
                
                // Se não há projetos, exibe mensagem
                if (!projetos || objetoVazio(projetos)) {
                    console.log('Nenhum projeto encontrado para este cliente');
                    document.getElementById('listasProjetos').innerHTML = `
                        <div class="alert alert-info">
                            Este cliente não possui projetos cadastrados.
                        </div>
                    `;
                    
                    // Oculta o indicador de carregamento e mostra o conteúdo
                    document.getElementById('loadingVisualizacao').classList.add('d-none');
                    document.getElementById('conteudoVisualizacao').classList.remove('d-none');
                    
                    // Exibe o modal
                    console.log('Exibindo modal sem projetos');
                    const modalVisualizacao = new bootstrap.Modal(document.getElementById('modalVisualizacao'));
                    modalVisualizacao.show();
                    
                    return;
                }
                
                // Cria os cards para cada tipo de projeto
                const listasProjetos = document.getElementById('listasProjetos');
                listasProjetos.innerHTML = ''; // Limpa qualquer conteúdo anterior
                
                // Registra os tipos de projetos já processados para evitar duplicidade
                const tiposProcessados = new Set();
                
                console.log('Processando tipos de projetos:', Object.keys(projetos));
                Object.keys(projetos).forEach(tipoProjeto => {
                    // Verifica se este tipo de projeto já foi processado
                    if (tiposProcessados.has(tipoProjeto)) {
                        console.log(`Tipo de projeto ${tipoProjeto} já foi processado, ignorando duplicidade`);
                        return;
                    }
                    
                    // Marca este tipo como processado
                    tiposProcessados.add(tipoProjeto);
                    
                    const projeto = projetos[tipoProjeto];
                    
                    console.log(`Processando projeto ${tipoProjeto}:`, projeto);
                    
                    if (!projeto) {
                        console.warn(`Projeto ${tipoProjeto} está vazio ou inválido`);
                        return;
                    }
                    
                    // Cria o card do projeto
                    const cardProjeto = document.createElement('div');
                    cardProjeto.className = 'card mb-3 projeto-card';
                    cardProjeto.dataset.tipoProjeto = tipoProjeto;
                    
                    // Cabeçalho do card
                    const cardHeader = document.createElement('div');
                    cardHeader.className = 'card-header d-flex justify-content-between align-items-center';
                    
                    // Título do projeto
                    const tituloCard = document.createElement('h5');
                    tituloCard.className = 'mb-0';
                    tituloCard.textContent = formatarTipoProjeto(tipoProjeto);
                    
                    // Badge de terceirizado, se aplicável
                    if (projeto.terceirizado) {
                        const badgeTerceirizado = document.createElement('span');
                        badgeTerceirizado.className = 'badge bg-info ms-2';
                        badgeTerceirizado.textContent = 'Terceirizado';
                        tituloCard.appendChild(badgeTerceirizado);
                    }
                    
                    cardHeader.appendChild(tituloCard);
                    cardProjeto.appendChild(cardHeader);
                    
                    // Corpo do card
                    const cardBody = document.createElement('div');
                    cardBody.className = 'card-body';
                    
                    // Se for terceirizado, mostra informações da empresa
                    if (projeto.terceirizado) {
                        cardBody.innerHTML = `
                            <p><strong>Empresa:</strong> ${projeto.empresa || 'Não informada'}</p>
                            <p><strong>Data de Solicitação:</strong> ${formatarData(projeto.dataSolicitacao) || 'Não informada'}</p>
                            <p><strong>Prazo de Entrega:</strong> ${formatarData(projeto.prazoEntrega) || 'Não informado'}</p>
                        `;
                    } 
                    // Se não for terceirizado, mostra as listas
                    else if (projeto.listas && !objetoVazio(projeto.listas)) {
                        console.log(`Processando listas do projeto ${tipoProjeto}:`, Object.keys(projeto.listas));
                        
                        // Cria botões para cada lista
                        const listasContainer = document.createElement('div');
                        listasContainer.className = 'listas-container';
                        
                        Object.keys(projeto.listas).forEach(nomeLista => {
                            console.log(`Criando botão para lista ${nomeLista}`);
                            
                            const btnLista = document.createElement('button');
                            btnLista.className = 'btn btn-outline-primary me-2 mb-2 btn-lista';
                            btnLista.textContent = formatarNomeLista(nomeLista);
                            btnLista.dataset.tipoProjeto = tipoProjeto;
                            btnLista.dataset.nomeLista = nomeLista;
                            btnLista.addEventListener('click', function() {
                                console.log(`Botão da lista ${nomeLista} clicado`);
                                
                                // Remove a classe ativa de todos os botões
                                document.querySelectorAll('.btn-lista').forEach(btn => {
                                    btn.classList.remove('active');
                                });
                                
                                // Adiciona a classe ativa ao botão clicado
                                this.classList.add('active');
                                
                                // Carrega os itens da lista
                                carregarItensLista(clienteId, tipoProjeto, nomeLista);
                            });
                            
                            listasContainer.appendChild(btnLista);
                        });
                        
                        cardBody.appendChild(listasContainer);
                    } else {
                        console.log(`Projeto ${tipoProjeto} não tem listas`);
                        cardBody.innerHTML = `
                            <div class="alert alert-light">
                                Nenhuma lista cadastrada para este projeto.
                            </div>
                        `;
                    }
                    
                    cardProjeto.appendChild(cardBody);
                    listasProjetos.appendChild(cardProjeto);
                });
                
                // Oculta o indicador de carregamento e mostra o conteúdo
                document.getElementById('loadingVisualizacao').classList.add('d-none');
                document.getElementById('conteudoVisualizacao').classList.remove('d-none');
                
                // Exibe o modal com animação
                console.log('Exibindo modal com projetos');
                const modalVisualizacao = new bootstrap.Modal(document.getElementById('modalVisualizacao'));
                modalVisualizacao.show();
                
                // Adiciona animação de entrada aos cards
                setTimeout(() => {
                    document.querySelectorAll('.projeto-card').forEach((card, index) => {
                        setTimeout(() => {
                            card.classList.add('animate__animated', 'animate__fadeInUp');
                        }, index * 100);
                    });
                }, 300);
                
                console.log('=== FIM DA FUNÇÃO VISUALIZAR CLIENTE - SUCESSO ===');
            })
            .catch(error => {
                console.error('Erro ao carregar dados do cliente:', error);
                console.error('Mensagem de erro:', error.message);
                console.error('Stack trace:', error.stack);
                
                mostrarNotificacao('Erro ao carregar dados do cliente. Tente novamente.', 'danger');
                
                // Exibe mensagem de erro no modal
                document.getElementById('listasProjetos').innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Erro ao carregar dados do cliente: ${error.message}
                    </div>
                    <div class="text-center mt-3">
                        <button class="btn btn-outline-danger" onclick="visualizarCliente('${clienteId}')">
                            <i class="fas fa-sync-alt me-2"></i> Tentar novamente
                        </button>
                    </div>
                `;
                
                // Oculta o indicador de carregamento e mostra o conteúdo
                document.getElementById('loadingVisualizacao').classList.add('d-none');
                document.getElementById('conteudoVisualizacao').classList.remove('d-none');
                
                // Exibe o modal mesmo com erro
                console.log('Exibindo modal com erro');
                const modalVisualizacao = new bootstrap.Modal(document.getElementById('modalVisualizacao'));
                modalVisualizacao.show();
                
                console.log('=== FIM DA FUNÇÃO VISUALIZAR CLIENTE - ERRO ===');
            });
    } catch (error) {
        console.error('Erro crítico ao executar visualizarCliente:', error);
        console.error('Mensagem de erro:', error.message);
        console.error('Stack trace:', error.stack);
        
        mostrarNotificacao('Erro crítico ao carregar dados. Recarregue a página.', 'danger');
        
        // Exibe mensagem de erro no modal
        document.getElementById('listasProjetos').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Erro crítico: ${error.message}
            </div>
            <div class="text-center mt-3">
                <button class="btn btn-outline-danger" onclick="location.reload()">
                    <i class="fas fa-sync-alt me-2"></i> Recarregar página
                </button>
            </div>
        `;
        
        // Oculta o indicador de carregamento e mostra o conteúdo
        document.getElementById('loadingVisualizacao').classList.add('d-none');
        document.getElementById('conteudoVisualizacao').classList.remove('d-none');
        
        // Exibe o modal mesmo com erro
        console.log('Exibindo modal com erro crítico');
        const modalVisualizacao = new bootstrap.Modal(document.getElementById('modalVisualizacao'));
        modalVisualizacao.show();
        
        console.log('=== FIM DA FUNÇÃO VISUALIZAR CLIENTE - ERRO CRÍTICO ===');
    }
}

/**
 * Carrega os itens de uma lista específica
 * 
 * @param {string} clienteId - ID do cliente
 * @param {string} tipoProjeto - Tipo de projeto
 * @param {string} nomeLista - Nome da lista
 */
function carregarItensLista(clienteId, tipoProjeto, nomeLista) {
    console.log('=== INÍCIO DA FUNÇÃO CARREGAR ITENS LISTA ===');
    console.log(`Carregando itens: cliente=${clienteId}, tipo=${tipoProjeto}, lista=${nomeLista}`);
    
    // Mostra o indicador de carregamento
    document.getElementById('loadingDetalhes').classList.remove('d-none');
    document.getElementById('detalhesLista').innerHTML = '';
    
    // Atualiza o título da seção
    document.getElementById('tituloDetalhes').textContent = `${formatarTipoProjeto(tipoProjeto)} - ${formatarNomeLista(nomeLista)}`;
    document.getElementById('secaoDetalhes').classList.remove('d-none');
    
    console.log(`Caminho da consulta: projetos/${clienteId}/${tipoProjeto}/listas/${nomeLista}`);
    
    // Busca os itens da lista no Firebase
    dbRef.projetos.child(`${clienteId}/${tipoProjeto}/listas/${nomeLista}`).once('value')
        .then(snapshot => {
            console.log('Resposta recebida do Firebase para itens da lista');
            console.log('Snapshot existe:', snapshot ? 'Sim' : 'Não');
            console.log('Snapshot válido:', snapshot.exists() ? 'Sim' : 'Não');
            
            const itens = snapshot.val();
            console.log('Dados dos itens:', itens);
            
            // Oculta o indicador de carregamento
            document.getElementById('loadingDetalhes').classList.add('d-none');
            
            // Se não há itens, exibe mensagem
            if (!itens || objetoVazio(itens)) {
                console.log('Nenhum item encontrado nesta lista');
                document.getElementById('detalhesLista').innerHTML = `
                    <div class="alert alert-light">
                        Nenhum item cadastrado nesta lista.
                    </div>
                `;
                return;
            }
            
            // Cria a tabela de itens
            const tabela = document.createElement('table');
            tabela.className = 'table table-striped table-hover';
            
            // Cabeçalho da tabela
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Quantidade</th>
                    <th>Status</th>
                </tr>
            `;
            tabela.appendChild(thead);
            
            // Corpo da tabela
            const tbody = document.createElement('tbody');
                    // Adiciona cada item à tabela
            Object.keys(itens).forEach(itemId => {
                const item = itens[itemId];
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.codigo || '-'}</td>
                    <td>${item.descricao || item.nome || 'Item sem nome'}</td>
                    <td>${item.quantidade || '-'}</td>
                    <td>
                        <span class="badge ${getBadgeClass(item.status)}">${item.status || 'Pendente'}</span>
                    </td>
                `;
                
                tbody.appendChild(tr);
            });;
            
            tabela.appendChild(tbody);
            document.getElementById('detalhesLista').appendChild(tabela);
            
            console.log('=== FIM DA FUNÇÃO CARREGAR ITENS LISTA - SUCESSO ===');
        })
        .catch(error => {
            console.error('Erro ao carregar itens da lista:', error);
            console.error('Mensagem de erro:', error.message);
            console.error('Stack trace:', error.stack);
            
            // Oculta o indicador de carregamento
            document.getElementById('loadingDetalhes').classList.add('d-none');
            
            // Exibe mensagem de erro
            document.getElementById('detalhesLista').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Erro ao carregar itens da lista: ${error.message}
                </div>
                <div class="text-center mt-3">
                    <button class="btn btn-outline-danger" onclick="carregarItensLista('${clienteId}', '${tipoProjeto}', '${nomeLista}')">
                        <i class="fas fa-sync-alt me-2"></i> Tentar novamente
                    </button>
                </div>
            `;
            
            console.log('=== FIM DA FUNÇÃO CARREGAR ITENS LISTA - ERRO ===');
        });
}

/**
 * Formata o tipo de projeto para exibição
 * 
 * @param {string} tipo - Tipo de projeto
 * @returns {string} - Tipo formatado
 */
function formatarTipoProjeto(tipo) {
    switch (tipo) {
        case 'PVC':
            return 'PVC';
        case 'Aluminio':
            return 'Alumínio';
        case 'Brise':
            return 'Brise';
        case 'ACM':
            return 'ACM';
        case 'Outros':
            return 'Outros';
        default:
            return tipo;
    }
}

/**
 * Formata o nome da lista para exibição
 * 
 * @param {string} nome - Nome da lista
 * @returns {string} - Nome formatado
 */
function formatarNomeLista(nome) {
    switch (nome) {
        case 'LPVC':
            return 'PVC';
        case 'LReforco':
            return 'Reforço';
        case 'LFerragens':
            return 'Ferragens';
        case 'LVidros':
        case 'LVidro':
            return 'Vidros';
        case 'LEsteira':
            return 'Esteira';
        case 'LMotor':
            return 'Motor';
        case 'LAcabamento':
            return 'Acabamento';
        case 'LTelaRetratil':
            return 'Tela Retrátil';
        case 'LAco':
            return 'Aço';
        case 'LOutros':
            return 'Outros';
        case 'LPerfil':
            return 'Perfil';
        case 'LContraMarco':
            return 'Contra Marco';
        default:
            return nome;
    }
}

/**
 * Retorna a classe do badge de acordo com o status
 * 
 * @param {string} status - Status do item
 * @returns {string} - Classe CSS para o badge
 */
function getBadgeClass(status) {
    switch (status) {
        case 'Em andamento':
            return 'bg-warning';
        case 'Concluído':
            return 'bg-success';
        case 'Pendente':
            return 'bg-secondary';
        default:
            return 'bg-secondary';
    }
}

/**
 * Formata uma data timestamp para exibição
 * 
 * @param {number} timestamp - Timestamp da data
 * @returns {string} - Data formatada
 */
function formatarData(timestamp) {
    if (!timestamp) return '-';
    
    const data = new Date(timestamp);
    
    // Formata a data como dd/mm/aaaa
    return `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()}`;
}

/**
 * Verifica se um objeto está vazio
 * 
 * @param {Object} obj - Objeto a ser verificado
 * @returns {boolean} - true se o objeto estiver vazio, false caso contrário
 */
function objetoVazio(obj) {
    return obj === null || obj === undefined || Object.keys(obj).length === 0;
}

/**
 * Exibe uma notificação na tela
 * 
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo da notificação (success, danger, warning, info)
 */
function mostrarNotificacao(mensagem, tipo) {
    // Cria o elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = `alert alert-${tipo} alert-dismissible fade show notification`;
    notificacao.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    // Adiciona a notificação ao corpo da página
    document.body.appendChild(notificacao);
    
    // Remove a notificação após 5 segundos
    setTimeout(() => {
        notificacao.classList.remove('show');
        setTimeout(() => {
            notificacao.remove();
        }, 300);
    }, 5000);
}
