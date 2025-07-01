/**
 * migration-script.js
 * Script de migração do Firebase Realtime Database para Cloud Firestore
 * 
 * INSTRUÇÕES DE USO:
 * 1. Execute este script em um ambiente Node.js separado
 * 2. Certifique-se de ter as credenciais de admin do Firebase
 * 3. Faça backup completo antes de executar
 * 
 * NOTA: Este é um script PLANEJADO, aguardando implementação
 */

const admin = require('firebase-admin');

// Configuração de credenciais (substitua pelo seu arquivo de service account)
const serviceAccount = require('./path/to/serviceAccountKey.json');

// Inicialização do Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pcp-2e388-default-rtdb.firebaseio.com'
});

const realtimeDB = admin.database();
const firestore = admin.firestore();

/**
 * Classe principal para gerenciar a migração
 */
class FirestoreMigration {
  
  constructor() {
    this.batchSize = 500; // Tamanho do batch para operações
    this.totalMigrated = 0;
    this.errors = [];
  }
  
  /**
   * Função principal de migração
   */
  async migrate() {
    console.log('🚀 Iniciando migração do Realtime Database para Firestore...');
    
    try {
      // Passo 1: Fazer backup dos dados
      console.log('📊 Fazendo backup dos dados...');
      const backupData = await this.backupRealtimeData();
      await this.saveBackup(backupData);
      
      // Passo 2: Migrar estrutura de clientes
      console.log('👥 Migrando clientes...');
      await this.migrateClientes(backupData.clientes);
      
      // Passo 3: Migrar estrutura de projetos e itens
      console.log('📋 Migrando projetos e itens...');
      await this.migrateProjetosEItens(backupData.projetos);
      
      // Passo 4: Migrar coleções auxiliares
      console.log('🔧 Migrando coleções auxiliares...');
      await this.migrateFornecedores(backupData.fornecedores);
      
      // Passo 5: Migrar dados de processo (SeparacaoProd, CorrecaoFinal)
      console.log('⚙️ Migrando dados de processo...');
      await this.migrateProcessData(backupData);
      
      console.log('✅ Migração concluída com sucesso!');
      console.log(`📈 Total de documentos migrados: ${this.totalMigrated}`);
      
      if (this.errors.length > 0) {
        console.log('⚠️ Erros encontrados durante a migração:');
        this.errors.forEach(error => console.error(error));
      }
      
    } catch (error) {
      console.error('❌ Erro crítico durante a migração:', error);
      throw error;
    }
  }
  
  /**
   * Fazer backup completo dos dados do Realtime Database
   */
  async backupRealtimeData() {
    console.log('Lendo dados do Realtime Database...');
    
    const snapshot = await realtimeDB.ref('/').once('value');
    const data = snapshot.val();
    
    console.log(`✅ Backup concluído. Dados lidos: ${Object.keys(data || {}).length} coleções principais`);
    
    return data;
  }
  
  /**
   * Salvar backup em arquivo local
   */
  async saveBackup(data) {
    const fs = require('fs');
    const backupFileName = `backup-realtime-${new Date().toISOString().split('T')[0]}.json`;
    
    fs.writeFileSync(backupFileName, JSON.stringify(data, null, 2));
    console.log(`✅ Backup salvo em: ${backupFileName}`);
  }
  
