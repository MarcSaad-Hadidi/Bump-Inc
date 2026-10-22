import nodemailer from 'nodemailer';
import { z } from 'zod';

const addressSchema = z.email().max(254);
const environmentSchema = z
  .object({
    SMTP_HOST: z.union([z.hostname(), z.ipv4(), z.ipv6()]),
    SMTP_PORT: z.number().int().min(1).max(65_535),
    SMTP_SECURE: z.boolean(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    MAIL_FROM: addressSchema,
    NODE_ENV: z.enum(['development', 'test', 'production']),
  })
  .refine((env) => Boolean(env.SMTP_USER) === Boolean(env.SMTP_PASSWORD))
  .refine((env) => env.NODE_ENV !== 'production' || env.SMTP_SECURE);

const messageSchema = z.strictObject({
  to: addressSchema,
  subject: z
    .string()
    .min(1)
    .max(200)
    .refine((subject) => !/[\r\n]/.test(subject)),
  text: z.string().min(1).max(100_000),
});

export type MailMessage = z.infer<typeof messageSchema>;

export function createMailer(env: {
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER?: string | undefined;
  SMTP_PASSWORD?: string | undefined;
  MAIL_FROM: string;
  NODE_ENV: string;
}): { send(message: MailMessage): Promise<void>; close(): void } {
  const parsed = environmentSchema.safeParse(env);
  if (!parsed.success) throw new Error('Invalid SMTP configuration');
  const config = parsed.data;
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    ...(config.SMTP_USER && config.SMTP_PASSWORD
      ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } }
      : {}),
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    dnsTimeout: 5_000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });

  return {
    async send(message) {
      const parsedMessage = messageSchema.safeParse(message);
      if (!parsedMessage.success) throw new Error('Invalid email message');
      try {
        const result = await transport.sendMail({
          from: config.MAIL_FROM,
          ...parsedMessage.data,
        });
        if (
          result.accepted.length !== 1 ||
          result.accepted[0] !== parsedMessage.data.to ||
          result.rejected.length !== 0
        ) {
          throw new Error('Email delivery failed');
        }
      } catch {
        throw new Error('Email delivery failed');
      }
    },
    close() {
      transport.close();
    },
  };
}
