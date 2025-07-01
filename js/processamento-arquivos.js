/**
 * processamento-arquivos.js
 * Funções para processamento de arquivos usando APENAS Cloud Firestore
 * 
 * MIGRAÇÃO COMPLETA: Realtime Database removido completamente
 */

console.log('📄 processamento-arquivos.js carregado - FIRESTORE EXCLUSIVO');

/**
 * Processar arquivo (CSV, XLSX, XML) e extrair dados
 */
function processarArquivo(arquivo, clienteId, tipoProjeto, nomeLista) {
  return new Promise((resolve, reject) => {
    if (!arquivo) {
      return reject(new Error("Nenhum arquivo fornecido"));
    }

    const tipoArquivo = obterTipoArquivo(arquivo.name);
    if (!tipoArquivo) {
      return reject(new Error(`Formato não suportado: ${arquivo.name.split(".").pop()}`));
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        let dados = [];
        const conteudo = e.target.result;

        switch (tipoArquivo) {
          case "csv":
            dados = processarCSV(conteudo);
            break;
          case "xlsx":
            dados = processarXLSX(conteudo);
            break;
          case "xml":
            dados = processarXML(conteudo);
            break;
          default:
            throw new Error(`Tipo de arquivo não implementado: ${tipoArquivo}`);
        }

        if (dados.length === 0) {
          throw new Error("Nenhum dado válido encontrado no arquivo");
        }

        console.log(`✅ ${dados.length} itens processados do arquivo`);

        // Normalizar dados para o Firestore
        const itensNormalizados = normalizarDados(dados, clienteId, tipoProjeto, nomeLista);

        resolve({
          sucesso: true,
          dados: itensNormalizados,
          totalItens: itensNormalizados.length,
          arquivo: arquivo.name,
          tipo: tipoArquivo
        });

      } catch (error) {
        console.error('❌ Erro ao processar arquivo:', error);
        reject(error);
      }
    };

    reader.onerror = function () {
      reject(new Error("Erro ao ler o arquivo"));
    };

    // Ler arquivo baseado no tipo
    if (tipoArquivo === "xlsx") {
      reader.readAsArrayBuffer(arquivo);
    } else {
      reader.readAsText(arquivo, 'UTF-8');
    }
  });
}

/**
 * Obter tipo do arquivo
 */
function obterTipoArquivo(nomeArquivo) {
  const extensao = nomeArquivo.split(".").pop().toLowerCase();
  
  switch (extensao) {
    case "csv":
      return "csv";
    case "xlsx":
    case "xls":
      return "xlsx";
    case "xml":
      return "xml";
    default:
      return null;
  }
}

/**
 * Processar arquivo CSV
 */
