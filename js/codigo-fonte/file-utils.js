/**
 * file-utils.js
 * Funções utilitárias para manipulação de arquivos
 */

// Cache para conteúdo de arquivos já carregados
const fileCache = {};

// Obter o ícone apropriado para o tipo de arquivo
function getFileIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    const iconMap = {
        'html': 'fa-html5 text-danger',
        'css': 'fa-css3-alt text-primary',
        'js': 'fa-js text-warning',
        'json': 'fa-file-code text-secondary',
        'md': 'fa-markdown text-info',
        'png': 'fa-file-image text-success',
        'jpg': 'fa-file-image text-success',
        'jpeg': 'fa-file-image text-success',
        'gif': 'fa-file-image text-success',
        'svg': 'fa-file-image text-success',
        'pdf': 'fa-file-pdf text-danger',
        'txt': 'fa-file-alt text-secondary',
        'xml': 'fa-file-code text-primary'
    };
    
    return iconMap[extension] || 'fa-file text-secondary';
}

// Obter linguagem para highlight.js
function getLanguage(extension) {
    const langMap = {
        'js': 'javascript',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown',
        'xml': 'xml'
    };
    
    return langMap[extension] || 'plaintext';
}

// Escapar HTML para exibição segura
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Obter nome do arquivo a partir do caminho
function getFileName(filePath) {
    return filePath.split('/').pop();
}

// Exibir mensagem de notificação
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
    notification.style.zIndex = '9999';
    notification.innerHTML = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, duration);
}

// Carregar múltiplos arquivos em paralelo
async function loadFilesInParallel(filePaths) {
    const promises = filePaths.map(filePath => {
        return fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao carregar ${filePath}: ${response.status}`);
                }
                
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.startsWith('image/')) {
                    return response.blob().then(blob => {
                        const imageUrl = URL.createObjectURL(blob);
                        fileCache[filePath] = { type: 'image', data: imageUrl, blob };
                        return { path: filePath, loaded: true };
                    });
                } else {
                    return response.text().then(text => {
                        fileCache[filePath] = { type: 'text', data: text };
                        return { path: filePath, loaded: true };
                    });
                }
            })
            .catch(error => {
                console.error(`Erro ao carregar ${filePath}:`, error);
                return { path: filePath, loaded: false, error: error.message };
            });
    });
    
    return Promise.all(promises);
}

// Exportar para uso global
window.fileCache = fileCache;
window.getFileIcon = getFileIcon;
window.getLanguage = getLanguage;
window.escapeHtml = escapeHtml;
window.getFileName = getFileName;
window.showNotification = showNotification;
window.loadFilesInParallel = loadFilesInParallel;