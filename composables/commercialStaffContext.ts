import { effectScope, watch, type Ref } from "vue";
import { jwtDecode } from "jwt-decode";

export const staffUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
type Profile = { id?: unknown; enabled?: unknown; admin?: unknown } | null;
type Session = {
  id?: unknown;
  user_id?: unknown;
  mfa_verified?: unknown;
} | null;
export type StaffProof = Readonly<{
  uid: string;
  sid: string;
  bearer: string;
  revision: number;
}>;
type Options = {
  user: Ref<Profile>;
  session: Ref<Session>;
  token: Ref<unknown>;
  getToken: () => unknown;
  run: <T>(callback: () => T) => T;
  browser?: Window;
  document?: Document;
};

// Commercial-only lifetime: no credential refresh, persistence or global logout.
export function createCommercialStaffContext(options: Options) {
  let revision = 0,
    alive = true,
    blocked = true;
  const callbacks = new Set<() => void>();
  const scope = effectScope(true);
  const cleanups: (() => void)[] = [];
  function invalidate() {
    if (!alive) return;
    revision++;
    blocked = true;
    for (const callback of callbacks) callback();
  }
  scope.run(() =>
    watch(
      () => [
        options.token.value,
        options.user.value?.id,
        options.user.value?.enabled,
        options.user.value?.admin,
        options.session.value?.id,
        options.session.value?.user_id,
        options.session.value?.mfa_verified,
      ],
      invalidate,
      { flush: "sync" },
    ),
  );
  function synchronize() {
    // runWithContext alone would leave useCookie's post-await listeners unowned.
    const getterScope = effectScope(true);
    try {
      return getterScope.run(() => options.run(options.getToken));
    } finally {
      getterScope.stop();
    }
  }
  function coherent(): Omit<StaffProof, "revision"> | null {
    if (!alive) return null;
    const bearer = synchronize(),
      user = options.user.value,
      session = options.session.value;
    if (
      typeof bearer !== "string" ||
      !bearer ||
      bearer !== options.token.value ||
      !staffUuid(user?.id) ||
      user?.admin !== true ||
      user?.enabled === false ||
      !staffUuid(session?.id) ||
      session?.user_id !== user.id ||
      session.mfa_verified !== true
    )
      return null;
    try {
      const token = jwtDecode<{ uid?: unknown; sid?: unknown }>(bearer);
      if (token.uid !== user.id || token.sid !== session.id) return null;
      return { uid: user.id, sid: session.id, bearer };
    } catch {
      return null;
    }
  }
  function activate() {
    if (!alive) return false;
    const proof = coherent();
    blocked = !proof;
    if (!proof) invalidate();
    return !!proof;
  }
  function capture(): StaffProof | null {
    if (!alive || blocked) return null;
    const proof = coherent();
    if (!proof || blocked) {
      if (!proof) invalidate();
      return null;
    }
    return Object.freeze({ ...proof, revision });
  }
  function current(proof: StaffProof) {
    const value = capture();
    return (
      !!value &&
      value.revision === proof.revision &&
      value.uid === proof.uid &&
      value.sid === proof.sid &&
      value.bearer === proof.bearer
    );
  }
  const target = options.browser;
  if (target) {
    const names = new Set(["accessToken", "user", "session"]);
    const store = (target as unknown as { cookieStore?: EventTarget })
      .cookieStore;
    if (store) {
      const listener = (event: Event) => {
        const change = event as Event & {
          changed?: { name: string }[];
          deleted?: { name: string }[];
        };
        if (
          [...(change.changed || []), ...(change.deleted || [])].some(
            (cookie) => names.has(cookie.name),
          )
        )
          invalidate();
      };
      store.addEventListener("change", listener);
      cleanups.push(() => store.removeEventListener("change", listener));
    }
    // The pinned Nuxt fallback emits these notifications. Payloads never supply authority.
    const Channel = (
      target as unknown as { BroadcastChannel?: typeof BroadcastChannel }
    ).BroadcastChannel;
    if (Channel)
      for (const name of names) {
        try {
          const channel = new Channel(`nuxt:cookies:${name}`);
          channel.addEventListener("message", invalidate);
          cleanups.push(() => {
            channel.removeEventListener("message", invalidate);
            channel.close();
          });
        } catch {
          /* Unsupported browser: getter and local lifecycle checks still apply. */
        }
      }
    const hidden = () => {
      if (options.document?.visibilityState === "hidden") invalidate();
    };
    target.addEventListener("pagehide", invalidate);
    target.addEventListener("focus", invalidate);
    options.document?.addEventListener("visibilitychange", hidden);
    cleanups.push(() => {
      target.removeEventListener("pagehide", invalidate);
      target.removeEventListener("focus", invalidate);
      options.document?.removeEventListener("visibilitychange", hidden);
    });
  }
  return {
    activate,
    capture,
    current,
    invalidate,
    reject(proof: StaffProof, status: number) {
      if ((status === 401 || status === 403) && current(proof)) invalidate();
    },
    onInvalidate(callback: () => void) {
      callbacks.add(callback);
      return () => callbacks.delete(callback);
    },
    dispose() {
      if (!alive) return;
      invalidate();
      alive = false;
      scope.stop();
      for (const cleanup of cleanups) cleanup();
      callbacks.clear();
    },
  };
}
export type CommercialStaffContext = ReturnType<
  typeof createCommercialStaffContext
>;
