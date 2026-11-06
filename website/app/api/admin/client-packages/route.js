// GET, POST /api/admin/client-packages
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export { getPackages as GET, postPackage as POST } from '@/lib/endpoints.js';
