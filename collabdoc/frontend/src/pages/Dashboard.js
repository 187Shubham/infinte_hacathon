import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { documentAPI } from '../utils/api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [error, setError] = useState('');

  const fetchDocuments = async () => {
    try {
      const res = await documentAPI.getAll();
      setDocuments(res.data.documents);
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await documentAPI.create(newTitle || 'Untitled Document');
      navigate(`/document/${res.data.document._id}`);
    } catch (err) {
      setError('Failed to create document');
      setCreating(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document?')) return;
    try {
      await documentAPI.delete(id);
      setDocuments(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-brand">
          <span className="brand-icon-sm">✦</span>
          <span className="brand-name">CollabDoc</span>
        </div>
        <div className="header-user">
          <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <span className="user-name">{user?.username}</span>
          <button className="logout-btn" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-hero">
          <h2>Your Documents</h2>
          <button className="new-doc-btn" onClick={() => setShowNewDoc(true)}>
            <span>+</span> New Document
          </button>
        </div>

        {showNewDoc && (
          <div className="new-doc-overlay" onClick={() => setShowNewDoc(false)}>
            <div className="new-doc-modal" onClick={e => e.stopPropagation()}>
              <h3>Create New Document</h3>
              <form onSubmit={handleCreate}>
                <input
                  type="text"
                  placeholder="Document title..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                />
                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowNewDoc(false)}>Cancel</button>
                  <button type="submit" className="btn-create" disabled={creating}>
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading-grid">
            {[1, 2, 3].map(i => <div key={i} className="doc-skeleton" />)}
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No documents yet</h3>
            <p>Create your first document to get started</p>
            <button className="new-doc-btn" onClick={() => setShowNewDoc(true)}>
              + New Document
            </button>
          </div>
        ) : (
          <div className="documents-grid">
            {documents.map(doc => (
              <div
                key={doc._id}
                className="doc-card"
                onClick={() => navigate(`/document/${doc._id}`)}
              >
                <div className="doc-card-icon">📝</div>
                <div className="doc-card-body">
                  <h3 className="doc-title">{doc.title}</h3>
                  <div className="doc-meta">
                    <span className="doc-owner">
                      {doc.owner._id === user?.id ? 'You' : doc.owner.username}
                    </span>
                    <span className="doc-separator">·</span>
                    <span className="doc-date">{formatDate(doc.lastModified)}</span>
                  </div>
                  {doc.collaborators?.length > 0 && (
                    <div className="doc-collaborators">
                      <span className="collab-badge">{doc.collaborators.length} collaborator{doc.collaborators.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
                {doc.owner._id === user?.id && (
                  <button
                    className="doc-delete-btn"
                    onClick={(e) => handleDelete(doc._id, e)}
                    title="Delete document"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
