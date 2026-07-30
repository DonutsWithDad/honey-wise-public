/**
 * Development environment.
 *
 * `apiUrl` is empty so services issue same-origin relative requests
 * (e.g. `/Users/login`). The Angular dev server proxies those to the API
 * (see proxy.conf.json), which sidesteps browser CORS and the self-signed
 * HTTPS dev certificate.
 */
export const environment = {
  production: false,
  apiUrl: '',
};
