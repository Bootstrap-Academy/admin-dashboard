// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  // Our reload handler keeps the loop guard without persisting user state.
  experimental: { emitRouteChunkError: 'manual', restoreState: false },
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },
  css: ['~/assets/css/tailwind.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    public: {
      BASE_API_URL: 'https://api.test.bootstrap.academy',
      BASE_WEB_URL: 'https://admin.test.bootstrap.academy',
      NODE_ENV: 'development',
      PROFILE_PUBLICATION_ENABLED: false,
    },
  },
});
