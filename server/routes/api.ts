import { Router } from 'express';
import {
  getSessionMe,
  googleLogin,
  login,
  recoverPassword,
  register,
  resetPassword,
} from '../controllers/authController';
import { getMyProfile, updateMyProfile, uploadAvatar } from '../controllers/profileController';
import {
  acceptPact,
  createGroup,
  joinGroup,
  listGroups,
  previewWhatIf,
  simulateCycle,
} from '../controllers/groupsController';
import {
  createWorkshop,
  joinWorkshopByPin,
  listPills,
  listWorkshops,
} from '../controllers/workshopsController';
import {
  createPill,
  deletePill,
  getAdminOverview,
  moderateGroup,
  updatePill,
  updateUserRole,
} from '../controllers/adminController';
import {
  requireAuth,
  requireEducatorOrAdmin,
  requireSuperAdmin,
} from '../middlewares/auth';

export const apiRouter = Router();

// Auth routes
apiRouter.post('/auth/register', register);
apiRouter.post('/auth/login', login);
apiRouter.post('/auth/google', googleLogin);
apiRouter.post('/auth/recover', recoverPassword);
apiRouter.post('/auth/reset-password', resetPassword);
apiRouter.get('/auth/me', requireAuth, getSessionMe);

// Profile & Avatar routes
apiRouter.get('/profile/me', requireAuth, getMyProfile);
apiRouter.put('/profile/me', requireAuth, updateMyProfile);
apiRouter.post('/profile/avatar', requireAuth, uploadAvatar);

// Groups & Simulation routes
apiRouter.get('/groups', requireAuth, listGroups);
apiRouter.post('/groups', requireAuth, createGroup);
apiRouter.post('/groups/:id/join', requireAuth, joinGroup);
apiRouter.post('/groups/:id/accept-pact', requireAuth, acceptPact);
apiRouter.post('/groups/:id/simulate-cycle', requireAuth, simulateCycle);
apiRouter.post('/groups/:id/what-if', requireAuth, previewWhatIf);

// Workshops (Modo Oficina PIN) & Educational Pills
apiRouter.get('/workshops', requireAuth, listWorkshops);
apiRouter.post('/workshops', requireAuth, requireEducatorOrAdmin, createWorkshop);
apiRouter.post('/workshops/join', requireAuth, joinWorkshopByPin);
apiRouter.get('/pills', requireAuth, listPills);

// Superadmin Governance routes
apiRouter.get('/admin/overview', requireAuth, requireSuperAdmin, getAdminOverview);
apiRouter.patch('/admin/users/:id/role', requireAuth, requireSuperAdmin, updateUserRole);
apiRouter.patch('/admin/groups/:id/moderate', requireAuth, requireSuperAdmin, moderateGroup);
apiRouter.post('/admin/pills', requireAuth, requireSuperAdmin, createPill);
apiRouter.patch('/admin/pills/:id', requireAuth, requireSuperAdmin, updatePill);
apiRouter.delete('/admin/pills/:id', requireAuth, requireSuperAdmin, deletePill);
