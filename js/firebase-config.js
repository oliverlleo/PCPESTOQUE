/**
 * firebase-config.js
 * * Configuração do Firebase para o Sistema de Controle de Compras e Recebimento
 * Este arquivo é responsável por inicializar a conexão com o Firebase
 */

console.log('firebase-config.js carregado');

// Configuração do Firebase focada no Firestore
const firebaseConfig = {
  apiKey: "AIzaSyC2Zi40wsyBoTeXb2syXvrogTb56lAVjk0", // Substitua pela sua API Key real, se diferente
  authDomain: "pcp-2e388.firebaseapp.com",
  projectId: "pcp-2e388",
  storageBucket: "pcp-2e388.appspot.com",
  messagingSenderId: "725540904176",
  appId: "1:725540904176:web:5b60009763c36bb12d7635",
  measurementId: "G-G4S09PBEFB"
};

try {
  console.log('Inicializando Firebase...');
  
  // Inicialize o Firebase
  if (!firebase.apps.length) {
    const app = firebase.initializeApp(firebaseConfig);
    console.log('Firebase inicializado com sucesso');
  } else {
    firebase.app(); // Obter a instância padrão se já inicializada
    console.log('Firebase já estava inicializado.');
  }
  
  // Inicialize APENAS o Firestore como seu banco de dados principal
  const db = firebase.firestore();
  console.log('Referência ao Firestore criada.');
  
  // Opcional: Configurações de performance para o Firestore
  db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
  });
  
  // Teste de conexão ao Firestore
  db.collection('clientes').limit(1).get()
    .then(snapshot => {
      console.log('Conectado ao Firestore com sucesso. Teste de acesso:', snapshot.empty ? '0' : snapshot.size, 'documentos.');
    })
    .catch(error => {
      console.error('Erro ao acessar o Firestore:', error);
    });

} catch (error) {
  console.error('Erro crítico ao inicializar Firebase:', error);
  // Tentar mostrar uma notificação mais robusta se global.js já estiver carregado
  if (typeof mostrarNotificacao === 'function') {
    mostrarNotificacao('Erro crítico ao conectar ao banco de dados. Recarregue a página.', 'danger', 10000);
  } else {
    alert('Erro crítico ao conectar ao banco de dados. Por favor, recarregue a página.');
  }
}