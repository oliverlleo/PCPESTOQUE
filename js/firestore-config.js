/**
 * firestore-config.js
 * Configuração do Cloud Firestore para o Sistema de Controle de Compras e Recebimento
 * 
 * NOTA: Este arquivo será usado quando a migração do Realtime Database for concluída
 * Status: PLANEJADO - Aguardando implementação da migração
 */

console.log('firestore-config.js carregado - MODO PLANEJADO');

// Configuração do Firebase (mesma do firebase-config.js)
const firestoreConfig = {
  apiKey: "AIzaSyC2Zi40wsyBoTeXb2syXvrogTb56lAVjk0",
  authDomain: "pcp-2e388.firebaseapp.com",
  databaseURL: "https://pcp-2e388-default-rtdb.firebaseio.com", // Ainda será usado durante a transição
  projectId: "pcp-2e388",
  storageBucket: "pcp-2e388.appspot.com",
  messagingSenderId: "725540904176",
  appId: "1:725540904176:web:5b60009763c36bb12d7635",
  measurementId: "G-G4S09PBEFB"
};

/**
 * Função para inicializar o Firestore (será usada após a migração)
 * Esta função substituirá a inicialização do Realtime Database
 */
function initFirestore() {
  try {
    console.log('Inicializando Cloud Firestore...');
    
    // Inicializar o Firebase se ainda não foi inicializado
    if (!firebase.apps.length) {
      firebase.initializeApp(firestoreConfig);
      console.log('Firebase inicializado com sucesso');
    } else {
      firebase.app();
      console.log('Firebase já estava inicializado.');
    }
    
    // Referência ao Firestore
    const db = firebase.firestore();
    console.log('Referência ao Cloud Firestore criada.');
    
    // Configurações de performance
    db.settings({
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    });
    
    // Habilitar persistência offline
    db.enablePersistence()
      .then(() => {
        console.log('Persistência offline habilitada');
      })
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          console.log('Múltiplas abas abertas, persistência desabilitada');
        } else if (err.code == 'unimplemented') {
          console.log('Navegador não suporta persistência');
        }
      });
    
    // Exportar as referências para uso global
    window.firestoreDB = db;
    
    // Definir referências estruturadas conforme nova arquitetura
    window.firestoreRefs = {
      // Coleções principais
      clientes: db.collection('clientes'),
      fornecedores: db.collection('fornecedores'),
      usuarios: db.collection('usuarios'),
      
      // Coleções de processos
      separacaoProd: db.collection('SeparacaoProd'),
      correcaoFinal: db.collection('CorrecaoFinal'),
      
      // Função helper para acessar itens de forma dinâmica
      getItensCollection: (clienteId, projetoId, listaId) => {
        return db.collection(`clientes/${clienteId}/projetos/${projetoId}/listas/${listaId}/itens`);
      },
      
      // Função para consultas de collection group
      getAllItens: () => {
        return db.collectionGroup('itens');
      },
      
      // Função para batch operations
      createBatch: () => {
        return db.batch();
      },
      
      // Função para transações
      runTransaction: (updateFunction) => {
        return db.runTransaction(updateFunction);
      }
    };
    
    console.log('window.firestoreRefs criado e disponível globalmente:', window.firestoreRefs);
    
    // Teste de conectividade
    return db.collection('_test').limit(1).get()
      .then(() => {
        console.log('Conectado ao Cloud Firestore com sucesso!');
        return true;
      })
      .catch(error => {
        console.error('Erro ao conectar com o Firestore:', error);
        return false;
      });
    
  } catch (error) {
    console.error('Erro crítico ao inicializar Cloud Firestore:', error);
    
    // Fallback para Realtime Database durante a transição
    console.log('Fazendo fallback para Firebase Realtime Database...');
    if (typeof firebase.database === 'function') {
      return false; // Indica que deve usar o Realtime Database
    }
    
    throw error;
  }
}

/**
 * Funções utilitárias para operações comuns do Firestore
 */
const FirestoreUtils = {
  
  /**
   * Criar um item com IDs desnormalizados
   */
  createItemWithDenormalizedIds: (itemData, clienteId, projetoId, listaId) => {
    return {
      ...itemData,
      clienteId: clienteId,
      projetoId: projetoId,
      listaId: listaId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  },
  
  /**
   * Atualizar timestamp de modificação
   */
  updateTimestamp: (updateData) => {
    return {
      ...updateData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  },
  
  /**
   * Buscar itens por status usando collection group
   */
  getItensByStatus: async (status, additionalFilters = {}) => {
    let query = window.firestoreRefs.getAllItens().where('status', '==', status);
    
    // Adicionar filtros adicionais
    Object.entries(additionalFilters).forEach(([field, value]) => {
      query = query.where(field, '==', value);
    });
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      path: doc.ref.path,
      ...doc.data()
    }));
  },
  
  /**
   * Atualizar status de um item
   */
  updateItemStatus: async (itemPath, newStatus, additionalData = {}) => {
    const updateData = FirestoreUtils.updateTimestamp({
      status: newStatus,
      ...additionalData
    });
    
    return window.firestoreDB.doc(itemPath).update(updateData);
  },
  
  /**
   * Salvar múltiplos itens usando batch
   */
  saveItemsBatch: async (items, clienteId, projetoId, listaId) => {
    const batch = window.firestoreRefs.createBatch();
    const itemsRef = window.firestoreRefs.getItensCollection(clienteId, projetoId, listaId);
    
    items.forEach(itemData => {
      const itemRef = itemsRef.doc();
      const enrichedItem = FirestoreUtils.createItemWithDenormalizedIds(
        itemData, clienteId, projetoId, listaId
      );
      batch.set(itemRef, enrichedItem);
    });
    
    return batch.commit();
  }
};

// Exportar utilitários para uso global
window.FirestoreUtils = FirestoreUtils;

// Esta função será chamada quando a migração for ativada
// Por enquanto, ela só está documentada e pronta para uso
console.log('Configuração do Firestore pronta. Use initFirestore() quando a migração for ativada.');

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initFirestore, FirestoreUtils, firestoreConfig };
}