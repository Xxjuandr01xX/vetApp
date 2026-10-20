import { handler } from '@/netlify/functions/admin-panel';
import { adaptNetlifyHandler } from '@/lib/utils/netlify-adapter';

const adapted = adaptNetlifyHandler(handler);

export const GET = adapted;
export const POST = adapted;
export const OPTIONS = adapted;
