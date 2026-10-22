import type { ApiEnv } from '@bump/contracts';
import {
  authSchema,
  type Database,
  organizationAudit,
  organizationSettings,
  setTenantContext,
  type TenantRole,
  type Transaction,
  withTenant,
} from '@bump/db';
import { type Auth, createAuth, type SendMail } from '@bump/identity';
import type { MailMessage } from '@bump/integrations';
import { fromNodeHeaders } from 'better-auth/node';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { registerEngagementRoutes } from './engagement-routes.js';
import { registerExecutionRoutes } from './execution-routes.js';

export interface IdentityContext {
  database: Database;
  env: ApiEnv;
  auth: Auth;
  sendMail: SendMail;
}

const authEndpoints = new Set([
  'POST /sign-up/email',
  'POST /sign-in/email',
  'POST /sign-out',
  'GET /get-session',
  'GET /verify-email',
  'POST /send-verification-email',
  'POST /request-password-reset',
  'GET /reset-password',
  'POST /reset-password',
  'POST /change-password',
  'GET /list-sessions',
  'POST /revoke-session',
  'POST /revoke-sessions',
  'POST /revoke-other-sessions',
]);
const organizationParams = z.object({ organizationId: z.uuid() });
const invitationParams = z.object({ invitationId: z.uuid() });
const memberParams = organizationParams.extend({ memberId: z.uuid() });
const roleSchema = z.enum(['admin', 'member']);
const nameSchema = z.string().trim().min(1).max(120);
const localeSchema = z.enum(['en', 'fr']);

function denied(statusCode = 403) {
  return Object.assign(new Error('Request denied'), { statusCode });
}

function headersFor(request: FastifyRequest) {
  const headers = fromNodeHeaders(request.headers);
  for (const name of ['x-forwarded-for', 'x-real-ip', 'x-bump-client-ip']) headers.delete(name);
  headers.set('x-bump-client-ip', request.ip);
  return headers;
}

function requireAdmin(role: TenantRole) {
  if (role !== 'owner' && role !== 'admin') throw denied();
}

async function audit(
  tx: Transaction,
  organizationId: string,
  actorUserId: string,
  requestId: string,
  action: string,
  targetId: string,
) {
  await tx
    .insert(organizationAudit)
    .values({ organizationId, actorUserId, requestId, action, targetId });
}

