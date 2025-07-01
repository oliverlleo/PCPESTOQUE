/**
 * separacao.js
 * Módulo responsável pela separação de itens
 * 
 * MIGRADO PARA FIRESTORE: Este arquivo agora usa APENAS Firestore
 */

// Inicialização e configuração global
let tabelaSeparacao;
let modalConfirmacao;
let modalDetalhes;
let clienteSelecionado = "";
let tipoProjetoSelecionado = "";
let nomeListaOriginalSelecionada = "";
let dadosListaSelecionada = {};
let clientesData = {};

// Inicialização dos componentes ao carregar o documento
document.addEventListener("DOMContentLoaded", function () {
    console.log("Inicializando separacao.js...");
    
    inicializarComponentes();
    carregarClientes();
    
    // Configurar eventos
    document.getElementById("btnSalvarSeparacao").addEventListener("click", () => salvarSeparacao());
    document.getElementById("btnExportar").addEventListener("click", exportarTabelaExcel);
    
    // Listener para alterações no cliente selecionado
    document.getElementById("selectCliente").addEventListener("change", function () {
        clienteSelecionado = this.value;
        if (clienteSelecionado) {
            document.getElementById("selectTipoProjeto").disabled = false;
            carregarTiposProjeto(clienteSelecionado);
        } else {
            document.getElementById("selectTipoProjeto").disabled = true;
            document.getElementById("selectTipoProjeto").innerHTML = '<option value="">Selecione...</option>';
            document.getElementById("selectListaOriginal").disabled = true;
            document.getElementById("selectListaOriginal").innerHTML = '<option value="">Selecione...</option>';
        }
    });
    
    // Listener para alterações no tipo de projeto selecionado
    document.getElementById("selectTipoProjeto").addEventListener("change", function () {
        tipoProjetoSelecionado = this.value;
        if (tipoProjetoSelecionado) {
            document.getElementById("selectListaOriginal").disabled = false;
            carregarListasOriginais(clienteSelecionado, tipoProjetoSelecionado);
        } else {
            document.getElementById("selectListaOriginal").disabled = true;
            document.getElementById("selectListaOriginal").innerHTML = '<option value="">Selecione...</option>';
        }
    });
    
    // Listener para alterações na lista original selecionada
    document.getElementById("selectListaOriginal").addEventListener("change", function () {
        nomeListaOriginalSelecionada = this.value;
        if (nomeListaOriginalSelecionada) {
            document.getElementById("btnCarregarLista").disabled = false;
        } else {
            document.getElementById("btnCarregarLista").disabled = true;
        }
    });
    
    // Listener para o botão de carregar lista
    document.getElementById("btnCarregarLista").addEventListener("click", () => 
        carregarListaSeparacao(clienteSelecionado, tipoProjetoSelecionado, nomeListaOriginalSelecionada)
    );
});

/**
 * Verifica se uma lista já foi processada
 */
async function verificarListaProcessada(clienteId, tipoProjeto, nomeListaOriginal) {
    console.log(`Verificando se a lista já foi processada: ${clienteId}/${tipoProjeto}/${nomeListaOriginal}`);
    
    return new Promise(async (resolve, reject) => {
        if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
            console.error("Parâmetros inválidos para verificarListaProcessada");
            return resolve(false);
        }

        try {
            // Usar Firestore em vez de Realtime Database
            const refCorrecaoFinal = window.db
                .collection('CorrecaoFinal')
                .doc(clienteId)
                .collection(tipoProjeto)
                .doc(nomeListaOriginal)
                .collection('itensProcessados');
                
            const snapshot = await refCorrecaoFinal.limit(1).get();
            const itensProcessados = !snapshot.empty;
            
            console.log(`Lista processada? ${itensProcessados}`);
            resolve(itensProcessados);
        } catch (error) {
            console.error("Erro ao verificar lista processada:", error);
            resolve(false);
        }
    });
}

/**
 * Formata os dados para exibição na tabela
 */
