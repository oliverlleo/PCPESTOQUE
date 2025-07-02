document.addEventListener('DOMContentLoaded', function() {
    // Verificação de segurança para garantir que o Firestore está pronto
    if (typeof db === 'undefined') {
        console.error("A configuração do Firestore (db) não foi encontrada. Verifique a ordem dos scripts no HTML.");
        return; // Para a execução se o DB não estiver pronto
    }

    // ===================================================
    // SEU CÓDIGO ORIGINAL E COMPLEXO COMEÇA ABAIXO DESTA LINHA
    // ===================================================

/**
 * cadastro.js
 * * Lógica específica da tela de cadastro de clientes e projetos
 * Este arquivo contém todas as funções relacionadas à tela de cadastro
 * do Sistema de Controle de Compras e Recebimento
 */

/**
 * Inicializa os componentes da interface
 * Configura datepickers, selects e outros elementos
 */
function inicializarComponentes() {
  // Inicializa os datepickers
  flatpickr(".datepicker", {
    locale: "pt",
    dateFormat: "d/m/Y",
    allowInput: true,
  });

  // Inicializa os selects com Select2
  $(document).ready(function () {
    $("#filtroCliente").select2({
      placeholder: "Selecione um cliente",
      allowClear: true,
    });

    $("#filtroStatus").select2({
      placeholder: "Selecione um status",
      allowClear: true,
    });
  });
}

/**
 * Configura os listeners de eventos para os elementos da página
 */
function configurarEventListeners() {
  // Botão Novo Cadastro
  document
    .getElementById("btnNovoCadastro")
    .addEventListener("click", function () {
      // Limpa o formulário antes de abrir o modal
      document.getElementById("formCadastro").reset();

      // Oculta todas as áreas de projeto
      document.querySelectorAll(".area-projeto").forEach((area) => {
        area.classList.add("d-none");
      });

      // Remove o ID do cliente do modal (para indicar que é um novo cadastro)
      document.getElementById("modalCadastro").dataset.clienteId = "";

      // Atualiza o título do modal
      document.getElementById("modalCadastroLabel").textContent =
        "Novo Cadastro";

      // Atualiza o texto do botão
      document.getElementById("btnSalvarCadastro").textContent = "Salvar";

      // Exibe o modal
      const modalCadastro = new bootstrap.Modal(
        document.getElementById("modalCadastro")
      );
      modalCadastro.show();
    });

  // Checkboxes de tipo de projeto
  document.querySelectorAll(".tipo-projeto").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const tipoId = this.id;
      const areaTipo = document.getElementById(
        "area" + tipoId.replace("tipo", "")
      );

      if (this.checked && areaTipo) {
        areaTipo.classList.remove("d-none");
      } else if (areaTipo) {
        areaTipo.classList.add("d-none");
      }
    });
  });

  // Checkbox de terceirização para Alumínio
  document
    .getElementById("aluminioTerceirizado")
    .addEventListener("change", function () {
      const areaTerceirizado = document.getElementById(
        "areaAluminioTerceirizado"
      );
      const areaProducao = document.getElementById("areaAluminioProducao");

      if (this.checked) {
        areaTerceirizado.classList.remove("d-none");
        areaProducao.classList.add("d-none");
      } else {
        areaTerceirizado.classList.add("d-none");
        areaProducao.classList.remove("d-none");
      }
    });

  // Checkbox de terceirização para Brise
  document
    .getElementById("briseTerceirizado")
    .addEventListener("change", function () {
      const areaTerceirizado = document.getElementById("areaBriseTerceirizado");
      const areaProducao = document.getElementById("areaBriseProducao");

      if (this.checked) {
        areaTerceirizado.classList.remove("d-none");
        areaProducao.classList.add("d-none");
      } else {
        areaTerceirizado.classList.add("d-none");
        areaProducao.classList.remove("d-none");
      }
    });

  // Checkbox de terceirização para ACM
  document
    .getElementById("acmTerceirizado")
    .addEventListener("change", function () {
      const areaTerceirizado = document.getElementById("areaACMTerceirizado");
      const areaProducao = document.getElementById("areaACMProducao");

      if (this.checked) {
        areaTerceirizado.classList.remove("d-none");
        areaProducao.classList.add("d-none");
      } else {
        areaTerceirizado.classList.add("d-none");
        areaProducao.classList.remove("d-none");
      }
    });

  // Checkbox de terceirização para Trilho
  document
    .getElementById("trilhoTerceirizado")
    .addEventListener("change", function () {
      const areaTerceirizado = document.getElementById(
        "areaTrilhoTerceirizado"
      );
      const areaProducao = document.getElementById("areaTrilhoProducao");

      if (this.checked) {
        areaTerceirizado.classList.remove("d-none");
        areaProducao.classList.add("d-none");
      } else {
        areaTerceirizado.classList.add("d-none");
        areaProducao.classList.remove("d-none");
      }
    });

  // Checkbox de terceirização para Outros
  document
    .getElementById("outrosTerceirizado")
    .addEventListener("change", function () {
      const areaTerceirizado = document.getElementById(
        "areaOutrosTerceirizado"
      );
      const areaProducao = document.getElementById("areaOutrosProducao");

      if (this.checked) {
        areaTerceirizado.classList.remove("d-none");
        areaProducao.classList.add("d-none");
      } else {
        areaTerceirizado.classList.add("d-none");
        areaProducao.classList.remove("d-none");
      }
    });

  // Botão para adicionar nova lista personalizada
  document
    .getElementById("btnAdicionarListaOutros")
    .addEventListener("click", function () {
      adicionarListaPersonalizada();
    });

  // Botão Salvar Cadastro
  document
    .getElementById("btnSalvarCadastro")
    .addEventListener("click", salvarCadastro);

  // Botão Filtrar
  document
    .getElementById("btnFiltrar")
    .addEventListener("click", aplicarFiltros);

  // Botão Limpar Filtros
  document
    .getElementById("btnLimparFiltros")
    .addEventListener("click", limparFiltros);
}

