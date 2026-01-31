#!/usr/bin/env node
/**
 * Run analysis on just a small sample of legislators
 */

require('dotenv').config();
const db = require('../src/services/databaseService');
const analysisService = require('../src/services/analysisService');

async function analyzeSample() {
  try {
    await db.connect();
    
    // Analyze only 3 legislators for quick testing
    const legislatorIds = ['ca-wiener', 'ca-essayli', 'ca-wicks'];
    
    console.log('Running analysis on sample legislators...\n');
    
    let totalAnalyzed = 0;
    let totalSkipped = 0;
    
    for (const legislatorId of legislatorIds) {
      console.log(`\n📋 Analyzing: ${legislatorId}`);
      console.log('='.repeat(60));
      
      // Get legislator info
      const legislator = await db.get('SELECT * FROM legislators WHERE id = ?', [legislatorId]);
      console.log(`Name: ${legislator.name} (${legislator.party})`);
      
      // Get their statements and votes
      const statements = await db.all('SELECT * FROM statements WHERE legislator_id = ?', [legislatorId]);
      const votes = await db.all(`
        SELECT v.*, b.bill_number, b.title, b.summary, b.topics, b.id as bill_id 
        FROM votes v 
        JOIN bills b ON v.bill_id = b.id 
        WHERE v.legislator_id = ?
      `, [legislatorId]);
      
      console.log(`Statements: ${statements.length}, Votes: ${votes.length}`);
      
      // Analyze each statement-vote pair
      for (const statement of statements) {
        for (const vote of votes) {
          // Check if already analyzed
          const existing = await db.get(
            'SELECT * FROM discrepancies WHERE statement_id = ? AND vote_id = ?',
            [statement.id, vote.id]
          );
          
          if (existing) {
            console.log(`  ⏭️  Already analyzed: statement ${statement.id} + vote ${vote.id}`);
            continue;
          }
          
          // Get bill info
          const bill = {
            id: vote.bill_id,
            bill_number: vote.bill_number,
            title: vote.title,
            summary: vote.summary,
            topics: vote.topics
          };
          
          // Check if statement and bill topics overlap
          const statementTopics = JSON.parse(statement.topics || '[]');
          const billTopics = JSON.parse(bill.topics || '[]');
          const statementLower = statement.content.toLowerCase();
          
          // Simple relevance check
          const mentionsBill = statementLower.includes(bill.bill_number.toLowerCase());
          const hasTopicOverlap = statementTopics.some(st => 
            billTopics.some(bt => st.toLowerCase() === bt.toLowerCase())
          );
          
          if (!mentionsBill && !hasTopicOverlap) {
            console.log(`  ⏭️  Skipping: No topic overlap (statement ${statement.id} + ${bill.bill_number})`);
            totalSkipped++;
            continue;
          }
          
          try {
            console.log(`  🔍 Analyzing: statement ${statement.id} + ${bill.bill_number}...`);
            
            const analysis = await analysisService.analyzePair(
              { ...statement, published_date: statement.published_date },
              { ...vote, vote_date: vote.vote_date },
              bill
            );
            
            // Skip if not relevant (our new relevance check)
            if (!analysis) {
              console.log(`  ⏭️  AI says not relevant (statement ${statement.id} + ${bill.bill_number})`);
              totalSkipped++;
              continue;
            }
            
            // Save discrepancy
            await db.run(`
              INSERT INTO discrepancies 
              (legislator_id, statement_id, bill_id, vote_id, discrepancy_type, 
               confidence_score, explanation, statement_summary, vote_summary, requires_review)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              legislatorId,
              statement.id,
              bill.id,
              vote.id,
              analysis.discrepancy_type,
              analysis.confidence_score,
              analysis.explanation,
              analysis.statement_summary,
              analysis.vote_summary,
              analysis.requires_review
            ]);
            
            const emoji = analysis.discrepancy_type === 'contradictory' ? '🔴' :
                         analysis.discrepancy_type === 'nuanced' ? '🟡' : '🟢';
            
            console.log(`  ${emoji} ${analysis.discrepancy_type.toUpperCase()} (confidence: ${analysis.confidence_score})`);
            totalAnalyzed++;
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            console.error(`  ❌ Error: ${error.message}`);
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Analysis complete!');
    console.log(`   Analyzed: ${totalAnalyzed}`);
    console.log(`   Skipped: ${totalSkipped}`);
    
    // Show summary from database
    const discrepancies = await db.all('SELECT * FROM discrepancies');
    console.log(`   Total in DB: ${discrepancies.length}`);
    
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

analyzeSample();
