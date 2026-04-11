import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve, relative } from 'path';
import crypto from 'crypto';
import { mkdirSync } from 'fs';

const DOCS_ROOT = process.env.DOCS_ROOT || './docs';
const SAFE_ROOT = resolve(DOCS_ROOT);

/**
 * Prevent directory traversal attacks
 */
function validatePath(requestedPath: string): string {
  const normalized = resolve(SAFE_ROOT, requestedPath);
  const relative_path = relative(SAFE_ROOT, normalized);
  
  if (relative_path.startsWith('..')) {
    throw new Error('Path traversal detected');
  }
  
  return normalized;
}

/**
 * Read markdown file safely
 */
export function readDoc(path: string): { content: string; hash: string } {
  const safePath = validatePath(path);
  const content = readFileSync(safePath, 'utf-8');
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return { content, hash };
}

/**
 * Save markdown with automatic backup
 */
export function saveDoc(
  path: string,
  content: string
): { hash: string; backupPath: string; timestamp: string } {
  const safePath = validatePath(path);
  const newHash = crypto.createHash('sha256').update(content).digest('hex');
  
  // Create backup if file exists
  let backupPath = '';
  try {
    const existing = readFileSync(safePath, 'utf-8');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    backupPath = `${safePath}.${timestamp}.bak`;
    writeFileSync(backupPath, existing);
  } catch (err) {
    // File doesn't exist yet, no backup needed
  }
  
  // Ensure directory exists
  mkdirSync(dirname(safePath), { recursive: true });
  
  // Write new content
  writeFileSync(safePath, content);
  
  return {
    hash: newHash,
    backupPath: backupPath ? relative(SAFE_ROOT, backupPath) : '',
    timestamp: new Date().toISOString()
  };
}

/**
 * List files in directory
 */
export function listDocs(dirPath: string = '.'): string[] {
  const safePath = validatePath(dirPath);
  // Placeholder - would use readdirSync in real impl
  return [];
}
