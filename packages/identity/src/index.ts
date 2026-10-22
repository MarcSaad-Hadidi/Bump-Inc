import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { ApiEnv } from '@bump/contracts';
import { authSchema, type Database, type Transaction } from '@bump/db';
import type { MailMessage } from '@bump/integrations';
import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';

export type SendMail = (message: MailMessage) => Promise<void>;

export function createAuth(
  database: Database['db'] | Transaction,
  env: ApiEnv,
  sendMail: SendMail,
  transaction = true,
) {
  return betterAuth({
    appName: 'Bump OS',
    baseURL: env.AUTH_BASE_URL,
    secret: env.AUTH_SECRET,
    trustedOrigins: [env.AUTH_BASE_URL],
    database: drizzleAdapter(database, { provider: 'pg', schema: authSchema, transaction }),
    logger: { disabled: true },
    advanced: {
      disableOriginCheck: false,
      disableCSRFCheck: false,
      database: { generateId: 'uuid' },
      ipAddress: { ipAddressHeaders: ['x-bump-client-ip'] },
      useSecureCookies: env.NODE_ENV === 'production',
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: env.NODE_ENV === 'production' || !env.AUTH_ALLOW_SIGNUP,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) =>
        sendMail({
          to: user.email,
          subject: 'Reset your Bump OS password',
          text: `Reset your password: ${url}`,
        }),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: ({ user, url }) =>
        sendMail({
          to: user.email,
          subject: 'Verify your Bump OS email',
          text: `Verify your email: ${url}`,
        }),
    },
    session: {
      expiresIn: 60 * 60 * 24,
      updateAge: 60 * 60,
      freshAge: 60 * 15,
      cookieCache: { enabled: false },
    },
    rateLimit: { enabled: true, window: 60, max: 60 },
    plugins: [
      organization({
        organizationLimit: 5,
        disableOrganizationDeletion: true,
        requireEmailVerificationOnInvitation: true,
        cancelPendingInvitationsOnReInvite: true,
        sendInvitationEmail: ({ email, id, organization: invitedOrganization }) =>
          sendMail({
            to: email,
            subject: 'Bump OS organization invitation',
            text: `You were invited to ${invitedOrganization.name}. Sign in with this email and accept invitation ${id}. Invitation details: ${env.AUTH_BASE_URL}/invitations/${id}`,
          }),
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
