jest.mock('nodemailer', () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'test-msg-id' });
  const verify = jest.fn().mockResolvedValue(true);
  return {
    createTransport: jest.fn(() => ({ sendMail, verify })),
    __mocks: { sendMail, verify }
  };
});

const nodemailer = require('nodemailer');
const emailServicePath = require.resolve('../../utils/emailService');

function clearSmtpEnv() {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_SECURE;
  delete process.env.EMAIL_FROM;
  delete process.env.FRONTEND_URL;
}

function setSmtpEnv() {
  process.env.SMTP_HOST = 'smtp.test';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'test@example.com';
  process.env.SMTP_PASS = 'pw';
}

function loadFreshEmailService() {
  delete require.cache[emailServicePath];
  return require('../../utils/emailService');
}

beforeEach(() => {
  nodemailer.createTransport.mockClear();
  nodemailer.__mocks.sendMail.mockClear();
  nodemailer.__mocks.verify.mockClear();
  nodemailer.__mocks.sendMail.mockResolvedValue({ messageId: 'test-msg-id' });
});

afterAll(() => {
  delete require.cache[emailServicePath];
});

describe('utils/emailService', () => {
  describe('sendEmail', () => {
    test('returns silently when "to" is missing', async () => {
      clearSmtpEnv();
      const { sendEmail } = loadFreshEmailService();
      await expect(sendEmail({ subject: 'X' })).resolves.toBeUndefined();
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });

    test('returns silently when "subject" is missing', async () => {
      clearSmtpEnv();
      const { sendEmail } = loadFreshEmailService();
      await expect(sendEmail({ to: 'a@b.com' })).resolves.toBeUndefined();
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });

    test('skips real send when SMTP env is not configured', async () => {
      clearSmtpEnv();
      const { sendEmail } = loadFreshEmailService();
      await expect(sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'x' })).resolves.toBeUndefined();
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
      expect(nodemailer.__mocks.sendMail).not.toHaveBeenCalled();
    });

    test('sends via nodemailer when SMTP is configured', async () => {
      setSmtpEnv();
      const { sendEmail } = loadFreshEmailService();
      await sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'plain', html: '<p>x</p>' });
      expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
      expect(nodemailer.__mocks.sendMail).toHaveBeenCalledTimes(1);
      const opts = nodemailer.__mocks.sendMail.mock.calls[0][0];
      expect(opts.to).toBe('a@b.com');
      expect(opts.subject).toBe('Hi');
      expect(opts.from).toBe('test@example.com');
    });

    test('honours EMAIL_FROM override', async () => {
      setSmtpEnv();
      process.env.EMAIL_FROM = 'noreply@agrismart.ai';
      const { sendEmail } = loadFreshEmailService();
      await sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'x' });
      const opts = nodemailer.__mocks.sendMail.mock.calls[0][0];
      expect(opts.from).toBe('noreply@agrismart.ai');
    });

    test('swallows transport errors without throwing', async () => {
      setSmtpEnv();
      nodemailer.__mocks.sendMail.mockRejectedValueOnce(new Error('boom'));
      const { sendEmail } = loadFreshEmailService();
      await expect(sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'x' })).resolves.toBeUndefined();
    });
  });

  describe('sendPasswordResetEmail', () => {
    test('returns silently for falsy user', async () => {
      clearSmtpEnv();
      const { sendPasswordResetEmail } = loadFreshEmailService();
      await expect(sendPasswordResetEmail(null, 'tok')).resolves.toBeUndefined();
      expect(nodemailer.__mocks.sendMail).not.toHaveBeenCalled();
    });

    test('returns silently for user without email', async () => {
      clearSmtpEnv();
      const { sendPasswordResetEmail } = loadFreshEmailService();
      await expect(sendPasswordResetEmail({ name: 'Farmer' }, 'tok')).resolves.toBeUndefined();
      expect(nodemailer.__mocks.sendMail).not.toHaveBeenCalled();
    });

    test('builds a reset URL using FRONTEND_URL and the token', async () => {
      setSmtpEnv();
      process.env.FRONTEND_URL = 'https://app.agrismart.ai/';
      const { sendPasswordResetEmail } = loadFreshEmailService();
      await sendPasswordResetEmail({ email: 'a@b.com', name: 'Anita' }, 'reset-token-123');
      const opts = nodemailer.__mocks.sendMail.mock.calls[0][0];
      expect(opts.to).toBe('a@b.com');
      expect(opts.subject).toMatch(/Password Reset/i);
      expect(opts.text).toContain('https://app.agrismart.ai/reset-password/reset-token-123');
      expect(opts.html).toContain('Anita');
    });

    test('falls back to default frontend URL when FRONTEND_URL is not set', async () => {
      setSmtpEnv();
      delete process.env.FRONTEND_URL;
      const { sendPasswordResetEmail } = loadFreshEmailService();
      await sendPasswordResetEmail({ email: 'a@b.com' }, 'tok');
      const opts = nodemailer.__mocks.sendMail.mock.calls[0][0];
      expect(opts.text).toContain('localhost:5173/reset-password/tok');
    });
  });

  describe('sendVerificationEmail', () => {
    test('returns silently for falsy user / missing email', async () => {
      clearSmtpEnv();
      const { sendVerificationEmail } = loadFreshEmailService();
      await expect(sendVerificationEmail(null, 'tok')).resolves.toBeUndefined();
      await expect(sendVerificationEmail({ name: 'X' }, 'tok')).resolves.toBeUndefined();
      expect(nodemailer.__mocks.sendMail).not.toHaveBeenCalled();
    });

    test('builds a verify URL using token query param', async () => {
      setSmtpEnv();
      process.env.FRONTEND_URL = 'https://app.agrismart.ai';
      const { sendVerificationEmail } = loadFreshEmailService();
      await sendVerificationEmail({ email: 'a@b.com', name: 'Bob' }, 'verify-xyz');
      const opts = nodemailer.__mocks.sendMail.mock.calls[0][0];
      expect(opts.text).toContain('verify-email?token=verify-xyz');
      expect(opts.subject).toMatch(/Verify/i);
    });
  });
});
