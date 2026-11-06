// PUT, DELETE /api/admin/client-packages/:id
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export { putPackage as PUT, deletePackage as DELETE } from '@/lib/endpoints.js';
