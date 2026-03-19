import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { documentAPI } from '../utils/api';
import VersionHistory from '../components/VersionHistory';
import CollaboratorPanel from '../components/CollaboratorPanel';
import ReactQuill from 'react-quill';               // ← NEW
import 'react-quill/dist/quill.snow.css';           // ← NEW

const SAVE_INTERVAL = 5000;

// ← NEW: Quill toolbar config
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'code-block'],
  ['link'],
  ['clean'],
];

export default function DocumentEditor() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { socket, connected, emit, on, off } = useSocket(token);

  const [title, setTitle] = useState('Untitled Document');
  const [content, setContent] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [version, setVersion] = useState(1);
  const [showVersions, setShowVersions] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [notification, setNotification] = useState('');

  const saveTimerRef = useRef(null);
  const contentRef = useRef('');
  const titleRef = useRef('Untitled Document');

  // Load document from API
  useEffect(() => {
    documentAPI.getById(id)
      .then(res => {
        const doc = res.data.document;
        setDocumentData(doc);
        setTitle(doc.title);
        setContent(doc.content);
        setVersion(doc.version);
        setIsOwner(doc.owner._id === user?.id || doc.owner._id?.toString() === user?.id);
        titleRef.current = doc.title;
        contentRef.current = doc.content;
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load document');
        setLoading(false);
      });
  }, [id, user]);

  // Socket events
  useEffect(() => {
    if (!connected || !id) return;

    emit('join-document', { documentId: id });

    const handleLoad = ({ content: docContent, title: docTitle, version: docVersion }) => {
      setContent(docContent);
      setTitle(docTitle);
      setVersion(docVersion);
      contentRef.current = docContent;
      titleRef.current = docTitle;
    };

    const handleReceiveChanges = ({ content: newContent, userId }) => {
      if (userId === user?.id) return;
      setContent(newContent);
      contentRef.current = newContent;
      setSaveStatus('unsaved');
    };

    const handleUsersUpdate = (users) => {
      setActiveUsers(users);
    };

    const handleDocumentSaved = ({ version: v, savedAt: at, savedBy }) => {
      setVersion(v);
      setSavedAt(new Date(at));
      setSaveStatus('saved');
      setSaving(false);
      if (savedBy !== user?.username) {
        showNotification(`Saved by ${savedBy}`);
      }
    };

    const handleDocumentReverted = ({ content: newContent, version: v, revertedTo }) => {
      setContent(newContent);
      setVersion(v);
      contentRef.current = newContent;
      showNotification(`Reverted to version ${revertedTo}`);
      setShowVersions(false);
    };

    const handleError = ({ message }) => {
      setError(message);
    };

    on('load-document', handleLoad);
    on('receive-changes', handleReceiveChanges);
    on('users-update', handleUsersUpdate);
    on('document-saved', handleDocumentSaved);
    on('document-reverted', handleDocumentReverted);
    on('error', handleError);

    return () => {
      off('load-document', handleLoad);
      off('receive-changes', handleReceiveChanges);
      off('users-update', handleUsersUpdate);
      off('document-saved', handleDocumentSaved);
      off('document-reverted', handleDocumentReverted);
      off('error', handleError);
    };
  }, [connected, id, user, emit, on, off]);

  // Auto-save
  useEffect(() => {
    if (saveStatus === 'unsaved') {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        handleSave();
      }, SAVE_INTERVAL);
    }
    return () => clearTimeout(saveTimerRef.current);
  }, [saveStatus, content, title]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // ← CHANGED: handles Quill's onChange (gives value string directly, not an event)
  const handleContentChange = useCallback((value) => {
    setContent(value);
    contentRef.current = value;
    setSaveStatus('unsaved');
    emit('send-changes', {
      documentId: id,
      content: value,
    });
  }, [id, emit]);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    titleRef.current = newTitle;
    setSaveStatus('unsaved');
  };

  const handleSave = useCallback(() => {
    if (saveStatus === 'saved') return;
    setSaving(true);
    setSaveStatus('saving');
    emit('save-document', {
      documentId: id,
      content: contentRef.current,
      title: titleRef.current,
    });
  }, [id, emit, saveStatus]);

  // Ctrl+S to save (attach to wrapper div since Quill owns the textarea)
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  // Word/char count — strip HTML tags from Quill's HTML output
  const plainText = content.replace(/<[^>]*>/g, '');
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const charCount = plainText.length;

  if (loading) return (
    <div className="editor-loading">
      <div className="loading-pulse">Loading document...</div>
    </div>
  );

  if (error) return (
    <div className="editor-error">
      <h2>⚠ {error}</h2>
      <button onClick={() => navigate('/')}>Go to Dashboard</button>
    </div>
  );

  return (
    <div className="editor-page" onKeyDown={handleKeyDown}>
      {/* Top Bar — unchanged */}
      <header className="editor-header">
        <div className="editor-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            ← Dashboard
          </button>
          <div className="title-wrapper">
            <input
              className="doc-title-input"
              value={title}
              onChange={handleTitleChange}
              onBlur={() => {
                if (title !== documentData?.title) {
                  documentAPI.updateTitle(id, title).catch(() => {});
                }
              }}
              placeholder="Untitled Document"
            />
          </div>
        </div>

        <div className="editor-header-center">
          <div className="active-users">
            {activeUsers.map((u, i) => (
              <div
                key={u.userId || i}
                className="user-bubble"
                style={{ backgroundColor: u.color, zIndex: 10 - i }}
                title={u.username}
              >
                {u.username?.[0]?.toUpperCase()}
              </div>
            ))}
            {activeUsers.length > 0 && (
              <span className="users-count">{activeUsers.length} online</span>
            )}
          </div>
        </div>

        <div className="editor-header-right">
          <div className={`save-status ${saveStatus}`}>
            {saveStatus === 'saved' && savedAt && (
              <><span className="status-dot saved" />Saved</>
            )}
            {saveStatus === 'unsaved' && (
              <><span className="status-dot unsaved" />Unsaved</>
            )}
            {saveStatus === 'saving' && (
              <><span className="status-dot saving" />Saving...</>
            )}
          </div>

          <button
            className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}
            title={connected ? 'Connected' : 'Disconnected'}
          >
            <span className="conn-dot" />
            {connected ? 'Live' : 'Offline'}
          </button>

          <button
            className="toolbar-btn"
            onClick={() => { setShowCollaborators(true); setShowVersions(false); }}
          >
            👥 Share
          </button>

          <button
            className="toolbar-btn"
            onClick={() => { setShowVersions(true); setShowCollaborators(false); }}
          >
            🕐 History
          </button>

          <button
            className="save-btn"
            onClick={handleSave}
            disabled={saving || saveStatus === 'saved'}
          >
            {saving ? 'Saving...' : '⌘ Save'}
          </button>
        </div>
      </header>

      {notification && (
        <div className="notification-banner">{notification}</div>
      )}

      {/* Main editor area */}
      <div className="editor-container">
        <div className="editor-paper">

          {/* ← CHANGED: ReactQuill replaces <textarea> */}
          <div className="editor-quill-wrapper">
            <ReactQuill
              theme="snow"
              value={content}
              onChange={handleContentChange}
              modules={{ toolbar: TOOLBAR_OPTIONS }}
              placeholder="Start writing... changes sync in real-time with all collaborators."
            />
          </div>

        </div>

        {showVersions && (
          <div className="side-panel">
            <VersionHistory
              documentId={id}
              currentVersion={version}
              socket={socket}
              onClose={() => setShowVersions(false)}
            />
          </div>
        )}

        {showCollaborators && (
          <div className="side-panel">
            <CollaboratorPanel
              documentId={id}
              document={documentData}
              isOwner={isOwner}
              onClose={() => setShowCollaborators(false)}
              onUpdate={setDocumentData}
            />
          </div>
        )}
      </div>

      {/* Status bar — unchanged */}
      <footer className="editor-statusbar">
        <span>v{version}</span>
        <span>·</span>
        <span>{wordCount} words</span>
        <span>·</span>
        <span>{charCount} chars</span>
        <span>·</span>
        <span>{activeUsers.length} collaborator{activeUsers.length !== 1 ? 's' : ''} online</span>
        {savedAt && (
          <>
            <span>·</span>
            <span>Last saved {savedAt.toLocaleTimeString()}</span>
          </>
        )}
      </footer>
    </div>
  );
}