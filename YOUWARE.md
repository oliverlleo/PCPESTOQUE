# Sistema de Controle de Compras e Recebimento

## Estrutura do Projeto

O projeto é um sistema web para controle de compras e recebimento de materiais, com as seguintes funcionalidades principais:

- Cadastro de clientes e projetos
- Tratamento de dados
- Processamento de compras
- Recebimento de materiais
- Empenho de materiais
- Separação de itens

### Tecnologias Utilizadas

- HTML5, CSS3, JavaScript (Frontend puro)
- Bootstrap 5 (Framework CSS)
- Font Awesome (Ícones)
- Firebase Realtime Database (Backend)
- JSZip e FileSaver.js (Para funcionalidade de download de código)
- Highlight.js (Para coloração de sintaxe no visualizador de código)

## Novas Funcionalidades

### Visualizador de Código-Fonte

Foi adicionada uma nova funcionalidade que permite aos usuários visualizar e baixar o código-fonte completo do sistema:

- **Página**: `codigo-fonte.html`
- **Scripts**: 
  - `js/codigo-fonte/file-system.js` - Mapeamento da estrutura de arquivos
  - `js/codigo-fonte/file-utils.js` - Funções utilitárias para manipulação de arquivos
  - `js/codigo-fonte/file-viewer.js` - Funcionalidades de visualização e interação
  - `js/codigo-fonte/visualizador.min.js` - Versão minificada combinada dos scripts acima

#### Recursos do Visualizador de Código:

1. **Navegação na Árvore de Arquivos**: Interface intuitiva para navegar pela estrutura de pastas e arquivos do projeto
2. **Visualização de Código com Sintaxe Destacada**: Exibe o código com coloração de sintaxe baseada no tipo de arquivo
3. **Visualização de Imagens**: Suporte para visualizar arquivos de imagem
4. **Copiar Conteúdo**: Permite copiar o conteúdo de arquivos de texto para a área de transferência
5. **Download de Arquivos Individuais**: Opção para baixar qualquer arquivo do projeto individualmente
6. **Download do Projeto Completo**: Funcionalidade para baixar todo o projeto compactado em um arquivo ZIP

## Arquivos Principais

- `index.html` - Página inicial do sistema
- `codigo-fonte.html` - Visualizador de código-fonte
- `js/firebase-config.js` - Configuração de conexão com o Firebase
- `js/global.js` - Funções globais utilizadas em todo o sistema
- `css/main.css` - Estilos principais do sistema

## Notas de Desenvolvimento

1. O visualizador de código funciona de forma independente de APIs externas, realizando todas as operações no navegador do cliente
2. Todos os arquivos são carregados dinamicamente quando necessário e armazenados em cache para melhor desempenho
3. A estrutura de arquivos é mantida em um objeto JavaScript para facilitar a navegação
4. O download do projeto completo é implementado usando JSZip para compactar todos os arquivos em um ZIP no navegador

## Migração Concluída: Firebase Realtime Database → Cloud Firestore

### Status da Migração
- **Status Atual**: Migração Crítica Implementada ✅
- **Progresso**: 70% implementado
- **Documento de Referência**: `MIGRAÇÃO_FIRESTORE_CHECKLIST.md`

### Principais Benefícios da Migração
1. **Performance Melhorada**: Consultas mais eficientes com `collectionGroup`
2. **Operações Atômicas**: Batch writes e transações para integridade de dados
3. **Escalabilidade**: Melhor estruturação para grandes volumes de dados
4. **Segurança**: Regras de segurança mais robustas
5. **Funcionalidades Avançadas**: Suporte a consultas complexas e agregações

### Arquitetura Planejada
```
clientes/{clienteId}/
  ├── projetos/{projetoId}/
  │   └── listas/{listaId}/
  │       └── itens/{itemId}/ (com campos desnormalizados)
SeparacaoProd/{clienteId}/projetos/{projetoId}/listas/{listaId}/itensSeparados/
CorrecaoFinal/{clienteId}/projetos/{projetoId}/listas/{listaId}/itensParaCorrecao/
fornecedores/{fornecedorId}/
usuarios/{usuarioId}/
```

### Componentes Migrados ✅
1. **Firebase Config**: Totalmente refatorado para Firestore com utilitários
2. **Ingestão de Dados**: Batch writes implementado com estrutura hierárquica
3. **Fluxo de Compras**: CollectionGroup queries e atualizações atômicas
4. **Teste de Migração**: Arquivo completo de validação criado

### Próximos Passos
1. ✅ ~~Fazer backup completo do Realtime Database~~
2. ✅ ~~Criar script de migração de dados~~
3. ✅ ~~Implementar refatoração por módulo (ingestão e compras)~~
4. Configurar índices necessários no Firestore Console
5. Implementar migração dos demais fluxos (recebimento, separação)
6. Implementar regras de segurança

## Futuras Melhorias

### Visualizador de Código-Fonte
1. Adicionar sistema de busca de arquivos por nome ou conteúdo
2. Implementar versionamento de código com histórico de alterações
3. Adicionar opção para edição de arquivos diretamente na interface
4. Melhorar o desempenho de download de arquivos grandes
5. Implementar exibição de diferenças entre versões de arquivos

### Sistema Principal
1. Concluir migração para Cloud Firestore
2. Implementar autenticação robusta
3. Adicionar relatórios e dashboards avançados
4. Implementar notificações em tempo real
5. Adicionar suporte para múltiplos idiomas