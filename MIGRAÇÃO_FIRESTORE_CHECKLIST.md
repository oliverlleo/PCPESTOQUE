# 📋 CHECKLIST: Migração Firebase Realtime Database → Cloud Firestore

## 🎯 Objetivo
Executar uma migração completa e robusta da aplicação OSCOMPRAS do Firebase Realtime Database para o Cloud Firestore.

---

## 📊 PARTE 1: ARQUITETURA DE DADOS DEFINITIVA NO FIRESTORE

### ✅ Estrutura Primária
- [x] **Definir estrutura `clientes/`**
  - [x] Documento `{clienteId}/` com dados do cliente
  - [x] Sub-coleção `projetos/` com documentos `{projetoId}/`
  - [x] Sub-coleção `listas/` com documentos `{listaId}/`
  - [x] Sub-coleção `itens/` com documentos `{itemId}/`

- [x] **Implementar campos desnormalizados cruciais**
  - [x] `clienteId` em cada item
  - [x] `projetoId` em cada item
  - [x] `listaId` em cada item
  - [x] Campo `status` como coração do fluxo de trabalho

### ✅ Coleções de Processos (Raiz)
- [x] **Estrutura `SeparacaoProd/`**
  - [x] Documento `{clienteId}/`
  - [x] Sub-coleção `projetos/` → `{projetoId}/`
  - [x] Sub-coleção `listas/` → `{listaId}/`
  - [x] Sub-coleção `itensSeparados/` → `{itemSeparadoId}/`

- [x] **Estrutura `CorrecaoFinal/`**
  - [x] Documento `{clienteId}/`
  - [x] Sub-coleção `projetos/` → `{projetoId}/`
  - [x] Sub-coleção `listas/` → `{listaId}/`
  - [x] Sub-coleção `itensParaCorrecao/` → `{itemCorrigidoId}/`

- [x] **Coleções auxiliares**
  - [x] `fornecedores/` → `{fornecedorId}/`
  - [x] `usuarios/` → `{usuarioId}/`

---

## 🔄 PARTE 2: LÓGICA DE MIGRAÇÃO POR FLUXO DE TRABALHO

### ✅ Fluxo 1: Ingestão e Processamento de Listas (Upload)
**Arquivos:** `processamento-arquivos.js`, `processamento-arquivos-compras.js`, `processamento-arquivos-tratamento.js`

- [x] **Refatorar função `salvarItensNoFirebase`**
  - [x] Implementar `db.batch()` para escritas em lote
  - [x] Criar referências para novos documentos na sub-coleção `itens`
  - [x] Enriquecer objetos `item` com IDs desnormalizados
  - [x] Adicionar operações ao batch com `batch.set(itemRef, item)`
  - [x] Implementar `await batch.commit()` ao final
  - [x] Adicionar criação automática da estrutura pai
  - [x] Implementar controle de batch size (500 itens)

- [ ] **Testes do Fluxo 1**
  - [ ] Testar upload de arquivo CSV
  - [ ] Testar upload de arquivo Excel
  - [ ] Verificar atomicidade das operações
  - [ ] Confirmar desnormalização correta dos IDs

### ✅ Fluxo 2: Compras e Empenho
**Arquivos:** `compras.js`, `empenho.js`

- [x] **Refatorar função `carregarItensParaCompra`**
  - [x] Implementar consulta com `db.collectionGroup('itens')`
  - [x] Usar `.where('status', '==', 'Aguardando Compra')`
  - [x] Adicionar filtros adicionais (cliente, projeto)
  - [x] Remover loops aninhados `forEach`
  - [x] Converter para async/await

- [x] **Refatorar função `confirmarCompra`**
  - [x] Armazenar path completo em atributos `data-*` no HTML
  - [x] Implementar atualização atômica com `db.doc(itemPath).update()`
  - [x] Atualizar status para 'Comprado'
  - [x] Adicionar campos adicionais: fornecedor, prazoEntrega, dataCompra
  - [x] Implementar tratamento de erros robusto

- [ ] **Refatorar função `empenharItem`**
  - [ ] Implementar lógica similar ao `confirmarCompra`
  - [ ] Atualizar campo `empenhado: true`

