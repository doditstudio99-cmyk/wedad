import LegacyScripts from '@/app/legacy-scripts.js';
import { pageBody, pageScripts } from '@/lib/page-html.js';

// Built once; all live data comes from /api/site and /api/slots in the browser
export const dynamic = 'force-static';

const body = pageBody('public/index.html');
const scripts = pageScripts('public/index.html');

export default function HomePage() {
  return (
    <>
      <div id="page" style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: body }} />
      <LegacyScripts srcs={scripts} />
    </>
  );
}
