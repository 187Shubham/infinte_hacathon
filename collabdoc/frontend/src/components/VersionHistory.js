import React, { useState, useEffect } from 'react';
import { documentAPI } from '../utils/api';

export default function VersionHistory({ documentId, currentVersion, socket, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reverting, setReverting] = useState(null);

  useEffect(() => {
    documentAPI.getVersions(documentId)
      .then(res => {
        setVersions(res.data.versions);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [documentId]);

  const handleRevert = (versionNumber) => {
    if (!window.confirm(`Revert to version ${versionNumber}? Current changes will be saved as a new version.`)) return;
    setReverting(versionNumber);
    socket?.emit('revert-version', { documentId, versionNumber });
    setTimeout(() => setReverting(null), 2000);
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  return (
    <div className="side-panel-content">
      <div className="panel-header">
        <h3>Version History</h3>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="panel-body">
        {/* Current version */}
        <div className="version-item current">
          <div className="version-badge current">Current</div>
          <div className="version-info">
            <span className="version-num">Version {currentVersion}</span>
            <span className="version-label">Working copy</span>
          </div>
        </div>

        <div className="versions-divider">Previous versions</div>

        {loading ? (
          <div className="panel-loading">Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="panel-empty">
            <p>No saved versions yet.</p>
            <p className="panel-hint">Save your document to create a version snapshot.</p>
          </div>
        ) : (
          versions.map((v) => (
            <div key={v.versionNumber} className="version-item">
              <div className="version-info">
                <span className="version-num">Version {v.versionNumber}</span>
                <span className="version-date">{formatDate(v.savedAt)}</span>
                {v.savedBy && (
                  <span className="version-author">by {v.savedBy.username || 'Unknown'}</span>
                )}
                {v.isRevertSnapshot && (
                  <span className="version-tag revert">Revert snapshot</span>
                )}
              </div>
              {v.contentPreview && (
                <div className="version-preview">{v.contentPreview}...</div>
              )}
              <button
                className="revert-btn"
                onClick={() => handleRevert(v.versionNumber)}
                disabled={reverting === v.versionNumber}
              >
                {reverting === v.versionNumber ? 'Reverting...' : '↩ Revert'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
