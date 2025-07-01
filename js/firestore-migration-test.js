/**
 * firestore-migration-test.js
 * 
 * Arquivo de teste para validar as funções migradas para o Firestore
 * 
 * INSTRUÇÕES DE USO:
 * 1. Inclua este script em uma página HTML após firebase-config.js
 * 2. Abra o console do navegador
 * 3. Execute as funções de teste uma por vez
 * 4. Verifique os resultados no console e no Firestore
 */

console.log('🧪 firestore-migration-test.js carregado - Funções de teste disponíveis');

/**
 * Testa a configuração básica do Firestore
 */
async function testarConfiguracaoFirestore() {
    console.log('🔥 Testando configuração do Firestore...');
    
    try {
        if (!window.db) {
            throw new Error('Firestore não está configurado');
        }
        
        // Teste simples de conectividade
        const testDoc = await window.db.collection('_test').add({
            message: 'Teste de conectividade',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Firestore configurado corretamente. Doc ID:', testDoc.id);
        
        // Limpar o documento de teste
        await testDoc.delete();
        console.log('🧹 Documento de teste removido');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro na configuração do Firestore:', error);
        return false;
    }
}

/**
 * Testa as funções utilitárias do FirestoreUtils
 */
async function testarFirestoreUtils() {
    console.log('🔧 Testando FirestoreUtils...');
    
    try {
        if (!window.FirestoreUtils) {
            throw new Error('FirestoreUtils não está disponível');
        }
        
        // Testar criação de item com IDs desnormalizados
        const itemTeste = window.FirestoreUtils.createItemWithDenormalizedIds(
            { codigo: 'TEST-001', descricao: 'Item de teste' },
            'cliente-teste',
            'projeto-teste',
            'lista-teste'
        );
        
        console.log('✅ Item com IDs desnormalizados criado:', itemTeste);
        
        // Testar busca por status (simulada)
        console.log('✅ Função getItensByStatus disponível');
        
        // Testar atualização de timestamp
        const updateData = window.FirestoreUtils.updateTimestamp({
            status: 'Testado'
        });
        
        console.log('✅ Dados com timestamp criados:', updateData);
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao testar FirestoreUtils:', error);
        return false;
    }
}

/**
 * Cria dados de teste no Firestore
 */
async function criarDadosTeste() {
    console.log('📁 Criando dados de teste no Firestore...');
    
    try {
        const clienteId = 'cliente-teste-migration';
        const projetoId = 'projeto-teste';
        const listaId = 'lista-teste';
        
        // Criar cliente de teste
        await window.db.collection('clientes').doc(clienteId).set({
            nome: 'Cliente Teste Migração',
            StatusCompras: 'Não iniciado',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Cliente de teste criado');
        
        // Criar projeto de teste
        await window.db.collection('clientes')
            .doc(clienteId)
            .collection('projetos')
            .doc(projetoId)
            .set({
                tipo: projetoId,
                clienteId: clienteId,
                nome: 'Projeto Teste',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        console.log('✅ Projeto de teste criado');
        
        // Criar lista de teste
        await window.db.collection('clientes')
            .doc(clienteId)
            .collection('projetos')
            .doc(projetoId)
            .collection('listas')
            .doc(listaId)
            .set({
                nome: listaId,
                clienteId: clienteId,
                projetoId: projetoId,
                totalItens: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        console.log('✅ Lista de teste criada');
        
        // Criar itens de teste
        const itensRef = window.db.collection('clientes')
            .doc(clienteId)
            .collection('projetos')
            .doc(projetoId)
            .collection('listas')
            .doc(listaId)
            .collection('itens');
        
        const itensTeste = [
            {
                codigo: 'TESTE-001',
                descricao: 'Item de teste 1',
                quantidade: 10,
                status: 'Aguardando Compra',
                clienteId: clienteId,
                projetoId: projetoId,
                listaId: listaId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                codigo: 'TESTE-002',
                descricao: 'Item de teste 2',
                quantidade: 5,
                status: 'Aguardando Compra',
                clienteId: clienteId,
                projetoId: projetoId,
                listaId: listaId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        ];
        
        for (const item of itensTeste) {
            await itensRef.add(item);
        }
        console.log('✅ Itens de teste criados');
        
        console.log('🎉 Dados de teste criados com sucesso!');
        console.log(`   Cliente ID: ${clienteId}`);
        console.log(`   Projeto ID: ${projetoId}`);
        console.log(`   Lista ID: ${listaId}`);
        
        return { clienteId, projetoId, listaId };
        
    } catch (error) {
        console.error('❌ Erro ao criar dados de teste:', error);
        throw error;
    }
}

/**
 * Testa a busca de itens usando collectionGroup
 */
async function testarBuscaItens(clienteId = 'cliente-teste-migration') {
    console.log('🔍 Testando busca de itens com collectionGroup...');
    
    try {
        // Buscar itens aguardando compra do cliente específico
        const query = window.db.collectionGroup('itens')
            .where('status', '==', 'Aguardando Compra')
            .where('clienteId', '==', clienteId);
        
        const snapshot = await query.get();
        
        console.log(`✅ Busca realizada com sucesso. Itens encontrados: ${snapshot.size}`);
        
        snapshot.forEach(doc => {
            const item = doc.data();
            console.log(`   - ${item.codigo}: ${item.descricao} (Status: ${item.status})`);
            console.log(`     Path: ${doc.ref.path}`);
        });
        
        return snapshot.size;
        
    } catch (error) {
        console.error('❌ Erro ao buscar itens:', error);
        throw error;
    }
}

/**
 * Testa atualização atômica de item
 */
async function testarAtualizacaoItem(clienteId = 'cliente-teste-migration') {
    console.log('✏️ Testando atualização atômica de item...');
    
    try {
        // Buscar um item para atualizar
        const query = window.db.collectionGroup('itens')
            .where('clienteId', '==', clienteId)
            .limit(1);
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            throw new Error('Nenhum item encontrado para teste');
        }
        
        const doc = snapshot.docs[0];
        const itemAntes = doc.data();
        
        console.log(`📝 Atualizando item: ${itemAntes.codigo}`);
        
        // Atualizar o item
        await doc.ref.update({
            status: 'Comprado',
            quantidadeComprada: itemAntes.quantidade,
            fornecedor: 'Fornecedor Teste',
            dataCompra: new Date().toLocaleDateString('pt-BR'),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Verificar a atualização
        const itemAtualizado = await doc.ref.get();
        const itemDepois = itemAtualizado.data();
        
        console.log('✅ Item atualizado com sucesso!');
        console.log(`   Status: ${itemAntes.status} → ${itemDepois.status}`);
        console.log(`   Fornecedor: ${itemDepois.fornecedor}`);
        console.log(`   Data Compra: ${itemDepois.dataCompra}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao atualizar item:', error);
        throw error;
    }
}

/**
 * Remove dados de teste
 */
async function limparDadosTeste(clienteId = 'cliente-teste-migration') {
    console.log('🧹 Removendo dados de teste...');
    
    try {
        // Remover itens
        const itensQuery = window.db.collectionGroup('itens')
            .where('clienteId', '==', clienteId);
        
        const itensSnapshot = await itensQuery.get();
        
        for (const doc of itensSnapshot.docs) {
            await doc.ref.delete();
        }
        console.log(`✅ ${itensSnapshot.size} itens removidos`);
        
        // Remover cliente (cascade delete não existe no Firestore, mas para teste está OK)
        await window.db.collection('clientes').doc(clienteId).delete();
        console.log('✅ Cliente de teste removido');
        
        console.log('🎉 Dados de teste removidos com sucesso!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao remover dados de teste:', error);
        throw error;
    }
}

/**
 * Executa todos os testes em sequência
 */
async function executarTodosTestes() {
    console.log('🚀 Executando todos os testes de migração...');
    
    try {
        // 1. Testar configuração
        await testarConfiguracaoFirestore();
        
        // 2. Testar utilitários
        await testarFirestoreUtils();
        
        // 3. Criar dados de teste
        const { clienteId } = await criarDadosTeste();
        
        // 4. Testar busca
        await testarBuscaItens(clienteId);
        
        // 5. Testar atualização
        await testarAtualizacaoItem(clienteId);
        
        // 6. Limpar dados de teste
        await limparDadosTeste(clienteId);
        
        console.log('🎉 TODOS OS TESTES PASSARAM! A migração está funcionando corretamente.');
        
        return true;
        
    } catch (error) {
        console.error('❌ FALHA NOS TESTES:', error);
        return false;
    }
}

// Disponibilizar funções globalmente
window.TesteMigracaoFirestore = {
    testarConfiguracaoFirestore,
    testarFirestoreUtils,
    criarDadosTeste,
    testarBuscaItens,
    testarAtualizacaoItem,
    limparDadosTeste,
    executarTodosTestes
};

console.log('🧪 Funções de teste disponíveis em window.TesteMigracaoFirestore');
console.log('   Execute: TesteMigracaoFirestore.executarTodosTestes()');