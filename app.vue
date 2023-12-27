<template>
	<NuxtLayout>
		<NuxtLoadingIndicator />
		<NuxtPage />

		<Modal v-if="dialog && dialog.show" @backdrop="handleDialogOnBackdrop()">
			<Dialog :dialog="dialog" />
		</Modal>
		<Snackbar />
		<Loading />
	</NuxtLayout>
</template>

<script>
export default {
  setup() {
    const dialog = useDialog();

    function handleDialogOnBackdrop() {
      return dialog.value?.triggerPrimaryActionOnBackdropClick;
    }

    const user = useUser();
    const cookie_user = useCookie('user');
    user.value = cookie_user.value ?? null;

    const session = useSession();
    const cookie_session = useCookie('session');
    session.value = cookie_session.value ?? null;

    const accessToken = useAccessToken();
    const cookie_accessToken = useCookie('accessToken');
    accessToken.value = cookie_accessToken.value ?? '';

    const refreshToken = useRefreshToken();
    const cookie_refreshToken = useCookie('refreshToken');
    refreshToken.value = cookie_refreshToken.value ?? '';

    return { dialog, handleDialogOnBackdrop };
  },
};
</script>

<style>
.page-enter-active,
.page-leave-active {
	transition: all 0.4s;
}
.page-enter-from,
.page-leave-to {
	opacity: 0;
	transform: translateY(-25px);
}
.layout-enter-active,
.layout-leave-active {
	transition: all 0.4s;
}
.layout-enter-from,
.layout-leave-to {
	opacity: 0;
	filter: blur(1rem);
}
</style>
