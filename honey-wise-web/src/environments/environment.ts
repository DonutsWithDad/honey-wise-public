/**
 * Production environment.
 *
 * `apiUrl` is the absolute base URL of the HoneyWise API. Replace this with the
 * real deployed API origin. In development the value is overridden by
 * environment.development.ts to an empty string so requests go through the
 * Angular dev-server proxy (see proxy.conf.json) and avoid CORS/HTTPS friction.
 */
export const environment = {
  production: true,
  apiUrl: 'https://localhost:7146',
};
