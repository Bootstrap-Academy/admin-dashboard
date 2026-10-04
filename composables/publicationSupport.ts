import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';
import { GET, POST } from './fetch';
import { sameSession } from '../utils/sessionRefresh';

export interface SupportPublication {
  profile_visibility: 'private' | 'shared';
  visibility_revision: number;
  shared_at: number | null;
  withdrawn_at: number | null;
}

function settings(value: any): SupportPublication {
  if (!value || !['private', 'shared'].includes(value.profile_visibility) ||
    !Number.isSafeInteger(value.visibility_revision) || value.visibility_revision < 0)
    throw new Error('Invalid publication state');
  return value;
}

export function usePublicationSupport(userId: Ref<string>) {
  const publication = ref<SupportPublication | null>(null);
  const loading = ref(false), busy = ref(false);
  const error = ref(''), confirmed = ref(false);
  const actor = useUser(), session = useSession();
  const context = computed(() => `${userId.value}:${actor.value?.id ?? ''}:${session.value?.id ?? ''}`);
  let generation = 0;
  let loaded: ReturnType<typeof capture> | undefined;

  function capture() {
    return { id: userId.value, auth: getSessionSnapshot(), generation };
  }
  function current(attempt: ReturnType<typeof capture>) {
    return attempt.id === userId.value && attempt.generation === generation &&
      sameSession(attempt.auth, getSessionSnapshot());
  }
  function path(id: string) {
    return `/auth/admin/users/${encodeURIComponent(id)}/publication`;
  }
  function errorKey(failure: any) {
    const status = failure?.statusCode ?? failure?.status ?? failure?.response?.status;
    return status === 401 || status === 403 ? 'PublicationSupport.Denied' :
      status === 503 ? 'PublicationSupport.Unavailable' :
        status === 409 ? 'PublicationSupport.Conflict' : 'PublicationSupport.Failed';
  }

  async function load() {
    if (busy.value) return;
    generation++;
    const attempt = capture();
    publication.value = null;
    loaded = undefined;
    confirmed.value = false;
    error.value = '';
    if (!attempt.id || !attempt.auth.identity) return;
    loading.value = true;
    try {
      const result = settings(await GET(path(attempt.id)));
      if (current(attempt)) {
        publication.value = result;
        loaded = attempt;
      }
    } catch (failure) {
      if (current(attempt)) error.value = errorKey(failure);
    } finally {
      if (current(attempt)) loading.value = false;
    }
  }

  async function withdraw() {
    if (busy.value || loading.value || publication.value?.profile_visibility !== 'shared') return;
    if (!loaded || !current(loaded)) { await load(); return; }
    const attempt = capture();
    const body = { expected_revision: publication.value.visibility_revision, request_id: crypto.randomUUID() };
    busy.value = true;
    error.value = '';
    confirmed.value = false;
    try {
      // The transport preserves the existing MFA/refresh path and the same command on its sole auth retry.
      const result = await POST(path(attempt.id) + '/withdraw', body as any);
      if (current(attempt)) {
        publication.value = settings(result?.current);
        confirmed.value = publication.value.profile_visibility === 'private';
      }
    } catch (failure) {
      if (!current(attempt)) return;
      publication.value = null;
      error.value = errorKey(failure);
      // A lost reply or CAS conflict needs a fresh read before any further action.
      try {
        const result = settings(await GET(path(attempt.id)));
        if (current(attempt)) publication.value = result;
      } catch {
        // Keep the explicit failure and make another write impossible until reload succeeds.
      }
    } finally {
      if (current(attempt)) busy.value = false;
    }
  }

  watch(context, () => {
    generation++;
    publication.value = null;
    loaded = undefined;
    loading.value = false;
    busy.value = false;
    error.value = '';
    confirmed.value = false;
    void load();
  }, { immediate: true, flush: 'sync' });
  function focus() { void load(); }
  onMounted(() => window.addEventListener('focus', focus));
  onBeforeUnmount(() => {
    generation++;
    window.removeEventListener('focus', focus);
  });
  return { publication, loading, busy, error, confirmed, load, withdraw };
}
