import { Handler } from '@netlify/functions';
import { NextRequest, NextResponse } from 'next/server';

export function adaptNetlifyHandler(handler: Handler) {
  return async function (req: NextRequest) {
    try {
      const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : '';
      const headers: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const event = {
        httpMethod: req.method,
        body,
        headers,
        rawUrl: req.url,
        path: req.nextUrl.pathname,
        queryStringParameters: Object.fromEntries(req.nextUrl.searchParams),
      };

      const result = await handler(event as any, {} as any);

      if (!result) {
        return new NextResponse(null, { status: 204 });
      }

      return new NextResponse(result.body, {
        status: result.statusCode || 200,
        headers: (result.headers as any) || { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('Adapter error:', err);
      return NextResponse.json(
        { error: 'Error interno en la función adaptada', details: err?.message },
        { status: 500 }
      );
    }
  };
}
