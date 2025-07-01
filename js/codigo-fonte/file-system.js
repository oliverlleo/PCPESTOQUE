/**
 * file-system.js
 * Mapeamento completo da estrutura de arquivos do sistema
 */

// Mapeamento da estrutura de arquivos para exibição e download
const fileSystem = {
    "index.html": { type: "file", path: "index.html" },
    "codigo-fonte.html": { type: "file", path: "codigo-fonte.html" },
    "README.md": { type: "file", path: "README.md" },
    "YOUWARE.md": { type: "file", path: "YOUWARE.md" },
    "assets": {
        type: "folder",
        children: {
            "img": {
                type: "folder",
                children: {
                    "logo.png": { type: "file", path: "assets/img/logo.png" },
                    "favicon.ico": { type: "file", path: "assets/img/favicon.ico" }
                }
            }
        }
    },
    "css": {
        type: "folder",
        children: {
            "main.css": { type: "file", path: "css/main.css" },
            "cadastro.css": { type: "file", path: "css/cadastro.css" },
            "compras.css": { type: "file", path: "css/compras.css" },
            "empenho.css": { type: "file", path: "css/empenho.css" },
            "lista-chaves.css": { type: "file", path: "css/lista-chaves.css" },
            "recebimento.css": { type: "file", path: "css/recebimento.css" },
            "tratamento-dados.css": { type: "file", path: "css/tratamento-dados.css" }
        }
    },
    "js": {
        type: "folder",
        children: {
            "cadastro.js": { type: "file", path: "js/cadastro.js" },
            "calendario-fix.js": { type: "file", path: "js/calendario-fix.js" },
            "colunas-garantia.js": { type: "file", path: "js/colunas-garantia.js" },
            "compras.js": { type: "file", path: "js/compras.js" },
            "empenho.js": { type: "file", path: "js/empenho.js" },
            "filtro-cliente-fix.js": { type: "file", path: "js/filtro-cliente-fix.js" },
            "filtros-fix.js": { type: "file", path: "js/filtros-fix.js" },
            "firebase-config.js": { type: "file", path: "js/firebase-config.js" },
            "funcoes-corrigidas.js": { type: "file", path: "js/funcoes-corrigidas.js" },
            "global.js": { type: "file", path: "js/global.js" },
            "processamento-arquivos-compras.js": { type: "file", path: "js/processamento-arquivos-compras.js" },
            "processamento-arquivos-tratamento.js": { type: "file", path: "js/processamento-arquivos-tratamento.js" },
            "processamento-arquivos.js": { type: "file", path: "js/processamento-arquivos.js" },
            "firestore-migration-test.js": { type: "file", path: "js/firestore-migration-test.js" },
            "recebimento-dashboard.js": { type: "file", path: "js/recebimento-dashboard.js" },
            "recebimento-selecao.js": { type: "file", path: "js/recebimento-selecao.js" },
            "recebimento.js": { type: "file", path: "js/recebimento.js" },
            "recebimento_calendario_helper.js": { type: "file", path: "js/recebimento_calendario_helper.js" },
            "recebimento_corrigido.js": { type: "file", path: "js/recebimento_corrigido.js" },
            "selector-init.js": { type: "file", path: "js/selector-init.js" },
            "separacao.js": { type: "file", path: "js/separacao.js" },
            "tratamento-dados.js": { type: "file", path: "js/tratamento-dados.js" },
            "validacao-recebimento.js": { type: "file", path: "js/validacao-recebimento.js" },
            "visualizacao.js": { type: "file", path: "js/visualizacao.js" },
            "codigo-fonte": {
                type: "folder",
                children: {
                    "file-system.js": { type: "file", path: "js/codigo-fonte/file-system.js" },
                    "file-viewer.js": { type: "file", path: "js/codigo-fonte/file-viewer.js" },
                    "file-utils.js": { type: "file", path: "js/codigo-fonte/file-utils.js" },
                    "visualizador.min.js": { type: "file", path: "js/codigo-fonte/visualizador.min.js" }
                }
            },
            "firestore-config.js": { type: "file", path: "js/firestore-config.js" }
        }
    },
    "pages": {
        type: "folder",
        children: {
            "cadastro.html": { type: "file", path: "pages/cadastro.html" },
            "compras.html": { type: "file", path: "pages/compras.html" },
            "empenho.html": { type: "file", path: "pages/empenho.html" },
            "recebimento.html": { type: "file", path: "pages/recebimento.html" },
            "separacao.html": { type: "file", path: "pages/separacao.html" },
            "tratamento-dados.html": { type: "file", path: "pages/tratamento-dados.html" }
        }
    },
    "scripts": {
        type: "folder",
        children: {
            "migration-script.js": { type: "file", path: "scripts/migration-script.js" }
        }
    },
    "firestore.rules": { type: "file", path: "firestore.rules" },
    "MIGRAÇÃO_FIRESTORE_CHECKLIST.md": { type: "file", path: "MIGRAÇÃO_FIRESTORE_CHECKLIST.md" }
};

// Função para adicionar novos arquivos à estrutura (para manter sempre atualizado)
function addFileToSystem(filePath) {
    const parts = filePath.split('/');
    const fileName = parts.pop();
    let currentLevel = fileSystem;
    
    // Criar estrutura de pastas se necessário
    for (let i = 0; i < parts.length; i++) {
        const folderName = parts[i];
        
        if (!currentLevel[folderName]) {
            currentLevel[folderName] = {
                type: "folder",
                children: {}
            };
        }
        
        currentLevel = currentLevel[folderName].children;
    }
    
    // Adicionar arquivo
    currentLevel[fileName] = { type: "file", path: filePath };
}

// Exportar para uso global
window.fileSystem = fileSystem;
window.addFileToSystem = addFileToSystem;