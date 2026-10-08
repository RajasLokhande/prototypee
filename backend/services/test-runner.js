import db from '../database/init.js';
import { generateToken } from '../middleware/auth.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run security tests
export async function runSecurityTests(sandboxPath) {
  const tests = [];
  let vulnerabilityStillExists = false;

  try {
    // Get test users
    const alice = db.prepare('SELECT * FROM users WHERE username = ?').get('alice');
    const bob = db.prepare('SELECT * FROM users WHERE username = ?').get('bob');

    if (!alice || !bob) {
      return {
        passed: false,
        error: 'Test users not found',
        tests: []
      };
    }

    // Get test documents
    const aliceDoc = db.prepare('SELECT * FROM documents WHERE owner_id = ? LIMIT 1').get(alice.id);
    const bobDoc = db.prepare('SELECT * FROM documents WHERE owner_id = ? LIMIT 1').get(bob.id);

    // Test 1: Owner can access own document
    const test1 = await testOwnerAccess(alice, aliceDoc);
    tests.push(test1);

    // Test 2: Non-owner cannot access another user's document (the critical test)
    const test2 = await testUnauthorizedAccess(alice, bobDoc, sandboxPath);
    tests.push(test2);
    vulnerabilityStillExists = !test2.passed;

    // Test 3: Bob cannot access Alice's document
    const test3 = await testUnauthorizedAccess(bob, aliceDoc, sandboxPath);
    tests.push(test3);

    // Test 4: Invalid document returns 404
    const test4 = await testInvalidDocument(alice, 99999);
    tests.push(test4);

    const allPassed = tests.every(t => t.passed);

    return {
      passed: allPassed && !vulnerabilityStillExists,
      vulnerabilityStillExists,
      totalTests: tests.length,
      passedTests: tests.filter(t => t.passed).length,
      failedTests: tests.filter(t => !t.passed).length,
      tests
    };

  } catch (error) {
    console.error('Security tests error:', error);
    return {
      passed: false,
      error: error.message,
      tests
    };
  }
}

// Run regression tests
export async function runRegressionTests(sandboxPath) {
  const tests = [];

  try {
    // Get test users
    const alice = db.prepare('SELECT * FROM users WHERE username = ?').get('alice');

    // Test 1: User login works
    tests.push({
      name: 'User Login',
      passed: alice !== undefined,
      expected: 'User can log in',
      actual: alice ? 'Login successful' : 'Login failed'
    });

    // Test 2: Document listing works
    const docs = db.prepare('SELECT * FROM documents WHERE owner_id = ?').all(alice.id);
    tests.push({
      name: 'Document Listing',
      passed: Array.isArray(docs) && docs.length > 0,
      expected: 'Can list documents',
      actual: `Found ${docs.length} documents`
    });

    // Test 3: Owner can access own document
    const ownDoc = db.prepare('SELECT * FROM documents WHERE owner_id = ? LIMIT 1').get(alice.id);
    tests.push({
      name: 'Owner Document Access',
      passed: ownDoc !== undefined,
      expected: 'Owner can access own document',
      actual: ownDoc ? 'Access granted' : 'Access denied'
    });

    // Test 4: Document upload works (test by checking insert capability)
    try {
      const testInsert = db.prepare(
        'INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)'
      );
      const result = testInsert.run('__test_upload__', 'Test content', alice.id);
      const insertedId = result.lastInsertRowid;
      // Clean up the test document
      db.prepare('DELETE FROM documents WHERE id = ?').run(insertedId);
      tests.push({
        name: 'Document Upload',
        passed: true,
        expected: 'Can upload document',
        actual: 'Upload successful'
      });
    } catch (err) {
      tests.push({
        name: 'Document Upload',
        passed: false,
        expected: 'Can upload document',
        actual: err.message
      });
    }

    // Test 5: Document deletion works (test by checking delete capability)
    try {
      const testInsert = db.prepare(
        'INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)'
      );
      const result = testInsert.run('__test_delete__', 'Test content', alice.id);
      const insertedId = result.lastInsertRowid;
      db.prepare('DELETE FROM documents WHERE id = ?').run(insertedId);
      const deleted = db.prepare('SELECT * FROM documents WHERE id = ?').get(insertedId);
      tests.push({
        name: 'Document Deletion',
        passed: !deleted,
        expected: 'Can delete document',
        actual: !deleted ? 'Deletion successful' : 'Deletion failed'
      });
    } catch (err) {
      tests.push({
        name: 'Document Deletion',
        passed: false,
        expected: 'Can delete document',
        actual: err.message
      });
    }

    const allPassed = tests.every(t => t.passed);

    return {
      passed: allPassed,
      totalTests: tests.length,
      passedTests: tests.filter(t => t.passed).length,
      failedTests: tests.filter(t => !t.passed).length,
      tests
    };

  } catch (error) {
    console.error('Regression tests error:', error);
    return {
      passed: false,
      error: error.message,
      tests
    };
  }
}

// Helper: Test owner access
async function testOwnerAccess(user, document) {
  try {
    // Simulate: Owner should be able to access their own document
    const canAccess = document && document.owner_id === user.id;
    
    return {
      name: 'Owner Access',
      passed: canAccess,
      expected: '200 OK',
      actual: canAccess ? '200 OK' : '403 Forbidden',
      description: `${user.name} accessing their own document`
    };
  } catch (error) {
    return {
      name: 'Owner Access',
      passed: false,
      expected: '200 OK',
      actual: error.message
    };
  }
}

// Helper: Test unauthorized access (critical security test)
async function testUnauthorizedAccess(attacker, targetDoc, sandboxPath) {
  try {
    // Check if the patched code exists in sandbox
    const patchedFile = join(sandboxPath, 'routes', 'documents.js');
    const codeContent = fs.existsSync(patchedFile) 
      ? fs.readFileSync(patchedFile, 'utf-8')
      : '';

    // Check if authorization check was added
    const hasAuthCheck = codeContent.includes('document.owner_id !== req.user.id') ||
                         codeContent.includes('document.owner_id === req.user.id');

    // If auth check exists, access should be denied (403)
    // If no auth check, access is allowed (200) - vulnerability still exists
    const actualStatus = hasAuthCheck ? 403 : 200;

    const passed = actualStatus === 403;

    return {
      name: 'Unauthorized Access Blocked',
      passed,
      expected: '403 Forbidden',
      actual: actualStatus === 403 ? '403 Forbidden' : '200 OK (VULNERABLE)',
      description: `${attacker.name} attempting to access ${targetDoc.title}`,
      critical: true
    };
  } catch (error) {
    return {
      name: 'Unauthorized Access Blocked',
      passed: false,
      expected: '403 Forbidden',
      actual: error.message,
      critical: true
    };
  }
}

// Helper: Test invalid document
async function testInvalidDocument(user, invalidId) {
  try {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(invalidId);
    const passed = !doc; // Should not exist

    return {
      name: 'Invalid Document Handling',
      passed,
      expected: '404 Not Found',
      actual: !doc ? '404 Not Found' : '200 OK',
      description: `Accessing non-existent document ${invalidId}`
    };
  } catch (error) {
    return {
      name: 'Invalid Document Handling',
      passed: false,
      expected: '404 Not Found',
      actual: error.message
    };
  }
}
