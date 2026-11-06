// DELETE /api/admin/client-packages/:id/usage/:uid
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export { deleteUsage as DELETE } from '@/lib/endpoints.js';
