/**
 * firebase-config.js
 * Configuração do Cloud Firestore para o Sistema de Controle de Compras e Recebimento
 * 
 * MIGRAÇÃO CONCLUÍDA: Este arquivo agora usa APENAS Cloud Firestore
 */

console.log('firebase-config.js carregado - FIRESTORE ONLY MODE');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC2Zi40wsyBoTeXb2syXvrogTb56lAVjk0",
  authDomain: "pcp-2e388.firebaseapp.com",
  projectId: "pcp-2e388",
  storageBucket: "pcp-2e388.appspot.com",
  messagingSenderId: "725540904176",
  appId: "1:725540904176:web:5b60009763c36bb12d7635",
  measurementId: "G-G4S09PBEFB"
};

// Variável global para controlar se o Firebase foi inicializado
let firebaseInitialized = false;

// Função principal de inicialização
async function initializeFirebase() {
  try {
    console.log('🔥 Inicializando Firebase com APENAS Firestore...');
    
    // Verificar se Firebase está disponível
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK não está carregado. Verifique se os scripts estão incluídos na página.');
    }
    
    // Inicializar o Firebase somente se ainda não foi inicializado
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('✅ Firebase App inicializado com sucesso');
    } else {
      console.log('✅ Firebase App já estava inicializado');
    }
    
    // Verificar se o Firestore está disponível
    if (typeof firebase.firestore !== 'function') {
      throw new Error('Firebase Firestore SDK não está carregado. Verifique se o script do Firestore está incluído.');
    }
    
    // Criar referência ao Cloud Firestore
    const db = firebase.firestore();
    console.log('✅ Referência ao Cloud Firestore criada');
    
    // Configurações de performance do Firestore
    try {
      db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
      });
      console.log('✅ Configurações de cache aplicadas');
    } catch (settingsError) {
      console.warn('⚠️ Erro ao aplicar configurações de cache:', settingsError);
    }
    
    // Tentar habilitar persistência offline
    try {
      await db.enablePersistence();
      console.log('✅ Persistência offline habilitada');
    } catch (persistenceError) {
      if (persistenceError.code === 'failed-precondition') {
        console.warn('⚠️ Múltiplas abas abertas, persistência offline desabilitada');
      } else if (persistenceError.code === 'unimplemented') {
        console.warn('⚠️ Navegador não suporta persistência offline');
      } else {
        console.warn('⚠️ Erro ao habilitar persistência:', persistenceError);
      }
    }
    
    // Disponibilizar Firestore globalmente
    window.db = db;
    
    // Criar dbRef compatível com o código existente usando APENAS Firestore
    window.dbRef = {
      // Coleções principais do Firestore
      clientes: db.collection('clientes'),
      fornecedores: db.collection('fornecedores'),
      usuarios: db.collection('usuarios'),
      
      // Coleções de processos
      separacaoProd: db.collection('SeparacaoProd'),
      correcaoFinal: db.collection('CorrecaoFinal'),
      
      // Emular métodos do Realtime Database para compatibilidade
      // Mas usando APENAS Firestore por baixo
      projetos: {
        child: (path) => ({
          once: async (eventType) => {
            if (eventType === 'value') {
              try {
                // Parse do path para extrair clienteId e projetoId
                const pathParts = path.split('/');
                if (pathParts.length >= 2) {
                  const clienteId = pathParts[0];
                  const projetoId = pathParts[1];
                  
                  const doc = await db.collection('clientes')
                    .doc(clienteId)
                    .collection('projetos')
                    .doc(projetoId)
                    .get();
                  
                  return {
                    exists: () => doc.exists,
                    val: () => doc.exists ? doc.data() : null
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
            try {
              const pathParts = path.split('/');
              if (pathParts.length >= 2) {
                const clienteId = pathParts[0];
                const projetoId = pathParts[1];
                
                const enrichedData = {
                  ...data,
                  clienteId: clienteId,
                  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await db.collection('clientes')
                  .doc(clienteId)
                  .collection('projetos')
                  .doc(projetoId)
                  .set(enrichedData);
                
                return true;
              }
              throw new Error('Path inválido para projeto');
            } catch (error) {
              console.error('Erro ao salvar projeto:', error);
              throw error;
            }
          },
          
          update: async (data) => {
            try {
              const pathParts = path.split('/');
              if (pathParts.length >= 2) {
                const clienteId = pathParts[0];
                const projetoId = pathParts[1];
                
                const enrichedData = {
                  ...data,
                  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await db.collection('clientes')
                  .doc(clienteId)
                  .collection('projetos')
                  .doc(projetoId)
                  .update(enrichedData);
                
                return true;
              }
              throw new Error('Path inválido para projeto');
            } catch (error) {
              console.error('Erro ao atualizar projeto:', error);
              throw error;
            }
          }
        })
      }
    };
    
    // Adicionar métodos de compatibilidade para clientes
    window.dbRef.clientes.child = (clienteId) => ({
      once: async (eventType) => {
        if (eventType === 'value') {
          try {
            const doc = await db.collection('clientes').doc(clienteId).get();
            return {
              exists: () => doc.exists,
              val: () => doc.exists ? doc.data() : null
            };
          } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            return { exists: () => false, val: () => null };
          }
        }
      },
      
      update: async (data) => {
        try {
          const enrichedData = {
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          
          await db.collection('clientes').doc(clienteId).update(enrichedData);
          return true;
        } catch (error) {
          console.error('Erro ao atualizar cliente:', error);
          throw error;
        }
      },
      
      set: async (data) => {
        try {
          const enrichedData = {
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          
          await db.collection('clientes').doc(clienteId).set(enrichedData);
          return true;
        } catch (error) {
          console.error('Erro ao salvar cliente:', error);
          throw error;
        }
      }
    });
    
    // Adicionar método once para buscar todos os clientes
    window.dbRef.clientes.once = async (eventType) => {
      if (eventType === 'value') {
        try {
          const snapshot = await db.collection('clientes').get();
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
          console.error('Erro ao buscar todos os clientes:', error);
          return {
            exists: () => false,
            val: () => null,
            forEach: () => {}
          };
        }
      }
    };
    
    console.log('✅ window.dbRef criado e disponível globalmente (FIRESTORE ONLY)');
    console.log('🔥 dbRef estrutura:', Object.keys(window.dbRef));
    
    // Teste de conectividade com Firestore
    try {
      await db.collection('_connectionTest').limit(1).get();
      console.log('✅ Conectado ao Cloud Firestore com sucesso!');
      
      firebaseInitialized = true;
      
      // Disparar evento personalizado para notificar que o Firebase está pronto
      window.dispatchEvent(new CustomEvent('firebaseReady', { 
        detail: { db: db, dbRef: window.dbRef } 
      }));
      
      // Chamar callback de conexão se existir
      if (typeof window.onFirebaseConnected === 'function') {
        window.onFirebaseConnected();
      }
      
    } catch (connectionError) {
      console.error('❌ Erro ao conectar com o Firestore:', connectionError);
      throw new Error('Falha na conectividade com o Firestore: ' + connectionError.message);
    }
    
  } catch (error) {
    console.error('❌ Erro crítico ao inicializar Cloud Firestore:', error);
    
    // Mostrar erro para o usuário
    const errorMessage = `Erro ao conectar ao banco de dados: ${error.message}`;
    
    if (typeof window.mostrarNotificacao === 'function') {
      window.mostrarNotificacao(errorMessage, 'danger', 10000);
    } else {
      alert(errorMessage + '\n\nPor favor, recarregue a página.');
    }
    
    throw error;
  }
}

// Utilitários globais para operações do Firestore
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
    const db = window.db;
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
    const db = window.db;
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
    const db = window.db;
    const updateData = window.FirestoreUtils.updateTimestamp({
      status: newStatus,
      ...additionalData
    });
    
    return db.doc(itemPath).update(updateData);
  },
  
  /**
   * Salvar múltiplos itens usando batch
   */
  saveItemsBatch: async (items, clienteId, projetoId, listaId) => {
    const db = window.db;
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
      const enrichedItem = window.FirestoreUtils.createItemWithDenormalizedIds(
        itemData, clienteId, projetoId, listaId
      );
      batch.set(itemRef, enrichedItem);
    });
    
    return batch.commit();
  }
};

// Verificar se o DOM está carregado antes de inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
  // DOM já carregado, inicializar imediatamente
  initializeFirebase();
}

// Exportar função de inicialização para uso manual se necessário
window.initializeFirebase = initializeFirebase;

console.log('✅ firebase-config.js carregado - aguardando inicialização do Firestore...');