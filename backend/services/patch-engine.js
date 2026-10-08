import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a sandbox copy of the vulnerable code
export async function createSandbox() {
  const timestamp = Date.now();
  const sandboxPath = join(__dirname, '..', 'sandbox', `repair-${timestamp}`);

  // Create sandbox directory
  if (!fs.existsSync(sandboxPath)) {
    fs.mkdirSync(sandboxPath, { recursive: true });
  }

  // Copy routes directory to sandbox
  const routesPath = join(__dirname, '..', 'routes');
  const sandboxRoutesPath = join(sandboxPath, 'routes');
  
  fs.mkdirSync(sandboxRoutesPath, { recursive: true });
  
  // Copy documents.js to sandbox
  const sourceFile = join(routesPath, 'documents.js');
  const destFile = join(sandboxRoutesPath, 'documents.js');
  
  fs.copyFileSync(sourceFile, destFile);

  console.log(`Sandbox created: ${sandboxPath}`);
  return sandboxPath;
}

// Apply patch to sandbox
export async function applyPatch(sandboxPath, patchContent) {
  try {
    const targetFile = join(sandboxPath, 'routes', 'documents.js');
    
    // Simple patch application: parse the diff and apply changes
    const patchedContent = applyDiffPatch(fs.readFileSync(targetFile, 'utf-8'), patchContent);
    
    fs.writeFileSync(targetFile, patchedContent, 'utf-8');

    return {
      success: true,
      message: 'Patch applied successfully',
      targetFile
    };
  } catch (error) {
    console.error('Patch application error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Simple diff patch parser and applicator
function applyDiffPatch(originalContent, patchContent) {
  const lines = originalContent.split('\n');
  const patchLines = patchContent.split('\n');
  
  let insertAfterLine = -1;
  const linesToInsert = [];
  
  // Parse patch to find where to insert the authorization check
  for (const line of patchLines) {
    if (line.startsWith('@@')) {
      // Parse line numbers from @@ format
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        insertAfterLine = parseInt(match[1]) - 1;
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      linesToInsert.push(line.substring(1));
    }
  }
  
  // If we found insertion point, insert the lines
  if (insertAfterLine >= 0 && linesToInsert.length > 0) {
    // Find the line with "if (!document)" and insert after the closing brace
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('if (!document)')) {
        // Find the closing brace
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() === '}') {
            // Insert authorization check after this line
            lines.splice(j + 1, 0, '', ...linesToInsert);
            break;
          }
        }
        break;
      }
    }
  }
  
  return lines.join('\n');
}

// Cleanup sandbox
export async function cleanupSandbox(sandboxPath) {
  try {
    if (fs.existsSync(sandboxPath)) {
      fs.rmSync(sandboxPath, { recursive: true, force: true });
      console.log(`Sandbox cleaned: ${sandboxPath}`);
    }
  } catch (error) {
    console.error('Sandbox cleanup error:', error);
  }
}
