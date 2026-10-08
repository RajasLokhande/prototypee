import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Dashboard.css';

const API_BASE = '';

function Dashboard({ user, token }) {
  const [status, setStatus] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState([]);
  const [verification, setVerification] = useState(null);
  const [selectedVuln, setSelectedVuln] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/api/repair/status`).then(r => setStatus(r.data)).catch(console.error);
  }, []);

  const simulateProgress = (setter, steps, delay = 600) => {
    return new Promise((resolve) => {
      setter([]);
      steps.forEach((step, i) => {
        setTimeout(() => {
          setter(prev => [...prev, step]);
          if (i === steps.length - 1) resolve();
        }, delay * (i + 1));
      });
    });
  };

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    setAnalysis(null);
    setVerification(null);
    setSelectedVuln(null);
    setScanProgress([]);

    const progressPromise = simulateProgress(setScanProgress, [
      'Authenticating test users...',
      'Discovering document endpoints...',
      'Enumerating document IDs...',
      'Testing cross-user access patterns...',
      'Analyzing authorization behavior...',
      'Generating vulnerability report...'
    ], 500);

    try {
      const [, res] = await Promise.all([
        progressPromise,
        axios.post(`${API_BASE}/api/scanner/scan`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setScanResult(res.data);
      if (res.data.vulnerabilities?.length > 0) {
        setSelectedVuln(res.data.vulnerabilities[0]);
      }
    } catch (err) {
      alert('Scan failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setScanning(false);
    }
  };

  const analyze = async () => {
    if (!selectedVuln) return;
    setAnalyzing(true);
    setAnalysisProgress([]);

    const progressPromise = simulateProgress(setAnalysisProgress, [
      'Reading vulnerable source code...',
      'Preparing vulnerability evidence...',
      'Sending to AI analyzer...',
      'Identifying root cause...',
      'Generating minimal patch...'
    ], 600);

    try {
      const hist = await axios.get(`${API_BASE}/api/scanner/history`);
      const [, res] = await Promise.all([
        progressPromise,
        axios.post(`${API_BASE}/api/repair/analyze`, {
          vulnerabilityId: hist.data.vulnerabilities[0].id
        })
      ]);
      setAnalysis(res.data.analysis);
    } catch (err) {
      alert('Analysis failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setAnalyzing(false);
    }
  };

  const applyPatch = async () => {
    if (!analysis) return;
    setApplying(true);
    setApplyProgress([]);

    const progressPromise = simulateProgress(setApplyProgress, [
      'Creating sandbox environment...',
      'Applying patch to sandbox...',
      'Running security tests...',
      'Running regression tests...',
      'Verifying repair...'
    ], 500);

    try {
      const hist = await axios.get(`${API_BASE}/api/scanner/history`);
      const [, res] = await Promise.all([
        progressPromise,
        axios.post(`${API_BASE}/api/repair/apply-patch`, {
          vulnerabilityId: hist.data.vulnerabilities[0].id,
          patch: analysis.patch,
          analysis
        })
      ]);
      setVerification(res.data);
    } catch (err) {
      alert('Patch failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setApplying(false);
    }
  };

  const reset = async () => {
    if (!confirm('Reset the system to its original vulnerable state? This will clear all scan and patch history.')) return;
    try {
      await axios.post(`${API_BASE}/api/repair/reset`);
      setScanResult(null);
      setScanProgress([]);
      setAnalysis(null);
      setAnalysisProgress([]);
      setVerification(null);
      setApplyProgress([]);
      setSelectedVuln(null);
      // Refresh system status
      const statusRes = await axios.get(`${API_BASE}/api/repair/status`);
      setStatus(statusRes.data);
      alert('✅ System reset to vulnerable state');
    } catch (err) {
      alert('Reset failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Security <span className="fw-400">Dashboard</span></h1>
          <p className="subtitle">SafePatch AI Detection and Repair</p>
        </div>

        {/* 1. System Status */}
        <section className="section-gap">
          <h2>System Status</h2>
          <div className="status-grid">
            <StatusCard title="Portal" status={status?.portal} icon="🌐" />
            <StatusCard title="Scanner" status={status?.scanner} icon="🔍" />
            <StatusCard title="AI Analyzer" status={status?.aiAnalyzer} icon="🤖" />
            <StatusCard title="Test Environment" status={status?.testEnvironment} icon="🧪" />
          </div>
        </section>

        {/* 2. Security Scan */}
        <section className="section-gap">
          <div className="section-header">
            <h2>Security Scan</h2>
            <button onClick={runScan} className="btn btn-primary" disabled={scanning}>
              {scanning ? '🔄 Scanning...' : '▶ Run Security Scan'}
            </button>
          </div>
          {scanning && <ProgressCard steps={scanProgress} />}
          {scanResult && <ScanResults result={scanResult} vuln={selectedVuln} />}
        </section>

        {/* 3. Proof — show when vuln is selected */}
        {selectedVuln && (
          <section className="section-gap">
            <h2>Proof of Vulnerability</h2>
            <ProofCard vuln={selectedVuln} />
          </section>
        )}

        {/* 4. AI Analysis */}
        {selectedVuln && (
          <section className="section-gap">
            <div className="section-header">
              <h2>AI Analysis</h2>
              <button onClick={analyze} className="btn btn-primary" disabled={analyzing || !!analysis}>
                {analyzing ? '🔄 Analyzing...' : '🤖 Analyze with AI'}
              </button>
            </div>
            {analyzing && <ProgressCard steps={analysisProgress} />}
            {analysis && <AnalysisResults analysis={analysis} />}
          </section>
        )}

        {/* 5. Proposed Fix + Apply */}
        {analysis && (
          <section className="section-gap">
            <div className="section-header">
              <h2>Proposed Minimal Fix</h2>
              <div className="btn-group">
                <button onClick={applyPatch} className="btn btn-primary" disabled={applying || !!verification}>
                  {applying ? '🔄 Applying...' : '✅ Apply Patch'}
                </button>
                {!verification && (
                  <button onClick={() => setAnalysis(null)} className="btn btn-outline" disabled={applying}>
                    ✕ Reject Patch
                  </button>
                )}
              </div>
            </div>
            <PatchDisplay analysis={analysis} />
            {applying && <ProgressCard steps={applyProgress} />}
          </section>
        )}

        {/* 6. Verification */}
        {verification && (
          <section className="section-gap">
            <h2>Verification Results</h2>
            <VerificationResults verification={verification} />
          </section>
        )}


      </div>
    </div>
  );
}

function StatusCard({ title, status, icon }) {
  const s = status || 'loading';
  const isActive = s === 'running' || s === 'ready' || s === 'mock' || s === 'claude';
  const label = s === 'mock' ? 'Mock Mode' : s === 'claude' ? 'Claude API' : s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <div className="card card-hover status-card">
      <div className="status-icon">{icon}</div>
      <h3>{title}</h3>
      <div className="status-indicator">
        <span className={`status-dot ${isActive ? 'status-running' : 'status-warning'}`}></span>
        <span>{label}</span>
      </div>
    </div>
  );
}

function ProgressCard({ steps }) {
  return (
    <div className="card progress-card">
      <div className="progress-steps">
        {steps.map((step, i) => (
          <div key={i} className="progress-step">
            <span className="progress-check">✓</span>
            <span>{step}</span>
          </div>
        ))}
        <div className="progress-step active">
          <div className="spinner-sm"></div>
          <span>Processing...</span>
        </div>
      </div>
    </div>
  );
}

function ScanResults({ result, vuln }) {
  return (
    <div className="scan-results">
      <div className="card scan-summary-card">
        <div className="scan-stats">
          <div className="scan-stat">
            <span className="scan-stat-number">{result.summary.usersScanned}</span>
            <span className="scan-stat-label">Users Scanned</span>
          </div>
          <div className="scan-stat">
            <span className="scan-stat-number">{result.summary.documentsScanned}</span>
            <span className="scan-stat-label">Documents Scanned</span>
          </div>
          <div className="scan-stat">
            <span className="scan-stat-number">{result.summary.totalTests}</span>
            <span className="scan-stat-label">Tests Run</span>
          </div>
          <div className="scan-stat">
            <span className="scan-stat-number critical">{result.summary.vulnerabilitiesFound}</span>
            <span className="scan-stat-label">Vulnerabilities</span>
          </div>
        </div>
      </div>
      {vuln && (
        <div className="card vulnerability-card">
          <div className="vuln-header">
            <span className="badge badge-critical">CRITICAL</span>
            <h3>Broken Object Level Authorization</h3>
          </div>
          <div className="vuln-details">
            <div className="vuln-detail-row">
              <span className="vuln-label">Attacker/User</span>
              <span>{vuln.requester.name} (ID: {vuln.requester.id})</span>
            </div>
            <div className="vuln-detail-row">
              <span className="vuln-label">Target Object</span>
              <span>Document {vuln.targetDocument.id} — "{vuln.targetDocument.title}"</span>
            </div>
            <div className="vuln-detail-row">
              <span className="vuln-label">Owner</span>
              <span>{vuln.targetDocument.ownerName} (ID: {vuln.targetDocument.ownerId})</span>
            </div>
            <div className="vuln-detail-row">
              <span className="vuln-label">Expected</span>
              <span className="badge">403 FORBIDDEN</span>
            </div>
            <div className="vuln-detail-row">
              <span className="vuln-label">Actual</span>
              <span className="badge badge-critical">200 OK</span>
            </div>
            <div className="vuln-detail-row">
              <span className="vuln-label">Status</span>
              <span className="critical">🚨 Confirmed Unauthorized Access</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProofCard({ vuln }) {
  return (
    <div className="card proof-card">
      <h3>Reproducible Proof</h3>
      <pre className="proof-request"><code>{`GET ${vuln.endpoint}
Authorization: Bearer <Alice's token>

Authenticated as: ${vuln.requester.name} (ID: ${vuln.requester.id})

Response: HTTP ${vuln.actualStatus} OK

Document owner: ${vuln.targetDocument.ownerName} (ID: ${vuln.targetDocument.ownerId})
Requester:      ${vuln.requester.name} (ID: ${vuln.requester.id})

Evidence marker: ${vuln.evidence}
Classification:  ${vuln.vulnerability}
Severity:        ${vuln.severity}`}</code></pre>
    </div>
  );
}

function AnalysisResults({ analysis }) {
  return (
    <div className="card analysis-card">
      <div className="analysis-grid">
        <div className="analysis-item">
          <span className="analysis-label">Root Cause</span>
          <p>{analysis.rootCause}</p>
        </div>
        <div className="analysis-item">
          <span className="analysis-label">Affected File</span>
          <code>{analysis.affectedFile}</code>
        </div>
        <div className="analysis-item">
          <span className="analysis-label">Affected Function</span>
          <code>{analysis.affectedFunction}</code>
        </div>
        {analysis.confidence && (
          <div className="analysis-item">
            <span className="analysis-label">Confidence</span>
            <span className={`badge ${analysis.confidence === 'high' ? 'badge-success' : ''}`}>
              {analysis.confidence.toUpperCase()}
            </span>
          </div>
        )}
        {analysis.aiMode && (
          <div className="analysis-item">
            <span className="analysis-label">AI Mode</span>
            <span className="badge">{analysis.aiMode === 'mock' ? 'MOCK (DETERMINISTIC)' : 'CLAUDE API'}</span>
          </div>
        )}
      </div>
      <div className="analysis-explanation">
        <span className="analysis-label">Explanation</span>
        <p>{analysis.explanation}</p>
      </div>
    </div>
  );
}

function PatchDisplay({ analysis }) {
  const lines = (analysis.patch || '').split('\n');
  return (
    <div className="card patch-card">
      {analysis.patchSummary && (
        <div className="patch-summary">
          <span>Files changed: <strong>{analysis.patchSummary.filesChanged}</strong></span>
          <span className="patch-added">+{analysis.patchSummary.linesAdded} added</span>
          <span className="patch-removed">-{analysis.patchSummary.linesRemoved} removed</span>
        </div>
      )}
      <pre className="diff-display"><code>{lines.map((line, i) => {
        let cls = 'diff-line';
        if (line.startsWith('+') && !line.startsWith('+++')) cls = 'diff-line diff-add';
        else if (line.startsWith('-') && !line.startsWith('---')) cls = 'diff-line diff-remove';
        else if (line.startsWith('@@')) cls = 'diff-line diff-hunk';
        return <div key={i} className={cls}>{line}</div>;
      })}</code></pre>
    </div>
  );
}

function VerificationResults({ verification }) {
  const securityTests = verification.verification?.security?.tests || [];
  const regressionTests = verification.verification?.regression?.tests || [];
  const repairSucceeded = verification.repairSucceeded;

  return (
    <div className="verification-results">
      {/* Final verdict */}
      <div className={`card verdict-card ${repairSucceeded ? 'verdict-pass' : 'verdict-fail'}`}>
        <div className="verdict-content">
          {repairSucceeded ? (
            <>
              <span className="verdict-icon">✅</span>
              <div>
                <h3>REPAIR VERIFIED</h3>
                <p>All security tests pass and no regressions detected.</p>
              </div>
            </>
          ) : (
            <>
              <span className="verdict-icon">❌</span>
              <div>
                <h3>REPAIR REJECTED</h3>
                <p>Some tests failed. The patch did not fully resolve the issue.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Security tests */}
      <div className="card">
        <h3>Security Tests</h3>
        <div className="test-list">
          {securityTests.map((t, i) => (
            <div key={i} className={`test-item ${t.passed ? 'test-pass' : 'test-fail'}`}>
              <span className="test-icon">{t.passed ? '✅' : '❌'}</span>
              <span className="test-name">{t.name}</span>
              <span className="test-result">{t.actual}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Regression tests */}
      <div className="card">
        <h3>Regression Tests</h3>
        <div className="test-list">
          {regressionTests.map((t, i) => (
            <div key={i} className={`test-item ${t.passed ? 'test-pass' : 'test-fail'}`}>
              <span className="test-icon">{t.passed ? '✅' : '❌'}</span>
              <span className="test-name">{t.name}</span>
              <span className="test-result">{t.actual}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
