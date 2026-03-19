import React, { useState } from 'react';
import { documentAPI } from '../utils/api';

export default function CollaboratorPanel({ documentId, document, isOwner, onClose, onUpdate }) {
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const collaborators = document?.collaborators || [];
  const owner = document?.owner;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    setError('');
    setSuccess('');
    try {
      const res = await documentAPI.addCollaborator(documentId, email);
      onUpdate(prev => ({ ...prev, collaborators: res.data.collaborators }));
      setSuccess(`${email} added as collaborator!`);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add collaborator');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this collaborator?')) return;
    try {
      await documentAPI.removeCollaborator(documentId, userId);
      onUpdate(prev => ({
        ...prev,
        collaborators: prev.collaborators.filter(c => c._id !== userId),
      }));
    } catch (err) {
      setError('Failed to remove collaborator');
    }
  };

  const shareUrl = `${window.location.origin}/document/${documentId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setSuccess('Link copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <div className="side-panel-content">
      <div className="panel-header">
        <h3>Share & Collaborate</h3>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="panel-body">
        {/* Share link */}
        <div className="share-link-section">
          <label className="panel-label">Share Link</label>
          <div className="share-link-row">
            <input
              className="share-link-input"
              value={shareUrl}
              readOnly
            />
            <button className="copy-btn" onClick={handleCopyLink}>Copy</button>
          </div>
        </div>

        {/* People with access */}
        <div className="access-section">
          <label className="panel-label">People with access</label>

          {owner && (
            <div className="collaborator-row owner">
              <div className="collab-avatar" style={{ backgroundColor: '#6C63FF' }}>
                {owner.username?.[0]?.toUpperCase()}
              </div>
              <div className="collab-info">
                <span className="collab-name">{owner.username}</span>
                <span className="collab-email">{owner.email}</span>
              </div>
              <span className="collab-role owner-role">Owner</span>
            </div>
          )}

          {collaborators.map(c => (
            <div key={c._id} className="collaborator-row">
              <div className="collab-avatar" style={{ backgroundColor: '#45B7D1' }}>
                {c.username?.[0]?.toUpperCase()}
              </div>
              <div className="collab-info">
                <span className="collab-name">{c.username}</span>
                <span className="collab-email">{c.email}</span>
              </div>
              <span className="collab-role">Editor</span>
              {isOwner && (
                <button
                  className="remove-collab-btn"
                  onClick={() => handleRemove(c._id)}
                  title="Remove collaborator"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {collaborators.length === 0 && !owner && (
            <p className="panel-empty-text">No collaborators yet.</p>
          )}
        </div>

        {/* Add collaborator */}
        {isOwner && (
          <div className="add-collab-section">
            <label className="panel-label">Add Collaborator</label>
            <form onSubmit={handleAdd}>
              <div className="add-collab-row">
                <input
                  type="email"
                  className="collab-email-input"
                  placeholder="Enter email address..."
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="add-collab-btn" disabled={adding}>
                  {adding ? '...' : 'Invite'}
                </button>
              </div>
            </form>
          </div>
        )}

        {error && <div className="panel-error">{error}</div>}
        {success && <div className="panel-success">{success}</div>}
      </div>
    </div>
  );
}
