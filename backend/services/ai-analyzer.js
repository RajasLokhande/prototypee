import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Anthropic client if API key is available
const anthropic = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function analyzeVulnerability(vulnerability, sourceCode) {
  // If no API key, use mock analyzer
  if (!anthropic) {
    console.log('⚠️  No Anthropic API key found. Using mock AI analyzer.');
    return mockAnalyzeVulnerability(vulnerability, sourceCode);
  }

  try {
    const prompt = buildAnalysisPrompt(vulnerability, sourceCode);

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const response = message.content[0].text;
    
    // Parse Claude's response
    return parseAIResponse(response);

  } catch (error) {
    console.error('AI Analysis error:', error.message);
    console.log('Falling back to mock analyzer...');
    return mockAnalyzeVulnerability(vulnerability, sourceCode);
  }
}

function buildAnalysisPrompt(vulnerability, sourceCode) {
  return `You are a senior security engineer analyzing a vulnerability in a Node.js/Express application.

## VULNERABILITY EVIDENCE

Type: ${vulnerability.type}
Severity: ${vulnerability.severity}
Endpoint: ${vulnerability.endpoint}

Requester: ${vulnerability.requester.name} (ID: ${vulnerability.requester.id})
Target Document: ${vulnerability.targetDocument.id} (owned by ${vulnerability.targetDocument.ownerName})

Expected HTTP Status: ${vulnerability.expectedStatus} (Forbidden)
Actual HTTP Status: ${vulnerability.actualStatus} (OK)

Reason: ${vulnerability.reason}

## SOURCE CODE

\`\`\`javascript
${sourceCode}
\`\`\`

## YOUR TASK

Analyze this Broken Object Level Authorization (BOLA/IDOR) vulnerability and provide:

1. Root cause explanation
2. Exact location in code (file, function, line area)
3. Why the authorization check is missing
4. A MINIMAL code patch that:
   - Adds ONLY the missing authorization check
   - Does NOT refactor unrelated code
   - Preserves all existing functionality
   - Uses the existing patterns in the codebase

Return your analysis in this JSON format:

{
  "vulnerability": "Broken Object Level Authorization (BOLA/IDOR)",
  "rootCause": "Brief explanation of why this vulnerability exists",
  "affectedFile": "routes/documents.js",
  "affectedFunction": "GET /api/documents/:id",
  "explanation": "Detailed explanation of the security flaw",
  "patch": "The minimal code patch in unified diff format",
  "testsToRun": ["security", "regression"],
  "confidence": "high"
}

IMPORTANT: The patch should be in unified diff format, showing exact line changes.`;
}

function parseAIResponse(response) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
  } catch (error) {
    console.error('Error parsing AI response:', error.message);
    // Return a structured response even if parsing fails
    return {
      vulnerability: 'Broken Object Level Authorization (BOLA/IDOR)',
      rootCause: 'Unable to parse AI response',
      affectedFile: 'routes/documents.js',
      affectedFunction: 'GET /api/documents/:id',
      explanation: response,
      patch: '// Unable to generate patch automatically',
      testsToRun: ['security', 'regression'],
      confidence: 'low'
    };
  }
}

// Mock AI analyzer for when API key is not available
function mockAnalyzeVulnerability(vulnerability, sourceCode) {
  console.log('🤖 Using deterministic mock AI analyzer...');

  const patch = `--- a/backend/routes/documents.js
+++ b/backend/routes/documents.js
@@ -18,6 +18,13 @@ router.get('/:id', authenticateToken, (req, res) => {
       return res.status(404).json({ error: 'Document not found' });
     }
 
+    // Authorization check: Verify document ownership
+    if (document.owner_id !== req.user.id) {
+      return res.status(403).json({ 
+        error: 'Forbidden: You do not have permission to access this document' 
+      });
+    }
+
     // SECURITY FLAW: Returns document without checking if req.user.id === document.owner_id
     res.json({ document });
`;

  return {
    vulnerability: 'Broken Object Level Authorization (BOLA/IDOR)',
    rootCause: 'The GET /api/documents/:id endpoint authenticates the user but fails to verify that the authenticated user is the owner of the requested document.',
    affectedFile: 'routes/documents.js',
    affectedFunction: 'GET /api/documents/:id',
    affectedLine: 'Line 18-32',
    explanation: `The vulnerability exists because the endpoint retrieves a document from the database based solely on the document ID without checking if the authenticated user (req.user.id) matches the document's owner_id. This allows any authenticated user to access any document by simply changing the document ID in the URL.

The fix is minimal: add a single authorization check after retrieving the document but before returning it. This check compares req.user.id with document.owner_id and returns 403 Forbidden if they don't match.

This is a textbook IDOR (Insecure Direct Object Reference) / BOLA (Broken Object Level Authorization) vulnerability - one of the OWASP API Security Top 10 risks.`,
    patch,
    patchSummary: {
      filesChanged: 1,
      linesAdded: 7,
      linesRemoved: 0
    },
    testsToRun: ['security', 'regression'],
    confidence: 'high',
    aiMode: 'mock'
  };
}

export function getMockStatus() {
  return !anthropic;
}
