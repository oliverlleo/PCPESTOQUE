/**
 * firebase-config.js
 * Configuração EXCLUSIVA do Cloud Firestore
 * 
 * MIGRAÇÃO COMPLETA: Sistema agora usa APENAS Cloud Firestore
 * Realtime Database foi REMOVIDO completamente
 */

console.log('🔥 firebase-config.js carregado - FIRESTORE EXCLUSIVO');

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

// Variáveis globais
let firebaseInitialized = false;

/**
 * Inicializar Firebase com APENAS Firestore
 */
async function initializeFirebase() {
  try {
    console.log('🚀 Inicializando Firebase com APENAS Cloud Firestore...');
    
    // Verificar se Firebase está disponível
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK não está carregado. Verifique se os scripts estão incluídos na página.');
    }
    
    // Inicializar o Firebase se ainda não foi inicializado
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('✅ Firebase App inicializado');
    }
    
    // Verificar se o Firestore está disponível
    if (typeof firebase.firestore !== 'function') {
      throw new Error('Firebase Firestore SDK não está carregado.');
    }
    
    // Criar referência ao Cloud Firestore
    const db = firebase.firestore();
    console.log('✅ Cloud Firestore conectado');
    
    // Configurações do Firestore
    try {
      db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
      });
      console.log('✅ Cache configurado');
    } catch (settingsError) {
      console.warn('⚠️ Erro ao configurar cache:', settingsError);
    }
    
    // Habilitar persistência offline
    try {
      await db.enablePersistence();
      console.log('✅ Persistência offline habilitada');
    } catch (persistenceError) {
      if (persistenceError.code === 'failed-precondition') {
        console.warn('⚠️ Múltiplas abas abertas, persistência offline desabilitada');
      } else if (persistenceError.code === 'unimplemented') {
        console.warn('⚠️ Navegador não suporta persistência offline');
      }
    }
    
    // Disponibilizar Firestore globalmente
    window.db = db;
    
    // Criar interface para acesso às coleções
    window.collections = {
      clientes: db.collection('clientes'),
      fornecedores: db.collection('fornecedores'),
      usuarios: db.collection('usuarios'),
      separacaoProd: db.collection('SeparacaoProd'),
      correcaoFinal: db.collection('CorrecaoFinal')
    };
    
    console.log('✅ Coleções disponíveis:', Object.keys(window.collections));
    
    // Teste de conectividade
    try {
      await db.collection('_connectionTest').limit(1).get();
      console.log('✅ Conectado ao Cloud Firestore!');
      
      firebaseInitialized = true;
      
      // Disparar evento de Firebase pronto
      window.dispatchEvent(new CustomEvent('firebaseReady', { 
        detail: { db: db, collections: window.collections } 
      }));
      
      // Callback de conexão
      if (typeof window.onFirebaseConnected === 'function') {
        window.onFirebaseConnected();
      }
      
    } catch (connectionError) {
      console.error('❌ Erro de conectividade:', connectionError);
      throw new Error('Falha na conectividade: ' + connectionError.message);
    }
    
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
    
    // Mostrar erro para o usuário
    const errorMessage = `Erro de conexão: ${error.message}`;
    
    if (typeof window.mostrarNotificacao === 'function') {
      window.mostrarNotificacao(errorMessage, 'danger', 10000);
    } else {
      alert(errorMessage + '\n\nRecarregue a página.');
    }
    
    throw error;
  }
}

/**
 * Utilitários do Firestore
 */
window.FirestoreAPI = {
  
  /**
   * Criar cliente
   */
  criarCliente: async (clienteData) => {
    const docRef = await window.collections.clientes.add({
      ...clienteData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  },
  
  /**
   * Buscar cliente por ID
   */
  buscarCliente: async (clienteId) => {
    const doc = await window.collections.clientes.doc(clienteId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },
  
  /**
   * Buscar todos os clientes
   */
  buscarTodosClientes: async () => {
    const snapshot = await window.collections.clientes.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  /**
   * Atualizar cliente
   */
  atualizarCliente: async (clienteId, updateData) => {
    await window.collections.clientes.doc(clienteId).update({
      ...updateData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },
  
  /**
   * Criar projeto para um cliente
   */
  criarProjeto: async (clienteId, projetoData) => {
    const docRef = await window.collections.clientes
      .doc(clienteId)
      .collection('projetos')
      .add({
        ...projetoData,
        clienteId: clienteId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    return docRef.id;
  },
  
  /**
   * Buscar projetos de um cliente
   */
  buscarProjetosCliente: async (clienteId) => {
    const snapshot = await window.collections.clientes
      .doc(clienteId)
      .collection('projetos')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  /**
   * Criar lista para um projeto
   */
  criarLista: async (clienteId, projetoId, listaData) => {
    const docRef = await window.collections.clientes
      .doc(clienteId)
      .collection('projetos')
      .doc(projetoId)
      .collection('listas')
      .add({
        ...listaData,
        clienteId: clienteId,
        projetoId: projetoId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    return docRef.id;
  },
  
  /**
   * Salvar itens em lote (batch)
   */
  salvarItensLote: async (clienteId, projetoId, listaId, itens) => {
    const batch = window.db.batch();
    const itensRef = window.collections.clientes
      .doc(clienteId)
      .collection('projetos')
      .doc(projetoId)
      .collection('listas')
      .doc(listaId)
      .collection('itens');
    
    itens.forEach(item => {
      const itemRef = itensRef.doc();
      batch.set(itemRef, {
        ...item,
        clienteId: clienteId,
        projetoId: projetoId,
        listaId: listaId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log(`✅ ${itens.length} itens salvos em lote`);
  },
  
  /**
   * Buscar itens por status usando collectionGroup
   */
  buscarItensPorStatus: async (status) => {
    const snapshot = await window.db.collectionGroup('itens')
      .where('status', '==', status)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      path: doc.ref.path,
      ...doc.data()
    }));
  },
  
  /**
   * Buscar itens de um cliente
   */
  buscarItensCliente: async (clienteId) => {
    const snapshot = await window.db.collectionGroup('itens')
      .where('clienteId', '==', clienteId)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      path: doc.ref.path,
      ...doc.data()
    }));
  },
  
  /**
   * Atualizar status de item
   */
  atualizarStatusItem: async (itemPath, novoStatus, dadosAdicionais = {}) => {
    const itemRef = window.db.doc(itemPath);
    await itemRef.update({
      status: novoStatus,
      ...dadosAdicionais,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },
  
  /**
   * Atualizar múltiplos itens em lote
   */
  atualizarItensLote: async (atualizacoes) => {
    const batch = window.db.batch();
    
    atualizacoes.forEach(({ path, dados }) => {
      const itemRef = window.db.doc(path);
      batch.update(itemRef, {
        ...dados,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log(`✅ ${atualizacoes.length} itens atualizados em lote`);
  },
  
  /**
   * Buscar fornecedores
   */
  buscarFornecedores: async () => {
    const snapshot = await window.collections.fornecedores.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  /**
   * Criar fornecedor
   */
  criarFornecedor: async (fornecedorData) => {
    const docRef = await window.collections.fornecedores.add({
      ...fornecedorData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  }
};

// Verificar se o DOM está carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
  initializeFirebase();
}

// Exportar função de inicialização
window.initializeFirebase = initializeFirebase;

console.log('✅ firebase-config.js carregado - aguardando inicialização do Firestore...');