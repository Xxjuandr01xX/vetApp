import { handler } from '@/netlify/functions/bcv-rates';
import { adaptNetlifyHandler } from '@/lib/utils/netlify-adapter';

const adapted = adaptNetlifyHandler(handler);

export const GET = adapted;
export const OPTIONS = adapted;