function processarCSV(conteudo) {
  console.log('📊 Processando arquivo CSV...');
  
  const linhas = conteudo.split('\n');
  if (linhas.length < 2) {
    throw new Error("Arquivo CSV deve ter pelo menos 2 linhas (cabeçalho + dados)");
  }

  // Detectar separador
  const separador = detectarSeparadorCSV(linhas[0]);
  
  // Processar cabeçalho
  const cabecalho = linhas[0].split(separador).map(col => col.trim().replace(/['"]/g, ''));
  
  // Identificar colunas importantes
  const mapeamentoColunas = identificarColunas(cabecalho);
  
  const dados = [];
  
  // Processar linhas de dados
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    
    const valores = linha.split(separador).map(val => val.trim().replace(/['"]/g, ''));
    
    const item = extrairDadosLinha(valores, mapeamentoColunas, cabecalho);
    if (item.codigo || item.descricao) {
      dados.push(item);
    }
  }
  
  console.log(`✅ CSV processado: ${dados.length} itens`);
  return dados;
}

/**
 * Processar arquivo XLSX
 */
function processarXLSX(arrayBuffer) {
  console.log('📊 Processando arquivo XLSX...');
  
  if (typeof XLSX === 'undefined') {
    throw new Error("Biblioteca XLSX não está carregada");
  }
  
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const primeiraAba = workbook.SheetNames[0];
  const planilha = workbook.Sheets[primeiraAba];
  
  // Converter para JSON
  const jsonData = XLSX.utils.sheet_to_json(planilha, { header: 1, raw: false });
  
  if (jsonData.length < 2) {
    throw new Error("Planilha deve ter pelo menos 2 linhas (cabeçalho + dados)");
  }
  
  // Processar cabeçalho
  const cabecalho = jsonData[0].map(col => (col || '').toString().trim());
  
  // Identificar colunas importantes
  const mapeamentoColunas = identificarColunas(cabecalho);
  
  const dados = [];
  
  // Processar linhas de dados
  for (let i = 1; i < jsonData.length; i++) {
    const linha = jsonData[i];
    if (!linha || linha.length === 0) continue;
    
    const valores = linha.map(val => (val || '').toString().trim());
    
    const item = extrairDadosLinha(valores, mapeamentoColunas, cabecalho);
    if (item.codigo || item.descricao) {
      dados.push(item);
    }
  }
  
  console.log(`✅ XLSX processado: ${dados.length} itens`);
  return dados;
}

/**
 * Processar arquivo XML
 */
function processarXML(conteudo) {
  console.log('📊 Processando arquivo XML...');
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(conteudo, "text/xml");
  
  // Verificar erros de parsing
  const parserError = xmlDoc.getElementsByTagName("parsererror");
  if (parserError.length > 0) {
    throw new Error("Erro ao analisar XML: formato inválido");
  }
  
  const dados = [];
  
  // Tentar diferentes estruturas XML comuns
  const elementos = xmlDoc.getElementsByTagName("item") || 
                   xmlDoc.getElementsByTagName("produto") || 
                   xmlDoc.getElementsByTagName("material") ||
                   xmlDoc.getElementsByTagName("row");
  
  if (elementos.length === 0) {
    throw new Error("Nenhum elemento de dados encontrado no XML");
  }
  
  for (let i = 0; i < elementos.length; i++) {
    const elemento = elementos[i];
    
    const item = {
      codigo: obterTextoElemento(elemento, ['codigo', 'id', 'ref', 'referencia']),
      descricao: obterTextoElemento(elemento, ['descricao', 'nome', 'produto', 'material']),
      quantidade: parseFloat(obterTextoElemento(elemento, ['quantidade', 'qtd', 'qty'])) || 1,
      unidade: obterTextoElemento(elemento, ['unidade', 'un', 'unit']),
      observacoes: obterTextoElemento(elemento, ['observacoes', 'obs', 'notas'])
    };
    
    if (item.codigo || item.descricao) {
      dados.push(item);
    }
  }
  
  console.log(`✅ XML processado: ${dados.length} itens`);
  return dados;
}

/**
 * Obter texto de elemento XML
 */
function obterTextoElemento(elemento, nomePossiveis) {
  for (const nome of nomePossiveis) {
    const child = elemento.getElementsByTagName(nome)[0];
    if (child && child.textContent) {
      return child.textContent.trim();
    }
    
    // Tentar como atributo
    const atributo = elemento.getAttribute(nome);
    if (atributo) {
      return atributo.trim();
    }
  }
  return '';
}

/**
 * Detectar separador CSV
 */
function detectarSeparadorCSV(linhaCabecalho) {
  const separadores = [';', ',', '\t', '|'];
  let melhorSeparador = ';';
  let maiorContagem = 0;
  
  for (const sep of separadores) {
    const contagem = (linhaCabecalho.match(new RegExp(`\\${sep}`, 'g')) || []).length;
    if (contagem > maiorContagem) {
      maiorContagem = contagem;
      melhorSeparador = sep;
    }
  }
  
  return melhorSeparador;
}

/**
 * Identificar colunas importantes
 */
function identificarColunas(cabecalho) {
  const mapeamento = {
    codigo: -1,
    descricao: -1,
    quantidade: -1,
    unidade: -1,
    observacoes: -1
  };
  
  cabecalho.forEach((coluna, index) => {
    const colunaLower = coluna.toLowerCase();
    
    // Identificar código (incluindo DOC)
    if (colunaLower.includes('codigo') || colunaLower.includes('doc') || 
        colunaLower.includes('ref') || colunaLower.includes('id')) {
      mapeamento.codigo = index;
    }
    
    // Identificar descrição
    else if (colunaLower.includes('descricao') || colunaLower.includes('nome') || 
             colunaLower.includes('produto') || colunaLower.includes('material')) {
      mapeamento.descricao = index;
    }
    
    // Identificar quantidade
    else if (colunaLower.includes('quantidade') || colunaLower.includes('qtd') || 
             colunaLower.includes('qty')) {
      mapeamento.quantidade = index;
    }
    
    // Identificar unidade
    else if (colunaLower.includes('unidade') || colunaLower.includes('un') || 
             colunaLower.includes('unit')) {
      mapeamento.unidade = index;
    }
    
    // Identificar observações
    else if (colunaLower.includes('observ') || colunaLower.includes('obs') || 
             colunaLower.includes('nota')) {
      mapeamento.observacoes = index;
    }
  });
  
  console.log('🗂️ Mapeamento de colunas:', mapeamento);
  return mapeamento;
}

/**
 * Extrair dados de uma linha
 */
function extrairDadosLinha(valores, mapeamento, cabecalho) {
  const item = {};
  
  // Extrair valores mapeados
  if (mapeamento.codigo >= 0 && valores[mapeamento.codigo]) {
    item.codigo = valores[mapeamento.codigo];
  }
  
  if (mapeamento.descricao >= 0 && valores[mapeamento.descricao]) {
    item.descricao = valores[mapeamento.descricao];
  }
  
  if (mapeamento.quantidade >= 0 && valores[mapeamento.quantidade]) {
    item.quantidade = parseFloat(valores[mapeamento.quantidade]) || 1;
  } else {
    item.quantidade = 1;
  }
  
  if (mapeamento.unidade >= 0 && valores[mapeamento.unidade]) {
    item.unidade = valores[mapeamento.unidade];
  }
  
  if (mapeamento.observacoes >= 0 && valores[mapeamento.observacoes]) {
    item.observacoes = valores[mapeamento.observacoes];
  }
  
  // Adicionar colunas extras como metadados
  item.dadosOriginais = {};
  cabecalho.forEach((coluna, index) => {
    if (valores[index] && valores[index].trim()) {
      item.dadosOriginais[coluna] = valores[index];
    }
  });
  
  return item;
}

/**
 * Normalizar dados para o Firestore
 */
function normalizarDados(dados, clienteId, tipoProjeto, nomeLista) {
  console.log('🔄 Normalizando dados para Firestore...');
  
  return dados.map((item, index) => {
    return {
      // Dados principais
      codigo: item.codigo || `AUTO_${Date.now()}_${index}`,
      descricao: item.descricao || 'Descrição não informada',
      quantidade: item.quantidade || 1,
      unidade: item.unidade || 'UN',
      observacoes: item.observacoes || '',
      
      // Status de controle
      status: 'Aguardando Compra',
      statusCompra: 'Aguardando Compra',
      statusRecebimento: 'Aguardando',
      statusSeparacao: 'Aguardando',
      
      // Informações de origem
      clienteId: clienteId,
      tipoProjeto: tipoProjeto,
      nomeLista: nomeLista,
      
      // Dados de compra (vazios inicialmente)
      fornecedor: '',
      valorUnitario: 0,
      quantidadeComprada: 0,
      dataCompra: '',
      prazoEntrega: '',
      
      // Dados de recebimento (vazios inicialmente)
      quantidadeRecebida: 0,
      dataRecebimento: '',
      localEstoque: '',
      
      // Metadados
      dadosOriginais: item.dadosOriginais || {},
      indiceOriginal: index,
      
      // Timestamps (serão adicionados pelo Firestore)
      createdAt: null,
      updatedAt: null
    };
  });
}

/**
 * Salvar itens no Firestore usando batch
 */
async function salvarItensNoFirebase(itens, clienteId, tipoProjeto, nomeLista) {
  try {
    console.log(`💾 Salvando ${itens.length} itens no Firestore...`);
    
    if (!window.db) {
      throw new Error('Firestore não está inicializado');
    }
    
    if (!clienteId || !tipoProjeto || !nomeLista) {
      throw new Error('Parâmetros obrigatórios não fornecidos');
    }
    
    // Verificar se cliente existe
    const cliente = await window.FirestoreAPI.buscarCliente(clienteId);
    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }
    
    // Criar projeto se não existir
    let projetoId = tipoProjeto;
    const projetos = await window.FirestoreAPI.buscarProjetosCliente(clienteId);
    const projetoExistente = projetos.find(p => p.tipo === tipoProjeto);
    
    if (!projetoExistente) {
      projetoId = await window.FirestoreAPI.criarProjeto(clienteId, {
        tipo: tipoProjeto,
        nome: `Projeto ${tipoProjeto}`
      });
      console.log('✅ Projeto criado:', projetoId);
    } else {
      projetoId = projetoExistente.id;
    }
    
    // Criar lista se não existir
    let listaId = nomeLista;
    // Por simplicidade, sempre criar nova lista com timestamp
    listaId = await window.FirestoreAPI.criarLista(clienteId, projetoId, {
      nome: nomeLista,
      totalItens: itens.length,
      arquivo: `Upload_${new Date().toISOString().split('T')[0]}`
    });
    console.log('✅ Lista criada:', listaId);
    
    // Salvar itens em lote
    await window.FirestoreAPI.salvarItensLote(clienteId, projetoId, listaId, itens);
    
    console.log('✅ Todos os itens foram salvos no Firestore');
    
    return {
      sucesso: true,
      clienteId: clienteId,
      projetoId: projetoId,
      listaId: listaId,
      totalItens: itens.length,
      mensagem: `${itens.length} itens salvos com sucesso!`
    };
    
  } catch (error) {
    console.error('❌ Erro ao salvar itens:', error);
    throw error;
  }
}

/**
 * Validar arquivo antes do processamento
 */
function validarArquivo(arquivo, tamanhoMaxMB = 10) {
  if (!arquivo) {
    throw new Error('Nenhum arquivo selecionado');
  }
  
  // Verificar tamanho
  const tamanhoMB = arquivo.size / (1024 * 1024);
  if (tamanhoMB > tamanhoMaxMB) {
    throw new Error(`Arquivo muito grande. Máximo: ${tamanhoMaxMB}MB`);
  }
  
  // Verificar tipo
  const tipoArquivo = obterTipoArquivo(arquivo.name);
  if (!tipoArquivo) {
    throw new Error('Formato de arquivo não suportado. Use CSV, XLSX ou XML');
  }
  
  return true;
}

/**
 * Processar e salvar arquivo completo
 */
async function processarESalvarArquivo(arquivo, clienteId, tipoProjeto, nomeLista, callback) {
  try {
    console.log('🚀 Iniciando processamento completo do arquivo...');
    
    // Validar arquivo
    validarArquivo(arquivo);
    
    // Callback de progresso
    if (callback) callback({ etapa: 'validacao', mensagem: 'Arquivo validado' });
    
    // Processar arquivo
    if (callback) callback({ etapa: 'processamento', mensagem: 'Processando arquivo...' });
    const resultado = await processarArquivo(arquivo, clienteId, tipoProjeto, nomeLista);
    
    if (callback) callback({ 
      etapa: 'processamento', 
      mensagem: `${resultado.totalItens} itens processados` 
    });
    
    // Salvar no Firestore
    if (callback) callback({ etapa: 'salvamento', mensagem: 'Salvando no banco de dados...' });
    const resultadoSalvamento = await salvarItensNoFirebase(
      resultado.dados, 
      clienteId, 
      tipoProjeto, 
      nomeLista
    );
    
    if (callback) callback({ 
      etapa: 'concluido', 
      mensagem: resultadoSalvamento.mensagem,
      dados: resultadoSalvamento
    });
    
    console.log('🎉 Processamento completo finalizado!');
    return resultadoSalvamento;
    
  } catch (error) {
    console.error('❌ Erro no processamento completo:', error);
    
    if (callback) callback({ 
      etapa: 'erro', 
      mensagem: error.message,
      erro: error
    });
    
    throw error;
  }
}

// Disponibilizar funções globalmente
window.processarArquivo = processarArquivo;
window.salvarItensNoFirebase = salvarItensNoFirebase;
window.processarESalvarArquivo = processarESalvarArquivo;
window.validarArquivo = validarArquivo;

console.log('✅ processamento-arquivos.js carregado - FIRESTORE EXCLUSIVO');