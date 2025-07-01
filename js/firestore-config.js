/**
 * firestore-config.js
 * Configuração e utilitários para o Cloud Firestore
 * 
 * ATUALIZADO: Removido qualquer suporte a Realtime Database
 */

// Configuração do Firebase (será a mesma do firebase-config.js)
const firebaseConfig = {
  apiKey: "AIzaSyC2Zi40wsyBoTeXb2syXvrogTb56lAVjk0",
  authDomain: "pcp-2e388.firebaseapp.com",
  projectId: "pcp-2e388",
  storageBucket: "pcp-2e388.appspot.com",
  messagingSenderId: "725540904176",
  appId: "1:725540904176:web:5b60009763c36bb12d7635",
  measurementId: "G-G4S09PBEFB"
};

/**
 * Inicializa o Firebase e configura o Firestore
 * @returns {Promise<Object>} Promise que resolve quando a inicialização for concluída
 */
async function initializeFirestore() {
  console.log('Inicializando Firestore...');

  // Verificar se o Firebase já foi inicializado
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Verificar se o Firestore está disponível
  if (typeof firebase.firestore !== 'function') {
    throw new Error('Firebase Firestore não está disponível');
  }

  try {
    // Inicializar Firestore
    const db = firebase.firestore();
    
    // Configurar cache e persistência offline
    db.settings({
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    });
    
    try {
      await db.enablePersistence();
      console.log('Persistência offline habilitada');
    } catch (e) {
      if (e.code === 'failed-precondition') {
        console.warn('Múltiplas abas abertas, persistência offline não disponível');
      } else if (e.code === 'unimplemented') {
        console.warn('Navegador não suporta persistência offline');
      }
    }
    
    // Criar objetos de acesso ao Firestore
    window.db = db;
    window.dbRef = {
      clientes: db.collection('clientes'),
      fornecedores: db.collection('fornecedores'),
      usuarios: db.collection('usuarios'),
      separacaoProd: db.collection('SeparacaoProd'),
      correcaoFinal: db.collection('CorrecaoFinal')
    };
    
    // Utilitários para Firestore
    window.FirestoreUtils = {
      /**
       * Cria um documento com timestamp
       * @param {Object} data - Dados a serem salvos
       * @returns {Object} Dados com timestamps adicionados
       */
      createDocument: (data) => {
        return {
          ...data,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
      },
      
      /**
       * Atualiza um documento com timestamp de atualização
       * @param {Object} data - Dados a serem atualizados
       * @returns {Object} Dados com timestamp atualizado
       */
      updateDocument: (data) => {
        return {
          ...data,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
      },
      
      /**
       * Busca itens comprados usando collectionGroup
       * @returns {Promise<Array>} Promise que resolve com array de itens comprados
       */
      getCompradosItems: async () => {
        const snapshot = await db.collectionGroup('itens')
          .where('statusCompra', '==', 'comprado')
          .get();
          
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ref: doc.ref,
          path: doc.ref.path,
          ...doc.data()
        }));
      },
      
      /**
       * Busca itens recebidos usando collectionGroup
       * @returns {Promise<Array>} Promise que resolve com array de itens recebidos
       */
      getRecebidosItems: async () => {
        const snapshot = await db.collectionGroup('itens')
          .where('statusRecebimento', '==', 'recebido')
          .get();
          
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ref: doc.ref,
          path: doc.ref.path,
          ...doc.data()
        }));
      },
      
      /**
       * Busca itens por fornecedor
       * @param {string} fornecedor - Nome do fornecedor
       * @returns {Promise<Array>} Promise que resolve com array de itens do fornecedor
       */
      getItemsByFornecedor: async (fornecedor) => {
        const snapshot = await db.collectionGroup('itens')
          .where('fornecedor', '==', fornecedor)
          .get();
          
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ref: doc.ref,
          path: doc.ref.path,
          ...doc.data()
        }));
      },
      
      /**
       * Cria múltiplos documentos em batch
       * @param {Array} items - Array de itens para criar
       * @param {Object} collectionRef - Referência para a coleção
       * @returns {Promise} Promise que resolve quando o batch for commitado
       */
      createBatch: async (items, collectionRef) => {
        const batch = db.batch();
        
        items.forEach(item => {
          const docRef = collectionRef.doc(item.id || db.collection('_temp').doc().id);
          batch.set(docRef, {
            ...item,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        
        return batch.commit();
      }
    };
    
    console.log('Firestore inicializado com sucesso');
    return { db, dbRef: window.dbRef };
  } catch (error) {
    console.error('Erro ao inicializar Firestore:', error);
    throw error;
  }
}

// Exportar função para uso global
window.initializeFirestore = initializeFirestore;