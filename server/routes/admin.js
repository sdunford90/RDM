const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated, isAdmin } = require('../auth');

const router = express.Router();
const prisma = new PrismaClient();

// All admin routes require auth + admin
router.use(isAuthenticated, isAdmin);

// GET /api/admin/overview — users + allowed emails
router.get('/overview', async (req, res) => {
  try {
    const [users, allowedEmails] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.allowedEmail.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);
    res.json({ users, allowedEmails });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ error: 'Failed to fetch admin data' });
  }
});

// POST /api/admin/allowed-emails — invite a new email
router.post('/allowed-emails', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    const entry = await prisma.allowedEmail.upsert({
      where: { email: email.toLowerCase().trim() },
      update: {},
      create: { email: email.toLowerCase().trim(), addedBy: req.user?.dbUser?.email || 'admin' },
    });
    res.json(entry);
  } catch (err) {
    console.error('Add allowed email error:', err);
    res.status(500).json({ error: 'Failed to add email' });
  }
});

// DELETE /api/admin/allowed-emails/:id — revoke access
router.delete('/allowed-emails/:id', async (req, res) => {
  try {
    await prisma.allowedEmail.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete allowed email error:', err);
    res.status(500).json({ error: 'Failed to remove email' });
  }
});

// PATCH /api/admin/users/:id/toggle-admin — promote/demote admin
router.patch('/users/:id/toggle-admin', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isAdmin: !user.isAdmin },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
