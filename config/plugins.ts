import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedTypes = [
  'image/svg+xml',
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

/**
 * Upload provider selection.
 *
 * UPLOAD_PROVIDER=local      -> public/uploads (dev only; wiped on Railway redeploy)
 * UPLOAD_PROVIDER=cloudinary -> Cloudinary, credentials from env
 *
 * Choosing cloudinary without all three credentials throws at config load so a
 * misconfigured deploy fails loudly instead of silently writing to disk.
 */
const buildUploadProviderConfig = (env: Core.Config.Shared.ConfigParams['env']) => {
  const provider = env('UPLOAD_PROVIDER', 'local');

  if (provider === 'local') {
    return {};
  }

  if (provider === 'cloudinary') {
    const cloudName = env('CLOUDINARY_NAME');
    const apiKey = env('CLOUDINARY_KEY');
    const apiSecret = env('CLOUDINARY_SECRET');
    const missing = [
      !cloudName && 'CLOUDINARY_NAME',
      !apiKey && 'CLOUDINARY_KEY',
      !apiSecret && 'CLOUDINARY_SECRET',
    ].filter(Boolean);

    if (missing.length > 0) {
      throw new Error(
        `UPLOAD_PROVIDER=cloudinary but the following env vars are missing: ${missing.join(', ')}`
      );
    }

    const folder = env('CLOUDINARY_FOLDER', 'portfolio');

    return {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      },
      actionOptions: {
        upload: { folder },
        uploadStream: { folder },
        delete: {},
      },
    };
  }

  throw new Error(`Unsupported UPLOAD_PROVIDER: ${provider}. Use "local" or "cloudinary".`);
};

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      jwtManagement: 'refresh',
      sessions: {
        httpOnly: true,
      },
    },
  },
  upload: {
    config: {
      ...buildUploadProviderConfig(env),
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes,
      },
    },
  },
});

export default config;
