const express = require('express');
const { Document } = require('../models/Document');
const { User } = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all documents for user
router.get('/', authenticate, async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id },
      ],
    })
      .populate('owner', 'username email')
      .populate('lastModifiedBy', 'username')
      .sort({ lastModified: -1 })
      .select('-content -versions');

    res.json({ documents });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create document
router.post('/', authenticate, async (req, res) => {
  try {
    const { title } = req.body;

    const document = new Document({
      title: title || 'Untitled Document',
      owner: req.user._id,
      lastModifiedBy: req.user._id,
    });

    await document.save();
    await document.populate('owner', 'username email');

    res.status(201).json({ document });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single document
router.get('/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('owner', 'username email')
      .populate('collaborators', 'username email')
      .populate('lastModifiedBy', 'username')
      .populate('versions.savedBy', 'username');

    if (!document) return res.status(404).json({ message: 'Document not found' });

    const hasAccess =
      document.owner._id.toString() === req.user._id.toString() ||
      document.collaborators.some(c => c._id.toString() === req.user._id.toString()) ||
      document.isPublic;

    if (!hasAccess) return res.status(403).json({ message: 'Access denied' });

    res.json({ document });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update document title
router.patch('/:id/title', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Not found' });

    const isOwner = document.owner.toString() === req.user._id.toString();
    const isCollaborator = document.collaborators.some(c => c.toString() === req.user._id.toString());

    if (!isOwner && !isCollaborator) return res.status(403).json({ message: 'Access denied' });

    document.title = req.body.title || document.title;
    document.lastModified = new Date();
    document.lastModifiedBy = req.user._id;
    await document.save();

    res.json({ document });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add collaborator
router.post('/:id/collaborators', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Not found' });

    if (document.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can add collaborators' });
    }

    const { email } = req.body;
    const collaboratorUser = await User.findOne({ email });
    if (!collaboratorUser) return res.status(404).json({ message: 'User not found' });

    if (document.collaborators.includes(collaboratorUser._id)) {
      return res.status(400).json({ message: 'User is already a collaborator' });
    }

    if (document.owner.toString() === collaboratorUser._id.toString()) {
      return res.status(400).json({ message: 'Owner cannot be added as collaborator' });
    }

    document.collaborators.push(collaboratorUser._id);
    await document.save();

    await document.populate('collaborators', 'username email');
    res.json({ collaborators: document.collaborators });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Remove collaborator
router.delete('/:id/collaborators/:userId', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Not found' });

    if (document.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can remove collaborators' });
    }

    document.collaborators = document.collaborators.filter(
      c => c.toString() !== req.params.userId
    );
    await document.save();

    res.json({ message: 'Collaborator removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get document versions
router.get('/:id/versions', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('versions.savedBy', 'username');

    if (!document) return res.status(404).json({ message: 'Not found' });

    const hasAccess =
      document.owner.toString() === req.user._id.toString() ||
      document.collaborators.some(c => c.toString() === req.user._id.toString());

    if (!hasAccess) return res.status(403).json({ message: 'Access denied' });

    const versions = document.versions.map(v => ({
      versionNumber: v.versionNumber,
      savedAt: v.savedAt,
      savedBy: v.savedBy,
      isRevertSnapshot: v.isRevertSnapshot,
      contentPreview: v.content.substring(0, 200),
    })).reverse();

    res.json({ versions, currentVersion: document.version });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete document
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Not found' });

    if (document.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can delete' });
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
