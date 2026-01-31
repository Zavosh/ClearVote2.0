#!/usr/bin/env node
/**
 * Fetch voting records from CA Legislature website
 */

require('dotenv').config();
const db = require('../src/services/databaseService');
const scraper = require('../src/services/legislatureScraperService');

const bills = require('../data/seed/bills.json');
const legislators = require('../data/seed/legislators.json');

async function fetchVotes() {
  try {
    await db.connect();
    
    console.log('Fetching voting records from CA Legislature...\n');
    
    for (const bill of bills) {
      try {
        console.log(`Processing ${bill.bill_number}...`);
        
        // Parse bill number to get type and number
        const match = bill.bill_number.match(/([A-Z]+)-(\d+)/);
        if (!match) {
          console.log(`  ✗ Invalid bill number format: ${bill.bill_number}`);
          continue;
        }
        
        const [, billType, billNumber] = match;
        const session = bill.session;
        
        // Scrape votes
        const votes = await scraper.scrapeBillVotes(session, billType, billNumber);
        
        if (votes.length === 0) {
          console.log(`  ℹ No votes found`);
          continue;
        }
        
        console.log(`  Found ${votes.length} vote records`);
        
        // Save votes for each legislator
        let voteCount = 0;
        for (const legislator of legislators) {
          for (const voteRecord of votes) {
            // Check if legislator voted in this record
            let voteCast = null;
            
            const nameMatch = (name) => {
              const nameLower = name.toLowerCase();
              const legislatorLower = legislator.name.toLowerCase();
              return nameLower.includes(legislatorLower) || 
                     legislatorLower.includes(nameLower) ||
                     nameLower.includes(legislatorLower.split(' ')[0]) ||
                     nameLower.includes(legislatorLower.split(' ').pop());
            };
            
            if (voteRecord.individual_votes.ayes.some(nameMatch)) {
              voteCast = 'yes';
            } else if (voteRecord.individual_votes.noes.some(nameMatch)) {
              voteCast = 'no';
            } else if (voteRecord.individual_votes.nvrs.some(nameMatch)) {
              voteCast = 'not_voting';
            }
            
            if (voteCast) {
              try {
                await db.run(`
                  INSERT OR REPLACE INTO votes 
                  (legislator_id, bill_id, vote, vote_date, vote_type)
                  VALUES (?, ?, ?, ?, ?)
                `, [
                  legislator.id,
                  bill.id,
                  voteCast,
                  voteRecord.date,
                  voteRecord.vote_type
                ]);
                voteCount++;
              } catch (err) {
                console.log(`    ⚠ Error saving vote: ${err.message}`);
              }
            }
          }
        }
        
        console.log(`  ✓ Saved ${voteCount} votes\n`);
        
        // Be nice to the server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ✗ Error: ${error.message}\n`);
      }
    }
    
    // Show summary
    const totalVotes = await db.get('SELECT COUNT(*) as count FROM votes');
    console.log('\n✅ Vote fetching complete!');
    console.log(`   Total votes in database: ${totalVotes.count}`);
    
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

fetchVotes();
