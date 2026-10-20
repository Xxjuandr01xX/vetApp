import { handler } from '@/netlify/functions/payments-approve';
import { adaptNetlifyHandler } from '@/lib/utils/netlify-adapter';

const adapted = adaptNetlifyHandler(handler);

export const POST = adapted;
export const OPTIONS = adapted;
