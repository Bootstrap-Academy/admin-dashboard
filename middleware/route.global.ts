export default defineNuxtRouteMiddleware((to, from) => {
  if (to.path !== from.path && import.meta.client) {
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth',
      });
    }, 450);
  }

});
