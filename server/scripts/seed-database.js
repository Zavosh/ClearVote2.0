#!/usr/bin/env node
/**
 * Seed database with initial legislators and bills
 */

require('dotenv').config();
const path = require('path');
const db = require('../src/services/databaseService');

const legislators = require('../data/seed/legislators.json');
const bills = require('../data/seed/bills.json');

async function seedDatabase() {
  try {
    await db.connect();
    await db.initializeSchema();
    
    console.log('Seeding legislators...');
    for (const legislator of legislators) {
      try {
        await db.run(`
          INSERT OR REPLACE INTO legislators 
          (id, name, party, chamber, district, photo_url, twitter_handle, email)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          legislator.id,
          legislator.name,
          legislator.party,
          legislator.chamber,
          legislator.district,
          legislator.photo_url,
          legislator.twitter_handle,
          legislator.email
        ]);
        console.log(`  ✓ ${legislator.name}`);
      } catch (err) {
        console.error(`  ✗ ${legislator.name}: ${err.message}`);
      }
    }
    
    console.log('\nSeeding bills...');
    for (const bill of bills) {
      try {
        await db.run(`
          INSERT OR REPLACE INTO bills 
          (id, bill_number, title, summary, session, status, topics, full_text_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          bill.id,
          bill.bill_number,
          bill.title,
          bill.summary,
          bill.session,
          bill.status,
          JSON.stringify(bill.topics),
          bill.full_text_url
        ]);
        console.log(`  ✓ ${bill.bill_number}`);
      } catch (err) {
        console.error(`  ✗ ${bill.bill_number}: ${err.message}`);
      }
    }
    
    console.log('\n✅ Database seeded successfully!');
    console.log(`   ${legislators.length} legislators`);
    console.log(`   ${bills.length} bills`);
    
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

seedDatabase();
