import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../database/init.js';
import { analyzeVulnerability, getMockStatus } from '../services/ai-analyzer.js';
import { applyPatch, createSandbox, cleanupSandbox } from '../services/patch-engine.js';
import { runSecurityTests, runRegressionTests } from '../services/test-runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Store the original vulnerable source code on first load
const documentsRoutePath = join(__dirname, '..', 'routes', 'documents.js');
const ORIGINAL_VULNERABLE_CODE = fs.readFileSync(documentsRoutePath, 'utf-8');

// Get system status
router.get('/status', (req, res) => {
  res.json({
    portal: 'running',
    scanner: 'ready',
    aiAnalyzer: getMockStatus() ? 'mock' : 'claude',
    testEnvironment: 'ready',
    timestamp: new Date().toISOString()
  });
});

// Analyze vulnerability and generate patch
router.post('/analyze', async (req, res) => {
  try {
    const { vulnerabilityId } = req.body;

    if (!vulnerabilityId) {
      return res.status(400).json({ error: 'vulnerabilityId is required' });
    }

    console.log(`🔬 Analyzing vulnerability ${vulnerabilityId}...`);

    // Get vulnerability from database
    const vulnRecord = db.prepare('SELECT * FROM vulnerabilities WHERE id = ?').get(vulnerabilityId);

    if (!vulnRecord) {
      return res.status(404).json({ error: 'Vulnerability not found' });
    }

    const vulnerability = JSON.parse(vulnRecord.evidence);

    // Read the vulnerable source code
    const sourceCode = fs.readFileSync(documentsRoutePath, 'utf-8');

    // Analyze with AI
    const analysis = await analyzeVulnerability(vulnerability, sourceCode);

    console.log('✅ Analysis complete');

    res.json({
      success: true,
      analysis,
      vulnerabilityId,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Analysis failed', details: err.message });
  }
});

// Apply patch and verify
router.post('/apply-patch', async (req, res) => {
  let sandboxPath = null;

  try {
    const { vulnerabilityId, patch, analysis } = req.body;

    if (!vulnerabilityId || !patch) {
      return res.status(400).json({ error: 'vulnerabilityId and patch are required' });
    }

    console.log(`🔧 Applying patch for vulnerability ${vulnerabilityId}...`);

    // Create sandbox environment
    sandboxPath = await createSandbox();
    console.log(`📦 Sandbox created at: ${sandboxPath}`);

    // Apply patch in sandbox
    const patchResult = await applyPatch(sandboxPath, patch);

    if (!patchResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Patch application failed',
        details: patchResult.error
      });
    }

    console.log('✅ Patch applied to sandbox');

    // Run security tests
    console.log('🧪 Running security tests...');
    const securityResults = await runSecurityTests(sandboxPath);

    // Run regression tests
    console.log('🧪 Running regression tests...');
    const regressionResults = await runRegressionTests(sandboxPath);

    // Determine if repair succeeded
    const repairSucceeded = 
      securityResults.passed && 
      regressionResults.passed &&
      !securityResults.vulnerabilityStillExists;

    // Store patch in database
    const stmt = db.prepare(
      'INSERT INTO patches (vulnerability_id, patch_content, status, applied_at, test_results) VALUES (?, ?, ?, ?, ?)'
    );
    
    const testResults = JSON.stringify({
      security: securityResults,
      regression: regressionResults
    });

    const patchId = stmt.run(
      vulnerabilityId,
      patch,
      repairSucceeded ? 'verified' : 'failed',
      new Date().toISOString(),
      testResults
    ).lastInsertRowid;

    // Update vulnerability status if repair succeeded
    if (repairSucceeded) {
      db.prepare('UPDATE vulnerabilities SET status = ?, resolved_at = ? WHERE id = ?')
        .run('resolved', new Date().toISOString(), vulnerabilityId);
    }

    console.log(repairSucceeded ? '✅ REPAIR VERIFIED' : '❌ REPAIR FAILED');

    res.json({
      success: true,
      patchId,
      repairSucceeded,
      verification: {
        security: securityResults,
        regression: regressionResults
      },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Patch application error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Patch application failed', 
      details: err.message 
    });
  } finally {
    // Cleanup sandbox
    if (sandboxPath) {
      try {
        await cleanupSandbox(sandboxPath);
        console.log('🧹 Sandbox cleaned up');
      } catch (err) {
        console.error('Sandbox cleanup error:', err);
      }
    }
  }
});

// Reset to vulnerable version — restores original code and clears scan/patch data
router.post('/reset', async (req, res) => {
  try {
    console.log('🔄 Resetting to vulnerable version...');

    // Restore original vulnerable documents.js
    fs.writeFileSync(documentsRoutePath, ORIGINAL_VULNERABLE_CODE, 'utf-8');
    console.log('📄 Restored original vulnerable documents.js');

    // Clear scan and patch history
    db.prepare('DELETE FROM vulnerabilities').run();
    db.prepare('DELETE FROM patches').run();
    console.log('🧹 Cleared vulnerability and patch history');

    // Clean up any leftover sandbox directories
    const sandboxDir = join(__dirname, '..', 'sandbox');
    if (fs.existsSync(sandboxDir)) {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up sandbox directories');
    }

    console.log('✅ System reset to vulnerable state');

    res.json({
      success: true,
      message: 'System reset to vulnerable version. All scan and patch history cleared.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Reset failed', 
      details: err.message 
    });
  }
});

export default router;
