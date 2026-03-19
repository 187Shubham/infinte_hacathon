import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

/* ─────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:         #f5f3ef;
  --surface:    #ffffff;
  --card:       #faf9f7;
  --border:     #e4e0d8;
  --border2:    #d0cab8;
  --accent:     #5b6af0;
  --accent-lt:  #eceeff;
  --accent2:    #e8634a;
  --accent3:    #2eab7b;
  --text:       #1a1916;
  --text2:      #5c5850;
  --muted:      #9e9888;
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:  0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05);
  --shadow-lg:  0 16px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.07);
  --font-body:  'Plus Jakarta Sans', sans-serif;
  --font-serif: 'Lora', Georgia, serif;
  --ease:       cubic-bezier(0.34,1.56,0.64,1);
}

body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 99px; }

.editor-shell { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

/* ── Connection banner ── */
.conn-banner {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 7px 20px; font-size: 12px; font-weight: 600;
  font-family: var(--font-body); transition: all 0.3s ease; flex-shrink: 0;
}
.conn-banner.connecting { background: #fef3c7; color: #92400e; }
.conn-banner.connected  { background: #d1fae5; color: #065f46; }
.conn-banner.error      { background: #fee2e2; color: #991b1b; }
.conn-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.connecting .conn-dot { background: #f59e0b; animation: blink 1s infinite; }
.connected  .conn-dot { background: #10b981; }
.error      .conn-dot { background: #ef4444; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

/* ── Top Nav ── */
.top-nav {
  height: 54px; display: flex; align-items: center; gap: 12px;
  padding: 0 20px; background: var(--surface);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-sm); flex-shrink: 0; z-index: 100;
}
.nav-back {
  background: none; border: none; color: var(--text2);
  font-family: var(--font-body); font-size: 13px; font-weight: 500;
  cursor: pointer; padding: 6px 10px; border-radius: 7px;
  transition: background 0.15s, color 0.15s; white-space: nowrap;
}
.nav-back:hover { background: var(--bg); color: var(--text); }
.nav-divider { width: 1px; height: 20px; background: var(--border); flex-shrink: 0; }
.nav-title-input {
  flex: 1; border: none; outline: none; background: none;
  font-family: var(--font-body); font-size: 15px; font-weight: 700;
  color: var(--text); min-width: 0;
}
.nav-title-input::placeholder { color: var(--muted); }
.nav-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.save-status {
  font-size: 12px; color: var(--muted); display: flex;
  align-items: center; gap: 5px; white-space: nowrap;
}
.save-dot { width: 6px; height: 6px; border-radius: 50%; }

.collab-avatars { display: flex; }
.collab-av {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff;
  border: 2px solid var(--surface); margin-left: -6px;
  cursor: default; transition: transform 0.2s; position: relative;
}
.collab-av:hover { transform: translateY(-3px); z-index: 10; }
.collab-tip {
  position: absolute; bottom: -24px; left: 50%; transform: translateX(-50%);
  background: var(--text); color: #fff; font-size: 10px; padding: 2px 7px;
  border-radius: 5px; white-space: nowrap; pointer-events: none;
  opacity: 0; transition: opacity 0.15s;
}
.collab-av:hover .collab-tip { opacity: 1; }

.btn-primary {
  display: flex; align-items: center; gap: 6px;
  color: #fff; border: none; font-family: var(--font-body);
  font-size: 13px; font-weight: 600; padding: 7px 16px; border-radius: 8px;
  cursor: pointer; transition: opacity 0.2s, transform 0.15s;
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-save  { background: var(--accent3); box-shadow: 0 2px 10px rgba(46,171,123,0.3); }
.btn-share { background: var(--accent);  box-shadow: 0 2px 10px rgba(91,106,240,0.3); }

/* ── Toolbar ── */
.toolbar-wrap {
  background: var(--surface); border-bottom: 1px solid var(--border);
  padding: 0 20px; flex-shrink: 0; z-index: 90;
}
.toolbar {
  display: flex; align-items: center; gap: 2px;
  height: 44px; overflow-x: auto; scrollbar-width: none;
}
.toolbar::-webkit-scrollbar { display: none; }
.tb-sep { width: 1px; height: 22px; background: var(--border); margin: 0 6px; flex-shrink: 0; }
.tb-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 7px; border: none;
  background: none; color: var(--text2); font-size: 14px;
  cursor: pointer; flex-shrink: 0; transition: background 0.15s, color 0.15s;
}
.tb-btn:hover { background: var(--bg); color: var(--text); }
.tb-select {
  border: 1px solid var(--border); background: var(--bg);
  color: var(--text2); font-family: var(--font-body); font-size: 12px;
  padding: 4px 8px; border-radius: 7px; outline: none;
  cursor: pointer; flex-shrink: 0;
}
.tb-color {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid var(--border); cursor: pointer;
  padding: 0; flex-shrink: 0;
}

/* ── Body ── */
.editor-body { display: flex; flex: 1; overflow: hidden; }

/* ── Sidebar ── */
.sidebar {
  width: 220px; background: var(--card); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; flex-shrink: 0;
  transition: width 0.25s ease; overflow: hidden;
}
.sidebar.collapsed { width: 0; border: none; }
.sidebar-inner { width: 220px; display: flex; flex-direction: column; height: 100%; padding: 16px 12px; gap: 4px; overflow-y: auto; }
.sidebar-section {
  font-size: 10px; font-weight: 700; color: var(--muted);
  letter-spacing: 0.08em; text-transform: uppercase; padding: 10px 8px 4px;
}
.sidebar-item {
  display: flex; align-items: center; gap: 9px; padding: 8px 10px;
  border-radius: 8px; cursor: pointer; font-size: 13px;
  color: var(--text2); font-weight: 500; transition: background 0.15s, color 0.15s;
  border: none; background: none; width: 100%; text-align: left;
}
.sidebar-item:hover  { background: var(--border); color: var(--text); }
.sidebar-item.active { background: var(--accent-lt); color: var(--accent); }
.sidebar-icon { font-size: 15px; flex-shrink: 0; }
.badge {
  margin-left: auto; background: var(--accent-lt); color: var(--accent);
  font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 99px;
}

.version-item {
  padding: 10px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface); font-size: 12px; cursor: pointer;
  transition: border-color 0.15s, background 0.15s; margin-bottom: 6px;
}
.version-item:hover { border-color: var(--accent); background: var(--accent-lt); }
.version-num { font-weight: 700; color: var(--accent); font-size: 11px; }
.version-by { color: var(--text2); margin-top: 2px; }
.version-date { color: var(--muted); font-size: 10px; }

.word-count {
  margin-top: auto; padding: 12px 10px; border-top: 1px solid var(--border);
  font-size: 11px; color: var(--muted); display: flex; flex-direction: column; gap: 6px;
}
.wc-row { display: flex; justify-content: space-between; }
.wc-val { font-weight: 600; color: var(--text2); }

/* ── Canvas ── */
.editor-canvas {
  flex: 1; overflow-y: auto; background: var(--bg);
  display: flex; flex-direction: column; align-items: center;
  padding: 40px 24px 120px;
}

/* ── Paper ── */
.paper {
  width: 100%; max-width: 740px; background: var(--surface);
  border-radius: 14px; box-shadow: var(--shadow-md), 0 0 0 1px var(--border);
  padding: 60px 72px; animation: riseIn 0.35s ease both;
}
@keyframes riseIn { from { opacity:0; transform:translateY(14px); } }
@media (max-width: 700px) { .paper { padding: 36px 24px; } }

.paper-title {
  font-family: var(--font-serif); font-size: 32px; font-weight: 600;
  color: var(--text); border: none; outline: none; width: 100%;
  background: none; line-height: 1.25; margin-bottom: 6px; resize: none;
}
.paper-title::placeholder { color: var(--border2); }
.paper-meta {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  font-size: 12px; color: var(--muted); margin-bottom: 28px;
  padding-bottom: 20px; border-bottom: 1px solid var(--border);
}

.rich-area {
  font-family: var(--font-serif); font-size: 16.5px; line-height: 1.85;
  color: var(--text); outline: none; min-height: 360px; word-break: break-word;
}
.rich-area:empty::before {
  content: attr(data-placeholder); color: var(--muted); pointer-events: none;
}
.rich-area h1 { font-size: 28px; font-weight: 600; margin: 24px 0 10px; }
.rich-area h2 { font-size: 22px; font-weight: 600; margin: 20px 0 8px; }
.rich-area h3 { font-size: 18px; font-weight: 600; margin: 16px 0 6px; }
.rich-area p  { margin-bottom: 14px; }
.rich-area blockquote {
  border-left: 3px solid var(--accent); margin: 20px 0;
  padding: 12px 20px; background: var(--accent-lt);
  border-radius: 0 8px 8px 0; font-style: italic; color: var(--text2);
}
.rich-area ul, .rich-area ol { margin: 12px 0 12px 24px; }
.rich-area li  { margin-bottom: 6px; }
.rich-area a   { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
.rich-area code {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 5px; padding: 2px 6px; font-size: 14px; font-family: monospace;
}
.rich-area pre {
  background: #1e1e2e; color: #cdd6f4; border-radius: 10px;
  padding: 20px 24px; margin: 16px 0; overflow-x: auto;
  font-size: 13.5px; font-family: monospace; line-height: 1.6;
}
.rich-area hr { border: none; border-top: 1px solid var(--border); margin: 28px 0; }
.rich-area table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
.rich-area th { background: var(--bg); font-weight: 700; text-align: left; padding: 10px 14px; border: 1px solid var(--border); }
.rich-area td { padding: 9px 14px; border: 1px solid var(--border); }
.rich-area tr:hover td { background: var(--bg); }

/* Inline images */
.inline-img-wrap {
  position: relative; display: block; margin: 16px 0;
  border-radius: 10px; overflow: hidden;
  box-shadow: var(--shadow-md); border: 2px solid transparent;
  transition: border-color 0.2s;
}
.inline-img-wrap:hover { border-color: var(--accent); }
.inline-img-wrap img { display: block; max-width: 100%; border-radius: 8px; }
.img-caption {
  text-align: center; font-size: 12px; color: var(--muted);
  font-family: var(--font-body); padding: 6px 0 2px;
  border: none; outline: none; width: 100%; background: none;
}
.img-caption::placeholder { color: var(--border2); }
.img-del {
  position: absolute; top: 6px; right: 6px;
  background: rgba(0,0,0,0.55); color: #fff; border: none;
  border-radius: 50%; width: 22px; height: 22px; font-size: 11px;
  cursor: pointer; display: none; align-items: center; justify-content: center;
}
.inline-img-wrap:hover .img-del { display: flex; }

/* Attachments */
.attachments-strip { margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border); }
.attachments-title { font-size: 12px; font-weight: 700; color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px; }
.attach-list { display: flex; flex-direction: column; gap: 8px; }
.attach-item {
  display: flex; align-items: center; gap: 12px;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 10px; padding: 10px 14px; transition: border-color 0.2s;
}
.attach-item:hover { border-color: var(--accent); }
.attach-icon { font-size: 22px; flex-shrink: 0; }
.attach-info { flex: 1; min-width: 0; }
.attach-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.attach-size { font-size: 11px; color: var(--muted); }
.attach-del { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 13px; }
.attach-del:hover { color: var(--accent2); }

/* Drop overlay */
.drop-zone {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(91,106,240,0.08); backdrop-filter: blur(4px);
  border: 3px dashed var(--accent); border-radius: 20px; margin: 16px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; pointer-events: none; animation: fadeIn 0.18s ease;
}
@keyframes fadeIn { from { opacity:0; } }
.drop-zone-icon { font-size: 56px; animation: bounce 0.6s ease infinite alternate; }
@keyframes bounce { to { transform: translateY(-12px); } }
.drop-zone-label { font-size: 20px; font-weight: 700; color: var(--accent); }
.drop-zone-sub { font-size: 13px; color: var(--text2); }

/* Upload panel */
.upload-panel {
  position: fixed; right: 0; top: 0; bottom: 0; width: 300px;
  background: var(--surface); border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg); z-index: 200; display: flex; flex-direction: column;
  animation: slideLeft 0.25s var(--ease);
}
@keyframes slideLeft { from { transform: translateX(100%); opacity: 0; } }
.upload-panel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--border);
}
.upload-panel-head h3 { font-size: 15px; font-weight: 700; }
.panel-close { background: none; border: none; font-size: 16px; cursor: pointer; color: var(--muted); }
.panel-close:hover { color: var(--text); }
.upload-panel-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.drop-target {
  border: 2px dashed var(--border2); border-radius: 12px;
  padding: 28px 20px; text-align: center; cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.drop-target:hover, .drop-target.over { border-color: var(--accent); background: var(--accent-lt); }
.drop-target-icon { font-size: 32px; margin-bottom: 10px; }
.drop-target p { font-size: 13px; color: var(--text2); margin-bottom: 4px; font-weight: 500; }
.drop-target span { font-size: 11px; color: var(--muted); }
.panel-section-title { font-size: 11px; font-weight: 700; color: var(--muted); letter-spacing: 0.07em; text-transform: uppercase; }
.panel-btn {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg); border: 1px solid var(--border); border-radius: 10px;
  padding: 12px 14px; font-family: var(--font-body); font-size: 13px; font-weight: 500;
  color: var(--text2); cursor: pointer; width: 100%;
  transition: border-color 0.2s, background 0.2s, color 0.2s;
}
.panel-btn:hover { border-color: var(--accent); background: var(--accent-lt); color: var(--accent); }
.panel-btn-icon { font-size: 18px; }
.file-input { display: none; }

/* Bubble menu */
.bubble-menu {
  position: fixed; z-index: 300; background: var(--text); border-radius: 10px;
  padding: 5px 6px; display: flex; gap: 2px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2); animation: popIn 0.15s var(--ease);
}
@keyframes popIn { from { opacity:0; transform:scale(0.85) translateY(6px); } }
.bb-btn {
  background: none; border: none; color: rgba(255,255,255,0.8);
  width: 28px; height: 28px; border-radius: 6px; font-size: 13px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.bb-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }

