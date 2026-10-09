<template>
  <section class="card style-card bg-secondary grid gap-card-sm" data-publication-support>
    <h2 class="text-heading-2">{{ t('PublicationSupport.Heading') }}</h2>
    <p v-if="loading" role="status">{{ t('PublicationSupport.Loading') }}</p>
    <template v-else-if="publication">
      <p data-publication-status>{{ t(publication.profile_visibility === 'shared' ? 'PublicationSupport.Shared' : 'PublicationSupport.Private') }}</p>
      <p>{{ t('PublicationSupport.Scope') }}</p>
      <Btn v-if="publication.profile_visibility === 'shared'" :disabled="busy" class="w-fit max-w-full" data-publication-withdraw @click="withdraw">
        {{ t(busy ? 'PublicationSupport.Saving' : 'PublicationSupport.Withdraw') }}
      </Btn>
    </template>
    <p v-if="confirmed" role="status">{{ t('PublicationSupport.Saved') }}</p>
    <p v-if="error" role="alert">{{ t(error) }}</p>
    <Btn v-if="error" secondary :disabled="loading || busy" class="w-fit max-w-full" data-publication-reload @click="load">{{ t('PublicationSupport.Reload') }}</Btn>
  </section>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePublicationSupport } from '../../composables/publicationSupport';
const props = defineProps<{ userId: string }>();
const { t } = useI18n();
const { publication, loading, busy, error, confirmed, load, withdraw } = usePublicationSupport(toRef(props, 'userId'));
</script>
