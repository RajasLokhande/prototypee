import bcrypt from 'bcrypt';
import db, { initDatabase } from '../database/init.js';

async function seed() {
  console.log('🌱 Seeding database...');

  // Initialize database
  initDatabase();

  try {
    // Clear existing data
    db.prepare('DELETE FROM documents').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM vulnerabilities').run();
    db.prepare('DELETE FROM patches').run();

    console.log('🧹 Cleared existing data');

    // Create users
    const alicePassword = await bcrypt.hash('alice123', 10);
    const bobPassword = await bcrypt.hash('bob123', 10);

    const alice = db.prepare('INSERT INTO users (username, password, name) VALUES (?, ?, ?)');
    const aliceResult = alice.run('alice', alicePassword, 'Alice');

    const bob = db.prepare('INSERT INTO users (username, password, name) VALUES (?, ?, ?)');
    const bobResult = bob.run('bob', bobPassword, 'Bob');

    console.log(`✅ Created users: Alice (ID: ${aliceResult.lastInsertRowid}), Bob (ID: ${bobResult.lastInsertRowid})`);

    // Create documents for Alice
    const insertDoc = db.prepare('INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)');

    const aliceDocs = [
      { title: 'Alice Project Proposal', content: 'CANARY_DOCUMENT_101: This is Alice\'s confidential project proposal.' },
      { title: 'Alice Meeting Notes', content: 'CANARY_DOCUMENT_102: Alice\'s private meeting notes from Q4 planning.' }
    ];

    for (const doc of aliceDocs) {
      const result = insertDoc.run(doc.title, doc.content, aliceResult.lastInsertRowid);
      console.log(`✅ Created document: "${doc.title}" (ID: ${result.lastInsertRowid}) for Alice`);
    }

    // Create documents for Bob
    const bobDocs = [
      { title: 'Bob Financial Report', content: 'CANARY_DOCUMENT_201: Bob\'s sensitive financial report for 2024.' },
      { title: 'Bob HR Document', content: 'CANARY_DOCUMENT_202: Bob\'s confidential HR performance review.' }
    ];

    for (const doc of bobDocs) {
      const result = insertDoc.run(doc.title, doc.content, bobResult.lastInsertRowid);
      console.log(`✅ Created document: "${doc.title}" (ID: ${result.lastInsertRowid}) for Bob`);
    }

    console.log('\n✨ Database seeded successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('   Alice: username=alice, password=alice123');
    console.log('   Bob: username=bob, password=bob123');
    console.log('\n🔒 Vulnerable State: The system is intentionally vulnerable to IDOR/BOLA attacks.');
    console.log('   Any authenticated user can access any document by changing the document ID.');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
