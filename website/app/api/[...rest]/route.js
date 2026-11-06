// Any unknown /api/... path answers with JSON (the front-end always expects JSON)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const notFound = () => Response.json({ error: 'not_found' }, { status: 404 });
export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE };
