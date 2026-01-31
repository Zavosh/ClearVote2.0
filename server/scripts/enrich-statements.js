#!/usr/bin/env node
/**
 * Enrich statements with semantic metadata using AI
 * This is done once per statement to make matching efficient
 */

require('dotenv').config();
const db = require('../src/services/databaseService');
const semanticService = require('../src/services/semanticService');

async function enrichStatements() {
  try {
    await db.connect();
    
    console.log('Enriching statements with semantic metadata (BATCH MODE)...\n');
    
    // Get all statements that don't have semantic metadata yet
    const statements = await db.all(`
      SELECT * FROM statements 
      WHERE semantic_keywords IS NULL OR semantic_keywords = ''
    `);
    
    console.log(`Found ${statements.length} statements to analyze`);
    
    if (statements.length === 0) {
      console.log('✅ All statements already have semantic metadata!');
      return;
    }
    
    console.log(`Will process in batches of 4 statements = ${Math.ceil(statements.length / 4)} API calls\n`);
    
    let analyzed = 0;
    let errors = 0;
    
    // Use batch processing
    const results = await semanticService.batchAnalyze(statements);
    
    // Save results to database
    for (const result of results) {
      const statement = statements.find(s => s.id === result.statement_id);
      
      if (!statement) continue;
      
      if (result.success) {
        console.log(`\n📝 Statement ${statement.id}:`);
        console.log(`   "${statement.content.substring(0, 80)}..."`);
        console.log(`   Policy Area: ${result.policy_area || 'None'}`);
        console.log(`   Topics: ${result.topics.slice(0, 3).join(', ')}${result.topics.length > 3 ? '...' : ''}`);
        console.log(`   Keywords: ${result.keywords.slice(0, 4).join(', ')}${result.keywords.length > 4 ? '...' : ''}`);
        
        try {
          // Update database with metadata
          await db.run(`
            UPDATE statements 
            SET 
              policy_area = ?,
              semantic_keywords = ?,
              key_positions = ?,
              topics = ?
            WHERE id = ?
          `, [
            result.policy_area,
            JSON.stringify(result.keywords),
            JSON.stringify(result.positions),
            JSON.stringify(result.topics),
            statement.id
          ]);
          
          analyzed++;
          console.log(`   ✅ Saved`);
        } catch (error) {
          console.error(`   ❌ DB Error: ${error.message}`);
          errors++;
        }
      } else {
        console.error(`\n❌ Statement ${statement.id}: ${result.error}`);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Semantic enrichment complete!');
    console.log(`   Analyzed: ${analyzed}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   API calls made: ~${Math.ceil(statements.length / 4)}`);
    console.log(`   API calls saved: ~${statements.length - Math.ceil(statements.length / 4)} (${Math.round((1 - Math.ceil(statements.length / 4)/statements.length) * 100)}% reduction)`);
    
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

enrichStatements();
