// Better Auth email links use the conventional /api/auth path. The same strict
// private proxy owns both entry points and never exposes the library's full API.
import { GET as forwardGet, POST as forwardPost } from '../../cyber/[...path]/route';

type Context = { params: Promise<{ path: string[] }> };
async function prefixed(context: Context) {
  return { params: Promise.resolve({ path: ['api', 'auth', ...(await context.params).path] }) };
}
export async function GET(request: Request, context: Context) {
  return forwardGet(request, await prefixed(context));
}
export async function POST(request: Request, context: Context) {
  return forwardPost(request, await prefixed(context));
}
