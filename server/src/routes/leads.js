import { Router } from 'express';
import { db } from '../db.js';
import { ah } from '../middleware/errors.js';

const router = Router();

router.get('/', ah(async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, conversation_id, name, contact, message, created_at
       FROM leads WHERE company_id = $1 ORDER BY created_at DESC LIMIT 500`,
    [req.user.companyId],
  );
  res.json(rows);
}));

export default router;
