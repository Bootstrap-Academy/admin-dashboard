<script setup lang="ts">
definePageMeta({ layout: "dashboard" });
const route = useRoute();
const owner = ref<ModerationOwner>("challenges"),
  rows = ref<any[]>([]),
  delivery = ref<any[]>([]),
  error = ref(""),
  busy = ref(false);
let generation = 0,
  alive = true;
const offset = ref(0);
const form = reactive({
  id: "",
  target_id: String(route.query.target || ""),
  target_kind: String(
    route.query.kind ||
      (route.query.owner === "backend" ? "account" : "subtask"),
  ),
  source: "own_review",
  facts: "",
  notifier_contact: "",
  received_at: "",
  authority: "",
  order_reference: "",
  notification_instructions: "",
  content_location: "",
  allegation: "",
  good_faith: "",
});
async function load() {
  const attempt = ++generation,
    source = owner.value,
    token = getAccessToken();
  rows.value = [];
  delivery.value = [];
  error.value = "";
  try {
    const result = await moderationAdmin(source, "queue", {
      limit: 100,
      offset: offset.value,
    });
    if (attempt !== generation || token !== getAccessToken()) return;
    rows.value = result.map((row: any) => ({ ...row, owner: source }));
    if (source === "backend") {
      const jobs = await moderationAdmin(source, "delivery_queue");
      if (attempt === generation && token === getAccessToken())
        delivery.value = jobs;
    }
  } catch {
    if (attempt === generation)
      error.value =
        "Vorgänge konnten nicht geladen werden. Aktuelle Administrator-Anmeldung mit zweitem Faktor erforderlich; bei Störung später erneut versuchen.";
  }
}
async function open() {
  if (busy.value) return;
  busy.value = true;
  if (!form.id) form.id = crypto.randomUUID();
  const source = owner.value,
    id = form.id,
    attempt = generation,
    token = getAccessToken();
  try {
    const private_evidence: any = { facts: form.facts };
    for (const name of [
      "notifier_contact",
      "received_at",
      "authority",
      "order_reference",
      "notification_instructions",
      "content_location",
      "allegation",
      "good_faith",
    ] as const)
      if (form[name]) private_evidence[name] = form[name];
    await moderationAdmin(source, "open", {
      id,
      target_id: form.target_id,
      target_kind: source === "backend" ? "account" : form.target_kind,
      source: form.source,
      private_evidence,
    });
    if (alive && attempt === generation && token === getAccessToken())
      await navigateTo(`/dashboard/moderation/${id}?owner=${source}`);
  } catch {
    error.value =
      "Eingang nicht bestätigt oder widersprüchlicher erneuter Versuch. Kennung und Angaben behalten, Vorgang prüfen.";
  } finally {
    busy.value = false;
  }
}
watch(
  () => [owner.value, getAccessToken()],
  () => {
    offset.value = 0;
    form.id = "";
    void load();
  },
);
onMounted(() => {
  if (route.query.owner === "backend") owner.value = "backend";
  void load();
});
onBeforeUnmount(() => {
  alive = false;
  generation++;
});
</script>
<template>
  <main class="moderation grid min-w-0 gap-6 p-4">
    <h1>Moderation: Eingänge, Entscheidungen und Beschwerden</h1>
    <p v-if="error" role="alert">{{ error }}</p>
    <label
      >Zuständiger Dienst<select v-model="owner">
        <option value="challenges">Aufgaben und Funktionen</option>
        <option value="backend">Konten und Zustellung</option>
      </select></label
    >
    <button type="button" @click="load">Aktuellen Stand laden</button>
    <p>
      Dringende Hinweise und unerledigte vorläufige Einschränkungen zuerst
      prüfen. Die Liste ist kein Nachweis einer tatsächlich erfolgten
      menschlichen Bearbeitung.
    </p>
    <article
      v-for="row in rows"
      :key="row.id"
      class="grid gap-2 rounded border p-4"
    >
      <NuxtLink :to="`/dashboard/moderation/${row.id}?owner=${row.owner}`"
        >{{ row.id }} · {{ row.target_kind }} · {{ row.target_id }}</NuxtLink
      >
      <p>
        Betroffene Person: {{ row.subject }} · Quelle: {{ row.source }} ·
        Revision: {{ row.revision }}
      </p>
      <p v-if="row.private_evidence.urgent_triage" class="font-bold">
        Dringende Sicherheitsprüfung
      </p>
      <p>
        Prüfung fällig: {{ row.review_due_at || "kein Termin hinterlegt" }} ·
        Offene Beschwerden:
        {{ row.complaints.filter((c: any) => !c.outcome_decision).length }}
      </p>
    </article>
    <nav class="flex gap-3">
      <button
        type="button"
        :disabled="offset === 0"
        @click="
          offset = Math.max(0, offset - 100);
          load();
        "
      >
        Vorherige Vorgänge</button
      ><span>Ab Vorgang {{ offset + 1 }}</span
      ><button
        type="button"
        :disabled="rows.length < 100"
        @click="
          offset += 100;
          load();
        "
      >
        Weitere Vorgänge
      </button>
    </nav>
    <details>
      <summary>
        Neuen Vorgang / eingegangene E-Mail / Anordnung erfassen
      </summary>
      <form class="grid gap-3 py-4" @submit.prevent="open">
        <fieldset :disabled="busy" class="grid gap-3">
          <label v-if="owner === 'challenges'"
            >Maßnahme betrifft<select v-model="form.target_kind">
              <option value="subtask">Genaue Teilaufgabe</option>
              <option value="create">Erstellfunktion</option>
              <option value="report">Melde-Funktion</option>
            </select></label
          >
          <label
            >Teilaufgaben-ID oder betroffene Nutzer-ID<input
              v-model="form.target_id"
              required
          /></label>
          <label
            >Quelle<select v-model="form.source">
              <option value="own_review">Eigene Prüfung</option>
              <option value="email_notice">Eingegangene E-Mail</option>
              <option value="authority_order">
                Behördliche / gerichtliche Anordnung
              </option>
            </select></label
          >
          <label
            >Private Tatsachen / Belegzuordnung<textarea
              v-model="form.facts"
              required
              rows="4"
            />
          </label>
          <label
            >Kontakt meldende Person, falls angegeben<input
              v-model="form.notifier_contact"
              type="email"
          /></label>
          <template v-if="form.source === 'email_notice'"
            ><label
              >Nachgewiesener Eingang (mit Zeitzone)<input
                v-model="form.received_at"
                required /></label
            ><label
              >Genaue Fundstelle<input v-model="form.content_location" /></label
            ><label
              >Rechtswidrigkeitsvorwurf / fehlende Angaben<textarea
                v-model="form.allegation"
              /></label
            ><label
              >Erklärung nach bestem Wissen / fehlende Angabe<input
                v-model="form.good_faith" /></label
          ></template>
          <template v-if="form.source === 'authority_order'"
            ><label
              >Ausstellende Stelle<input
                v-model="form.authority"
                required /></label
            ><label
              >Anordnung / Belegreferenz<input
                v-model="form.order_reference"
                required /></label
            ><label
              >Geprüfte Benachrichtigungsanweisung<textarea
                v-model="form.notification_instructions"
                required
              /></label
          ></template>
          <button type="submit" :disabled="busy">
            Eingang dauerhaft erfassen
          </button>
        </fieldset>
      </form>
    </details>
    <details v-if="owner === 'backend'">
      <summary>
        Offene Zustellung und Kontaktklärung ({{ delivery.length }})
      </summary>
      <article
        v-for="row in delivery"
        :key="`${row.source}:${row.id}`"
        class="border p-3"
      >
        <p>
          {{ row.case_id }} · {{ row.audience }} · {{ row.status }} · Versuche:
          {{ row.attempts }}
        </p>
        <p>
          Transportannahme belegt noch keine Information der empfangenden
          Person. Fehlender Kontakt / wiederholte Fehler erfordern menschliche
          Klärung.
        </p>
      </article>
    </details>
  </main>
</template>
<style scoped>
label {
  display: grid;
  gap: 0.4rem;
}
input,
textarea,
select {
  color: #111827;
  background: white;
  border: 1px solid #94a3b8;
  border-radius: 0.3rem;
  padding: 0.6rem;
  min-width: 0;
}
button {
  border: 1px solid currentColor;
  padding: 0.6rem;
  border-radius: 0.3rem;
}
button:disabled {
  opacity: 0.5;
}
</style>
