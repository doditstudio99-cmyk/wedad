import LegacyScripts from '@/app/legacy-scripts.js';
import { pageBody, pageScripts } from '@/lib/page-html.js';

export const dynamic = 'force-static';

const body = pageBody('public/admin/index.html');
const scripts = pageScripts('public/admin/index.html');

export default function AdminPage() {
  return (
    <>
      <div id="page" style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: body }} />
      <LegacyScripts srcs={scripts} />
    </>
  );
}