  /**
   * Migrar coleção de clientes
   */
  async migrateClientes(clientesData) {
    if (!clientesData) {
      console.log('⚠️ Nenhum dado de clientes encontrado');
      return;
    }
    
    const batch = firestore.batch();
    let batchCount = 0;
    
    for (const [clienteId, clienteData] of Object.entries(clientesData)) {
      const clienteRef = firestore.collection('clientes').doc(clienteId);
      
      // Separar dados do cliente dos projetos
      const { projetos, ...dadosCliente } = clienteData;
      
      batch.set(clienteRef, {
        ...dadosCliente,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      batchCount++;
      this.totalMigrated++;
      
      // Executar batch quando atingir o limite
      if (batchCount >= this.batchSize) {
        await batch.commit();
        console.log(`📦 Batch de clientes executado: ${batchCount} documentos`);
        batchCount = 0;
      }
    }
    
    // Executar batch restante
    if (batchCount > 0) {
      await batch.commit();
      console.log(`📦 Batch final de clientes executado: ${batchCount} documentos`);
    }
  }
  
  /**
   * Migrar projetos e itens (estrutura hierárquica)
   */
  async migrateProjetosEItens(projetosData) {
    if (!projetosData) {
      console.log('⚠️ Nenhum dado de projetos encontrado');
      return;
    }
    
    for (const [clienteId, clienteProjetos] of Object.entries(projetosData)) {
      console.log(`📁 Migrando projetos do cliente: ${clienteId}`);
      
      for (const [projetoId, projetoData] of Object.entries(clienteProjetos)) {
        await this.migrateProjetoCompleto(clienteId, projetoId, projetoData);
      }
    }
  }
  
  /**
   * Migrar um projeto completo com suas listas e itens
   */
  async migrateProjetoCompleto(clienteId, projetoId, projetoData) {
    const batch = firestore.batch();
    let batchCount = 0;
    
    // Criar documento do projeto
    const projetoRef = firestore
      .collection('clientes').doc(clienteId)
      .collection('projetos').doc(projetoId);
    
    const { listas, ...dadosProjeto } = projetoData;
    
    batch.set(projetoRef, {
      ...dadosProjeto,
      clienteId: clienteId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    batchCount++;
    this.totalMigrated++;
    
    // Migrar listas e itens do projeto
    if (listas) {
      for (const [listaId, listaData] of Object.entries(listas)) {
        await this.migrateLista(clienteId, projetoId, listaId, listaData);
      }
    }
    
    // Executar batch do projeto
    if (batchCount > 0) {
      await batch.commit();
    }
  }
  
  /**
   * Migrar uma lista com seus itens
   */
  async migrateLista(clienteId, projetoId, listaId, listaData) {
    const batch = firestore.batch();
    let batchCount = 0;
    
    // Criar documento da lista
    const listaRef = firestore
      .collection('clientes').doc(clienteId)
      .collection('projetos').doc(projetoId)
      .collection('listas').doc(listaId);
    
    const { itens, ...dadosLista } = listaData;
    
    batch.set(listaRef, {
      ...dadosLista,
      clienteId: clienteId,
      projetoId: projetoId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    batchCount++;
    this.totalMigrated++;
    
    // Migrar itens da lista
    if (itens) {
      for (const [itemIndex, itemData] of Object.entries(itens)) {
        const itemRef = listaRef.collection('itens').doc();
        
        // Adicionar campos desnormalizados (CRUCIAL!)
        const enrichedItem = {
          ...itemData,
          clienteId: clienteId,
          projetoId: projetoId,
          listaId: listaId,
          originalIndex: itemIndex,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        batch.set(itemRef, enrichedItem);
        batchCount++;
        this.totalMigrated++;
        
        // Executar batch quando atingir o limite
        if (batchCount >= this.batchSize) {
          await batch.commit();
          console.log(`📦 Batch de itens executado: ${batchCount} documentos`);
          batchCount = 0;
        }
      }
    }
    
    // Executar batch restante
    if (batchCount > 0) {
      await batch.commit();
      console.log(`📦 Batch final da lista ${listaId}: ${batchCount} documentos`);
    }
  }
  
  /**
   * Migrar fornecedores
   */
  async migrateFornecedores(fornecedoresData) {
    if (!fornecedoresData) {
      console.log('⚠️ Nenhum dado de fornecedores encontrado');
      return;
    }
    
    const batch = firestore.batch();
    let batchCount = 0;
    
    for (const [fornecedorId, fornecedorData] of Object.entries(fornecedoresData)) {
      const fornecedorRef = firestore.collection('fornecedores').doc(fornecedorId);
      
      batch.set(fornecedorRef, {
        ...fornecedorData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      batchCount++;
      this.totalMigrated++;
      
      if (batchCount >= this.batchSize) {
        await batch.commit();
        console.log(`📦 Batch de fornecedores executado: ${batchCount} documentos`);
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
      console.log(`📦 Batch final de fornecedores executado: ${batchCount} documentos`);
    }
  }
  
  /**
   * Migrar dados de processo (SeparacaoProd, CorrecaoFinal)
   */
  async migrateProcessData(backupData) {
    // Migrar SeparacaoProd
    if (backupData.SeparacaoProd) {
      console.log('🔄 Migrando SeparacaoProd...');
      await this.migrateCollectionWithStructure('SeparacaoProd', backupData.SeparacaoProd);
    }
    
    // Migrar CorrecaoFinal
    if (backupData.CorrecaoFinal) {
      console.log('🔧 Migrando CorrecaoFinal...');
      await this.migrateCollectionWithStructure('CorrecaoFinal', backupData.CorrecaoFinal);
    }
  }
  
  /**
   * Migrar coleção com estrutura hierárquica
   */
  async migrateCollectionWithStructure(collectionName, data) {
    const batch = firestore.batch();
    let batchCount = 0;
    
    for (const [clienteId, clienteData] of Object.entries(data)) {
      for (const [projetoId, projetoData] of Object.entries(clienteData)) {
        for (const [listaId, listaData] of Object.entries(projetoData)) {
          
          const baseRef = firestore
            .collection(collectionName).doc(clienteId)
            .collection('projetos').doc(projetoId)
            .collection('listas').doc(listaId);
          
          // Determinar sub-coleção baseada no tipo
          const subCollection = collectionName === 'SeparacaoProd' ? 'itensSeparados' : 'itensParaCorrecao';
          
          for (const [itemId, itemData] of Object.entries(listaData)) {
            const itemRef = baseRef.collection(subCollection).doc();
            
            batch.set(itemRef, {
              ...itemData,
              clienteId: clienteId,
              projetoId: projetoId,
              listaId: listaId,
              originalItemId: itemId,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            batchCount++;
            this.totalMigrated++;
            
            if (batchCount >= this.batchSize) {
              await batch.commit();
              console.log(`📦 Batch de ${collectionName} executado: ${batchCount} documentos`);
              batchCount = 0;
            }
          }
        }
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
      console.log(`📦 Batch final de ${collectionName}: ${batchCount} documentos`);
    }
  }
  
  /**
   * Verificar integridade dos dados migrados
   */
  async verifyMigration() {
    console.log('🔍 Verificando integridade da migração...');
    
    try {
      // Verificar contadores de documentos
      const clientesCount = await firestore.collection('clientes').get().then(snap => snap.size);
      const fornecedoresCount = await firestore.collection('fornecedores').get().then(snap => snap.size);
      const itensCount = await firestore.collectionGroup('itens').get().then(snap => snap.size);
      
      console.log(`✅ Verificação concluída:`);
      console.log(`   Clientes: ${clientesCount}`);
      console.log(`   Fornecedores: ${fornecedoresCount}`);
      console.log(`   Itens (total): ${itensCount}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erro na verificação:', error);
      return false;
    }
  }
}

/**
 * Função principal para executar a migração
 */
async function executeMigration() {
  const migration = new FirestoreMigration();
  
  try {
    await migration.migrate();
    await migration.verifyMigration();
    
    console.log('🎉 Migração concluída com sucesso!');
    console.log('📋 Próximos passos:');
    console.log('   1. Atualizar firebase-config.js para usar Firestore');
    console.log('   2. Refatorar módulos conforme checklist');
    console.log('   3. Configurar índices no Console Firebase');
    console.log('   4. Implementar regras de segurança');
    
  } catch (error) {
    console.error('❌ Falha na migração:', error);
    process.exit(1);
  }
}

// Executar migração se chamado diretamente
if (require.main === module) {
  executeMigration();
}

module.exports = { FirestoreMigration, executeMigration };