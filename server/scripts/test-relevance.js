#!/usr/bin/env node
/**
 * Test relevance checker with the dairy/AI example
 */

require('dotenv').config();
const analysisService = require('../src/services/analysisService');

async function testRelevance() {
  console.log('Testing relevance checker with dairy/AI example...\n');
  
  // The problematic dairy nutrition statement
  const dairyStatement = {
    content: `The U.S. Department of Agriculture (USDA) revived the 1990s Milk Mustache campaign to promote dairy nutrition amid debates on dietary guidelines over low-fat and full-fat dairy. California state Sen… [+3728 chars]`,
    published_date: '2026-01-19'
  };
  
  // The AI transparency bill (AB-853)
  const aiBill = {
    bill_number: 'AB-853',
    title: 'Artificial Intelligence Transparency Act',
    summary: 'Requires transparency from developers of large-scale AI systems regarding their training data and model capabilities.'
  };
  
  console.log('Statement:', dairyStatement.content.substring(0, 150) + '...');
  console.log('\nBill:', aiBill.bill_number, '-', aiBill.title);
  console.log('Summary:', aiBill.summary);
  console.log('\n' + '='.repeat(80));
  
  try {
    const result = await analysisService.checkRelevance(dairyStatement, aiBill);
    
    console.log('\n✅ Relevance Check Result:');
    console.log('   Is Relevant:', result.is_relevant);
    console.log('   Reason:', result.reason);
    
    if (!result.is_relevant) {
      console.log('\n🎉 SUCCESS! The system correctly identified this as NOT relevant.');
      console.log('   This statement would now be SKIPPED instead of analyzed.');
    } else {
      console.log('\n⚠️  WARNING! The system still thinks this is relevant.');
      console.log('   This needs further investigation.');
    }
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
  }
  
  process.exit(0);
}

testRelevance();
