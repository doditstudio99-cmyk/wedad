// PATCH, DELETE /api/admin/bookings/:id
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export { patchBooking as PATCH, deleteBooking as DELETE } from '@/lib/endpoints.js';
