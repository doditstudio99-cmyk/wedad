// POST /api/admin/:collection/:id/move
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export { moveItem as POST } from '@/lib/endpoints.js';
