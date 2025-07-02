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

// As chamadas que estavam no DOMContentLoaded original serão feitas no final do novo wrapper.
// inicializarComponentes();
// carregarClientes();
// configurarEventListeners();

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
                visualizarCliente(clienteId);
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

  if (!dbRef) { // ATENÇÃO: dbRef ainda está sendo usado aqui. Precisa ser migrado para Firestore.
    console.error("ERRO CRÍTICO: dbRef não está definido! Esta função (editarCliente) precisa ser migrada para Firestore.");
    mostrarNotificacao(
      "Erro de conexão com o banco de dados (dbRef). Recarregue a página.",
      "danger"
    );
    return;
  }

  // Limpa o formulário antes de carregar os dados
  document.getElementById("formCadastro").reset();

  // Oculta todas as áreas de projeto
  document.querySelectorAll(".area-projeto").forEach((area) => {
    area.classList.add("d-none");
  });

  // Armazena o ID do cliente no modal para uso na função de salvar
  document.getElementById("modalCadastro").dataset.clienteId = clienteId;

  // Atualiza o título do modal
  document.getElementById("modalCadastroLabel").textContent = "Editar Cadastro";

  // Atualiza o texto do botão
  document.getElementById("btnSalvarCadastro").textContent = "Atualizar";

  // Busca os dados do cliente no Firebase (dbRef - PRECISA MIGRAR)
  dbRef.clientes
    .child(clienteId)
    .once("value")
    .then((snapshotCliente) => {
      console.log("Resposta recebida do Firebase para dados do cliente (dbRef)");

      const cliente = snapshotCliente.val();
      console.log("Dados do cliente (dbRef):", cliente);

      if (!cliente) {
        console.error("Cliente não encontrado no Firebase (dbRef)");
        throw new Error("Cliente não encontrado");
      }

      // Preenche os campos do formulário com os dados do cliente
      document.getElementById("cliente").value = cliente.nome || "";

      // Formata a data de prazo de entrega
      if (cliente.prazoEntrega) {
        const data = new Date(cliente.prazoEntrega);
        const dia = String(data.getDate()).padStart(2, "0");
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const ano = data.getFullYear();
        document.getElementById(
          "dataPrazoEntrega"
        ).value = `${dia}/${mes}/${ano}`;
      }

      // Busca os projetos do cliente (dbRef - PRECISA MIGRAR)
      // E a lógica precisará mudar para buscar projetos individuais na coleção 'projetos' do Firestore
      return dbRef.projetos.child(clienteId).once("value");
    })
    .then((snapshotProjetos) => {
      console.log("Resposta recebida do Firebase para projetos (dbRef)");

      const projetosMap = snapshotProjetos.val(); // Isso era um mapa de projetos no Realtime DB
      console.log("Dados dos projetos (dbRef - estrutura antiga):", projetosMap);

      // ATENÇÃO: A lógica abaixo para preencher o formulário com dados de projetos
      // precisa ser completamente refeita para buscar documentos individuais da coleção 'projetos'
      // do Firestore e reconstruir o estado do formulário.
      // A estrutura 'projetosMap' não é mais como os dados são armazenados.

      if (!projetosMap || objetoVazio(projetosMap)) {
        console.log("Nenhum projeto encontrado para este cliente (dbRef - estrutura antiga)");
        const modalCadastro = new bootstrap.Modal(document.getElementById("modalCadastro"));
        modalCadastro.show();
        return;
      }

      // Esta lógica de iterar Object.keys(projetosMap) e preencher o formulário
      // com base nos tipos de projeto como chaves do objeto 'projetosMap'
      // precisará ser substituída por uma query à coleção 'projetos' do Firestore
      // filtrando por clienteId, e depois processando cada documento de projeto.
      console.warn("Lógica de preenchimento de projetos em editarCliente precisa ser migrada para Firestore e nova estrutura de dados.");


      // Exemplo de como seria a busca (PRECISA IMPLEMENTAR O PREENCHIMENTO DO FORMULÁRIO):
      // db.collection('projetos').where('clienteId', '==', clienteId).get().then(querySnapshot => {
      //   querySnapshot.forEach(doc => {
      //     const projeto = doc.data();
      //     const tipoProjeto = projeto.tipo;
      //     // Aqui você preencheria o formulário para este tipoProjeto
      //     // Ex: document.getElementById(`tipo${tipoProjeto}`).checked = true;
      //     // ... e os campos específicos do projeto ...
      //   });
      // }).catch(err => console.error("Erro ao buscar projetos individuais para edição:", err));


      // Marcando checkboxes e áreas de projeto (LÓGICA ANTIGA - INCOMPATÍVEL)
      Object.keys(projetosMap).forEach((tipoProjetoKey) => { // tipoProjetoKey era "PVC", "Aluminio" etc.
        const checkbox = document.getElementById(`tipo${tipoProjetoKey}`);
        if (checkbox) {
          checkbox.checked = true;
          const areaTipo = document.getElementById(`area${tipoProjetoKey}`);
          if (areaTipo) areaTipo.classList.remove("d-none");

          const projetoData = projetosMap[tipoProjetoKey]; // Dados específicos do projeto
          if (projetoData.terceirizado) {
            const checkboxTerceirizado = document.getElementById(`${tipoProjetoKey.toLowerCase()}Terceirizado`);
            if (checkboxTerceirizado) {
              checkboxTerceirizado.checked = true;
              // ... preencher outros campos de terceirizado ...
            }
          } else {
            // ... mostrar área de produção própria ...
          }
        }
      });


      const modalCadastro = new bootstrap.Modal(
        document.getElementById("modalCadastro")
      );
      modalCadastro.show();
    })
    .catch((error) => {
      console.error("Erro ao editar cliente (dbRef):", error);
      mostrarNotificacao("Erro ao editar cliente (função antiga). Tente novamente.", "danger");
      console.log("=== FIM DA FUNÇÃO EDITAR CLIENTE - ERRO (dbRef) ===");
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
  let listasPersonalizadas = [];

  if (document.getElementById("tipoOutros").checked) {
    nomeProjetoOutros = document
      .getElementById("nomeProjetoOutros")
      .value.trim();

    // Se não for terceirizado, captura as listas personalizadas
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
          listasPersonalizadas.push({
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

  // Verifica se é uma edição ou um novo cadastro
  let clienteId = // Declarar com let para poder reatribuir abaixo
    document.getElementById("modalCadastro").dataset.clienteId || gerarId();
  const isEditing =
    !!document.getElementById("modalCadastro").dataset.clienteId;

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
    clienteData.projetoOutrosNome = nomeProjetoOutros;
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
    // *** INÍCIO DA CORREÇÃO LÓGICA *** (Mantida da etapa anterior)

    // 1. Busca os projetos existentes se estiver em modo de edição (AINDA USA dbRef, PRECISA MUDAR)
    //    Esta parte é para construir o objeto projetosParaSalvar, que é usado abaixo.
    //    A lógica de como os projetos são *salvos* já foi alterada para Firestore.
    //    Mas a lógica de como os dados são *coletados do formulário* para edição ainda depende de como eram lidos.
    let projetosExistentesParaFormulario = {};
    if (isEditing) {
        // ATENÇÃO: Esta busca de projetos existentes para preencher 'projetosParaSalvar'
        // ainda usa a estrutura antiga do Realtime Database (dbRef).
        // Para que a edição de projetos funcione corretamente com a nova estrutura de dados do Firestore
        // (projetos individuais), a forma como 'projetosExistentesParaFormulario' é populada
        // precisaria ser alterada para buscar os projetos individuais do Firestore
        // e reconstruir um objeto similar ao que 'projetosParaSalvar' espera,
        // ou a lógica de construção de 'projetosParaSalvar' precisaria ser ajustada.
        // Por enquanto, a edição de *campos de projeto* pode não funcionar como esperado
        // se a estrutura de 'projetosExistentesParaFormulario' não corresponder ao que o código abaixo espera.
        console.warn("A lógica de coleta de dados de projetos existentes para edição em salvarCadastro (usando dbRef) precisa ser revisada para a nova estrutura Firestore.");
        const snapshotProjetosAntigos = await dbRef.projetos.child(clienteId).once("value");
        projetosExistentesParaFormulario = snapshotProjetosAntigos.val() || {};
    }


    // 2. Constrói o novo objeto de projetos, preservando as listas existentes
    const projetosParaSalvar = {};
    tiposProjetoSelecionados.forEach((tipo) => {
      // Usar 'projetosExistentesParaFormulario' para pegar os dados do projeto específico
      const projetoExistente = projetosExistentesParaFormulario[tipo] || {};

      const tipoProjeto = {
        terceirizado: false,
        listas: projetoExistente.listas || {},
      };

      const checkboxTerceirizado = document.getElementById(
        `${tipo.toLowerCase()}Terceirizado`
      );
      if (checkboxTerceirizado && checkboxTerceirizado.checked) {
        tipoProjeto.terceirizado = true;

        const empresa = document.getElementById(`empresa${tipo}`).value;
        const dataSolicitacao = document.getElementById(
          `dataSolicitacao${tipo}`
        ).value;
        const prazoEntregaTerceirizado = document.getElementById(
          `prazoEntrega${tipo}`
        ).value;

        tipoProjeto.empresa = empresa;

        if (dataSolicitacao) {
          const parts = dataSolicitacao.split("/");
          tipoProjeto.dataSolicitacao = new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0])
          ).getTime();
        }

        if (prazoEntregaTerceirizado) {
          const parts = prazoEntregaTerceirizado.split("/");
          tipoProjeto.prazoEntrega = new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0])
          ).getTime();
        }
      }
      projetosParaSalvar[tipo] = tipoProjeto;
    });

    // 3. Salva os dados do cliente
    let effectiveClientId = clienteId;

    if (isEditing) {
      await db.collection('clientes').doc(clienteId).update(clienteData);
    } else {
      const docRef = await db.collection('clientes').add(clienteData);
      effectiveClientId = docRef.id;
    }

    // 4. Salva cada projeto como um documento separado
    if (isEditing) {
        const existingProjetosSnapshot = await db.collection('projetos').where('clienteId', '==', effectiveClientId).get();
        const batch = db.batch();
        existingProjetosSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    for (const tipo of tiposProjetoSelecionados) {
        const projetoDetalhes = projetosParaSalvar[tipo];
        if (!projetoDetalhes) continue;

        const projetoDocData = {
            ...projetoDetalhes,
            clienteId: effectiveClientId,
            tipo: tipo,
            ultimaAtualizacao: Date.now()
        };
        if (!isEditing || !projetoDetalhes.dataCriacao) {
            projetoDocData.dataCriacao = Date.now();
        }

        await db.collection('projetos').add(projetoDocData);
    }

    clienteId = effectiveClientId; // Atualiza clienteId para processarArquivosListas

    // *** FIM DA CORREÇÃO LÓGICA PARA PROJETOS INDIVIDUAIS ***

    // 5. Processa os arquivos de listas
    await processarArquivosListas(
      effectiveClientId,
      tiposProjetoSelecionados,
      listasPersonalizadas
    );

    mostrarNotificacao("Cliente salvo com sucesso!", "success");
    const modalCadastro = bootstrap.Modal.getInstance(
      document.getElementById("modalCadastro")
    );
    modalCadastro.hide();
    carregarClientes();
  } catch (error) {
    console.error("Erro ao salvar cadastro:", error);
    mostrarNotificacao("Erro ao salvar cadastro. Tente novamente.", "danger");
  }
}

