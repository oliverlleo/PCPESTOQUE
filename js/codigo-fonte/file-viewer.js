/**
 * file-viewer.js
 * Funcionalidades de visualização e interação com arquivos
 */

// Variável para armazenar o arquivo atualmente selecionado
let currentFilePath = null;

// Elementos DOM
let fileTreeEl, codeViewerEl, codeContentEl, breadcrumbEl, copyBtn, downloadFileBtn, downloadBtn;

// Inicializar os elementos DOM
function initElements() {
    fileTreeEl = document.getElementById('file-tree');
    codeViewerEl = document.getElementById('code-viewer');
    codeContentEl = document.getElementById('code-content');
    breadcrumbEl = document.getElementById('breadcrumb');
    copyBtn = document.getElementById('copy-btn');
    downloadFileBtn = document.getElementById('download-file-btn');
    downloadBtn = document.getElementById('download-btn');
}

// Renderizar a árvore de arquivos
function renderFileTree(structure, parentElement, path = '') {
    for (const [name, item] of Object.entries(structure)) {
        if (name === 'type' || name === 'path') continue;
        
        const itemPath = path ? `${path}/${name}` : name;
        const isFolder = item.type === 'folder';
        
        const itemEl = document.createElement('div');
        itemEl.className = `file-item ${isFolder ? 'folder-item' : ''}`;
        itemEl.innerHTML = `
            <i class="fas ${isFolder ? 'fa-folder text-warning' : getFileIcon(name)} me-2"></i>
            ${name}
        `;
        
        if (isFolder) {
            itemEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const childrenEl = itemEl.querySelector('.tree-indent');
                if (childrenEl) {
                    childrenEl.style.display = childrenEl.style.display === 'none' ? 'block' : 'none';
                    itemEl.querySelector('i').className = `fas ${childrenEl.style.display === 'none' ? 'fa-folder' : 'fa-folder-open'} text-warning me-2`;
                }
            });
            
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-indent';
            renderFileTree(item.children, childrenContainer, itemPath);
            itemEl.appendChild(childrenContainer);
        } else {
            itemEl.addEventListener('click', () => loadFile(item.path));
        }
        
        parentElement.appendChild(itemEl);
    }
}

