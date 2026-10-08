import { useState, useEffect } from 'react';
import axios from 'axios';
import './Portal.css';

function Portal({ user, token }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data.documents);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      alert('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post('/api/documents', 
        { title, content },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setTitle('');
      setContent('');
      setShowCreateForm(false);
      fetchDocuments();
    } catch (err) {
      alert('Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  const deleteDocument = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await axios.delete(`/api/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDocuments();
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  return (
    <div className="portal">
      <div className="container">
        <div className="portal-header">
          <h1>Document Portal</h1>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)} 
            className="btn btn-primary"
          >
            {showCreateForm ? 'Cancel' : '+ New Document'}
          </button>
        </div>

        {showCreateForm && (
          <div className="card create-form">
            <h3>Create New Document</h3>
            <form onSubmit={createDocument}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter document title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea
                  className="input textarea"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter document content"
                  rows="6"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating...' : 'Create Document'}
              </button>
            </form>
          </div>
        )}

        <div className="documents-section">
          <h2>My Documents</h2>
          {loading ? (
            <div className="card">
              <p>Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="card">
              <p>No documents yet. Create your first document!</p>
            </div>
          ) : (
            <div className="documents-grid">
              {documents.map((doc) => (
                <div key={doc.id} className="card document-card">
                  <h3>{doc.title}</h3>
                  <p className="document-excerpt">{doc.content.substring(0, 100)}...</p>
                  <div className="document-meta">
                    <span className="badge">ID: {doc.id}</span>
                    <span className="document-date">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="document-actions">
                    <button 
                      onClick={() => deleteDocument(doc.id)} 
                      className="btn btn-outline btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Portal;
