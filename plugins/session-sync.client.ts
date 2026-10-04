/** Cookie refresh signals carry no credentials; always reread the shared jar. */
export default defineNuxtPlugin((app) => {
  const router = useRouter();
  // A request can observe a remote logout before the cookie notification.
  // Watch the state transition itself so that ordering cannot retain the view.
  const stopAuth = watch(useAccessToken(), (token, previous) => {
    if (previous && !token) router.push('/');
  }, { flush: 'sync' });
  const cookies = ["authGeneration", "accessToken"].map((name) =>
    useCookie(name, { readonly: true, watch: false })
  );
  const sync = () => app.runWithContext(syncSessionCookies);
  const visible = () => {
    if (document.visibilityState === "visible") sync();
  };
  const stop = watch(cookies, sync);
  window.addEventListener("focus", sync);
  document.addEventListener("visibilitychange", visible);
  app.vueApp.onUnmount(() => {
    stop();
    stopAuth();
    window.removeEventListener("focus", sync);
    document.removeEventListener("visibilitychange", visible);
  });
});
