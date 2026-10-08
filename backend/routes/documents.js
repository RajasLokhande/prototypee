import express from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all documents for the authenticated user
router.get('/', authenticateToken, (req, res) => {
  try {
    const documents = db.prepare(
      'SELECT id, title, content, owner_id, created_at, updated_at FROM documents WHERE owner_id = ?'
    ).all(req.user.id);

    res.json({ documents });
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get a specific document by ID - VULNERABLE VERSION (IDOR/BOLA)
// This is the intentionally vulnerable endpoint that allows unauthorized access
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const documentId = req.params.id;

    // VULNERABILITY: Missing authorization check
    // The endpoint authenticates the user but doesn't verify if they own the document
    const document = db.prepare(
      'SELECT id, title, content, owner_id, created_at, updated_at FROM documents WHERE id = ?'
    ).get(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // SECURITY FLAW: Returns document without checking if req.user.id === document.owner_id
    res.json({ document });

  } catch (err) {
    console.error('Error fetching document:', err);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Create a new document
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const stmt = db.prepare(
      'INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)'
    );
    const result = stmt.run(title, content, req.user.id);

    const document = db.prepare(
      'SELECT id, title, content, owner_id, created_at, updated_at FROM documents WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Document created successfully',
      document
    });
  } catch (err) {
    console.error('Error creating document:', err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update a document
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { title, content } = req.body;
    const documentId = req.params.id;

    // Check ownership for updates (this one is secure)
    const document = db.prepare('SELECT owner_id FROM documents WHERE id = ?').get(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this document' });
    }

    const stmt = db.prepare(
      'UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(title, content, documentId);

    const updated = db.prepare(
      'SELECT id, title, content, owner_id, created_at, updated_at FROM documents WHERE id = ?'
    ).get(documentId);

    res.json({
      message: 'Document updated successfully',
      document: updated
    });
  } catch (err) {
    console.error('Error updating document:', err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete a document
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const documentId = req.params.id;

    // Check ownership for deletion (this one is secure)
    const document = db.prepare('SELECT owner_id FROM documents WHERE id = ?').get(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this document' });
    }

    db.prepare('DELETE FROM documents WHERE id = ?').run(documentId);

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