/**
 * Carrega a lista de clientes cadastrados do Firebase
 * e atualiza a tabela na interface
 */
function carregarClientes() {
    // Acessa a *coleção* 'clientes' e pega os documentos
    db.collection('clientes').get().then((querySnapshot) => {
        const tabelaClientes = document.getElementById("tabelaClientes");
        const nenhumCliente = document.getElementById("nenhumCliente");
        const filtroCliente = document.getElementById("filtroCliente");

        // Limpa a tabela e o select de filtro
        tabelaClientes.innerHTML = "";
        filtroCliente.innerHTML = '<option value="">Todos os clientes</option>'; // Alterado de selectCliente para filtroCliente

        // Verifica se existem clientes cadastrados
        if (querySnapshot.empty) {
            nenhumCliente.classList.remove("d-none");
            return;
        }

        nenhumCliente.classList.add("d-none");

        // Itera sobre o resultado
        querySnapshot.forEach((doc) => {
            const cliente = doc.data(); // Dados do cliente
            const clienteId = doc.id; // ID do documento

            // Adiciona ao filtro
            const option = document.createElement('option');
            option.value = clienteId;
            option.textContent = cliente.nome;
            filtroCliente.appendChild(option);

            // Cria a linha da tabela
            const tr = document.createElement("tr");
            tr.dataset.id = clienteId;

            // Define a classe de acordo com o status
            if (cliente.StatusCadastro === "Em andamento") {
                tr.classList.add("table-warning");
            } else if (cliente.StatusCadastro === "Concluído") {
                tr.classList.add("table-success");
            }

            // Formata a data de criação
            const dataCriacao = formatarData(cliente.dataCriacao);

            // Conteúdo da linha
            tr.innerHTML = `
                <td>${cliente.nome}</td>
                <td>${dataCriacao}</td>
                <td>
                    <span class="badge ${getBadgeClass(
                        cliente.StatusCadastro
                    )}">${cliente.StatusCadastro || "Não iniciado"}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-info me-1 btn-visualizar" onclick="visualizarCliente('${clienteId}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="editarCliente('${clienteId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;

            tabelaClientes.appendChild(tr);
        });

        // Adiciona os event listeners aos botões de visualização (mantido como estava)
        const botoesVisualizar = document.querySelectorAll(".btn-visualizar");
        botoesVisualizar.forEach(function (botao) {
            botao.addEventListener('click', function() {
                const clienteId = this.closest('tr').dataset.id;
                visualizarCliente(clienteId); // Assumindo que visualizarCliente é global ou definida neste escopo
            });
        });

    }).catch((error) => {
        console.error("Erro ao carregar clientes: ", error);
        mostrarNotificacao(
            "Erro ao carregar clientes. Tente novamente.",
            "danger"
        );
    });
}

/**
 * Retorna a classe do badge de acordo com o status
 * * @param {string} status - Status do cliente
 * @returns {string} - Classe CSS para o badge
 */
function getBadgeClass(status) {
  switch (status) {
    case "Em andamento":
      return "bg-warning";
    case "Concluído":
      return "bg-success";
    default:
      return "bg-secondary";
  }
}

/**
 * Abre o modal de edição de cliente com os dados carregados
 * * @param {string} clienteId - ID do cliente a ser editado
 */
function editarCliente(clienteId) {
  console.log("=== INÍCIO DA FUNÇÃO EDITAR CLIENTE ===");
  console.log("Editando cliente com ID:", clienteId);

  // ATENÇÃO: dbRef ainda está sendo usado aqui. Precisa ser migrado para Firestore.
  // E a lógica de como os projetos são carregados para edição precisa mudar drasticamente
  // devido à nova estrutura de projetos individuais no Firestore.
  console.warn("FUNCIONALIDADE 'EDITAR CLIENTE' PRECISA DE MIGRAÇÃO COMPLETA PARA FIRESTORE E NOVA ESTRUTURA DE PROJETOS.");

  // Limpa o formulário antes de carregar os dados
  document.getElementById("formCadastro").reset();
  document.querySelectorAll(".area-projeto").forEach((area) => area.classList.add("d-none"));
  document.getElementById("modalCadastro").dataset.clienteId = clienteId;
  document.getElementById("modalCadastroLabel").textContent = "Editar Cadastro";
  document.getElementById("btnSalvarCadastro").textContent = "Atualizar";

  // Busca dados do cliente no Firestore
  db.collection('clientes').doc(clienteId).get().then(docSnapshot => {
    if (!docSnapshot.exists) {
      console.error("Cliente não encontrado no Firestore para edição.");
      mostrarNotificacao("Cliente não encontrado.", "danger");
      return;
    }
    const cliente = docSnapshot.data();
    document.getElementById("cliente").value = cliente.nome || "";
    if (cliente.prazoEntrega) {
      document.getElementById("dataPrazoEntrega").value = formatarData(cliente.prazoEntrega);
    }

    // Busca os projetos individuais do cliente no Firestore
    return db.collection('projetos').where('clienteId', '==', clienteId).get();
  }).then(querySnapshotProjetos => {
    if (querySnapshotProjetos) { // Verifica se a query foi bem sucedida (mesmo que vazia)
        querySnapshotProjetos.forEach(docProjeto => {
            const projeto = docProjeto.data();
            const tipoProjeto = projeto.tipo; // e.g., PVC, Aluminio

            const checkbox = document.getElementById(`tipo${tipoProjeto}`);
            if (checkbox) {
                checkbox.checked = true;
                const areaTipo = document.getElementById(`area${tipoProjeto}`);
                if (areaTipo) areaTipo.classList.remove("d-none");

                // Preencher campos específicos do projeto (terceirizado, empresa, etc.)
                if (projeto.terceirizado) {
                    const checkboxTerceirizado = document.getElementById(`${tipoProjeto.toLowerCase()}Terceirizado`);
                    if (checkboxTerceirizado) checkboxTerceirizado.checked = true;

                    const areaTerceirizado = document.getElementById(`area${tipoProjeto}Terceirizado`);
                    const areaProducao = document.getElementById(`area${tipoProjeto}Producao`);
                    if(areaTerceirizado) areaTerceirizado.classList.remove("d-none");
                    if(areaProducao) areaProducao.classList.add("d-none");

                    const empresaInput = document.getElementById(`empresa${tipoProjeto}`);
                    if (empresaInput) empresaInput.value = projeto.empresa || "";

                    const dataSolicitacaoInput = document.getElementById(`dataSolicitacao${tipoProjeto}`);
                    if (dataSolicitacaoInput && projeto.dataSolicitacao) dataSolicitacaoInput.value = formatarData(projeto.dataSolicitacao);

                    const prazoEntregaInput = document.getElementById(`prazoEntrega${tipoProjeto}`);
                    if (prazoEntregaInput && projeto.prazoEntrega) prazoEntregaInput.value = formatarData(projeto.prazoEntrega);

                } else {
                    const areaProducao = document.getElementById(`area${tipoProjeto}Producao`);
                    if (areaProducao) areaProducao.classList.remove("d-none");
                    const areaTerceirizado = document.getElementById(`area${tipoProjeto}Terceirizado`);
                     if(areaTerceirizado) areaTerceirizado.classList.add("d-none");
                }
                // ATENÇÃO: A lógica de carregar arquivos/listas para projetos existentes não está implementada aqui.
                // A estrutura de 'listas' dentro de cada projeto precisaria ser lida e usada para popular os inputs de arquivo se necessário.
            }
        });
    }
    const modal = new bootstrap.Modal(document.getElementById("modalCadastro"));
    modal.show();
  }).catch(error => {
    console.error("Erro ao carregar dados do cliente ou projetos para edição (Firestore):", error);
    mostrarNotificacao("Erro ao carregar dados para edição. Tente novamente.", "danger");
  });
}


/**
 * Salva um novo cadastro de cliente e seus projetos no Firebase
 * ou atualiza um cadastro existente
 */
async function salvarCadastro() {
  // Referência ao formulário
  const form = document.getElementById("formCadastro");

  // Valida o formulário
  if (!validarFormulario(form)) {
    mostrarNotificacao("Preencha todos os campos obrigatórios.", "warning");
    return;
  }

  // Validação específica para o tipo de projeto "Outros"
  if (document.getElementById("tipoOutros").checked) {
    const nomeProjetoOutros = document
      .getElementById("nomeProjetoOutros")
      .value.trim();
    if (!nomeProjetoOutros) {
      mostrarNotificacao("Informe o nome do projeto personalizado.", "warning");
      return;
    }
  }

  // Obtém os valores do formulário
  const nomeCliente = document.getElementById("cliente").value;
  const prazoEntrega = document.getElementById("dataPrazoEntrega").value;

  // Captura informações do projeto personalizado (Outros)
  let nomeProjetoOutros = "";
  let listasPersonalizadasParaUpload = []; // Renomeado para clareza

  if (document.getElementById("tipoOutros").checked) {
    nomeProjetoOutros = document
      .getElementById("nomeProjetoOutros")
      .value.trim();

    if (!document.getElementById("outrosTerceirizado").checked) {
      const listasContainer = document.getElementById(
        "listasPersonalizadasContainer"
      );
      const listasItems = listasContainer.querySelectorAll(
        ".lista-personalizada"
      );

      listasItems.forEach((item) => {
        const nomeLista = item
          .querySelector(".nome-lista-personalizada")
          .value.trim();
        const arquivoLista = item.querySelector(".arquivo-lista-personalizada")
          .files[0];

        if (nomeLista && arquivoLista) {
          listasPersonalizadasParaUpload.push({ // Usando o nome correto
            nome: nomeLista,
            arquivo: arquivoLista,
          });
        }
      });
    }
  }

  // Converte a data para timestamp
  const dataParts = prazoEntrega.split("/");
  const prazoEntregaTimestamp = new Date(
    parseInt(dataParts[2]),
    parseInt(dataParts[1]) - 1,
    parseInt(dataParts[0])
  ).getTime();

  let currentClientId = document.getElementById("modalCadastro").dataset.clienteId;
  const isEditing = !!currentClientId;

  if (!isEditing) {
      currentClientId = gerarId(); // Gera ID apenas para novos, Firestore gerará o seu próprio
  }


  // Prepara os dados do cliente
  const clienteData = {
    nome: nomeCliente,
    prazoEntrega: prazoEntregaTimestamp,
    ultimaAtualizacao: Date.now(),
  };

  if (!isEditing) {
    clienteData.dataCriacao = Date.now();
    clienteData.StatusCadastro = "Não iniciado";
  }

  if (document.getElementById("tipoOutros").checked && nomeProjetoOutros) {
    clienteData.projetoOutrosNome = nomeProjetoOutros; // Este campo pode ser específico do cliente ou do projeto "Outros"
  }

  const tiposProjetoSelecionados = [];
  document.querySelectorAll(".tipo-projeto:checked").forEach((checkbox) => {
    tiposProjetoSelecionados.push(checkbox.value);
  });

  if (tiposProjetoSelecionados.length === 0) {
    mostrarNotificacao("Selecione pelo menos um tipo de projeto.", "warning");
    return;
  }

  try {
    // Coleta de dados para projetosParaSalvar (baseado no formulário)
    const projetosParaSalvarNoForm = {};
    tiposProjetoSelecionados.forEach((tipo) => {
      const tipoProjetoData = { terceirizado: false, listas: {} }; // Inicializa listas como objeto

      const checkboxTerceirizado = document.getElementById(`${tipo.toLowerCase()}Terceirizado`);
      if (checkboxTerceirizado && checkboxTerceirizado.checked) {
        tipoProjetoData.terceirizado = true;
        tipoProjetoData.empresa = document.getElementById(`empresa${tipo}`).value;
        const dataSolicitacaoVal = document.getElementById(`dataSolicitacao${tipo}`).value;
        if (dataSolicitacaoVal) {
            const parts = dataSolicitacaoVal.split("/");
            tipoProjetoData.dataSolicitacao = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
        }
        const prazoEntregaTerceirizadoVal = document.getElementById(`prazoEntrega${tipo}`).value;
        if (prazoEntregaTerceirizadoVal) {
            const parts = prazoEntregaTerceirizadoVal.split("/");
            tipoProjetoData.prazoEntrega = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
        }
      }
      // Adicionar lógica para coletar nomes de arquivos das 'listas' se necessário guardar essa info no doc do projeto
      // Por exemplo, se um arquivo foi selecionado para 'listaPVC', você pode querer armazenar o nome do arquivo.
      // Esta parte depende de como `processarArquivosListas` irá funcionar com a nova estrutura.
      // Por agora, `projetosParaSalvarNoForm[tipo].listas` permanece um objeto vazio ou com dados de edição.

      if (tipo === "Outros" && nomeProjetoOutros) {
        tipoProjetoData.nomeProjetoPersonalizado = nomeProjetoOutros;
      }

      projetosParaSalvarNoForm[tipo] = tipoProjetoData;
    });

    let effectiveClientId = currentClientId;

    if (isEditing) {
      await db.collection('clientes').doc(effectiveClientId).update(clienteData);
    } else {
      // Para novos clientes, Firestore gera o ID.
      const docRef = await db.collection('clientes').add(clienteData);
      effectiveClientId = docRef.id; // Usa o ID gerado pelo Firestore
    }

    // Salva/Atualiza projetos individuais
    if (isEditing) {
        const existingProjetosSnapshot = await db.collection('projetos').where('clienteId', '==', effectiveClientId).get();
        const batch = db.batch();
        existingProjetosSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    for (const tipo of tiposProjetoSelecionados) {
        const projetoDetalhesForm = projetosParaSalvarNoForm[tipo];
        const projetoDocData = {
            ...projetoDetalhesForm,
            clienteId: effectiveClientId,
            tipo: tipo,
            ultimaAtualizacao: Date.now()
        };
        if (!isEditing) { // Adiciona dataCriacao apenas para projetos de um cliente totalmente novo
            projetoDocData.dataCriacao = Date.now();
        } else {
            // Para edições, idealmente, buscaríamos o projeto existente para manter sua dataCriacao original
            // A lógica atual de delete-all-add-new não preserva isso facilmente.
            // Uma solução seria buscar dataCriacao antes do delete, ou mudar a estratégia de update.
            // Por simplicidade agora, novos projetos (mesmo para cliente existente) recebem nova data.
             projetoDocData.dataCriacao = Date.now(); // Ou lógica mais complexa para preservar
        }
        await db.collection('projetos').add(projetoDocData);
    }

    // Passar effectiveClientId para processarArquivosListas
    await processarArquivosListas(
      effectiveClientId,
      tiposProjetoSelecionados,
      listasPersonalizadasParaUpload
    );

    mostrarNotificacao("Cliente salvo com sucesso!", "success");
    const modalCadastroInstance = bootstrap.Modal.getInstance(document.getElementById("modalCadastro"));
    if (modalCadastroInstance) modalCadastroInstance.hide();
    document.getElementById("formCadastro").reset(); // Limpa o formulário
    carregarClientes();
  } catch (error) {
    console.error("Erro ao salvar cadastro:", error);
    mostrarNotificacao("Erro ao salvar cadastro. Tente novamente.", "danger");
  }
}


/**
 * Processa os arquivos de listas para cada tipo de projeto
 * * @param {string} clienteId - ID do cliente (effectiveClientId)
 * @param {Array} tiposSelecionados - Tipos de projeto selecionados
 * @param {Array} listasPersonalizadasParaUpload - Listas personalizadas para o tipo "Outros" com arquivos
 * @returns {Promise} - Promise que resolve quando todos os arquivos forem processados
 */
async function processarArquivosListas(
  clienteId,
  tiposSelecionados,
  listasPersonalizadasParaUpload = []
) {
  const promessas = [];

  for (const tipo of tiposSelecionados) {
    // Identificar o documento de projeto específico para este tipo e clienteId
    // Esta é uma simplificação; pode haver múltiplos projetos do mesmo tipo para um cliente se não houver constraint.
    // Assumindo que queremos o mais recente ou um específico. Para este exemplo, pegamos o primeiro.
    let projetoDocId = null;
    try {
        const projetoQuerySnapshot = await db.collection('projetos')
                                             .where('clienteId', '==', clienteId)
                                             .where('tipo', '==', tipo)
                                             .orderBy('dataCriacao', 'desc') // Pega o mais recente se houver múltiplos
                                             .limit(1)
                                             .get();
        if (!projetoQuerySnapshot.empty) {
            projetoDocId = projetoQuerySnapshot.docs[0].id;
        } else {
            console.warn(`Documento do projeto tipo '${tipo}' para cliente '${clienteId}' não encontrado para processar arquivos.`);
            // continue; // Pula para o próximo tipo de projeto se o doc do projeto não for encontrado
        }
    } catch(error) {
        console.error(`Erro ao buscar projeto ${tipo} para cliente ${clienteId} para processamento de arquivos:`, error);
        // continue;
    }
    // Se projetoDocId não for encontrado, a função processarArquivo chamada abaixo pode falhar ou não ter onde salvar.
    // A função processarArquivo precisa ser robusta para isso ou esta lógica precisa garantir que o doc existe.

    const checkboxTerceirizado = document.getElementById(`${tipo.toLowerCase()}Terceirizado`);
    if (checkboxTerceirizado && checkboxTerceirizado.checked) {
      const inputChaves = document.getElementById(`listaChaves${tipo}Terceirizado`);
      if (inputChaves && inputChaves.files.length > 0) {
        // Passar projetoDocId se processarArquivo for atualizá-lo
        promessas.push(processarArquivo(inputChaves.files[0], clienteId, tipo, "LChaves", projetoDocId));
      }
      // return; // Não usar return aqui, pois é dentro de um forEach/for-of
      continue; // Pula para o próximo tipo de projeto
    }

    let listasDefinidas = []; // Renomeado de 'listas' para evitar confusão com 'listasPersonalizadasParaUpload'
    switch (tipo) {
      case "PVC":
        listasDefinidas = [
          { id: "listaChavesPVC", nome: "LChaves" }, { id: "listaPVC", nome: "LPVC" },
          { id: "listaReforco", nome: "LReforco" }, { id: "listaFerragens", nome: "LFerragens" },
          { id: "listaVidros", nome: "LVidros" }, { id: "listaEsteira", nome: "LEsteira" },
          { id: "listaMotor", nome: "LMotor" }, { id: "listaAcabamento", nome: "LAcabamento" },
          { id: "listaTelaRetratil", nome: "LTelaRetratil" }, { id: "listaAco", nome: "LAco" },
          { id: "listaOutrosPVC", nome: "LOutros" },
        ];
        break;
      case "Aluminio":
        listasDefinidas = [
          { id: "listaChavesAluminio", nome: "LChaves" }, { id: "listaPerfil", nome: "LPerfil" },
          { id: "listaContraMarco", nome: "LContraMarco" }, { id: "listaFerragensAluminio", nome: "LFerragens" },
          { id: "listaVidroAluminio", nome: "LVidro" }, { id: "listaMotorAluminio", nome: "LMotor" },
          { id: "listaEsteiraAluminio", nome: "LEsteira" }, { id: "listaAcabamentoAluminio", nome: "LAcabamento" },
          { id: "listaTelaRetratilAluminio", nome: "LTelaRetratil" }, { id: "listaOutrosAluminio", nome: "LOutros" },
        ];
        break;
      case "Brise":
        listasDefinidas = [
          { id: "listaChavesBrise", nome: "LChaves" }, { id: "listaPerfilBrise", nome: "LPerfil" },
          { id: "listaFerragensBrise", nome: "LFerragens" }, { id: "listaConexaoBrise", nome: "LConexao" },
          { id: "listaFechaduraEletronicaBrise", nome: "LFechaduraEletronica" }, { id: "listaOutrosBrise", nome: "LOutros" },
        ];
        break;
      case "ACM":
        listasDefinidas = [
          { id: "listaChavesACM", nome: "LChaves" }, { id: "listaPerfilACM", nome: "LPerfil" },
          { id: "listaFerragensACM", nome: "LFerragens" }, { id: "listaConexaoACM", nome: "LConexao" },
          { id: "listaChapaACM", nome: "LChapaACM" }, { id: "listaFechaduraEletronicaACM", nome: "LFechaduraEletronica" },
          { id: "listaOutrosACM", nome: "LOutros" },
        ];
        break;
      case "Trilho":
        listasDefinidas = [
          { id: "listaChavesTrilho", nome: "LChaves" }, { id: "listaPerfilTrilho", nome: "LPerfil" },
          { id: "listaOutrosTrilho", nome: "LOutros" },
        ];
        break;
      case "Outros":
        // Para "Outros", as listas vêm de listasPersonalizadasParaUpload
        listasDefinidas = [{ id: "listaChavesOutros", nome: "LChaves" }];
        listasPersonalizadasParaUpload.forEach(listaPersonalizada => {
            // Assumindo que processarArquivo pode lidar com um objeto de arquivo diretamente
            // e que o 'nome' da lista é importante para processarArquivo.
            // A função processarArquivo precisa ser adaptada para receber o ID do documento do projeto específico.
            if(listaPersonalizada.arquivo) {
                 promessas.push(processarArquivo(listaPersonalizada.arquivo, clienteId, tipo, `L${listaPersonalizada.nome}`, projetoDocId));
            }
        });
        break; // Sai do switch para tipo "Outros"
    }

    listasDefinidas.forEach((lista) => {
      const inputFile = document.getElementById(lista.id);
      if (inputFile && inputFile.files.length > 0) {
        promessas.push(processarArquivo(inputFile.files[0], clienteId, tipo, lista.nome, projetoDocId));
      }
    });
  } // Fim do loop for (const tipo of tiposSelecionados)

  return Promise.all(promessas);
}


/**
 * Adiciona uma nova lista personalizada para o tipo de projeto "Outros"
 */
function adicionarListaPersonalizada() {
  const template = document.getElementById("templateListaPersonalizada");
  const container = document.getElementById("listasPersonalizadasContainer");
  const clone = document.importNode(template.content, true);
  const btnRemover = clone.querySelector(".btn-remover-lista");
  btnRemover.addEventListener("click", function () {
    this.closest(".lista-personalizada").remove();
  });
  container.appendChild(clone);
}

/**
 * Aplica os filtros selecionados à tabela de clientes
 */
function aplicarFiltros() {
  console.log("Aplicando filtros...");
  const filtroCliente = document.getElementById("filtroCliente").value;
  const filtroStatus = document.getElementById("filtroStatus").value;
  const linhas = document.querySelectorAll("#tabelaClientes tr");

  linhas.forEach((linha) => {
    const clienteId = linha.dataset.id;
    const statusElement = linha.querySelector(".badge");
    const status = statusElement ? statusElement.textContent : "";
    let mostrar = true;
    if (filtroCliente && clienteId !== filtroCliente) mostrar = false;
    if (filtroStatus && status !== filtroStatus) mostrar = false;
    linha.style.display = mostrar ? "" : "none";
  });
}

/**
 * Limpa os filtros aplicados à tabela de clientes
 */
function limparFiltros() {
  document.getElementById("filtroCliente").value = "";
  $("#filtroCliente").trigger('change'); // Para Select2
  document.getElementById("filtroStatus").value = "";
  $("#filtroStatus").trigger('change'); // Para Select2

  // Mostrar todas as linhas da tabela novamente
  const linhas = document.querySelectorAll("#tabelaClientes tr");
  linhas.forEach((linha) => {
    linha.style.display = "";
  });
  // Não é necessário recarregar os clientes do DB, apenas limpar os filtros da UI
}

/**
 * Valida o formulário de cadastro
 * * @param {HTMLFormElement} form - Formulário a ser validado
 * @returns {boolean} - Indica se o formulário é válido
 */
function validarFormulario(form) {
  const nomeCliente = document.getElementById("cliente").value;
  if (!nomeCliente) return false;
  const prazoEntrega = document.getElementById("dataPrazoEntrega").value;
  if (!prazoEntrega) return false;
  return true;
}

/**
 * Gera um ID único para novos registros (usado como fallback se Firestore ID não for pego a tempo)
 * * @returns {string} - ID único
 */
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Formata uma data timestamp para o formato DD/MM/YYYY
 * * @param {number} timestamp - Timestamp da data
 * @returns {string} - Data formatada
 */
function formatarData(timestamp) {
  if (!timestamp && timestamp !== 0) return "Data inválida"; // Adiciona verificação para timestamp nulo/undefined
  const data = new Date(timestamp);
  if (isNaN(data.getTime())) return "Data inválida"; // Adiciona verificação para data inválida

  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Verifica se um objeto está vazio
 * * @param {object} obj - Objeto a ser verificado
 * @returns {boolean} - Indica se o objeto está vazio
 */
function objetoVazio(obj) {
  return obj === null || obj === undefined || Object.keys(obj).length === 0;
}

/**
 * Exibe uma notificação na interface
 * * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo da notificação (success, warning, danger)
 */
function mostrarNotificacao(mensagem, tipo) {
  const notificacao = document.createElement("div");
  notificacao.className = `alert alert-${tipo} alert-dismissible fade show`;
  notificacao.role = "alert";
  notificacao.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;

  const container = document.querySelector("main.container");
  if (container) {
    container.insertBefore(notificacao, container.firstChild);
  } else {
    document.body.insertBefore(notificacao, document.body.firstChild);
  }

  setTimeout(() => {
    notificacao.classList.remove("show");
    setTimeout(() => {
      if (notificacao.parentNode) {
        notificacao.remove();
      }
    }, 150);
  }, 5000);
}

    // ===================================================
    // SEU CÓDIGO ORIGINAL E COMPLEXO TERMINA ACIMA DESTA LINHA
    // ===================================================

    // Inicializa os componentes da página
    inicializarComponentes();

    // Carrega a lista de clientes cadastrados
    carregarClientes();

    // Configura os listeners de eventos
    configurarEventListeners();

}); // Fim do addEventListener 'DOMContentLoaded'