- [ ] **Testes do Fluxo 2**
  - [ ] Testar carregamento de itens para compra
  - [ ] Testar confirmação de compra
  - [ ] Testar empenho de materiais
  - [ ] Verificar atualizações atômicas

### ✅ Fluxo 3: Recebimento de Materiais (Multi-etapas)
**Arquivos:** `recebimento.js`, `recebimento-selecao.js`, `validacao-recebimento.js`, `recebimento_corrigido.js`

- [ ] **Refatorar carregamento de itens para recebimento**
  - [ ] Usar `collectionGroup('itens').where('status', 'in', ['Comprado', 'Recebido Parcialmente'])`
  - [ ] Implementar carregamento sob demanda

- [ ] **Refatorar validação (`validacao-recebimento.js`)**
  - [ ] Manter lógica de validação no cliente
  - [ ] Adaptar fonte de dados para consultas Firestore
  - [ ] Comparar quantidade recebida com comprada

- [ ] **Refatorar atualização de status**
  - [ ] Implementar atualização de documento individual
  - [ ] Usar `firebase.firestore.FieldValue.increment()` para quantidades
  - [ ] Garantir atomicidade para recebimentos parciais

- [ ] **Refatorar dashboard (`recebimento-dashboard.js`)**
  - [ ] Implementar consultas agregadas para cada status
  - [ ] Usar `.count()` ou `.get().then(snap => snap.size)`
  - [ ] Otimizar carregamento do dashboard

- [ ] **Testes do Fluxo 3**
  - [ ] Testar carregamento de itens para recebimento
  - [ ] Testar validação de recebimento
  - [ ] Testar recebimento parcial
  - [ ] Testar dashboard de recebimento

### ✅ Fluxo 4: Separação e Correção (Lógica de Negócio Chave)
**Arquivo:** `separacao.js`

- [ ] **Refatorar leitura da Lista Original**
  - [ ] Implementar `db.collection('clientes/.../listas/{id}/itens').get()`

- [ ] **Refatorar leitura da Separação**
  - [ ] Implementar `db.collection('SeparacaoProd/.../listas/{id}/itensSeparados').get()`

- [ ] **Manter lógica de comparação**
  - [ ] Adaptar para operar sobre `originaisSnap.docs` e `separadosSnap.docs`
  - [ ] Manter funções `forEach`, `find`, etc.

- [ ] **Refatorar escrita da Correção**
  - [ ] Usar `batch write` para salvar divergências
  - [ ] Garantir atomicidade de todas as correções
  - [ ] Salvar na coleção `CorrecaoFinal`

- [ ] **Testes do Fluxo 4**
  - [ ] Testar leitura de listas originais
  - [ ] Testar leitura de separação
  - [ ] Testar comparação e identificação de divergências
  - [ ] Testar salvamento atômico de correções

### ✅ Fluxo 5: Utilitários e Helpers
**Arquivos:** `filtros-fix.js`, `filtro-cliente-fix.js`, `funcoes-corrigidas.js`, `global.js`, `calendario-fix.js`

- [ ] **Refatorar lógica de filtragem**
  - [ ] Mover filtros para o servidor (consultas Firestore)
  - [ ] Construir consultas dinâmicas baseadas na UI
  - [ ] Remover funções `filtrarArray(array, filtro)`

- [ ] **Refatorar funções globais (`global.js`)**
  - [ ] Adaptar funções para lidar com `doc.data()`
  - [ ] Substituir `snapshot.val()` por arrays de `doc.data()`

- [ ] **Refatorar calendário (`calendario-fix.js`)**
  - [ ] Usar consultas para fonte de dados do calendário
  - [ ] Implementar filtros por data: `dataRecebimentoPrevista >= inicioDoMes`

- [ ] **Testes do Fluxo 5**
  - [ ] Testar filtros dinâmicos
  - [ ] Testar funções globais adaptadas
  - [ ] Testar funcionalidade do calendário

---

## 🎨 PARTE 3: LÓGICAS ESPECÍFICAS E DE UI

### ✅ Fluxo 6: Visualização de Dados e Navegação (`visualizacao.js`)
- [ ] **Implementar carregamento progressivo**
  - [ ] Carregar apenas lista de clientes inicialmente: `db.collection('clientes').get()`
  - [ ] Carregar projetos sob demanda: `db.collection('clientes').doc(clienteId).collection('projetos').get()`
  - [ ] Carregar listas sob demanda ao clicar em projeto
  - [ ] Carregar itens sob demanda ao clicar em lista