async function formatarDadosParaTabela(dados, clienteId, tipoProjeto, nomeListaOriginal) {
    console.log("Formatando dados para tabela de separação");
    
    return new Promise(async (resolve, reject) => {
        try {
            // Usar Firestore em vez de Realtime Database
            const refCorrecaoFinal = window.db
                .collection('CorrecaoFinal')
                .doc(clienteId)
                .collection(tipoProjeto)
                .doc(nomeListaOriginal)
                .collection('itensProcessados');
                
            const snapshot = await refCorrecaoFinal.get();
            let itensProcessados = [];
            
            snapshot.forEach(doc => {
                itensProcessados.push(doc.data());
            });
            
            console.log(`Itens processados encontrados: ${itensProcessados.length}`);
            
            const dadosFormatados = [];
            
            for (const item of Object.values(dados)) {
                if (!item) continue;
                
                // Verifica se o item já foi processado
                const itemProcessado = itensProcessados.find(i => i.id === item.id);
                
                // Adiciona as informações necessárias para a tabela
                dadosFormatados.push({
                    id: item.id,
                    descricao: item.descricao || '-',
                    codigoMaterial: item.codigoMaterial || '-',
                    quantidade: item.quantidade || 0,
                    unidade: item.unidade || '-',
                    quantidadeSeparada: item.quantidade || 0,
                    status: itemProcessado ? 'Processado' : 'Pendente',
                    itemOriginal: item
                });
            }
            
            resolve(dadosFormatados);
        } catch (error) {
            console.error("Erro ao formatar dados para tabela:", error);
            reject(error);
        }
    });
}

/**
 * Obtém e formata itens que já estão na correção final
 */
async function obterItensSeparacao(clienteId, tipoProjeto, nomeListaOriginal) {
    console.log(`Obtendo itens de separação: ${clienteId}/${tipoProjeto}/${nomeListaOriginal}`);
    
    return new Promise(async (resolve, reject) => {
        try {
            // Usar Firestore em vez de Realtime Database
            const refCorrecaoFinal = window.db
                .collection('CorrecaoFinal')
                .doc(clienteId)
                .collection(tipoProjeto)
                .doc(nomeListaOriginal)
                .collection('itensProcessados');
                
            const snapshot = await refCorrecaoFinal.get();
            let itensProcessados = [];
            
            snapshot.forEach(doc => {
                itensProcessados.push(doc.data());
            });
            
            console.log(`Itens já processados: ${itensProcessados.length}`);
            resolve(itensProcessados);
        } catch (error) {
            console.error("Erro ao obter itens de separação:", error);
            reject(error);
        }
    });
}

/**
 * Atualiza o item na correção final
 */
