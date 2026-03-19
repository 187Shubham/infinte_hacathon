import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { documentAPI } from '../utils/api';
import VersionHistory from '../components/VersionHistory';
import CollaboratorPanel from '../components/CollaboratorPanel';

const SAVE_INTERVAL = 5000;

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

  const editorRef = useRef(null);
  const saveTimerRef = useRef(null);
  const contentRef = useRef('');
  const titleRef = useRef('Untitled Document');
  const isRemoteChange = useRef(false);

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

    // Join document room
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
      isRemoteChange.current = true;
      setContent(newContent);
      contentRef.current = newContent;
      setSaveStatus('unsaved');

      // Preserve cursor position
      const editor = editorRef.current;
      if (editor) {
        const selStart = editor.selectionStart;
        const selEnd = editor.selectionEnd;
        editor.value = newContent;
        editor.setSelectionRange(selStart, selEnd);
      }
      isRemoteChange.current = false;
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

  const handleContentChange = useCallback((e) => {
    const newContent = e.target.value;
    setContent(newContent);
    contentRef.current = newContent;
    setSaveStatus('unsaved');

    // Broadcast to others
    emit('send-changes', {
      documentId: id,
      content: newContent,
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

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    // Tab support
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newValue);
      contentRef.current = newValue;
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

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
    <div className="editor-page">
      {/* Top Bar */}
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
          {/* Active users avatars */}
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
            title="Collaborators"
          >
            👥 Share
          </button>

          <button
            className="toolbar-btn"
            onClick={() => { setShowVersions(true); setShowCollaborators(false); }}
            title="Version history"
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
          <textarea
            ref={editorRef}
            className="editor-textarea"
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="Start writing your document here...

You can use plain text or Markdown-style formatting.
Press Ctrl+S (or Cmd+S) to save.
Changes sync in real-time with all collaborators."
            spellCheck
          />
        </div>

        {/* Version history panel */}
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

        {/* Collaborators panel */}
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

      {/* Status bar */}
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
