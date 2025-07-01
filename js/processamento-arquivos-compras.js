/**
 * processamento-arquivos-compras.js
 * Funções para processamento de arquivos e atualizações específicas do módulo de compras
 * 
 * MIGRADO PARA FIRESTORE: Este arquivo agora usa APENAS Firestore
 */

/**
 * Atualiza o status de compra dos itens selecionados
 * @param {string} clienteId - ID do cliente
 * @param {Array} itensIds - IDs dos itens a serem atualizados
 * @param {string} statusCompra - Novo status de compra
 * @returns {Promise} - Promise que resolve quando a atualização for concluída
 */
function atualizarStatusCompraItens(clienteId, itensIds, statusCompra) {
    console.log(`Atualizando status de compra para ${itensIds.length} itens do cliente ${clienteId} para ${statusCompra}`);
    
    return new Promise((resolve, reject) => {
        // Referência para o cliente no Firestore
        const clienteRef = window.db.collection('clientes').doc(clienteId);
        
        // Busca os dados do cliente
        clienteRef.get()
            .then((clienteDoc) => {
                if (!clienteDoc.exists) {
                    throw new Error(`Cliente ${clienteId} não encontrado no Firestore`);
                }
                
                // Objeto para armazenar as atualizações
                const atualizacoes = {};
                
                // Busca cada item individualmente para obter dados completos
                const promises = itensIds.map(itemId => {
                    // Buscar o item na estrutura do Firestore
                    // Precisamos primeiro descobrir em qual subcoleção o item está
                    return window.db.collectionGroup('itens')
                        .where('id', '==', itemId)
                        .where('clienteId', '==', clienteId)
                        .limit(1)
                        .get()
                        .then((itemSnapshot) => {
                            if (itemSnapshot.empty) {
                                console.warn(`Item ${itemId} não encontrado`);
                                return;
                            }
                            
                            // Pegar o primeiro documento encontrado
                            const itemDoc = itemSnapshot.docs[0];
                            const itemData = itemDoc.data();
                            const itemRef = itemDoc.ref;
                            
                            // Preparar a atualização
                            return itemRef.update({
                                statusCompra: statusCompra,
                                dataAtualizacaoStatusCompra: firebase.firestore.FieldValue.serverTimestamp(),
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        });
                });
                
                // Espera todas as atualizações serem concluídas
                return Promise.all(promises);
            })
            .then(() => {
                console.log(`Status de compra atualizado com sucesso para ${itensIds.length} itens`);
                resolve();
            })
            .catch((error) => {
                console.error('Erro ao atualizar status de compra:', error);
                reject(error);
            });
    });
}

/**
 * Atualiza o prazo de entrega de um item específico
 * @param {string} clienteId - ID do cliente
 * @param {string} itemId - ID do item a ser atualizado
 * @param {string} prazoEntrega - Novo prazo de entrega
 * @returns {Promise} - Promise que resolve quando a atualização for concluída
 */
function atualizarPrazoEntregaItem(clienteId, itemId, prazoEntrega) {
    console.log(`Atualizando prazo de entrega do item ${itemId} do cliente ${clienteId} para ${prazoEntrega}`);
    
    return new Promise((resolve, reject) => {
        // Referência para o item no Firestore
        window.db.collectionGroup('itens')
            .where('id', '==', itemId)
            .where('clienteId', '==', clienteId)
            .limit(1)
            .get()
            .then((itemSnapshot) => {
                if (itemSnapshot.empty) {
                    throw new Error(`Item ${itemId} não encontrado no Firestore`);
                }
                
                // Pegar o primeiro documento encontrado
                const itemDoc = itemSnapshot.docs[0];
                const itemRef = itemDoc.ref;
                
                // Atualiza o prazo de entrega
                return itemRef.update({
                    prazoEntrega: prazoEntrega,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                console.log(`Prazo de entrega atualizado com sucesso para o item ${itemId}`);
                resolve();
            })
            .catch((error) => {
                console.error('Erro ao atualizar prazo de entrega:', error);
                reject(error);
            });
    });
}

/**
 * Atualiza o status de um cliente
 * @param {string} clienteId - ID do cliente
 * @param {string} statusCliente - Novo status do cliente
 * @returns {Promise} - Promise que resolve quando a atualização for concluída
 */
function atualizarStatusCliente(clienteId, statusCliente) {
    console.log(`Atualizando status do cliente ${clienteId} para ${statusCliente}`);
    
    return new Promise((resolve, reject) => {
        // Referência para o cliente no Firestore
        const clienteRef = window.db.collection('clientes').doc(clienteId);
        
        // Atualiza o status do cliente
        clienteRef.update({
            status: statusCliente,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
            .then(() => {
                console.log(`Status do cliente atualizado com sucesso para ${statusCliente}`);
                resolve();
            })
            .catch((error) => {
                console.error('Erro ao atualizar status do cliente:', error);
                reject(error);
            });
    });
}

// Exporta as funções para uso em outros arquivos
window.atualizarStatusCompraItens = atualizarStatusCompraItens;
window.atualizarPrazoEntregaItem = atualizarPrazoEntregaItem;
window.atualizarStatusCliente = atualizarStatusCliente;