async function atualizarItemCorrecaoFinal(item, clienteId, tipoProjeto, nomeListaOriginal) {
    console.log("Atualizando item na correção final:", item.id);
    
    return new Promise(async (resolve, reject) => {
        try {
            // Usar Firestore em vez de Realtime Database
            const refCorrecaoFinal = window.db
                .collection('CorrecaoFinal')
                .doc(clienteId)
                .collection(tipoProjeto)
                .doc(nomeListaOriginal)
                .collection('itensProcessados');
                
            const snapshot = await refCorrecaoFinal.get();
            let itensProcessados = [];
            
            snapshot.forEach(doc => {
                itensProcessados.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Adiciona ou atualiza o item
            const itemIndex = itensProcessados.findIndex(i => i.id === item.id);
            
            if (itemIndex !== -1) {
                // Atualiza o item existente
                await refCorrecaoFinal.doc(item.id).update({
                    ...item,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Adiciona novo item
                await refCorrecaoFinal.doc(item.id).set({
                    ...item,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            console.log("Item atualizado com sucesso na correção final");
            resolve(true);
        } catch (error) {
            console.error("Erro ao atualizar item na correção final:", error);
            reject(error);
        }
    });
}

/**
 * Carrega os clientes do Firestore
 */
function carregarClientes() {
    console.log("Carregando clientes do Firestore...");
    
    // Usar Firestore em vez de Realtime Database
    const clientesRef = window.db.collection("clientes");

    clientesRef
        .get()
        .then(snapshot => {
            const selectCliente = document.getElementById("selectCliente");
            selectCliente.innerHTML = '<option value="">Selecione...</option>';
            
            clientesData = {}; // Limpar dados anteriores
            
            if (snapshot.empty) {
                console.log("Nenhum cliente encontrado");
                return;
            }
            
            snapshot.forEach(doc => {
                const cliente = doc.data();
                const clienteId = doc.id;
                
                clientesData[clienteId] = cliente;
                
                const option = document.createElement("option");
                option.value = clienteId;
                option.textContent = cliente.nome || clienteId;
                selectCliente.appendChild(option);
            });
            
            console.log(`${snapshot.size} clientes carregados`);
        })
        .catch(error => {
            console.error("Erro ao carregar clientes:", error);
            mostrarNotificacao("Erro ao carregar clientes", "danger");
        });
}

/**
 * Carrega os tipos de projeto do cliente selecionado
 */
async function carregarTiposProjeto(clienteId) {
    console.log(`Carregando tipos de projeto para cliente: ${clienteId}`);
    
    const selectTipoProjeto = document.getElementById("selectTipoProjeto");
    selectTipoProjeto.innerHTML = '<option value="">Selecione...</option>';
    
    try {
        // Usar Firestore em vez de Realtime Database
        const projetosRef = window.db
            .collection("clientes")
            .doc(clienteId)
            .collection("projetos");
            
        const snapshot = await projetosRef.get();
        
        if (snapshot.empty) {
            console.log("Nenhum tipo de projeto encontrado");
            return;
        }
        
        snapshot.forEach(doc => {
            const tipoProjeto = doc.id;
            
            const option = document.createElement("option");
            option.value = tipoProjeto;
            option.textContent = tipoProjeto.charAt(0).toUpperCase() + tipoProjeto.slice(1);
            selectTipoProjeto.appendChild(option);
        });
        
        console.log(`${snapshot.size} tipos de projeto carregados`);
    } catch (error) {
        console.error("Erro ao carregar tipos de projeto:", error);
        mostrarNotificacao("Erro ao carregar tipos de projeto", "danger");
    }
}

/**
 * Carrega as listas originais para o cliente e tipo de projeto selecionados
 */
async function carregarListasOriginais(clienteId, tipo) {
    console.log(`Carregando listas para cliente: ${clienteId}, tipo: ${tipo}`);
    
    const selectListaOriginal = document.getElementById("selectListaOriginal");
    selectListaOriginal.innerHTML = '<option value="">Selecione...</option>';
    
    try {
        // Usar Firestore em vez de Realtime Database
        const refListasRoot = window.db
            .collection("clientes")
            .doc(clienteId)
            .collection("projetos")
            .doc(tipo)
            .collection("listas");
            
        const snapshotListas = await refListasRoot.get();
        
        if (snapshotListas.empty) {
            console.log("Nenhuma lista encontrada");
            return;
        }
        
        snapshotListas.forEach(doc => {
            const nomeLista = doc.id;
            
            const option = document.createElement("option");
            option.value = nomeLista;
            option.textContent = nomeLista;
            selectListaOriginal.appendChild(option);
        });
        
        console.log(`${snapshotListas.size} listas originais carregadas`);
    } catch (error) {
        console.error("Erro ao carregar listas:", error);
        mostrarNotificacao("Erro ao carregar listas", "danger");
    }
}

/**
 * Carrega os itens da lista selecionada para separação
 */
async function carregarListaSeparacao(clienteId, tipoProjeto, nomeListaOriginal) {
    console.log(`Carregando lista para separação: ${clienteId}/${tipoProjeto}/${nomeListaOriginal}`);
    
    if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
        mostrarNotificacao("Selecione cliente, tipo de projeto e lista", "warning");
        return;
    }
    
    // Mostrar loading
    mostrarLoading(true);
    
    try {
        // Verifica se já existe uma lista de separação salva
        const listaProcessada = await verificarListaProcessada(clienteId, tipoProjeto, nomeListaOriginal);
        
        if (listaProcessada) {
            await carregarListaProcessada(clienteId, tipoProjeto, nomeListaOriginal);
        } else {
            await carregarListaOriginal(clienteId, tipoProjeto, nomeListaOriginal);
        }
        
        // Atualiza os botões de ação
        document.getElementById("btnSalvarSeparacao").disabled = false;
        document.getElementById("btnExportar").disabled = false;
        
        // Esconde o loading
        mostrarLoading(false);
    } catch (error) {
        console.error("Erro ao carregar lista para separação:", error);
        mostrarNotificacao("Erro ao carregar lista para separação", "danger");
        mostrarLoading(false);
    }
}

/**
 * Carrega uma lista já processada
 */
async function carregarListaProcessada(clienteId, tipoProjeto, nomeListaOriginal) {
    console.log(`Carregando lista já processada: ${clienteId}/${tipoProjeto}/${nomeListaOriginal}`);
    
    try {
        // Buscar itens da lista original no Firestore
        const itensOriginaisRef = window.db
            .collection("clientes")
            .doc(clienteId)
            .collection("projetos")
            .doc(tipoProjeto)
            .collection("listas")
            .doc(nomeListaOriginal)
            .collection("itens");
            
        const itensOriginaisSnapshot = await itensOriginaisRef.get();
        
        if (itensOriginaisSnapshot.empty) {
            console.log("Nenhum item encontrado na lista original");
            mostrarNotificacao("Nenhum item encontrado na lista original", "warning");
            return;
        }
        
        // Converter snapshot para objeto
        const itensOriginais = {};
        itensOriginaisSnapshot.forEach(doc => {
            itensOriginais[doc.id] = {
                id: doc.id,
                ...doc.data()
            };
        });
        
        // Buscar itens da lista de separação no Firestore
        const itensSeparacaoRef = window.db
            .collection("SeparacaoProd")
            .doc(clienteId)
            .collection(tipoProjeto)
            .doc(nomeListaOriginal)
            .collection("itens");
            
        const itensSeparacaoSnapshot = await itensSeparacaoRef.get();
        
        // Converter snapshot para objeto
        const itensSeparacao = {};
        itensSeparacaoSnapshot.forEach(doc => {
            itensSeparacao[doc.id] = {
                id: doc.id,
                ...doc.data()
            };
        });
        
        // Mesclar dados originais com dados de separação
        const dadosMesclados = {};
        
        for (const [itemId, itemOriginal] of Object.entries(itensOriginais)) {
            dadosMesclados[itemId] = {
                ...itemOriginal,
                quantidadeSeparada: itensSeparacao[itemId]?.quantidadeSeparada || itemOriginal.quantidade || 0
            };
        }
        
        // Formatar dados para tabela e renderizar
        const dadosFormatados = await formatarDadosParaTabela(
            dadosMesclados,
            clienteId,
            tipoProjeto,
            nomeListaOriginal
        );
        
        renderizarTabelaSeparacao(dadosFormatados);
        dadosListaSelecionada = dadosFormatados;
        
        console.log(`Lista processada carregada com ${dadosFormatados.length} itens`);
        mostrarNotificacao(`Lista já processada carregada com ${dadosFormatados.length} itens`, "success");
    } catch (error) {
        console.error("Erro ao carregar lista processada:", error);
        mostrarNotificacao("Erro ao carregar lista processada", "danger");
    }
}

/**
 * Carrega uma lista original (ainda não processada)
 */
async function carregarListaOriginal(clienteId, tipoProjeto, nomeListaOriginal) {
    console.log(`Carregando lista original: ${clienteId}/${tipoProjeto}/${nomeListaOriginal}`);
    
    try {
        // Buscar itens da lista original no Firestore
        const itensRef = window.db
            .collection("clientes")
            .doc(clienteId)
            .collection("projetos")
            .doc(tipoProjeto)
            .collection("listas")
            .doc(nomeListaOriginal)
            .collection("itens");
            
        const snapshot = await itensRef.get();
        
        if (snapshot.empty) {
            console.log("Nenhum item encontrado na lista original");
            mostrarNotificacao("Nenhum item encontrado na lista original", "warning");
            return;
        }
        
        // Converter snapshot para objeto
        const itens = {};
        snapshot.forEach(doc => {
            itens[doc.id] = {
                id: doc.id,
                ...doc.data()
            };
        });
        
        // Formatar dados para tabela e renderizar
        const dadosFormatados = await formatarDadosParaTabela(
            itens,
            clienteId,
            tipoProjeto,
            nomeListaOriginal
        );
        
        renderizarTabelaSeparacao(dadosFormatados);
        dadosListaSelecionada = dadosFormatados;
        
        console.log(`Lista original carregada com ${dadosFormatados.length} itens`);
        mostrarNotificacao(`Lista original carregada com ${dadosFormatados.length} itens`, "success");
    } catch (error) {
        console.error("Erro ao carregar lista original:", error);
        mostrarNotificacao("Erro ao carregar lista original", "danger");
    }
}

/**
 * Salva os dados da separação
 */
async function salvarSeparacao() {
    console.log("Salvando separação...");
    
    if (!clienteSelecionado || !tipoProjetoSelecionado || !nomeListaOriginalSelecionada) {
        mostrarNotificacao("Selecione cliente, tipo de projeto e lista", "warning");
        return;
    }
    
    if (tabelaSeparacao) {
        mostrarLoading(true);
        
        try {
            // Obter dados da tabela
            const dados = tabelaSeparacao.data();
            
            if (!dados || dados.length === 0) {
                mostrarNotificacao("Nenhum item para salvar", "warning");
                mostrarLoading(false);
                return;
            }
            
            // Formatar itens para salvar no Firestore
            const itensFormatados = {};
            
            dados.forEach(item => {
                itensFormatados[item.id] = {
                    id: item.id,
                    descricao: item.descricao,
                    codigoMaterial: item.codigoMaterial,
                    quantidade: item.quantidade,
                    unidade: item.unidade,
                    quantidadeSeparada: item.quantidadeSeparada,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
            });
            
            // Salvar no Firestore em SeparacaoProd
            const separacaoProdRef = window.db
                .collection("SeparacaoProd")
                .doc(clienteSelecionado)
                .collection(tipoProjetoSelecionado)
                .doc(nomeListaOriginalSelecionada);
                
            await separacaoProdRef.set({
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: "separado"
            });
            
            // Salvar os itens em uma subcoleção
            const itensRef = separacaoProdRef.collection("itens");
            
            // Usar batch para salvar múltiplos documentos
            const batch = window.db.batch();
            
            for (const [itemId, itemData] of Object.entries(itensFormatados)) {
                const docRef = itensRef.doc(itemId);
                batch.set(docRef, itemData);
            }
            
            await batch.commit();
            
            // Processamento adicional - comparar listas e criar correção final
            await processarResultadoSeparacao(
                clienteSelecionado,
                tipoProjetoSelecionado, 
                nomeListaOriginalSelecionada
            );
            
            mostrarNotificacao("Separação salva com sucesso", "success");
            mostrarLoading(false);
        } catch (error) {
            console.error("Erro ao salvar separação:", error);
            mostrarNotificacao("Erro ao salvar separação", "danger");
            mostrarLoading(false);
        }
    } else {
        mostrarNotificacao("Nenhum item para salvar", "warning");
    }
}

/**
 * Processa o resultado da separação
 */
async function processarResultadoSeparacao(clienteId, tipoProjeto, nomeListaOriginal) {
    console.log(`Processando resultado da separação: ${clienteId}/${tipoProjeto}/${nomeListaOriginal}`);
    
    // 1. Buscar Lista Original (com empenho/recebido)
    const origRef = window.db
        .collection("clientes")
        .doc(clienteId)
        .collection("projetos")
        .doc(tipoProjeto)
        .collection("listas")
        .doc(nomeListaOriginal)
        .collection("itens");
        
    const origSnapshot = await origRef.get();
    
    if (origSnapshot.empty) {
        console.log("Nenhum item encontrado na lista original");
        return;
    }
    
    // Converter snapshot para objeto
    const listaOriginalItens = {};
    origSnapshot.forEach(doc => {
        listaOriginalItens[doc.id] = {
            id: doc.id,
            ...doc.data()
        };
    });
    
    // 2. Buscar Nova Lista de Separação (recém salva)
    const sepRef = window.db
        .collection("SeparacaoProd")
        .doc(clienteId)
        .collection(tipoProjeto)
        .doc(nomeListaOriginal)
        .collection("itens");
        
    const sepSnapshot = await sepRef.get();
    
    if (sepSnapshot.empty) {
        console.log("Nenhum item encontrado na lista de separação");
        return;
    }
    
    // Converter snapshot para objeto
    const listaSeparacaoItens = {};
    sepSnapshot.forEach(doc => {
        listaSeparacaoItens[doc.id] = {
            id: doc.id,
            ...doc.data()
        };
    });
    
    // 3. Comparar as duas listas e criar itens processados
    const itensProcessados = [];
    
    for (const [itemId, itemOriginal] of Object.entries(listaOriginalItens)) {
        const itemSeparacao = listaSeparacaoItens[itemId];
        
        if (!itemSeparacao) continue;
        
        const quantidadeOriginal = itemOriginal.quantidade || 0;
        const quantidadeSeparada = itemSeparacao.quantidadeSeparada || 0;
        const quantidadeEmpenhada = itemOriginal.quantidadeEmpenhada || 0;
        const quantidadeRecebida = itemOriginal.quantidadeRecebida || 0;
        
        let status = "OK";
        let diferenca = 0;
        
        // Verificar diferenças
        if (quantidadeSeparada < quantidadeOriginal) {
            status = "PARCIAL";
            diferenca = quantidadeOriginal - quantidadeSeparada;
        } else if (quantidadeSeparada > quantidadeOriginal) {
            status = "EXCESSO";
            diferenca = quantidadeSeparada - quantidadeOriginal;
        }
        
        // Adicionar ao array de itens processados
        itensProcessados.push({
            id: itemId,
            descricao: itemOriginal.descricao || "",
            codigoMaterial: itemOriginal.codigoMaterial || "",
            quantidade: quantidadeOriginal,
            unidade: itemOriginal.unidade || "",
            quantidadeSeparada: quantidadeSeparada,
            quantidadeEmpenhada: quantidadeEmpenhada,
            quantidadeRecebida: quantidadeRecebida,
            diferenca: diferenca,
            status: status,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    // Salvar o resultado da comparação em CorrecaoFinal
    const correcaoFinalRef = window.db
        .collection("CorrecaoFinal")
        .doc(clienteId)
        .collection(tipoProjeto)
        .doc(nomeListaOriginal);
        
    await correcaoFinalRef.set({
        status: "processado",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Salvar os itens processados em uma subcoleção
    const itensProcessadosRef = correcaoFinalRef.collection("itensProcessados");
    
    // Usar batch para salvar múltiplos documentos
    const batch = window.db.batch();
    
    for (const item of itensProcessados) {
        const docRef = itensProcessadosRef.doc(item.id);
        batch.set(docRef, item);
    }
    
    await batch.commit();
    
    console.log(`Processamento finalizado com ${itensProcessados.length} itens`);
}

/**
 * Carrega e exibe o relatório de correção final
 */
async function carregarRelatorioCorrecaoFinal(clienteId, tipoProjeto, nomeListaOriginal) {
    console.log(`Carregando relatório de correção final: ${clienteId}/${tipoProjeto}/${nomeListaOriginal}`);
    
    try {
        const correcaoFinalRef = window.db
            .collection("CorrecaoFinal")
            .doc(clienteId)
            .collection(tipoProjeto)
            .doc(nomeListaOriginal)
            .collection("itensProcessados");
            
        const snapshot = await correcaoFinalRef.get();
        
        if (snapshot.empty) {
            console.log("Nenhum item encontrado no relatório de correção final");
            return [];
        }
        
        const itens = [];
        snapshot.forEach(doc => {
            itens.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Relatório carregado com ${itens.length} itens`);
        return itens;
    } catch (error) {
        console.error("Erro ao carregar relatório de correção final:", error);
        return [];
    }
}

/**
 * Inicializa os componentes da página
 */
function inicializarComponentes() {
    console.log("Inicializando componentes da página");
    
    // Inicializa modais
    modalConfirmacao = new bootstrap.Modal(document.getElementById("modalConfirmacao"));
    modalDetalhes = new bootstrap.Modal(document.getElementById("modalDetalhes"));
    
    // Configura os botões
    document.getElementById("btnSalvarSeparacao").disabled = true;
    document.getElementById("btnExportar").disabled = true;
    document.getElementById("btnCarregarLista").disabled = true;
    document.getElementById("selectTipoProjeto").disabled = true;
    document.getElementById("selectListaOriginal").disabled = true;
}

/**
 * Renderiza a tabela de separação
 */
function renderizarTabelaSeparacao(dados) {
    console.log(`Renderizando tabela de separação com ${dados.length} itens`);
    
    const tabelaContainer = document.getElementById("tabelaSeparacao");
    
    // Destrói a tabela existente se houver
    if (tabelaSeparacao) {
        tabelaSeparacao.destroy();
    }
    
    // Inicializa a nova tabela
    tabelaSeparacao = new DataTable("#tabelaSeparacao", {
        data: dados,
        columns: [
            { data: "id", title: "ID" },
            { data: "descricao", title: "Descrição" },
            { data: "codigoMaterial", title: "Código Material" },
            { data: "quantidade", title: "Quantidade Original" },
            { data: "unidade", title: "Unidade" },
            { 
                data: "quantidadeSeparada", 
                title: "Quantidade Separada",
                render: function(data, type, row) {
                    if (type === "display") {
                        return `<input type="number" class="form-control form-control-sm input-quantidade-separada" 
                                value="${data}" min="0" data-id="${row.id}">`;
                    }
                    return data;
                }
            },
            { data: "status", title: "Status" }
        ],
        language: {
            url: "//cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json"
        },
        responsive: true,
        ordering: true,
        paging: true,
        searching: true,
        info: true
    });
    
    // Adiciona evento para atualizar os dados quando a quantidade separada for alterada
    tabelaContainer.addEventListener("change", function(e) {
        if (e.target.classList.contains("input-quantidade-separada")) {
            const itemId = e.target.dataset.id;
            const novaQuantidade = parseFloat(e.target.value) || 0;
            
            // Atualiza os dados na tabela
            const dadosTabela = tabelaSeparacao.data();
            
            for (let i = 0; i < dadosTabela.length; i++) {
                if (dadosTabela[i].id === itemId) {
                    dadosTabela[i].quantidadeSeparada = novaQuantidade;
                    tabelaSeparacao.row(i).data(dadosTabela[i]).draw(false);
                    break;
                }
            }
        }
    });
}

/**
 * Exporta a tabela para Excel
 */
function exportarTabelaExcel() {
    console.log("Exportando tabela para Excel");
    
    if (!tabelaSeparacao) {
        mostrarNotificacao("Nenhum dado para exportar", "warning");
        return;
    }
    
    try {
        const dados = tabelaSeparacao.data();
        
        if (!dados || dados.length === 0) {
            mostrarNotificacao("Nenhum dado para exportar", "warning");
            return;
        }
        
        // Formatar dados para Excel
        const dadosExcel = dados.map(item => ({
            ID: item.id,
            Descricao: item.descricao,
            CodigoMaterial: item.codigoMaterial,
            QuantidadeOriginal: item.quantidade,
            Unidade: item.unidade,
            QuantidadeSeparada: item.quantidadeSeparada,
            Status: item.status
        }));
        
        // Criar workbook e worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dadosExcel);
        
        // Adicionar worksheet ao workbook
        XLSX.utils.book_append_sheet(wb, ws, "Separacao");
        
        // Nome do arquivo
        const nomeArquivo = `Separacao_${clienteSelecionado}_${tipoProjetoSelecionado}_${nomeListaOriginalSelecionada}.xlsx`;
        
        // Exportar
        XLSX.writeFile(wb, nomeArquivo);
        
        mostrarNotificacao("Exportação concluída com sucesso", "success");
    } catch (error) {
        console.error("Erro ao exportar para Excel:", error);
        mostrarNotificacao("Erro ao exportar para Excel", "danger");
    }
}

/**
 * Mostra ou esconde o loading
 */
function mostrarLoading(mostrar) {
    const loading = document.getElementById("loading");
    
    if (mostrar) {
        loading.style.display = "flex";
    } else {
        loading.style.display = "none";
    }
}

/**
 * Mostra uma notificação na página
 */
function mostrarNotificacao(mensagem, tipo, tempo = 5000) {
    const notificacao = document.createElement("div");
    notificacao.className = `alert alert-${tipo} alert-dismissible fade show notification`;
    notificacao.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    document.body.appendChild(notificacao);
    
    setTimeout(() => {
        notificacao.classList.add("show");
    }, 100);
    
    setTimeout(() => {
        notificacao.classList.remove("show");
        setTimeout(() => {
            notificacao.remove();
        }, 500);
    }, tempo);
}