/* Toast */
.toast-area { position: fixed; bottom: 24px; right: 24px; z-index: 600; display: flex; flex-direction: column; gap: 8px; }
.toast {
  background: var(--text); color: #fff; font-size: 13px; font-family: var(--font-body);
  padding: 12px 18px; border-radius: 10px; box-shadow: var(--shadow-lg);
  display: flex; align-items: center; gap: 8px; animation: popIn 0.25s var(--ease);
}
.toast.success { background: var(--accent3); }
.toast.error   { background: var(--accent2); }
.toast.info    { background: var(--accent); }

.page-indicator {
  margin-top: 24px; font-size: 11px; color: var(--muted);
  display: flex; align-items: center; gap: 6px;
}
.page-line { height: 1px; flex: 1; background: var(--border); }
`;

/* ── Helpers ── */
function fileIcon(type = '') {
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf') return '📕';
  if (type.includes('word') || type.includes('document')) return '📘';
  if (type.includes('sheet') || type.includes('excel')) return '📗';
  if (type.includes('presentation') || type.includes('powerpoint')) return '📙';
  if (type.includes('zip') || type.includes('rar')) return '🗜️';
  if (type.includes('text')) return '📄';
  return '📎';
}
function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return { toasts, add };
}

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5001';

/* ═══════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════ */
export default function DocumentEditor() {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const { user }  = useAuth();

  // Inject CSS once
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  /* ── Refs ── */
  const socketRef    = useRef(null);
  const editorRef    = useRef(null);
  const fileInputRef = useRef(null);
  const imgInputRef  = useRef(null);
  const saveTimer    = useRef(null);
  const isRemote     = useRef(false); // prevent echo loop

  /* ── State ── */
  const [connStatus,  setConnStatus]  = useState('connecting');
  const [title,       setTitle]       = useState('Untitled Document');
  const [saveState,   setSaveState]   = useState('saved');   // saved | unsaved | saving
  const [activeUsers, setActiveUsers] = useState([]);
  const [versions,    setVersions]    = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePanel, setActivePanel] = useState('editor');
  const [uploadOpen,  setUploadOpen]  = useState(false);
  const [overDrop,    setOverDrop]    = useState(false);
  const [dragging,    setDragging]    = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [images,      setImages]      = useState([]);
  const [bubble,      setBubble]      = useState(null);
  const [wordCount,   setWordCount]   = useState({ words: 0, chars: 0, readTime: 0 });
  const { toasts, add: toast }        = useToasts();

  /* ══════════════════════════════════════
     SOCKET CONNECTION
  ══════════════════════════════════════ */
  useEffect(() => {
    if (!documentId || !user) return;

    // token stored by your auth flow
    const token =
      localStorage.getItem('token') ||
      sessionStorage.getItem('token');

    const socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    // ── lifecycle ──
    socket.on('connect', () => {
      setConnStatus('connected');
      socket.emit('join-document', { documentId });
    });
    socket.on('connect_error', err => {
      setConnStatus('error');
      toast(`Connection failed: ${err.message}`, 'error');
    });
    socket.on('disconnect', reason => {
      setConnStatus('connecting');
      if (reason !== 'io client disconnect')
        toast('Lost connection — reconnecting…', 'error');
    });
    socket.on('reconnect', () => {
      setConnStatus('connected');
      socket.emit('join-document', { documentId });
      toast('Reconnected ✓', 'success');
    });

    // ── load document from server ──
    socket.on('load-document', ({ content, title: t, version }) => {
      setTitle(t || 'Untitled Document');
      if (editorRef.current) {
        isRemote.current = true;
        editorRef.current.innerHTML = content || '';
        isRemote.current = false;
        calcWordCount();
      }
      setSaveState('saved');
      toast(`Loaded v${version}`, 'info');
    });

    // ── receive remote changes ──
    socket.on('receive-changes', ({ content, userId: uid }) => {
      if (uid === user.id || !editorRef.current) return;

      // save + restore cursor so typing position isn't lost
      const sel = window.getSelection();
      let range = null;
      if (sel && sel.rangeCount > 0) range = sel.getRangeAt(0).cloneRange();

      isRemote.current = true;
      editorRef.current.innerHTML = content;
      isRemote.current = false;
      calcWordCount();

      if (range) { try { sel.removeAllRanges(); sel.addRange(range); } catch (_) {} }
    });

    // ── live users list ──
    socket.on('users-update', users => setActiveUsers(users));

    // ── save confirmation ──
    socket.on('document-saved', ({ version, savedAt, savedBy }) => {
      setSaveState('saved');
      setVersions(prev => [{ versionNumber: version, savedAt, savedBy }, ...prev.slice(0, 19)]);
    });

    // ── revert confirmation ──
    socket.on('document-reverted', ({ content, version }) => {
      if (editorRef.current) {
        isRemote.current = true;
        editorRef.current.innerHTML = content;
        isRemote.current = false;
        calcWordCount();
      }
      setSaveState('saved');
      toast(`Reverted to v${version}`, 'info');
    });

    socket.on('error', ({ message }) => toast(message, 'error'));

    return () => socket.disconnect();
  }, [documentId, user]); // eslint-disable-line

  /* ══════════════════════════════════════
     EMIT CHANGES  (called on every keystroke)
  ══════════════════════════════════════ */
  const emitChanges = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !editorRef.current) return;
    socket.emit('send-changes', {
      documentId,
      delta:   null,
      content: editorRef.current.innerHTML,
    });
  }, [documentId]);

  /* ── Auto-save: debounced 3 s after last keystroke ── */
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('unsaved');
    saveTimer.current = setTimeout(() => {
      const socket = socketRef.current;
      if (!socket || !editorRef.current) return;
      setSaveState('saving');
      socket.emit('save-document', {
        documentId,
        content: editorRef.current.innerHTML,
        title,
      });
    }, 3000);
  }, [documentId, title]);

  /* ── Manual save ── */
  const manualSave = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !editorRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    socket.emit('save-document', {
      documentId,
      content: editorRef.current.innerHTML,
      title,
    });
  }, [documentId, title]);

  /* ── ⌘S shortcut ── */
  useEffect(() => {
    const h = e => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); manualSave(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [manualSave]);

  /* ══════════════════════════════════════
     EDITOR EVENTS
  ══════════════════════════════════════ */
  const calcWordCount = () => {
    const text = editorRef.current?.innerText || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount({ words, chars: text.replace(/\s/g, '').length, readTime: Math.max(1, Math.ceil(words / 200)) });
  };

  const handleInput = useCallback(() => {
    if (isRemote.current) return;
    calcWordCount();
    emitChanges();   // broadcast to other users immediately
    scheduleSave();  // persist to DB after 3 s idle
  }, [emitChanges, scheduleSave]);

  const handleTitleChange = e => {
    setTitle(e.target.value);
    scheduleSave();
  };

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) { setBubble(null); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setBubble({ x: rect.left + rect.width / 2, y: rect.top - 10 });

    socketRef.current?.emit('cursor-move', {
      documentId,
      cursor: { x: rect.left, y: rect.top },
    });
  }, [documentId]);

  /* ── Exec command + re-emit ── */
  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleInput();
  };

  /* ── Revert to version ── */
  const revertVersion = (versionNumber) => {
    if (!socketRef.current) return;
    if (!window.confirm(`Revert to v${versionNumber}? Current content will be snapshotted.`)) return;
    socketRef.current.emit('revert-version', { documentId, versionNumber });
  };

  /* ══════════════════════════════════════
     FILE / IMAGE HANDLING
  ══════════════════════════════════════ */
  const insertImageInline = useCallback((url, name) => {
    setImages(prev => [...prev, { id: Date.now().toString(), url, name, caption: '' }]);
    toast(`Image "${name}" inserted`, 'success');
    scheduleSave();
  }, [scheduleSave]); // eslint-disable-line

  const processFiles = useCallback(files => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        insertImageInline(URL.createObjectURL(file), file.name);
      } else {
        setAttachments(prev => [...prev, { id: Date.now() + Math.random(), file, url: URL.createObjectURL(file) }]);
        toast(`"${file.name}" attached`, 'success');
      }
    });
  }, [insertImageInline]); // eslint-disable-line

  useEffect(() => {
    const over  = e => { e.preventDefault(); setDragging(true); };
    const leave = ()  => setDragging(false);
    const drop  = e  => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); };
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragover', over); window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop); };
  }, [processFiles]);

  /* ── Save state display ── */
  const ss = {
    saved:   { color: 'var(--accent3)', label: 'Saved' },
    unsaved: { color: '#f59e0b',        label: 'Unsaved changes' },
    saving:  { color: '#6b7280',        label: 'Saving…' },
  }[saveState];

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="editor-shell">

      {/* ── Connection Banner ── */}
      <div className={`conn-banner ${connStatus}`}>
        <div className="conn-dot" />
        {connStatus === 'connecting' && 'Connecting to server…'}
        {connStatus === 'connected'  && `Live · ${activeUsers.length} user${activeUsers.length !== 1 ? 's' : ''} in document`}
        {connStatus === 'error'      && "Can't reach server — changes won't sync until reconnected"}
      </div>

      {/* ── Top Nav ── */}
      <nav className="top-nav">
        <button className="nav-back" onClick={() => navigate('/')}>← Back</button>
        <div className="nav-divider" />
        <input
          className="nav-title-input"
          value={title}
          onChange={handleTitleChange}
          placeholder="Document title…"
        />
        <div className="nav-actions">
          <div className="save-status">
            <div className="save-dot" style={{ background: ss.color }} />
            {ss.label}
          </div>

          {/* Live collaborator avatars (others only) */}
          <div className="collab-avatars">
            {activeUsers
              .filter(u => u.userId !== user?.id)
              .map((u, i) => (
                <div key={i} className="collab-av" style={{ background: u.color }}>
                  {u.username?.[0]?.toUpperCase()}
                  <span className="collab-tip">{u.username}</span>
                </div>
              ))}
          </div>

          <button className="btn-primary btn-save" onClick={manualSave} disabled={saveState === 'saving'}>
            💾 {saveState === 'saving' ? 'Saving…' : 'Save'}
          </button>
          <button className="btn-primary btn-share">↗ Share</button>
        </div>
      </nav>

      {/* ── Toolbar ── */}
      <div className="toolbar-wrap">
        <div className="toolbar">
          <button className="tb-btn" title="Undo (⌘Z)"  onClick={() => exec('undo')}>↩</button>
          <button className="tb-btn" title="Redo (⌘Y)"  onClick={() => exec('redo')}>↪</button>
          <div className="tb-sep" />
          <select className="tb-select" onChange={e => exec('formatBlock', e.target.value)} defaultValue="p">
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="blockquote">Quote</option>
            <option value="pre">Code block</option>
          </select>
          <select className="tb-select" onChange={e => exec('fontName', e.target.value)}>
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans</option>
            <option value="monospace">Mono</option>
          </select>
          <div className="tb-sep" />
          <button className="tb-btn" title="Bold (⌘B)"        onClick={() => exec('bold')}><b>B</b></button>
          <button className="tb-btn" title="Italic (⌘I)"      onClick={() => exec('italic')}><i>I</i></button>
          <button className="tb-btn" title="Underline (⌘U)"   onClick={() => exec('underline')}><u>U</u></button>
          <button className="tb-btn" title="Strikethrough"     onClick={() => exec('strikeThrough')}><s>S</s></button>
          <div className="tb-sep" />
          <input type="color" className="tb-color" title="Text color"   defaultValue="#1a1916" onChange={e => exec('foreColor', e.target.value)} />
          <input type="color" className="tb-color" title="Highlight"    defaultValue="#fef08a" onChange={e => exec('hiliteColor', e.target.value)} />
          <div className="tb-sep" />
          <button className="tb-btn" title="Left"    onClick={() => exec('justifyLeft')}>⬅</button>
          <button className="tb-btn" title="Center"  onClick={() => exec('justifyCenter')}>↔</button>
          <button className="tb-btn" title="Right"   onClick={() => exec('justifyRight')}>➡</button>
          <div className="tb-sep" />
          <button className="tb-btn" title="Bullet list"   onClick={() => exec('insertUnorderedList')}>•≡</button>
          <button className="tb-btn" title="Numbered list" onClick={() => exec('insertOrderedList')}>1≡</button>
          <button className="tb-btn" title="Indent"        onClick={() => exec('indent')}>→</button>
          <button className="tb-btn" title="Outdent"       onClick={() => exec('outdent')}>←</button>
          <div className="tb-sep" />
          <button className="tb-btn" title="Insert link"  onClick={() => { const u = prompt('URL:'); if (u) exec('createLink', u); }}>🔗</button>
          <button className="tb-btn" title="Insert image" onClick={() => imgInputRef.current?.click()}>🖼️</button>
          <button className="tb-btn" title="Attach file"  onClick={() => setUploadOpen(true)}>📎</button>
          <button className="tb-btn" title="Insert table" onClick={() => exec('insertHTML', '<table><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell</td><td>Cell</td></tr></table><p></p>')}>⊞</button>
          <button className="tb-btn" title="Divider"      onClick={() => exec('insertHorizontalRule')}>—</button>
          <div className="tb-sep" />
          <button className="tb-btn" title="Toggle sidebar" onClick={() => setSidebarOpen(s => !s)}>◫</button>
          <button className="tb-btn" title="Files & images" onClick={() => setUploadOpen(o => !o)}>⬆</button>
          <button className="tb-btn" title="Save now (⌘S)" onClick={manualSave} style={{ color: 'var(--accent3)', fontWeight: 700 }}>💾</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="editor-body">

        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-inner">
            <div className="sidebar-section">Document</div>

            {[
              { icon: '📝', label: 'Editor',      key: 'editor' },
              { icon: '🖼️', label: 'Images',      key: 'images',      count: images.length },
              { icon: '📎', label: 'Attachments', key: 'attachments', count: attachments.length },
              { icon: '🕑', label: 'History',     key: 'history',     count: versions.length },
              { icon: '👥', label: 'Online now',  key: 'users',       count: activeUsers.length },
            ].map(item => (
              <button
                key={item.key}
                className={`sidebar-item ${activePanel === item.key ? 'active' : ''}`}
                onClick={() => {
                  setActivePanel(item.key);
                  if (item.key === 'images' || item.key === 'attachments') setUploadOpen(true);
                }}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {item.label}
                {item.count > 0 && <span className="badge">{item.count}</span>}
              </button>
            ))}

            {/* Version history */}
            {activePanel === 'history' && (
              versions.length === 0
                ? <p style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 10px' }}>No saved versions yet.</p>
                : versions.map(v => (
                  <div key={v.versionNumber} className="version-item" onClick={() => revertVersion(v.versionNumber)}>
                    <div className="version-num">v{v.versionNumber}</div>
                    <div className="version-by">by {v.savedBy}</div>
                    <div className="version-date">{new Date(v.savedAt).toLocaleString()}</div>
                  </div>
                ))
            )}

            {/* Online users */}
            {activePanel === 'users' && activeUsers.map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--surface)', borderRadius: 8, marginBottom: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: u.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{u.username}</span>
                {u.userId === user?.id && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>you</span>}
              </div>
            ))}

            <div className="word-count">
              <div className="wc-row"><span>Words</span>     <span className="wc-val">{wordCount.words.toLocaleString()}</span></div>
              <div className="wc-row"><span>Characters</span><span className="wc-val">{wordCount.chars.toLocaleString()}</span></div>
              <div className="wc-row"><span>Read time</span> <span className="wc-val">~{wordCount.readTime} min</span></div>
            </div>
          </div>
        </aside>

        {/* ── Canvas ── */}
        <div className="editor-canvas">
          <div className="paper">
            {/* Title */}
            <textarea
              className="paper-title"
              placeholder="Document title…"
              rows={1}
              value={title}
              onChange={handleTitleChange}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            />

            <div className="paper-meta">
              <span>✦ CollabDoc</span>
              <span>·</span>
              <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span>·</span>
              <span>{wordCount.words} words</span>
              {connStatus === 'connected' && activeUsers.length > 1 && (
                <><span>·</span><span style={{ color: 'var(--accent3)' }}>🟢 {activeUsers.length} online</span></>
              )}
            </div>

            {/* ── Editable body — all socket events wired here ── */}
            <div
              ref={editorRef}
              className="rich-area"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start writing… ⌘S to save · edits sync live to all collaborators"
              onInput={handleInput}
              onMouseUp={handleMouseUp}
              onKeyUp={handleMouseUp}
              spellCheck
            />

            {/* Inline images */}
            {images.length > 0 && (
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {images.map(img => (
                  <div key={img.id} className="inline-img-wrap">
                    <img src={img.url} alt={img.name} />
                    <button className="img-del" onClick={() => { setImages(p => p.filter(i => i.id !== img.id)); scheduleSave(); }}>✕</button>
                    <input
                      className="img-caption"
                      placeholder="Add a caption…"
                      value={img.caption}
                      onChange={e => setImages(p => p.map(i => i.id === img.id ? { ...i, caption: e.target.value } : i))}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="attachments-strip">
                <div className="attachments-title">📎 Attachments ({attachments.length})</div>
                <div className="attach-list">
                  {attachments.map(a => (
                    <div key={a.id} className="attach-item">
                      <div className="attach-icon">{fileIcon(a.file.type)}</div>
                      <div className="attach-info">
                        <div className="attach-name">{a.file.name}</div>
                        <div className="attach-size">{fmtSize(a.file.size)}</div>
                      </div>
                      <a href={a.url} download={a.file.name} style={{ color: 'var(--accent)', fontSize: 12, textDecoration: 'none', marginRight: 4 }}>↓</a>
                      <button className="attach-del" onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="page-indicator">
            <div className="page-line" /><span>Page 1</span><div className="page-line" />
          </div>
        </div>
      </div>

      {/* ── Upload / Media Panel ── */}
      {uploadOpen && (
        <div className="upload-panel">
          <div className="upload-panel-head">
            <h3>📎 Insert & Attach</h3>
            <button className="panel-close" onClick={() => setUploadOpen(false)}>✕</button>
          </div>
          <div className="upload-panel-body">
            <div
              className={`drop-target ${overDrop ? 'over' : ''}`}
              onDragOver={e => { e.preventDefault(); setOverDrop(true); }}
              onDragLeave={() => setOverDrop(false)}
              onDrop={e => { e.preventDefault(); setOverDrop(false); processFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="drop-target-icon">☁️</div>
              <p>Drop files or click to browse</p>
              <span>Images, PDFs, Docs — any file</span>
            </div>
            <div className="panel-section-title">Quick Insert</div>
            <button className="panel-btn" onClick={() => imgInputRef.current?.click()}>
              <span className="panel-btn-icon">🖼️</span> Upload Image
            </button>
            <button className="panel-btn" onClick={() => fileInputRef.current?.click()}>
              <span className="panel-btn-icon">📄</span> Upload Document
            </button>
            <button className="panel-btn" onClick={() => {
              const u = prompt('Paste image URL:');
              if (u) insertImageInline(u, 'External image');
            }}>
              <span className="panel-btn-icon">🔗</span> Image from URL
            </button>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={imgInputRef}  type="file" className="file-input" accept="image/*" multiple onChange={e => { processFiles(e.target.files); e.target.value = ''; }} />
      <input ref={fileInputRef} type="file" className="file-input" multiple           onChange={e => { processFiles(e.target.files); e.target.value = ''; }} />

      {/* Global drag overlay */}
      {dragging && (
        <div className="drop-zone">
          <div className="drop-zone-icon">☁️</div>
          <div className="drop-zone-label">Drop to insert</div>
          <div className="drop-zone-sub">Images inline · Other files attached</div>
        </div>
      )}

      {/* Bubble menu */}
      {bubble && (
        <div className="bubble-menu" style={{ left: bubble.x, top: bubble.y, transform: 'translate(-50%, -100%)' }}>
          <button className="bb-btn" onClick={() => exec('bold')}><b>B</b></button>
          <button className="bb-btn" onClick={() => exec('italic')}><i>I</i></button>
          <button className="bb-btn" onClick={() => exec('underline')}><u>U</u></button>
          <button className="bb-btn" onClick={() => { const u = prompt('URL:'); if (u) exec('createLink', u); }}>🔗</button>
          <button className="bb-btn" onClick={() => exec('hiliteColor', '#fef08a')}>✏️</button>
          <button className="bb-btn" onClick={() => exec('removeFormat')}>✗</button>
        </div>
      )}

      {/* Toasts */}
      <div className="toast-area">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'} {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
