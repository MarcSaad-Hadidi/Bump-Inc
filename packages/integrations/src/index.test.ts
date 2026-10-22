import nodemailer from 'nodemailer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMailer } from './index.js';

const smtp = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => smtp) } }));

const environment = {
  SMTP_HOST: 'localhost',
  SMTP_PORT: 1025,
  SMTP_SECURE: false,
  MAIL_FROM: 'bump@example.test',
  NODE_ENV: 'test',
};
const message = {
  to: 'recipient@example.test',
  subject: 'Verify your email',
  text: 'Synthetic verification message',
};

beforeEach(() => {
  vi.clearAllMocks();
  smtp.sendMail.mockResolvedValue({ accepted: [message.to], rejected: [] });
});

describe('SMTP adapter', () => {
  it('sends one validated plain-text message through the configured transport', async () => {
    const mailer = createMailer(environment);
    await mailer.send(message);
    expect(smtp.sendMail).toHaveBeenCalledWith({ from: environment.MAIL_FROM, ...message });
    mailer.close();
    expect(smtp.close).toHaveBeenCalledOnce();
  });

  it('uses verified TLS, bounded timeouts and no logs or content access in production', () => {
    createMailer({
      ...environment,
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: 465,
      SMTP_SECURE: true,
      SMTP_USER: 'synthetic-user',
      SMTP_PASSWORD: 'synthetic-password',
    });
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.test',
      port: 465,
      secure: true,
      auth: { user: 'synthetic-user', pass: 'synthetic-password' },
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
  });

  it.each([
    { NODE_ENV: 'production' },
    { SMTP_USER: 'synthetic-user' },
    { SMTP_PASSWORD: 'synthetic-password' },
    { SMTP_USER: '', SMTP_PASSWORD: '' },
    { SMTP_HOST: 'smtp://smtp.example.test/?tls.rejectUnauthorized=false' },
    { SMTP_PORT: 0 },
    { SMTP_PORT: 65_536 },
    { MAIL_FROM: 'one@example.test,two@example.test' },
    { MAIL_FROM: 'bad\r\nBcc: other@example.test' },
  ])('rejects unsafe configuration before creating a transport: %j', (override) => {
    expect(() => createMailer({ ...environment, ...override })).toThrow(
      'Invalid SMTP configuration',
    );
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it.each([
    ['multiple recipients', { to: 'one@example.test,two@example.test' }],
    ['recipient injection', { to: 'bad\r\nBcc: other@example.test' }],
    ['subject injection', { subject: 'hello\r\nBcc: other@example.test' }],
    ['oversized subject', { subject: 'x'.repeat(201) }],
    ['oversized body', { text: 'x'.repeat(100_001) }],
    ['empty body', { text: '' }],
    ['unexpected attachment', { attachments: [{ path: '/private/file' }] }],
  ] as const)('rejects %s before SMTP submission', async (_name, override) => {
    const mailer = createMailer(environment);
    await expect(mailer.send({ ...message, ...override })).rejects.toThrow('Invalid email message');
    expect(smtp.sendMail).not.toHaveBeenCalled();
  });

  it.each([
    { accepted: [], rejected: [message.to] },
    { accepted: [], rejected: [] },
    { accepted: ['wrong-recipient@example.test'], rejected: [] },
    { accepted: [message.to, 'another@example.test'], rejected: [] },
    { accepted: [message.to], rejected: ['another@example.test'] },
  ])('fails unless exactly one recipient is accepted without rejection: %j', async (result) => {
    smtp.sendMail.mockResolvedValue(result);
    await expect(createMailer(environment).send(message)).rejects.toThrow('Email delivery failed');
  });

  it('does not propagate SMTP credentials or verification content from transport errors', async () => {
    smtp.sendMail.mockRejectedValue(new Error('SMTP failed with synthetic-private-token'));
    await expect(createMailer(environment).send(message)).rejects.toThrow(
      /^Email delivery failed$/,
    );
  });
});
