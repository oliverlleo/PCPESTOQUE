/**
 * cadastro.js
 * Lógica de cadastro usando APENAS Cloud Firestore
 * 
 * MIGRAÇÃO COMPLETA: Realtime Database removido completamente
 */

console.log('📝 cadastro.js carregado - FIRESTORE EXCLUSIVO');

// Aguarda o carregamento do DOM
document.addEventListener("DOMContentLoaded", function () {
  console.log('🚀 Inicializando página de cadastro...');
  
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
  console.log('📋 Configurando página de cadastro...');
  
  inicializarComponentes();
  carregarClientes();
  configurarEventListeners();
}

/**
 * Inicializar componentes da interface
 */
function inicializarComponentes() {
  // Inicializar datepickers
  flatpickr(".datepicker", {
    locale: "pt",
    dateFormat: "d/m/Y",
    allowInput: true,
  });

  // Inicializar selects com Select2
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
 * Configurar listeners de eventos
 */
function configurarEventListeners() {
  // Botão Novo Cadastro
  document.getElementById("btnNovoCadastro")?.addEventListener("click", novoCadastro);
  
  // Botão Salvar Cliente
  document.getElementById("btnSalvarCliente")?.addEventListener("click", salvarCliente);
  
  // Botão Adicionar Projeto
  document.getElementById("btnAdicionarProjeto")?.addEventListener("click", adicionarProjeto);
  
  // Filtros
  document.getElementById("filtroCliente")?.addEventListener("change", aplicarFiltros);
  document.getElementById("filtroStatus")?.addEventListener("change", aplicarFiltros);
  
  // Botão Limpar Filtros
  document.getElementById("btnLimparFiltros")?.addEventListener("click", limparFiltros);
}

/**
 * Carregar lista de clientes do Firestore
 */
async function carregarClientes() {
  try {
    console.log('📥 Carregando clientes do Firestore...');
    
    const clientes = await window.FirestoreAPI.buscarTodosClientes();
    
    console.log(`✅ ${clientes.length} clientes carregados`);
    
    // Atualizar select de filtros
    atualizarSelectClientes(clientes);
    
    // Exibir na tabela
    exibirClientesNaTabela(clientes);
    
  } catch (error) {
    console.error('❌ Erro ao carregar clientes:', error);
    mostrarNotificacao('Erro ao carregar clientes: ' + error.message, 'danger');
  }
}

/**
 * Atualizar select de clientes
 */
function atualizarSelectClientes(clientes) {
  const selectCliente = document.getElementById("filtroCliente");
  if (!selectCliente) return;
  
  // Limpar opções existentes (exceto a primeira)
  selectCliente.innerHTML = '<option value="">Todos os clientes</option>';
  
  // Adicionar clientes
  clientes.forEach(cliente => {
    const option = document.createElement("option");
    option.value = cliente.id;
    option.textContent = cliente.nome || cliente.id;
    selectCliente.appendChild(option);
  });
  
  // Atualizar Select2
  $("#filtroCliente").trigger('change');
}

/**
 * Exibir clientes na tabela
 */
function exibirClientesNaTabela(clientes) {
  const tbody = document.querySelector("#tabelaClientes tbody");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  if (clientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum cliente cadastrado</td></tr>';
    return;
  }
  
  clientes.forEach(cliente => {
    const row = document.createElement("tr");
    
    const statusCompras = cliente.StatusCompras || "Não iniciado";
    const statusClass = getStatusClass(statusCompras);
    
    row.innerHTML = `
      <td>${cliente.nome || 'N/A'}</td>
      <td><span class="badge ${statusClass}">${statusCompras}</span></td>
      <td>${formatarData(cliente.createdAt)}</td>
      <td>${formatarData(cliente.updatedAt)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editarCliente('${cliente.id}')">
          <i class="fas fa-edit"></i> Editar
        </button>
        <button class="btn btn-sm btn-info" onclick="verProjetos('${cliente.id}')">
          <i class="fas fa-eye"></i> Projetos
        </button>
        <button class="btn btn-sm btn-danger" onclick="excluirCliente('${cliente.id}')">
          <i class="fas fa-trash"></i> Excluir
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

/**
 * Obter classe CSS para status
 */
function getStatusClass(status) {
  switch (status) {
    case "Não iniciado": return "bg-secondary";
    case "Em andamento": return "bg-primary";
    case "Finalizado": return "bg-success";
    case "Aguardando": return "bg-warning";
    default: return "bg-secondary";
  }
}

/**
 * Formatar data para exibição
 */
function formatarData(timestamp) {
  if (!timestamp) return 'N/A';
  
  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }
  
  return date.toLocaleDateString('pt-BR');
}

/**
 * Novo cadastro - limpar formulário
 */
function novoCadastro() {
  console.log('📝 Iniciando novo cadastro...');
  
  // Limpar formulário
  document.getElementById("formCadastro")?.reset();
  
  // Limpar lista de projetos
  const listaProjetos = document.getElementById("listaProjetos");
  if (listaProjetos) {
    listaProjetos.innerHTML = "";
  }
  
  // Focar no campo nome
  document.getElementById("nomeCliente")?.focus();
  
  // Resetar ID do cliente (para indicar novo cadastro)
  window.clienteAtualId = null;
  
  mostrarNotificacao('Formulário limpo para novo cadastro', 'info');
}

/**
 * Salvar cliente no Firestore
 */
async function salvarCliente() {
  try {
    console.log('💾 Salvando cliente...');
    
    // Coletar dados do formulário
    const dadosCliente = coletarDadosFormulario();
    
    if (!dadosCliente) {
      return; // Validação falhou
    }
    
    // Verificar se é edição ou novo cadastro
    if (window.clienteAtualId) {
      // Atualizar cliente existente
      await window.FirestoreAPI.atualizarCliente(window.clienteAtualId, dadosCliente);
      console.log('✅ Cliente atualizado');
      mostrarNotificacao('Cliente atualizado com sucesso!', 'success');
    } else {
      // Criar novo cliente
      const clienteId = await window.FirestoreAPI.criarCliente(dadosCliente);
      console.log('✅ Cliente criado:', clienteId);
      mostrarNotificacao('Cliente cadastrado com sucesso!', 'success');
      
      // Definir ID atual para futuros updates
      window.clienteAtualId = clienteId;
    }
    
    // Salvar projetos se existirem
    await salvarProjetosCliente();
    
    // Recarregar lista de clientes
    await carregarClientes();
    
  } catch (error) {
    console.error('❌ Erro ao salvar cliente:', error);
    mostrarNotificacao('Erro ao salvar cliente: ' + error.message, 'danger');
  }
}

/**
 * Coletar dados do formulário
 */
function coletarDadosFormulario() {
  const nomeCliente = document.getElementById("nomeCliente")?.value?.trim();
  
  if (!nomeCliente) {
    mostrarNotificacao('Nome do cliente é obrigatório', 'warning');
    document.getElementById("nomeCliente")?.focus();
    return null;
  }
  
  return {
    nome: nomeCliente,
    StatusCompras: "Não iniciado"
  };
}

/**
 * Salvar projetos do cliente
 */
async function salvarProjetosCliente() {
  if (!window.clienteAtualId) return;
  
  const projetos = coletarProjetosFormulario();
  
  for (const projeto of projetos) {
    try {
      await window.FirestoreAPI.criarProjeto(window.clienteAtualId, projeto);
      console.log('✅ Projeto salvo:', projeto.tipo);
    } catch (error) {
      console.error('❌ Erro ao salvar projeto:', projeto.tipo, error);
    }
  }
}

/**
 * Coletar projetos do formulário
 */
function coletarProjetosFormulario() {
  const projetos = [];
  const listaProjetos = document.getElementById("listaProjetos");
  
  if (!listaProjetos) return projetos;
  
  const itensProjeto = listaProjetos.querySelectorAll(".projeto-item");
  
  itensProjeto.forEach(item => {
    const select = item.querySelector("select");
    if (select && select.value) {
      projetos.push({
        tipo: select.value,
        nome: select.options[select.selectedIndex].text
      });
    }
  });
  
  return projetos;
}

/**
 * Adicionar projeto à lista
 */
function adicionarProjeto() {
  console.log('➕ Adicionando projeto...');
  
  const listaProjetos = document.getElementById("listaProjetos");
  if (!listaProjetos) return;
  
  const projetoDiv = document.createElement("div");
  projetoDiv.className = "projeto-item mb-3 p-3 border rounded";
  
  projetoDiv.innerHTML = `
    <div class="row">
      <div class="col-md-10">
        <label class="form-label">Tipo de Projeto:</label>
        <select class="form-select" required>
          <option value="">Selecione o tipo de projeto</option>
          <option value="lm">Lista de Materiais (LM)</option>
          <option value="am">Auxiliar de Montagem (AM)</option>
          <option value="fm">Ferramental de Montagem (FM)</option>
          <option value="outro">Outro</option>
        </select>
      </div>
      <div class="col-md-2 d-flex align-items-end">
        <button type="button" class="btn btn-danger btn-sm" onclick="removerProjeto(this)">
          <i class="fas fa-trash"></i> Remover
        </button>
      </div>
    </div>
  `;
  
  listaProjetos.appendChild(projetoDiv);
  
  mostrarNotificacao('Projeto adicionado. Configure o tipo.', 'info');
}

/**
 * Remover projeto da lista
 */
function removerProjeto(button) {
  const projetoItem = button.closest(".projeto-item");
  if (projetoItem) {
    projetoItem.remove();
    mostrarNotificacao('Projeto removido', 'info');
  }
}

/**
 * Editar cliente
 */
async function editarCliente(clienteId) {
  try {
    console.log('✏️ Editando cliente:', clienteId);
    
    const cliente = await window.FirestoreAPI.buscarCliente(clienteId);
    
    if (!cliente) {
      mostrarNotificacao('Cliente não encontrado', 'danger');
      return;
    }
    
    // Preencher formulário
    document.getElementById("nomeCliente").value = cliente.nome || "";
    
    // Definir ID atual
    window.clienteAtualId = clienteId;
    
    // Carregar projetos do cliente
    await carregarProjetosCliente(clienteId);
    
    // Scroll para o formulário
    document.getElementById("formCadastro")?.scrollIntoView({ behavior: 'smooth' });
    
    mostrarNotificacao('Cliente carregado para edição', 'info');
    
  } catch (error) {
    console.error('❌ Erro ao editar cliente:', error);
    mostrarNotificacao('Erro ao carregar cliente: ' + error.message, 'danger');
  }
}

/**
 * Carregar projetos do cliente
 */
async function carregarProjetosCliente(clienteId) {
  try {
    const projetos = await window.FirestoreAPI.buscarProjetosCliente(clienteId);
    
    // Limpar lista atual
    const listaProjetos = document.getElementById("listaProjetos");
    if (listaProjetos) {
      listaProjetos.innerHTML = "";
    }
    
    // Adicionar projetos existentes
    projetos.forEach(projeto => {
      adicionarProjetoExistente(projeto);
    });
    
    console.log(`✅ ${projetos.length} projetos carregados`);
    
  } catch (error) {
    console.error('❌ Erro ao carregar projetos:', error);
  }
}

/**
 * Adicionar projeto existente à lista
 */
function adicionarProjetoExistente(projeto) {
  const listaProjetos = document.getElementById("listaProjetos");
  if (!listaProjetos) return;
  
  const projetoDiv = document.createElement("div");
  projetoDiv.className = "projeto-item mb-3 p-3 border rounded";
  
  projetoDiv.innerHTML = `
    <div class="row">
      <div class="col-md-10">
        <label class="form-label">Tipo de Projeto:</label>
        <select class="form-select" required>
          <option value="">Selecione o tipo de projeto</option>
          <option value="lm" ${projeto.tipo === 'lm' ? 'selected' : ''}>Lista de Materiais (LM)</option>
          <option value="am" ${projeto.tipo === 'am' ? 'selected' : ''}>Auxiliar de Montagem (AM)</option>
          <option value="fm" ${projeto.tipo === 'fm' ? 'selected' : ''}>Ferramental de Montagem (FM)</option>
          <option value="outro" ${projeto.tipo === 'outro' ? 'selected' : ''}>Outro</option>
        </select>
      </div>
      <div class="col-md-2 d-flex align-items-end">
        <button type="button" class="btn btn-danger btn-sm" onclick="removerProjeto(this)">
          <i class="fas fa-trash"></i> Remover
        </button>
      </div>
    </div>
  `;
  
  listaProjetos.appendChild(projetoDiv);
}

/**
 * Ver projetos do cliente
 */
async function verProjetos(clienteId) {
  try {
    console.log('👁️ Visualizando projetos do cliente:', clienteId);
    
    const cliente = await window.FirestoreAPI.buscarCliente(clienteId);
    const projetos = await window.FirestoreAPI.buscarProjetosCliente(clienteId);
    
    let conteudo = `
      <h5>Projetos do Cliente: ${cliente?.nome || 'N/A'}</h5>
      <hr>
    `;
    
    if (projetos.length === 0) {
      conteudo += '<p>Nenhum projeto cadastrado para este cliente.</p>';
    } else {
      conteudo += '<ul class="list-group">';
      projetos.forEach(projeto => {
        conteudo += `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${projeto.nome || projeto.tipo}</strong>
              <br>
              <small class="text-muted">Tipo: ${projeto.tipo}</small>
            </div>
            <span class="badge bg-primary rounded-pill">
              ${formatarData(projeto.createdAt)}
            </span>
          </li>
        `;
      });
      conteudo += '</ul>';
    }
    
    // Mostrar em modal (assumindo que existe um modal)
    mostrarModal('Projetos do Cliente', conteudo);
    
  } catch (error) {
    console.error('❌ Erro ao visualizar projetos:', error);
    mostrarNotificacao('Erro ao carregar projetos: ' + error.message, 'danger');
  }
}

/**
 * Excluir cliente
 */
async function excluirCliente(clienteId) {
  if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  try {
    console.log('🗑️ Excluindo cliente:', clienteId);
    
    // TODO: Implementar exclusão no Firestore
    // Note: Firestore não tem cascade delete automático
    // Seria necessário excluir manualmente projetos, listas e itens
    
    await window.collections.clientes.doc(clienteId).delete();
    
    console.log('✅ Cliente excluído');
    mostrarNotificacao('Cliente excluído com sucesso!', 'success');
    
    // Recarregar lista
    await carregarClientes();
    
  } catch (error) {
    console.error('❌ Erro ao excluir cliente:', error);
    mostrarNotificacao('Erro ao excluir cliente: ' + error.message, 'danger');
  }
}

/**
 * Aplicar filtros na tabela
 */
function aplicarFiltros() {
  const filtroCliente = document.getElementById("filtroCliente")?.value;
  const filtroStatus = document.getElementById("filtroStatus")?.value;
  
  console.log('🔍 Aplicando filtros:', { cliente: filtroCliente, status: filtroStatus });
  
  // Recarregar com filtros (implementação simplificada)
  carregarClientes();
}

/**
 * Limpar filtros
 */
function limparFiltros() {
  console.log('🧹 Limpando filtros...');
  
  document.getElementById("filtroCliente").value = "";
  document.getElementById("filtroStatus").value = "";
  
  // Atualizar Select2
  $("#filtroCliente").trigger('change');
  $("#filtroStatus").trigger('change');
  
  // Recarregar dados
  carregarClientes();
  
  mostrarNotificacao('Filtros limpos', 'info');
}

/**
 * Mostrar notificação
 */
function mostrarNotificacao(mensagem, tipo = 'info') {
  // Implementação depende do sistema de notificações do projeto
  console.log(`📢 ${tipo.toUpperCase()}: ${mensagem}`);
  
  // Se existir função global, usar
  if (typeof window.mostrarNotificacao === 'function') {
    window.mostrarNotificacao(mensagem, tipo);
  } else {
    // Fallback para alert
    alert(mensagem);
  }
}

/**
 * Mostrar modal
 */
function mostrarModal(titulo, conteudo) {
  // Implementação depende do sistema de modais do projeto
  console.log(`📱 Modal: ${titulo}`);
  
  // Se existir função global, usar
  if (typeof window.mostrarModal === 'function') {
    window.mostrarModal(titulo, conteudo);
  } else {
    // Fallback para alert
    alert(titulo + '\n\n' + conteudo.replace(/<[^>]*>/g, ''));
  }
}

console.log('✅ cadastro.js carregado - FIRESTORE EXCLUSIVO');