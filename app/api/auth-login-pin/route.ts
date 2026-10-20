import { handler } from '@/netlify/functions/auth-login-pin';
import { adaptNetlifyHandler } from '@/lib/utils/netlify-adapter';

const adapted = adaptNetlifyHandler(handler);

export const POST = adapted;
export const OPTIONS = adapted;
