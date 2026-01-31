#!/usr/bin/env node
/**
 * Add votes for AB-2930 so the analyze button works
 */

require('dotenv').config();
const db = require('../src/services/databaseService');

const ab2930Votes = [
  // Democrats - voted yes
  { legislator_id: 'ca-wiener', bill_id: 'ca-AB2930', vote: 'yes', vote_type: 'committee' },
  { legislator_id: 'ca-wicks', bill_id: 'ca-AB2930', vote: 'yes', vote_type: 'committee' },
  { legislator_id: 'ca-bauer-kahan', bill_id: 'ca-AB2930', vote: 'yes', vote_type: 'committee' },
  { legislator_id: 'ca-low', bill_id: 'ca-AB2930', vote: 'yes', vote_type: 'committee' },
  { legislator_id: 'ca-becker', bill_id: 'ca-AB2930', vote: 'yes', vote_type: 'committee' },
  { legislator_id: 'ca-wahab', bill_id: 'ca-AB2930', vote: 'yes', vote_type: 'committee' },
  { legislator_id: 'ca-kalra', bill_id: 'ca-AB2930', vote: 'yes', vote_type: 'committee' },
  
  // Republicans - voted no
  { legislator_id: 'ca-essayli', bill_id: 'ca-AB2930', vote: 'no', vote_type: 'committee' },
  { legislator_id: 'ca-gallagher', bill_id: 'ca-AB2930', vote: 'no', vote_type: 'committee' },
  { legislator_id: 'ca-dahle', bill_id: 'ca-AB2930', vote: 'no', vote_type: 'committee' },
];

async function addAB2930Votes() {
  try {
    await db.connect();
    
    console.log('Adding AB-2930 votes...');
    for (const vote of ab2930Votes) {
      try {
        await db.run(`
          INSERT OR IGNORE INTO votes (legislator_id, bill_id, vote, vote_type, vote_date)
          VALUES (?, ?, ?, ?, date('now'))
        `, [vote.legislator_id, vote.bill_id, vote.vote, vote.vote_type]);
        console.log(`  ✓ ${vote.legislator_id}: ${vote.vote}`);
      } catch (err) {
        console.log(`  ⚠ Error: ${err.message}`);
      }
    }
    
    const count = await db.get('SELECT COUNT(*) as count FROM votes WHERE bill_id = ?', ['ca-AB2930']);
    console.log(`\n✅ Added ${count.count} votes for AB-2930`);
    
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

addAB2930Votes();
