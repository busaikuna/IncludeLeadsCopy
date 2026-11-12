import { json, Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  createLead,
  deleteLead,
  getLead,
  listLeads,
  updateLead,
  updateLeadStage,
} from '../controllers/lead.controller';
import {
  createInteraction,
  listInteractions,
} from '../controllers/interaction.controller';

const router = Router();

router.use(authenticate);
router.use(json());

// Rotas principais de Leads
router.post('/', createLead);
router.get('/', listLeads);
router.get('/:id', getLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

router.patch('/:id/stage', updateLeadStage);

router.post('/:leadId/interactions', createInteraction);
router.get('/:leadId/interactions', listInteractions);

export default router;