/**
 * Processa os arquivos de listas para cada tipo de projeto
 * * @param {string} clienteId - ID do cliente
 * @param {Array} tiposSelecionados - Tipos de projeto selecionados
 * @param {Array} listasPersonalizadas - Listas personalizadas para o tipo "Outros"
 * @returns {Promise} - Promise que resolve quando todos os arquivos forem processados
 */
function processarArquivosListas(
  clienteId, // Este é o effectiveClientId
  tiposSelecionados,
  listasPersonalizadas = []
) {
  const promessas = [];

  tiposSelecionados.forEach((tipo) => {
    const checkboxTerceirizado = document.getElementById(
      `${tipo.toLowerCase()}Terceirizado`
    );
    if (checkboxTerceirizado && checkboxTerceirizado.checked) {
      const inputChaves = document.getElementById(
        `listaChaves${tipo}Terceirizado`
      );
      if (inputChaves && inputChaves.files.length > 0) {
        // ATENÇÃO: processarArquivo precisa saber como encontrar o *documento específico do projeto*
        // para salvar os metadados do arquivo, não apenas o clienteId e tipo.
        // Ela pode precisar fazer uma query: db.collection('projetos').where('clienteId', '==', clienteId).where('tipo', '==', tipo).get()
        // e depois atualizar o primeiro documento encontrado (assumindo um projeto por tipo por cliente).
        // Ou, o ID do documento do projeto específico precisa ser passado para processarArquivo.
        console.warn(`processarArquivo para ${tipo} terceirizado precisa de lógica para encontrar/atualizar doc de projeto individual.`);
        const promessa = new Promise((resolve, reject) => {
          processarArquivo(inputChaves.files[0], clienteId, tipo, "LChaves")
            .then(resolve)
            .catch(reject);
        });
        promessas.push(promessa);
      }
      return;
    }

    let listas = [];
    switch (tipo) {
      case "PVC":
        listas = [
          { id: "listaChavesPVC", nome: "LChaves" }, { id: "listaPVC", nome: "LPVC" },
          { id: "listaReforco", nome: "LReforco" }, { id: "listaFerragens", nome: "LFerragens" },
          { id: "listaVidros", nome: "LVidros" }, { id: "listaEsteira", nome: "LEsteira" },
          { id: "listaMotor", nome: "LMotor" }, { id: "listaAcabamento", nome: "LAcabamento" },
          { id: "listaTelaRetratil", nome: "LTelaRetratil" }, { id: "listaAco", nome: "LAco" },
          { id: "listaOutrosPVC", nome: "LOutros" },
        ];
        break;
      case "Aluminio":
        listas = [
          { id: "listaChavesAluminio", nome: "LChaves" }, { id: "listaPerfil", nome: "LPerfil" },
          { id: "listaContraMarco", nome: "LContraMarco" }, { id: "listaFerragensAluminio", nome: "LFerragens" },
          { id: "listaVidroAluminio", nome: "LVidro" }, { id: "listaMotorAluminio", nome: "LMotor" },
          { id: "listaEsteiraAluminio", nome: "LEsteira" }, { id: "listaAcabamentoAluminio", nome: "LAcabamento" },
          { id: "listaTelaRetratilAluminio", nome: "LTelaRetratil" }, { id: "listaOutrosAluminio", nome: "LOutros" },
        ];
        break;
      case "Brise":
        listas = [
          { id: "listaChavesBrise", nome: "LChaves" }, { id: "listaPerfilBrise", nome: "LPerfil" },
          { id: "listaFerragensBrise", nome: "LFerragens" }, { id: "listaConexaoBrise", nome: "LConexao" },
          { id: "listaFechaduraEletronicaBrise", nome: "LFechaduraEletronica" }, { id: "listaOutrosBrise", nome: "LOutros" },
        ];
        break;
      case "ACM":
        listas = [
          { id: "listaChavesACM", nome: "LChaves" }, { id: "listaPerfilACM", nome: "LPerfil" },
          { id: "listaFerragensACM", nome: "LFerragens" }, { id: "listaConexaoACM", nome: "LConexao" },
          { id: "listaChapaACM", nome: "LChapaACM" }, { id: "listaFechaduraEletronicaACM", nome: "LFechaduraEletronica" },
          { id: "listaOutrosACM", nome: "LOutros" },
        ];
        break;
      case "Trilho":
        listas = [
          { id: "listaChavesTrilho", nome: "LChaves" }, { id: "listaPerfilTrilho", nome: "LPerfil" },
          { id: "listaOutrosTrilho", nome: "LOutros" },
        ];
        break;
      case "Outros":
        listas = [{ id: "listaChavesOutros", nome: "LChaves" }];
        break;
    }

    listas.forEach((lista) => {
      const inputFile = document.getElementById(lista.id);
      if (inputFile && inputFile.files.length > 0) {
        console.warn(`processarArquivo para ${tipo} - ${lista.nome} precisa de lógica para encontrar/atualizar doc de projeto individual.`);
        const promessa = new Promise((resolve, reject) => {
          processarArquivo(inputFile.files[0], clienteId, tipo, lista.nome)
            .then(resolve)
            .catch(reject);
        });
        promessas.push(promessa);
      }
    });

    if (tipo === "Outros" && listasPersonalizadas.length > 0) {
      listasPersonalizadas.forEach((lista) => {
        console.warn(`processarArquivo para Outros - ${lista.nome} precisa de lógica para encontrar/atualizar doc de projeto individual.`);
        const promessa = new Promise((resolve, reject) => {
          processarArquivo(lista.arquivo, clienteId, tipo, `L${lista.nome}`)
            .then(resolve)
            .catch(reject);
        });
        promessas.push(promessa);
      });
    }
  });

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
  document.getElementById("filtroStatus").value = "";
  carregarClientes();
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
 * Gera um ID único para novos registros
 * * @returns {string} - ID único
 */
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Formata uma data timestamp para o formato DD/MM/YYYY
 * * @param {number} timestamp - Timestamp da data
 * @returns {string} - Data formatada
 */
function formatarData(timestamp) {
  if (!timestamp) return "Data inválida"; // Adiciona verificação para timestamp nulo/undefined
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

  const container = document.querySelector("main.container"); // Mais específico para evitar problemas
  if (container) {
    container.insertBefore(notificacao, container.firstChild);
  } else {
    document.body.insertBefore(notificacao, document.body.firstChild); // Fallback
  }


  setTimeout(() => {
    notificacao.classList.remove("show");
    setTimeout(() => {
      if (notificacao.parentNode) { // Verifica se ainda está no DOM
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