export async function registerIdentityRoutes(app: FastifyInstance, context: IdentityContext) {
  const { database, env, auth, sendMail } = context;
  async function sessionFor(request: FastifyRequest) {
    const session = await auth.api.getSession({
      headers: headersFor(request),
      query: { disableCookieCache: true },
    });
    if (!session) throw denied(401);
    if (!session.user.emailVerified) throw denied();
    return session;
  }

  app.addHook('onRequest', async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      // Bump's cookie-authenticated mutations need their own CSRF boundary.
      if (request.headers.origin !== env.AUTH_BASE_URL) throw denied();
    }
  });

  await registerEngagementRoutes(app, database, sessionFor);
  await registerExecutionRoutes(app, database, sessionFor);

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      const url = new URL(request.url, env.AUTH_BASE_URL);
      if (url.origin !== new URL(env.AUTH_BASE_URL).origin) throw denied(400);
      const endpoint = url.pathname.slice('/api/auth'.length);
      const route = `${request.method} ${endpoint === '/reset-password' || endpoint.startsWith('/reset-password/') ? '/reset-password' : endpoint}`;
      if (!authEndpoints.has(route)) throw denied(404);
      if (
        endpoint === '/sign-up/email' &&
        (env.NODE_ENV === 'production' || !env.AUTH_ALLOW_SIGNUP)
      )
        throw denied();
      const response = await auth.handler(
        new Request(url, {
          method: request.method,
          headers: headersFor(request),
          ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
        }),
      );
      if (response.status >= 500) throw denied(500);
      for (const [key, value] of response.headers) {
        if (key !== 'set-cookie') reply.header(key, value);
      }
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header('set-cookie', cookies);
      return reply.code(response.status).send(await response.text());
    },
  });

  app.get('/me', async (request) => {
    const { user } = await sessionFor(request);
    return { id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified };
  });

  app.get('/organizations', async (request) => {
    await sessionFor(request);
    return auth.api.listOrganizations({ headers: headersFor(request) });
  });

  app.post('/organizations', async (request, reply) => {
    const { user } = await sessionFor(request);
    const body = z
      .strictObject({
        name: nameSchema,
        slug: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .max(80),
        locale: localeSchema.default('en'),
      })
      .parse(request.body);
    const result = await database.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${user.id}, 0))`);
      const scopedAuth = createAuth(tx, env, sendMail, false);
      const organization = await scopedAuth.api.createOrganization({
        headers: headersFor(request),
        body: { name: body.name, slug: body.slug },
      });
      if (!organization) throw denied(500);
      await setTenantContext(tx, { userId: user.id, organizationId: organization.id });
      await tx
        .insert(organizationSettings)
        .values({ organizationId: organization.id, locale: body.locale });
      await audit(
        tx,
        organization.id,
        user.id,
        request.id,
        'organization.created',
        organization.id,
      );
      return organization;
    });
    return reply.code(201).send(result);
  });

  app.get('/organizations/:organizationId', async (request) => {
    const { user } = await sessionFor(request);
    const { organizationId } = organizationParams.parse(request.params);
    return withTenant(database, { userId: user.id, organizationId }, async (tx, role) => {
      const [organization] = await tx
        .select({
          id: authSchema.organization.id,
          name: authSchema.organization.name,
          slug: authSchema.organization.slug,
        })
        .from(authSchema.organization)
        .where(eq(authSchema.organization.id, organizationId));
      return { ...organization, role };
    });
  });

  app.patch('/organizations/:organizationId', async (request) => {
    const { user } = await sessionFor(request);
    const { organizationId } = organizationParams.parse(request.params);
    const data = z.strictObject({ name: nameSchema }).parse(request.body);
    return withTenant(database, { userId: user.id, organizationId }, async (tx, role) => {
      requireAdmin(role);
      const result = await createAuth(tx, env, sendMail, false).api.updateOrganization({
        headers: headersFor(request),
        body: { organizationId, data },
      });
      await audit(tx, organizationId, user.id, request.id, 'organization.updated', organizationId);
      return result;
    });
  });

  app.get('/organizations/:organizationId/members', async (request) => {
    const { user } = await sessionFor(request);
    const { organizationId } = organizationParams.parse(request.params);
    return withTenant(database, { userId: user.id, organizationId }, (tx) =>
      tx
        .select({
          id: authSchema.member.id,
          userId: authSchema.member.userId,
          role: authSchema.member.role,
          name: authSchema.user.name,
          email: authSchema.user.email,
        })
        .from(authSchema.member)
        .innerJoin(authSchema.user, eq(authSchema.member.userId, authSchema.user.id))
        .where(eq(authSchema.member.organizationId, organizationId))
        .limit(100),
    );
  });

  app.get('/organizations/:organizationId/settings', async (request) => {
    const { user } = await sessionFor(request);
    const { organizationId } = organizationParams.parse(request.params);
    return withTenant(database, { userId: user.id, organizationId }, async (tx) => {
      const [settings] = await tx
        .select()
        .from(organizationSettings)
        .where(eq(organizationSettings.organizationId, organizationId));
      return settings;
    });
  });

  app.patch('/organizations/:organizationId/settings', async (request) => {
    const { user } = await sessionFor(request);
    const { organizationId } = organizationParams.parse(request.params);
    const body = z.strictObject({ locale: localeSchema }).parse(request.body);
    return withTenant(database, { userId: user.id, organizationId }, async (tx, role) => {
      requireAdmin(role);
      const [settings] = await tx
        .update(organizationSettings)
        .set({ locale: body.locale, updatedAt: new Date() })
        .where(eq(organizationSettings.organizationId, organizationId))
        .returning();
      await audit(tx, organizationId, user.id, request.id, 'settings.updated', organizationId);
      return settings;
    });
  });

  app.get('/organizations/:organizationId/audit', async (request) => {
    const { user } = await sessionFor(request);
    const { organizationId } = organizationParams.parse(request.params);
    return withTenant(database, { userId: user.id, organizationId }, (tx, role) => {
      requireAdmin(role);
      return tx
        .select()
        .from(organizationAudit)
        .where(eq(organizationAudit.organizationId, organizationId))
        .orderBy(desc(organizationAudit.createdAt))
        .limit(50);
    });
  });

  app.post('/organizations/:organizationId/invitations', async (request, reply) => {
    const { user } = await sessionFor(request);
    const { organizationId } = organizationParams.parse(request.params);
    const body = z
      .strictObject({
        email: z.email().max(254),
        role: roleSchema.default('member'),
        resend: z.boolean().default(false),
      })
      .parse(request.body);
    const messages: MailMessage[] = [];
    const invitation = await withTenant(
      database,
      { userId: user.id, organizationId },
      async (tx, role) => {
        requireAdmin(role);
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${organizationId}, 1))`);
        const scopedAuth = createAuth(
          tx,
          env,
          async (message) => {
            messages.push(message);
          },
          false,
        );
        const result = await scopedAuth.api.createInvitation({
          headers: headersFor(request),
          // Native resend keeps the old inviter; reissue binds the grant to the current admin.
          body: { email: body.email, role: body.role, organizationId, resend: false },
        });
        if (messages.length !== 1) throw denied(500);
        await audit(
          tx,
          organizationId,
          user.id,
          request.id,
          body.resend ? 'invitation.resent' : 'invitation.created',
          result.id,
        );
        return result;
      },
    );
    try {
      for (const message of messages) await sendMail(message);
    } catch {
      request.log.error({ organizationId }, 'Invitation delivery failed');
      return reply
        .code(502)
        .send({ invitationId: invitation.id, delivery: 'failed', requestId: request.id });
    }
    return reply.code(201).send({ invitationId: invitation.id, delivery: 'sent' });
  });

  app.get('/invitations/:invitationId', async (request) => {
    await sessionFor(request);
    const { invitationId } = invitationParams.parse(request.params);
    return auth.api.getInvitation({ headers: headersFor(request), query: { id: invitationId } });
  });

  app.post('/invitations/:invitationId/accept', async (request) => {
    const { user } = await sessionFor(request);
    const { invitationId } = invitationParams.parse(request.params);
    return database.db.transaction(async (tx) => {
      const [invitation] = await tx
        .select()
        .from(authSchema.invitation)
        .where(eq(authSchema.invitation.id, invitationId))
        .for('update');
      if (!invitation) throw denied();
      const [inviter] = await tx
        .select({ role: authSchema.member.role })
        .from(authSchema.member)
        .where(
          and(
            eq(authSchema.member.organizationId, invitation.organizationId),
            eq(authSchema.member.userId, invitation.inviterId),
          ),
        )
        .for('share');
      if (!inviter || (inviter.role !== 'owner' && inviter.role !== 'admin')) throw denied();
      const result = await createAuth(tx, env, sendMail, false).api.acceptInvitation({
        headers: headersFor(request),
        body: { invitationId },
      });
      const organizationId = result.member.organizationId;
      await setTenantContext(tx, { userId: user.id, organizationId });
      await audit(tx, organizationId, user.id, request.id, 'invitation.accepted', invitationId);
      return { organizationId, memberId: result.member.id };
    });
  });

  app.patch('/organizations/:organizationId/members/:memberId', async (request) => {
    const { user } = await sessionFor(request);
    const { organizationId, memberId } = memberParams.parse(request.params);
    const body = z.strictObject({ role: roleSchema }).parse(request.body);
    return withTenant(database, { userId: user.id, organizationId }, async (tx, role) => {
      requireAdmin(role);
      const [target] = await tx
        .select()
        .from(authSchema.member)
        .where(
          and(
            eq(authSchema.member.id, memberId),
            eq(authSchema.member.organizationId, organizationId),
          ),
        )
        .for('update');
      if (!target || target.role === 'owner') throw denied();
      const result = await createAuth(tx, env, sendMail, false).api.updateMemberRole({
        headers: headersFor(request),
        body: { organizationId, memberId, role: body.role },
      });
      await audit(tx, organizationId, user.id, request.id, 'member.role_changed', memberId);
      return result;
    });
  });

  app.delete('/organizations/:organizationId/members/:memberId', async (request) => {
    const { user } = await sessionFor(request);
    const { organizationId, memberId } = memberParams.parse(request.params);
    return withTenant(database, { userId: user.id, organizationId }, async (tx, role) => {
      requireAdmin(role);
      const [target] = await tx
        .select()
        .from(authSchema.member)
        .where(
          and(
            eq(authSchema.member.id, memberId),
            eq(authSchema.member.organizationId, organizationId),
          ),
        )
        .for('update');
      if (!target || target.role === 'owner') throw denied();
      // Audit first so self-removal still has membership; the transaction rolls back both on failure.
      await audit(tx, organizationId, user.id, request.id, 'member.removed', memberId);
      await createAuth(tx, env, sendMail, false).api.removeMember({
        headers: headersFor(request),
        body: { organizationId, memberIdOrEmail: memberId },
      });
      return { status: 'removed' };
    });
  });
}