- [ ] **Atualizar UI progressivamente**
  - [ ] Implementar indicadores de carregamento
  - [ ] Atualizar interface a cada etapa de carregamento

- [ ] **Testes do Fluxo 6**
  - [ ] Testar carregamento progressivo de clientes
  - [ ] Testar carregamento de projetos sob demanda
  - [ ] Testar navegação responsiva

### ✅ Fluxo 7: Tratamento de Dados (`tratamento-dados.js`)
- [ ] **Implementar consulta específica**
  - [ ] Usar `db.collectionGroup('itens').where('status', '==', 'Aguardando Tratamento')`

- [ ] **Implementar atualização atômica**
  - [ ] Usar `db.doc(itemPath).update({ status: 'Tratado' })`

- [ ] **Testes do Fluxo 7**
  - [ ] Testar busca de itens aguardando tratamento
  - [ ] Testar atualização de status

### ✅ Fluxo 8: Lógica de Garantia e Colunas Dinâmicas (`colunas-garantia.js`)
- [ ] **Adaptar fonte de dados**
  - [ ] Receber objeto `itemData` de `doc.data()`
  - [ ] Manter lógica de renderização HTML
  - [ ] Adaptar verificação `itemData.hasOwnProperty('garantia')`

- [ ] **Testes do Fluxo 8**
  - [ ] Testar criação dinâmica de colunas
  - [ ] Verificar renderização correta

### ✅ Fluxo 9: Inicialização de Selects e Componentes (`selector-init.js`)
- [ ] **Refatorar população de dropdowns**
  - [ ] Substituir `firebase.database().ref('clientes').once('value')` por `db.collection('clientes').get()`
  - [ ] Adaptar iteração: `snapshot.forEach(doc => ...)`
  - [ ] Usar `doc.id` e `doc.data().nome` para popular seletores

- [ ] **Testes do Fluxo 9**
  - [ ] Testar população de dropdown de clientes
  - [ ] Testar população de dropdown de fornecedores

---

## 🚀 PARTE 4: ESTRATÉGIA DE IMPLEMENTAÇÃO

### ✅ Passo 0: Backup
- [ ] **Fazer backup completo do Realtime Database**
  - [ ] Exportar dados via Console Firebase
  - [ ] Salvar backup local
  - [ ] Verificar integridade do backup

### ✅ Passo 1: Script de Migração de Dados
- [ ] **Criar script Node.js separado**
  - [ ] Configurar conexão com Realtime Database
  - [ ] Configurar conexão com Firestore
  - [ ] Implementar leitura completa da árvore do Realtime DB
  - [ ] Implementar conversão da estrutura de dados
  - [ ] Usar `batch writes` para recriar estrutura no Firestore
  - [ ] Executar e verificar migração

### ✅ Passo 2: Configuração da Aplicação
- [x] **Atualizar `firebase-config.js`**
  - [x] Substituir `firebase.database()` por `firebase.firestore()`
  - [x] Atualizar imports necessários
  - [x] Implementar funções utilitárias (FirestoreUtils)
  - [x] Manter compatibilidade com código existente
  - [x] Configurar persistência offline
  - [x] Criar arquivo de teste (`firestore-migration-test.js`)

### ✅ Passo 3: Refatoração por Módulo
- [ ] **Começar pelo Fluxo 1 (Ingestão) - PRIORITÁRIO**
  - [ ] Refatorar `processamento-arquivos.js`
  - [ ] Implementar `batch writes`
  - [ ] Testar isoladamente

- [ ] **Continuar com Fluxo 2 (Compras)**
  - [ ] Refatorar tela de compras
  - [ ] Implementar `collectionGroup` para leitura
  - [ ] Implementar `update()` individual para escrita
  - [ ] Testar exaustivamente

- [ ] **Seguir para outros fluxos sequencialmente**
  - [ ] Recebimento
  - [ ] Separação
  - [ ] Demais fluxos
  - [ ] Testar cada um antes de prosseguir