// Carregar o conteúdo de um arquivo
async function loadFile(filePath) {
    try {
        currentFilePath = filePath;
        updateBreadcrumb(filePath);
        
        // Verifica se o conteúdo já está em cache
        if (fileCache[filePath]) {
            displayFileContent(filePath, fileCache[filePath]);
            return;
        }
        
        // Caso contrário, carrega o arquivo
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error(`Erro ao carregar arquivo: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        
        // Verifica se é uma imagem
        if (contentType && contentType.startsWith('image/')) {
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            fileCache[filePath] = { type: 'image', data: imageUrl, blob };
            displayFileContent(filePath, fileCache[filePath]);
        } else {
            // Para arquivos de texto
            const text = await response.text();
            fileCache[filePath] = { type: 'text', data: text };
            displayFileContent(filePath, fileCache[filePath]);
        }
        
        // Habilita os botões
        copyBtn.disabled = false;
        downloadFileBtn.disabled = false;
    } catch (error) {
        console.error(error);
        codeContentEl.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> 
                Erro ao carregar o arquivo: ${error.message}
            </div>
        `;
    }
}

// Exibir o conteúdo do arquivo
function displayFileContent(filePath, content) {
    if (content.type === 'image') {
        codeContentEl.innerHTML = `
            <div class="text-center py-3">
                <img src="${content.data}" alt="${getFileName(filePath)}" class="img-preview">
                <p class="mt-3">${getFileName(filePath)}</p>
            </div>
        `;
    } else {
        // Para arquivos de texto
        const extension = filePath.split('.').pop().toLowerCase();
        const fileContent = content.data;
        
        // Usando highlight.js para colorir a sintaxe de código
        if (['js', 'html', 'css', 'json', 'xml', 'md'].includes(extension)) {
            codeContentEl.innerHTML = `<pre><code class="language-${getLanguage(extension)}">${escapeHtml(fileContent)}</code></pre>`;
            document.querySelectorAll('pre code').forEach((el) => {
                hljs.highlightElement(el);
            });
        } else {
            codeContentEl.innerHTML = `<pre>${escapeHtml(fileContent)}</pre>`;
        }
    }
}

// Atualizar o breadcrumb
function updateBreadcrumb(filePath) {
    const parts = filePath.split('/');
    breadcrumbEl.innerHTML = '';
    
    // Adiciona o item Home
    const homeItem = document.createElement('li');
    homeItem.className = 'breadcrumb-item';
    homeItem.innerHTML = '<i class="fas fa-home"></i>';
    homeItem.addEventListener('click', () => {
        codeContentEl.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-code fa-5x text-muted mb-3"></i>
                <h3>Selecione um arquivo para visualizar seu conteúdo</h3>
            </div>
        `;
        currentFilePath = null;
        copyBtn.disabled = true;
        downloadFileBtn.disabled = true;
        updateBreadcrumb('');
    });
    breadcrumbEl.appendChild(homeItem);
    
    // Adiciona cada parte do caminho
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath += (i > 0 ? '/' : '') + part;
        
        const item = document.createElement('li');
        item.className = i === parts.length - 1 ? 'breadcrumb-item active' : 'breadcrumb-item';
        item.textContent = part;
        
        if (i < parts.length - 1) {
            item.style.cursor = 'pointer';
            const finalPath = currentPath;
            item.addEventListener('click', () => {
                // Aqui poderia implementar navegação ao clicar em pastas no breadcrumb
            });
        }
        
        breadcrumbEl.appendChild(item);
    }
}

// Baixar o arquivo atual
function downloadCurrentFile() {
    if (currentFilePath && fileCache[currentFilePath]) {
        const content = fileCache[currentFilePath];
        const fileName = getFileName(currentFilePath);
        
        if (content.type === 'image') {
            // Para imagens
            fetch(content.data)
                .then(res => res.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                });
        } else {
            // Para arquivos de texto
            const blob = new Blob([content.data], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        }
    }
}

// Copiar o conteúdo do arquivo atual
function copyCurrentFile() {
    if (currentFilePath && fileCache[currentFilePath]) {
        const content = fileCache[currentFilePath];
        if (content.type === 'text') {
            navigator.clipboard.writeText(content.data).then(() => {
                showNotification('Conteúdo copiado para a área de transferência!', 'success', 2000);
            }).catch(err => {
                console.error('Erro ao copiar: ', err);
                showNotification('Erro ao copiar conteúdo', 'danger', 2000);
            });
        }
    }
}

// Baixar o projeto completo
async function downloadFullProject() {
    try {
        const zip = new JSZip();
        const loadingEl = document.createElement('div');
        loadingEl.className = 'alert alert-info text-center position-fixed top-50 start-50 translate-middle';
        loadingEl.style.zIndex = '9999';
        loadingEl.innerHTML = `
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            Compactando arquivos para download...
        `;
        document.body.appendChild(loadingEl);
        
        // Função para percorrer a estrutura e adicionar arquivos ao ZIP
        async function addFilesToZip(structure, path = '') {
            for (const [name, item] of Object.entries(structure)) {
                if (name === 'type' || name === 'path') continue;
                
                const itemPath = path ? `${path}/${name}` : name;
                
                if (item.type === 'folder') {
                    zip.folder(itemPath);
                    await addFilesToZip(item.children, itemPath);
                } else {
                    // Carrega o arquivo se ainda não estiver em cache
                    if (!fileCache[item.path]) {
                        try {
                            const response = await fetch(item.path);
                            
                            if (response.ok) {
                                const contentType = response.headers.get('content-type');
                                
                                if (contentType && contentType.startsWith('image/')) {
                                    const blob = await response.blob();
                                    fileCache[item.path] = { type: 'image', data: URL.createObjectURL(blob), blob };
                                } else {
                                    const text = await response.text();
                                    fileCache[item.path] = { type: 'text', data: text };
                                }
                            }
                        } catch (error) {
                            console.error(`Erro ao carregar ${item.path}:`, error);
                        }
                    }
                    
                    // Adiciona o arquivo ao ZIP
                    if (fileCache[item.path]) {
                        const content = fileCache[item.path];
                        
                        if (content.type === 'image' && content.blob) {
                            zip.file(itemPath, content.blob);
                        } else if (content.type === 'text') {
                            zip.file(itemPath, content.data);
                        } else if (content.type === 'image') {
                            // Se temos a URL da imagem mas não o blob, buscamos novamente
                            try {
                                const response = await fetch(item.path);
                                if (response.ok) {
                                    const blob = await response.blob();
                                    zip.file(itemPath, blob);
                                }
                            } catch (error) {
                                console.error(`Erro ao carregar imagem ${item.path}:`, error);
                            }
                        }
                    } else {
                        // Tenta carregar o arquivo diretamente
                        try {
                            const response = await fetch(item.path);
                            if (response.ok) {
                                const blob = await response.blob();
                                zip.file(itemPath, blob);
                            }
                        } catch (error) {
                            console.error(`Erro ao carregar ${item.path}:`, error);
                        }
                    }
                }
            }
        }
        
        // Adiciona todos os arquivos ao ZIP
        await addFilesToZip(fileSystem);
        
        // Gera o arquivo ZIP
        const content = await zip.generateAsync({ type: 'blob' });
        
        // Remove o indicador de carregamento
        document.body.removeChild(loadingEl);
        
        // Cria link para download
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'sistema-compras-recebimento.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('Download iniciado!', 'success', 3000);
    } catch (error) {
        console.error('Erro ao criar arquivo ZIP:', error);
        showNotification('Erro ao gerar o download do projeto', 'danger', 3000);
    }
}

// Inicialização
function initFileViewer() {
    // Inicializa os elementos DOM
    initElements();
    
    // Renderiza a árvore de arquivos
    renderFileTree(fileSystem, fileTreeEl);
    
    // Adiciona os event listeners
    copyBtn.addEventListener('click', copyCurrentFile);
    downloadFileBtn.addEventListener('click', downloadCurrentFile);
    downloadBtn.addEventListener('click', downloadFullProject);
    
    // Pré-carregamento de alguns arquivos comuns
    preloadCommonFiles();
}

// Pré-carregar arquivos comuns
async function preloadCommonFiles() {
    // Lista de arquivos para pré-carregar
    const filesToPreload = [
        'index.html',
        'js/firebase-config.js',
        'js/global.js',
        'css/main.css'
    ];
    
    // Carrega os arquivos em paralelo
    loadFilesInParallel(filesToPreload)
        .then(results => {
            const loadedCount = results.filter(r => r.loaded).length;
            if (loadedCount > 0) {
                console.log(`Pré-carregados ${loadedCount} de ${filesToPreload.length} arquivos.`);
            }
        });
}

// Exportar para uso global
window.initFileViewer = initFileViewer;
window.loadFile = loadFile;
window.downloadFullProject = downloadFullProject;