/**
 * firebase-config.js
 * Configuração do Cloud Firestore para o Sistema de Controle de Compras e Recebimento
 * 
 * MIGRAÇÃO CONCLUÍDA: Este arquivo agora usa Cloud Firestore em vez do Realtime Database
 */

console.log('firebase-config.js carregado - FIRESTORE MODE');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC2Zi40wsyBoTeXb2syXvrogTb56lAVjk0",
  authDomain: "pcp-2e388.firebaseapp.com",
  databaseURL: "https://pcp-2e388-default-rtdb.firebaseio.com", // Ainda mantido para compatibilidade
  projectId: "pcp-2e388",
  storageBucket: "pcp-2e388.appspot.com",
  messagingSenderId: "725540904176",
  appId: "1:725540904176:web:5b60009763c36bb12d7635",
  measurementId: "G-G4S09PBEFB"
};

try {
  console.log('Inicializando Firebase com Firestore...');
  
  // Inicializar o Firebase somente se ainda não foi inicializado
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase inicializado com sucesso');
  } else {
    firebase.app();
    console.log('Firebase já estava inicializado.');
  }
  
  // Referência ao Cloud Firestore
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
  
  // Exportar as referências para uso global (mantendo compatibilidade com código existente)
  window.db = db;
  
  // Referências estruturadas conforme nova arquitetura
  window.dbRef = {
    // Coleções principais
    clientes: db.collection('clientes'),
    fornecedores: db.collection('fornecedores'),
    usuarios: db.collection('usuarios'),
    
    // Coleções de processos
    separacaoProd: db.collection('SeparacaoProd'),
    correcaoFinal: db.collection('CorrecaoFinal'),
    
    // COMPATIBILIDADE: Manter interface similar ao Realtime Database
    projetos: {
      // Emular o comportamento do Realtime Database para projetos
      child: (path) => ({
        once: async (eventType) => {
          if (eventType === 'value') {
            try {
              // Parse do path para extrair clienteId e projetoId
              const pathParts = path.split('/');
              if (pathParts.length >= 2) {
                const clienteId = pathParts[0];
                const projetoId = pathParts[1];
                
                const snapshot = await db.collection('clientes')
                  .doc(clienteId)
                  .collection('projetos')
                  .doc(projetoId)
                  .get();
                
                return {
                  exists: () => snapshot.exists,
                  val: () => snapshot.exists ? snapshot.data() : null
                };
              }
              return { exists: () => false, val: () => null };
            } catch (error) {
              console.error('Erro ao buscar projeto:', error);
              return { exists: () => false, val: () => null };
            }
          }
        },
        
        set: async (data) => {
          const pathParts = path.split('/');
          if (pathParts.length >= 2) {
            const clienteId = pathParts[0];
            const projetoId = pathParts[1];
            
            const enrichedData = FirestoreUtils.updateTimestamp({
              ...data,
              clienteId: clienteId
            });
            
            return db.collection('clientes')
              .doc(clienteId)
              .collection('projetos')
              .doc(projetoId)
              .set(enrichedData);
          }
        }
      })
    }
  };
  
  // Funções utilitárias globais para operações do Firestore
  window.FirestoreUtils = {
    
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
      let query = db.collectionGroup('itens').where('status', '==', status);
      
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
     * Buscar todos os itens de um cliente específico
     */
    getItensByCliente: async (clienteId) => {
      const query = db.collectionGroup('itens').where('clienteId', '==', clienteId);
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
      
      return db.doc(itemPath).update(updateData);
    },
    
    /**
     * Salvar múltiplos itens usando batch
     */
    saveItemsBatch: async (items, clienteId, projetoId, listaId) => {
      const batch = db.batch();
      const itemsRef = db.collection('clientes')
        .doc(clienteId)
        .collection('projetos')
        .doc(projetoId)
        .collection('listas')
        .doc(listaId)
        .collection('itens');
      
      items.forEach(itemData => {
        const itemRef = itemsRef.doc();
        const enrichedItem = FirestoreUtils.createItemWithDenormalizedIds(
          itemData, clienteId, projetoId, listaId
        );
        batch.set(itemRef, enrichedItem);
      });
      
      return batch.commit();
    },
    
    /**
     * Função para emular o comportamento do Realtime Database .once('value')
     */
    emulateRealtimeOnce: async (collectionPath) => {
      try {
        const snapshot = await db.collection(collectionPath).get();
        const data = {};
        snapshot.forEach(doc => {
          data[doc.id] = doc.data();
        });
        
        return {
          exists: () => !snapshot.empty,
          val: () => snapshot.empty ? null : data,
          forEach: (callback) => {
            snapshot.forEach(doc => {
              callback({
                key: doc.id,
                val: () => doc.data()
              });
            });
          }
        };
      } catch (error) {
        console.error('Erro ao emular Realtime Database:', error);
        return {
          exists: () => false,
          val: () => null,
          forEach: () => {}
        };
      }
    },
    
    /**
     * Função para carregar estrutura completa de um cliente (para compatibilidade)
     */
    loadClienteCompleto: async (clienteId) => {
      try {
        const clienteDoc = await db.collection('clientes').doc(clienteId).get();
        if (!clienteDoc.exists) {
          return null;
        }
        
        const clienteData = clienteDoc.data();
        const projetos = {};
        
        // Carregar projetos
        const projetosSnapshot = await db.collection('clientes')
          .doc(clienteId)
          .collection('projetos')
          .get();
        
        for (const projetoDoc of projetosSnapshot.docs) {
          const projetoId = projetoDoc.id;
          const projetoData = projetoDoc.data();
          
          // Carregar listas do projeto
          const listasSnapshot = await db.collection('clientes')
            .doc(clienteId)
            .collection('projetos')
            .doc(projetoId)
            .collection('listas')
            .get();
          
          const listas = {};
          for (const listaDoc of listasSnapshot.docs) {
            const listaId = listaDoc.id;
            const listaData = listaDoc.data();
            
            // Carregar itens da lista
            const itensSnapshot = await db.collection('clientes')
              .doc(clienteId)
              .collection('projetos')
              .doc(projetoId)
              .collection('listas')
              .doc(listaId)
              .collection('itens')
              .get();
            
            const itens = {};
            itensSnapshot.forEach(itemDoc => {
              itens[itemDoc.id] = itemDoc.data();
            });
            
            listas[listaId] = {
              ...listaData,
              itens: itens
            };
          }
          
          projetos[projetoId] = {
            ...projetoData,
            listas: listas
          };
        }
        
        return {
          ...clienteData,
          projetos: projetos
        };
      } catch (error) {
        console.error('Erro ao carregar cliente completo:', error);
        return null;
      }
    }
  };
  
  console.log('window.dbRef criado e disponível globalmente (FIRESTORE MODE):', window.dbRef);
  
  // Teste de conectividade
  db.collection('_test').limit(1).get()
    .then(() => {
      console.log('Conectado ao Cloud Firestore com sucesso!');
      
      // Simular evento de conexão para compatibilidade
      if (window.onFirebaseConnected) {
        window.onFirebaseConnected();
      }
    })
    .catch(error => {
      console.error('Erro ao conectar com o Firestore:', error);
    });

} catch (error) {
  console.error('Erro crítico ao inicializar Cloud Firestore:', error);
  
  // Tentar mostrar uma notificação mais robusta se global.js já estiver carregado
  if (typeof mostrarNotificacao === 'function') {
    mostrarNotificacao('Erro crítico ao conectar ao banco de dados. Recarregue a página.', 'danger', 10000);
  } else {
    alert('Erro crítico ao conectar ao banco de dados. Por favor, recarregue a página.');
  }
}