### ✅ Passo 4: Criar Índices no Console Firebase
- [ ] **Executar consultas em ambiente de teste**
  - [ ] Coletar erros de índices no console
  - [ ] Clicar nos links para criar índices compostos
  - [ ] Aguardar criação dos índices
  - [ ] Testar novamente

---

## 🔒 PARTE 5: TÓPICOS AVANÇADOS E LÓGICAS CRÍTICAS

### ✅ Fluxo 10: Atualizações em Tempo Real (Listeners)
- [ ] **Implementar `onSnapshot` para telas reativas**
  - [ ] Dashboard (`recebimento-dashboard.js`)
  - [ ] Lista de itens (`compras.js`)
  - [ ] Outras telas que precisam de reatividade

- [ ] **Gerenciar listeners**
  - [ ] Guardar função `unsubscribe`
  - [ ] Chamar `unsubscribe` ao sair da página
  - [ ] Prevenir memory leaks

- [ ] **Testes do Fluxo 10**
  - [ ] Testar atualizações em tempo real
  - [ ] Verificar sincronização entre usuários
  - [ ] Testar gerenciamento de listeners

### ✅ Fluxo 11: Garantindo Integridade com Transações
- [ ] **Implementar transações para operações críticas**
  - [ ] Refatorar `separacao.js` com `db.runTransaction()`
  - [ ] Implementar leitura-modificação-escrita atômica
  - [ ] Tratar re-execução automática da transação

- [ ] **Implementar tratamento de erros de transação**
  - [ ] Usar try/catch para transações
  - [ ] Log de erros detalhado
  - [ ] Feedback ao usuário em caso de falha

- [ ] **Testes do Fluxo 11**
  - [ ] Testar transações em condições normais
  - [ ] Testar comportamento com dados concorrentes
  - [ ] Verificar atomicidade das operações

### ✅ Fluxo 12: Autenticação e Regras de Segurança
- [ ] **Configurar Security Rules (`firestore.rules`)**
  - [ ] Definir regras para coleção `clientes/`
  - [ ] Definir regras para coleção `usuarios/`
  - [ ] Definir regras para sub-coleções
  - [ ] Implementar autenticação obrigatória

- [ ] **Testar regras de segurança**
  - [ ] Testar acesso com usuário logado
  - [ ] Testar bloqueio de acesso não autorizado
  - [ ] Verificar funcionamento das regras

### ✅ Fluxo 13: Tratamento de Erros e Feedback ao Usuário
- [ ] **Implementar try/catch em todas as operações Firestore**
  - [ ] Operações `.get()`
  - [ ] Operações `.update()`
  - [ ] Operações `.set()`
  - [ ] Transações

- [ ] **Implementar feedback visual**
  - [ ] Spinner/loading durante operações
  - [ ] Mensagens de sucesso (toasts)
  - [ ] Mensagens de erro (alerts)
  - [ ] Estados de carregamento na UI

- [ ] **Testes do Fluxo 13**
  - [ ] Testar tratamento de erros offline
  - [ ] Testar feedback de sucesso
  - [ ] Testar feedback de erro

---

## 📝 RESUMO DE PROGRESSO

### ✅ Concluído
- ✅ Checklist detalhado criado
- ✅ Estrutura de migração definida
- ✅ Arquivo `firestore-config.js` criado
- ✅ Script de migração `migration-script.js` criado
- ✅ Regras de segurança `firestore.rules` definidas
- ✅ Documentação atualizada no `YOUWARE.md`
- ✅ Estrutura de arquivos atualizada no visualizador de código

### 🔄 Em Andamento
- [ ] Aguardando início da implementação dos fluxos

### ⏳ Pendente
- [ ] Todos os fluxos de migração (implementação)

---

## 📋 NOTAS IMPORTANTES

1. **Ordem de Prioridade:** Começar sempre pelo Fluxo 1 (Ingestão) por ser o mais isolado
2. **Testes:** Testar exaustivamente cada fluxo antes de prosseguir para o próximo
3. **Backup:** Manter backup sempre disponível durante toda a migração
4. **Rollback:** Ter plano de rollback para cada etapa implementada
5. **Performance:** Monitorar performance após cada implementação
6. **Índices:** Criar índices conforme necessário durante os testes

---

**Status Geral da Migração: 0% Concluído**

**Próximo Passo:** Fazer backup do Realtime Database e criar script de migração de dados.