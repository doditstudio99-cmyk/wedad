// PUT, DELETE /api/admin/:collection/:id
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export { putItem as PUT, deleteItem as DELETE } from '@/lib/endpoints.js';
