<script setup lang="ts">
definePageMeta({ layout: "dashboard" });
const route = useRoute(),
  owner = computed<ModerationOwner>(() =>
    route.query.owner === "backend" ? "backend" : "challenges",
  );
const record = ref<any>(null),
  error = ref(""),
  busy = ref(false),
  preview = ref(false),
  key = ref("");
const loaded = ref<{
  owner: ModerationOwner;
  id: string;
  generation: number;
  token: string | null;
} | null>(null);
let generation = 0;
const form = reactive({
  outcome: "restore",
  rationale: "",
  notifier_rationale: "",
  ground: "",
  rule_version: "",
  automation:
    "Menschliche Prüfung und Entscheidung; Speicherung und Versand automatisiert.",
  redress:
    "Du kannst ab Information über diese Entscheidung mindestens sechs Kalendermonate kostenlos eine menschliche Überprüfung unter /moderation oder hallo@bootstrap.academy verlangen. Eigene Tatsachen und Korrekturen werden geprüft. Spätere Beschwerden werden zur menschlichen Bewertung angenommen. Gesetzliche außergerichtliche Rechtsbehelfe, soweit anwendbar, und der Rechtsweg bleiben unberührt.",
  ends_at: "",
  hearing: "",
  complaint_id: "",
  human_review: false,
  review_assessment: "",
  order_event_evidence: "",
  notify_after: "",
  misconduct_facts: "",
  proportionality: "",
  duration_policy: "published_ladder",
  duration_reason: "",
  prior_warning: "",
  absolute_frequency: "",
  relative_frequency: "",
  seriousness: "",
  intent_assessment: "",
  article23_applicability: "undetermined",
  article23_basis: "",
});
const escalation = reactive({
  id: "",
  kind: "article18_assessment",
  facts: "",
  assessment: "",
  human_responsibility: "",
  authority: "",
  transmitted_at: "",
  transmission_evidence: "",
  notified_at: "",
  notification_evidence: "",
  resolves: "",
  notice_after: "",
  instruction_evidence: "",
});
const scopes: Record<string, string> = {
  subtask: "Diese Teilaufgabe auf Bootstrap Academy",
  create: "Erstellen von Teilaufgaben auf Bootstrap Academy",
  report: "Melden von Teilaufgaben auf Bootstrap Academy",
  account:
    "Allgemeiner Kontozugang auf Bootstrap Academy; Rechtezugang bleibt erhalten",
};
const retention = reactive({
  id: "",
  action: "minimize",
  reason: "",
  fields: "comment",
  legal_or_claim_basis: "",
  review_at: "",
  retention_id: "",
  contact_necessity_assessment: "",
  remaining_remedy_access: "",
  unnotified_rights_preserved: false,
  confirmed: false,
  open_complaints_considered: false,
});
const handling = reactive({ id: "", status: "", facts: "" });
const contacts = ref<any[]>([]),
  correction = reactive({ message: "", contact: "", evidence: "" });
const contactResult = ref("");
const scope = computed(() => scopes[record.value?.target_kind]);
const outcomes = computed(() =>
  record.value?.source === "authority_order"
    ? ["authority_start", "authority_change", "authority_end"]
    : record.value?.target_kind === "subtask"
      ? ["restore", "provisional", "uphold", "remove", "retire", "warn"]
      : ["restore", "restrict", "uphold", "warn"],
);
function command() {
  if (
    !loaded.value ||
    loaded.value.id !== String(route.params.id) ||
    loaded.value.owner !== owner.value ||
    loaded.value.token !== getAccessToken()
  )
    throw new Error("Loaded case changed");
  const body: any = {
    request_key: key.value,
    case_id: loaded.value.id,
    expected_revision: record.value.revision,
    outcome: form.outcome,
    rationale: form.rationale,
    notifier_rationale: form.notifier_rationale,
    ground: form.ground,
    rule_version: form.rule_version,
    automation: form.automation,
    scope: scope.value,
    redress: form.redress,
    hearing: form.hearing,
  };
  if (record.value.target_kind === "subtask")
    body.reviewed_content_revision = record.value.review_target?.revision;
  for (const name of [
    "ends_at",
    "complaint_id",
    "order_event_evidence",
    "notify_after",
    "misconduct_facts",
    "proportionality",
    "duration_policy",
    "duration_reason",
    "prior_warning",
    "absolute_frequency",
    "relative_frequency",
    "seriousness",
    "intent_assessment",
    "article23_applicability",
    "article23_basis",
  ] as const)
    if (form[name]) body[name] = form[name];
  if (form.complaint_id) {
    body.human_review = form.human_review;
    body.review_assessment = form.review_assessment;
  }
  return body;
}
async function load() {
  const identity = {
    owner: owner.value,
    id: String(route.params.id),
    generation: ++generation,
    token: getAccessToken(),
  };
  record.value = loaded.value = null;
  preview.value = false;
  contacts.value = [];
  contactResult.value = "";
  correction.message = correction.contact = correction.evidence = "";
  retention.id =
    retention.reason =
    retention.legal_or_claim_basis =
    retention.review_at =
    retention.retention_id =
    retention.contact_necessity_assessment =
    retention.remaining_remedy_access =
      "";
  retention.action = "minimize";
  retention.fields = "comment";
  retention.confirmed = retention.open_complaints_considered = false;
  retention.unnotified_rights_preserved = false;
  handling.id = handling.status = handling.facts = "";
  form.rationale =
    form.notifier_rationale =
    form.ground =
    form.rule_version =
    form.review_assessment =
    form.complaint_id =
    form.hearing =
    form.order_event_evidence =
    form.notify_after =
    form.ends_at =
      "";
  for (const field of Object.keys(escalation) as (keyof typeof escalation)[])
    escalation[field] = field === "kind" ? "article18_assessment" : "";
  form.human_review = false;
  form.misconduct_facts =
    form.proportionality =
    form.duration_reason =
    form.prior_warning =
    form.absolute_frequency =
    form.relative_frequency =
    form.seriousness =
    form.intent_assessment =
    form.article23_basis =
      "";
  form.duration_policy = "published_ladder";
  form.article23_applicability = "undetermined";
  try {
    const result = await moderationAdmin(identity.owner, "case", {
      id: identity.id,
    });
    if (
      identity.generation !== generation ||
      identity.token !== getAccessToken()
    )
      return;
    if (!result || result.id !== identity.id) throw new Error();
    record.value = result;
    loaded.value = Object.freeze(identity);
    key.value = crypto.randomUUID();
    error.value = "";
  } catch {
    if (identity.generation === generation)
      error.value =
        "Vorgang nicht geladen. ID, Dienst, MFA-Anmeldung und Verfügbarkeit prüfen.";
  }
}
async function decide() {
  if (busy.value || !preview.value || !loaded.value) return;
  const identity = loaded.value,
    body = command();
  busy.value = true;
  try {
    await moderationAdmin(identity.owner, "decide", body);
    if (identity.generation === generation) await load();
  } catch {
    if (identity.generation === generation)
      error.value =
        "Entscheidung nicht bestätigt oder aktueller Stand / Pflichtangaben stimmen nicht. Unveränderten Versuch mit derselben Kennung wiederholen; vor neuen Angaben aktuellen Vorgang laden. Es wurde keine erfolgreiche Zustellung behauptet.";
  } finally {
    busy.value = false;
  }
}
watch(
  form,
  () => {
    if (!busy.value) {
      key.value = crypto.randomUUID();
      preview.value = false;
    }
  },
  { deep: true },
);
async function escalate() {
  if (busy.value || !loaded.value) return;
  const identity = loaded.value,
    body = {
      ...escalation,
      id: (escalation.id ||= crypto.randomUUID()),
      case_id: identity.id,
    };
  busy.value = true;
  try {
    await moderationAdmin(identity.owner, "escalate", body);
    if (identity.generation === generation) await load();
  } catch {
    if (identity.generation === generation)
      error.value =
        "Eskalationsvermerk unvollständig oder nicht bestätigt. Eine Übermittlung wird nur mit tatsächlichem Zeitpunkt und Beleg gespeichert.";
  } finally {
    busy.value = false;
  }
}
watch(
  () => Object.values(retention).slice(1),
  () => {
    if (!busy.value) retention.id = "";
  },
);
watch(
  () => [handling.status, handling.facts],
  () => {
    if (!busy.value) handling.id = "";
  },
);
watch(
  () => Object.values(escalation).slice(1),
  () => {
    if (!busy.value) escalation.id = "";
  },
);
async function lifecycle(operation: "retention" | "handling") {
  if (busy.value || !loaded.value) return;
  const identity = loaded.value;
  if (identity.token !== getAccessToken()) return;
  if (operation === "retention" && !retention.confirmed) return;
  const id =
    operation === "retention"
      ? (retention.id ||= crypto.randomUUID())
      : (handling.id ||= crypto.randomUUID());
  const body =
    operation === "retention"
      ? {
        id,
        case_id: identity.id,
        action: retention.action,
        reason: retention.reason,
        unnecessary_fields: retention.fields.split(",").map((s) => s.trim()),
        necessary_fields: retention.fields.split(",").map((s) => s.trim()),
        legal_or_claim_basis: retention.legal_or_claim_basis,
        review_at: retention.review_at || null,
        retention_id: retention.retention_id || null,
        claims_and_retention_checked: retention.confirmed,
        open_complaints_considered: retention.open_complaints_considered,
        contact_necessity_assessment: retention.contact_necessity_assessment,
        remaining_remedy_access: retention.remaining_remedy_access,
        unnotified_rights_preserved: retention.unnotified_rights_preserved,
      }
      : {
        id,
        case_id: identity.id,
        kind: "commercial_rights_and_contract_review",
        status: handling.status,
        facts: handling.facts,
      };
  busy.value = true;
  try {
    await moderationAdmin(identity.owner, operation, body);
    if (identity.generation === generation) {
      if (operation === "retention" && retention.action === "dispose")
        await navigateTo("/dashboard/moderation");
      else await load();
    }
  } catch {
    if (identity.generation === generation)
      error.value =
        "Bearbeitung nicht bestätigt. Unveränderte Kennung/Angaben behalten; offene Rechte, Aufbewahrung und Zuständigkeit prüfen.";
  } finally {
    busy.value = false;
  }
}
async function loadContacts() {
  const identity = loaded.value;
  if (!identity) return;
  try {
    const rows = await moderationAdmin("backend", "delivery_queue", {
      case_id: identity.id,
      source: identity.owner,
    });
    if (
      identity.generation === generation &&
      identity.token === getAccessToken()
    )
      contacts.value = rows;
  } catch {
    if (identity.generation === generation)
      error.value = "Zustellungsstand vorübergehend nicht verfügbar.";
  }
}
async function correctContact() {
  const identity = loaded.value,
    row = contacts.value.find((r) => r.id === correction.message);
  if (
    !identity ||
    !row ||
    busy.value ||
    row.case_id !== identity.id ||
    row.source !== identity.owner
  )
    return;
  const body = {
    source: identity.owner,
    id: row.id,
    contact: correction.contact,
    verification_evidence: correction.evidence,
  };
  busy.value = true;
  try {
    const result = await moderationAdmin("backend", "delivery_contact", body);
    if (identity.generation === generation) {
      contactResult.value = `Kontaktkorrektur gespeichert. Bereits zugelassene, noch ungeklärte Versandversuche: ${result.in_progress_attempts ?? 0}. Eine Zulassung belegt keinen Versand; bereits übermittelte Nachrichten können damit nicht zurückgerufen werden.`;
      await loadContacts();
    }
  } catch {
    if (identity.generation === generation)
      error.value =
        "Kontaktkorrektur nicht bestätigt; tatsächliche Berechtigung und unveränderten Vorgang prüfen.";
  } finally {
    busy.value = false;
  }
}
watch(() => [String(route.params.id), owner.value, getAccessToken()], load, {
  immediate: true,
});
onBeforeUnmount(() => {
  generation++;
  record.value = loaded.value = null;
});
</script>
<template>
  <main class="moderation grid min-w-0 gap-6 p-4">
    <NuxtLink to="/dashboard/moderation">Vorgangsliste</NuxtLink>
    <h1>Vorgang {{ route.params.id }}</h1>
    <p v-if="error" role="alert">{{ error }}</p>
    <button type="button" @click="load">Aktuellen Stand laden</button>
    <template v-if="record">
      <p>
        Exaktes Ziel: {{ record.target_kind }} {{ record.target_id }} ·
        Betroffene Person: {{ record.subject }} · Revision {{ record.revision }}
      </p>
      <p v-if="record.review_target">
        Zu prüfende Inhaltsrevision: {{ record.review_target.revision }} ·
        zurückgezogen: {{ record.review_target.withdrawn }}
      </p>
      <details>
        <summary>
          Private Belege / ursprünglicher Inhalt — nicht in Empfängertexte
          kopieren
        </summary>
        <pre>{{ JSON.stringify(record.private_evidence, null, 2) }}</pre>
      </details>
      <details v-if="record.review_target">
        <summary>Aktueller genauer Inhalt für diese Prüfung</summary>
        <pre>{{ JSON.stringify(record.review_target.content, null, 2) }}</pre>
      </details>
      <details open>
        <summary>Wirksame Einschränkungen</summary>
        <pre>{{ JSON.stringify(record.effective, null, 2) }}</pre>
      </details>
      <p>
        Eine Wiederherstellung beendet nur diesen Vorgang. Andere
        Einschränkungen, Anordnungen und ein Rückzug durch den Autor bleiben
        maßgeblich. Die Datenbankrolle belegt weder reale Besetzung noch
        Qualifikation der Bearbeitung.
      </p>
      <form class="grid gap-4" @submit.prevent="decide">
        <fieldset :disabled="busy" class="grid gap-4">
          <label
            >Ausdrückliches Ergebnis<select v-model="form.outcome">
              <option v-for="value in outcomes" :key="value" :value="value">
                {{ value }}
              </option>
            </select></label
          >
          <label
            >Empfängerfähige konkrete Tatsachen und Begründung<textarea
              v-model="form.rationale"
              required
              minlength="3"
              rows="5"
            />
          </label>
          <label
            >Getrennte kurze Begründung für meldende Person<textarea
              v-model="form.notifier_rationale"
              rows="3"
            />
          </label>
          <label
            >Rechtliche oder anwendbare vertragliche Grundlage<textarea
              v-model="form.ground"
              required
              minlength="3"
            />
          </label>
          <label
            >Unveränderliche Regelfassung / Belegreferenz und tatsächliche
            Anwendbarkeit<textarea
              v-model="form.rule_version"
              required
              minlength="3"
            />
          </label>
          <p>
            Eine heutige Fassung oder ein aktuelles Kontofeld belegt keine
            historische Zustimmung oder rechtliche Wirksamkeit. Unbekannte
            Grundlage nicht als festgestellt darstellen.
          </p>
          <label
            >Automatisierung / tatsächliche menschliche Prüfung<textarea
              v-model="form.automation"
              required
            />
          </label>
          <label
            >Anhörung, Korrekturvorschlag oder konkrete Dringlichkeit<textarea
              v-model="form.hearing"
            />
          </label>
          <label
            >Ende der Einschränkung (ISO-Zeit mit Zeitzone), falls
            befristet<input v-model="form.ends_at"
          /></label>
          <template
            v-if="
              ['create', 'report', 'account'].includes(record.target_kind) &&
              ['restrict', 'uphold'].includes(form.outcome)
            "
          >
            <label
              >Konkretes Fehlverhalten, unabhängig von bloßem Sachfehler /
              erfolgloser Meldung<textarea
                v-model="form.misconduct_facts"
                required
              /></label
            ><label
              >Verhältnismäßigkeit, mildere Mittel und Dauer<textarea
                v-model="form.proportionality"
                required
              />
            </label>
            <label v-if="record.target_kind !== 'account'"
              >Dauer<select v-model="form.duration_policy">
                <option value="published_ladder">
                  Veröffentlichte Staffel: 3 / 7 / 30 Tage / unbefristet;
                  aufgehobene Sperren zählen nicht
                </option>
                <option value="individual_assessment">
                  Einzelfallprüfung mit ausdrücklich eingetragenem Ende
                </option>
              </select></label
            ><label v-if="form.duration_policy === 'individual_assessment'"
              >Begründung der abweichenden Dauer<textarea
                v-model="form.duration_reason"
                required
              />
            </label>
            <template
              v-if="
                record.target_kind === 'report' ||
                form.article23_applicability === 'applies'
              "
              ><label
                v-for="field in [
                  'prior_warning',
                  'absolute_frequency',
                  'relative_frequency',
                  'seriousness',
                  'intent_assessment',
                ] as const"
                :key="field"
                >{{
                  {
                    prior_warning: "Tatsächliche vorherige Warnung",
                    absolute_frequency: "Absolute Häufigkeit",
                    relative_frequency: "Relative Häufigkeit",
                    seriousness: "Schwere und Folgen",
                    intent_assessment: "Erkennbare Absicht",
                  }[field]
                }}<textarea v-model="form[field]" required />
              </label>
              <p>
                Bei anwendbarem Art. 23 sind vorherige Warnung,
                Einzelfallprüfung und endliche Dauer erforderlich. Eine
                Startup-Annahme belegt keine Ausnahme. Die öffentlichen
                gesetzlichen Melde- und Beschwerdewege bleiben offen.
              </p></template
            ><label
              >Art.-23-Anwendbarkeit<select
                v-model="form.article23_applicability"
              >
                <option value="undetermined">Ungeklärt</option>
                <option value="applies">Anwendbar</option>
                <option value="does_not_apply">
                  Nicht anwendbar, tatsächlich belegt
                </option>
              </select></label
            ><label v-if="form.article23_applicability !== 'undetermined'"
              >Konkreter Nachweis, keine pauschale Startup-Annahme<textarea
                v-model="form.article23_basis"
                required
              />
            </label>
          </template>
          <label
            >Rechtsbehelfe<textarea v-model="form.redress" required rows="4" />
          </label>
          <label
            >Zu entscheidende offene Beschwerde<select
              v-model="form.complaint_id"
            >
              <option value="">Keine</option>
              <option
                v-for="c in record.complaints.filter(
                  (c: any) => !c.outcome_decision,
                )"
                :key="c.id"
                :value="c.id"
              >
                {{ c.id }}: {{ c.text }}
              </option>
            </select></label
          >
          <template v-if="form.complaint_id"
            ><label class="flex gap-2"
              ><input
                v-model="form.human_review"
                type="checkbox"
                required
              />Tatsächliche menschliche Prüfung unter qualifizierter Aufsicht
              dokumentieren</label
            ><label
              >Empfängerfähiges Ergebnis der Prüfung einschließlich neuer
              Tatsachen<textarea
                v-model="form.review_assessment"
                required
              /></label
          ></template>
          <template v-if="record.source === 'authority_order'"
            ><label
              >Validiertes Start-/Änderungs-/Endereignis und Beleg<textarea
                v-model="form.order_event_evidence"
                required
              /></label
            ><label
              >Benachrichtigung erst ab (nur nach konkreter rechtmäßiger
              Anweisung)<input v-model="form.notify_after" /></label
          ></template>
          <button type="button" :disabled="busy" @click="preview = true">
            Empfängertexte prüfen
          </button>
          <article v-if="preview" class="grid gap-2 rounded border p-4">
            <h2>Vorschau für betroffene Person</h2>
            <p class="whitespace-pre-wrap">{{ form.rationale }}</p>
            <p>{{ form.ground }}</p>
            <p>{{ form.rule_version }}</p>
            <p>
              {{ scope }} · {{ form.ends_at || "Kein festes Ende eingetragen" }}
            </p>
            <p>{{ form.automation }}</p>
            <p>{{ form.redress }}</p>
            <h2>Vorschau für meldende Person</h2>
            <p>{{ form.notifier_rationale || form.rationale }}</p>
            <p>{{ form.automation }}</p>
            <p>{{ form.redress }}</p>
            <button type="submit" :disabled="busy">
              Entscheidung und Mitteilungsauftrag verbindlich speichern
            </button>
          </article>
        </fieldset>
      </form>
      <details>
        <summary>
          Dringende Sicherheitsprüfung / Art.-18-Prüfung / Anordnungsereignis
          dokumentieren
        </summary>
        <form class="grid gap-3 py-3" @submit.prevent="escalate">
          <fieldset :disabled="busy" class="grid gap-3">
            <label
              >Art<select v-model="escalation.kind">
                <option>article18_assessment</option>
                <option>article18_transmission</option>
                <option>authority_validation</option>
                <option>authority_notification</option>
                <option>notice_instruction</option>
                <option>work_resolution</option>
                <option>platform_obligations_review</option>
              </select></label
            ><label
              >Konkrete Tatsachen<textarea
                v-model="escalation.facts"
                required
              /></label
            ><label
              >Prüfung / weitere Schritte<textarea
                v-model="escalation.assessment"
                required
              /></label
            ><label
              >Tatsächlich verantwortliche menschliche Bearbeitung<input
                v-model="escalation.human_responsibility"
                required /></label
            ><template v-if="escalation.kind === 'article18_transmission'"
              ><label
                >Tatsächliche Empfangsstelle<input
                  v-model="escalation.authority"
                  required /></label
              ><label
                >Tatsächlicher Übermittlungszeitpunkt mit Zeitzone<input
                  v-model="escalation.transmitted_at"
                  required /></label
              ><label
                >Nachweis der Übermittlung<textarea
                  v-model="escalation.transmission_evidence"
                  required
                /></label></template
            ><template v-if="escalation.kind === 'authority_notification'"
              ><label
                >Tatsächliche Information an die zuständige Stelle / Beleg<input
                  v-model="escalation.notified_at"
                  required
                /><textarea
                  v-model="escalation.notification_evidence"
                  required
                /></label></template
            ><label v-if="escalation.kind === 'work_resolution'"
              >Exakte Kennung des tatsächlich erledigten Ereignisses<input
                v-model="escalation.resolves"
                required
            /></label>
            <p v-if="escalation.kind === 'platform_obligations_review'">
              Tatsächliche Einordnung/Größenmerkmale, einschlägige Warn-,
              Berichts- oder Datenbankpflichten sowie verantwortliche weitere
              Arbeit dokumentieren. Keine Veröffentlichung oder Übermittlung
              durch dieses Formular.
            </p>
            <template v-if="escalation.kind === 'notice_instruction'"
              ><label
                >Aktuell rechtmäßig frühester Benachrichtigungszeitpunkt<input
                  v-model="escalation.notice_after"
                  required /></label
              ><label
                >Konkrete geprüfte Anweisung / Freigabe<textarea
                  v-model="escalation.instruction_evidence"
                  required
                /></label
            ></template>
            <p>Diese Erfassung versendet keine Meldung an eine Behörde.</p>
            <button type="submit" :disabled="busy">
              Tatsächlichen Vermerk speichern
            </button>
            <p v-if="escalation.id">
              Kennung für unveränderten erneuten Versuch: {{ escalation.id }}
            </p>
          </fieldset>
        </form>
      </details>
      <details v-if="owner === 'backend'">
        <summary>Offene kommerzielle Rechtebearbeitung</summary>
        <p>{{ record.handling }}</p>
        <form class="grid gap-3" @submit.prevent="lifecycle('handling')">
          <fieldset :disabled="busy" class="grid gap-3">
            <label
              >Tatsächlicher Stand<select v-model="handling.status" required>
                <option value="">Auswählen</option>
                <option value="pending_human_handling">Weiter offen</option>
                <option value="completed">Tatsächlich erledigt</option>
                <option value="not_applicable">
                  Nach konkreter Prüfung nicht einschlägig
                </option>
              </select></label
            ><label
              >Konkrete bezahlte Rechte, gewählte Abhilfe und tatsächliches
              Ergebnis<textarea v-model="handling.facts" required /></label
            ><button type="submit">
              Tatsächliche Bearbeitung dokumentieren
            </button>
          </fieldset>
        </form>
      </details>
      <details>
        <summary>Aufbewahrung und erforderliche private Daten prüfen</summary>
        <p>
          Abschluss: {{ record.closed_at || "noch offen" }}. Grundsätzlich zwölf
          Monate danach; offene Rechte und ausdrücklich notwendige Felder
          bleiben geschützt. Jede längere Ausnahme später ausdrücklich
          freigeben.
        </p>
        <form class="grid gap-3" @submit.prevent="lifecycle('retention')">
          <fieldset :disabled="busy" class="grid gap-3">
            <label
              >Geprüfte Aktion<select v-model="retention.action">
                <option value="minimize">
                  Bestimmte unnötige private Felder reduzieren
                </option>
                <option value="retain">
                  Konkrete notwendige Aufbewahrung dokumentieren
                </option>
                <option value="release_retention">
                  Beendete Aufbewahrungsausnahme freigeben
                </option>
                <option value="dispose">
                  Abgeschlossenen fälligen Fall löschen
                </option>
              </select></label
            ><label
              >Konkrete Prüfung / Begründung<textarea
                v-model="retention.reason"
                required
              /></label
            ><label
              >Betroffene Felder (durch Komma getrennt)<input
                v-model="retention.fields" /></label
            ><template v-if="retention.action === 'retain'"
              ><label
                >Konkrete gesetzliche Pflicht / Anspruchsgrundlage<textarea
                  v-model="retention.legal_or_claim_basis"
                  required
                /></label
              ><label
                >Nächster Prüftermin mit Zeitzone<input
                  v-model="retention.review_at"
                  required /></label></template
            ><template v-if="retention.action === 'minimize' && !record.closed_at && retention.fields.split(',').some((field) => ['author_contact', 'notifier_contact'].includes(field.trim()))">
              <label>Konkrete Prüfung: warum dieser Kontakt unnötig ist<textarea v-model="retention.contact_necessity_assessment" required /></label>
              <label>Verbleibender Zugang zu offenen Rechten und Beschwerden<textarea v-model="retention.remaining_remedy_access" required /></label>
              <label>Nächster individueller Prüftermin mit Zeitzone<input v-model="retention.review_at" required /></label>
              <label><input v-model="retention.unnotified_rights_preserved" type="checkbox" required />Unbekannte Information bleibt unbekannt; offene Beschwerde- und sonstige Rechte bleiben erhalten.</label>
            </template><label v-if="retention.action === 'release_retention'"
              >Exakte Kennung der freizugebenden Ausnahme<input
                v-model="retention.retention_id"
                required /></label
            ><label
              ><input
                v-model="retention.open_complaints_considered"
                type="checkbox"
              />Spezifische offene Beschwerden und Belegbedarf geprüft</label
            ><label
              ><input
                v-model="retention.confirmed"
                type="checkbox"
                required
              />Konkrete Notwendigkeit, offene Rechte, gesetzliche Pflichten und
              Ansprüche tatsächlich geprüft</label
            ><button type="submit">Geprüfte Aktion dauerhaft ausführen</button>
            <p v-if="retention.id">
              Kennung für unveränderten erneuten Versuch: {{ retention.id }}
            </p>
          </fieldset>
        </form>
      </details>
      <details>
        <summary>
          Empfängerbezogene Zustellung und nachgewiesene Kontaktkorrektur
        </summary>
        <button type="button" @click="loadContacts">
          Aktuellen Zustellungsstand laden
        </button>
        <form class="grid gap-3" @submit.prevent="correctContact">
          <fieldset :disabled="busy" class="grid gap-3">
            <label
              >Exakte Nachricht<select v-model="correction.message" required>
                <option value="">Auswählen</option>
                <option
                  v-for="item in contacts.filter(
                    (r) => r.audience !== 'recovery',
                  )"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.id }} · {{ item.audience }} · {{ item.status }} ·
                  {{ item.current_contact || "Kontakt ungeklärt" }}
                </option>
              </select></label
            ><label
              >Tatsächlich nachgewiesener aktueller Kontakt<input
                v-model="correction.contact"
                type="email"
                required /></label
            ><label
              >Konkreter Prüfbeleg der Empfängerberechtigung<textarea
                v-model="correction.evidence"
                required
              />
            </label>
            <p>
              Die Korrektur entzieht früheren Fallzugängen die weitere
              Berechtigung. Sie bestätigt keine erfolgte Zustellung.
            </p>
            <button type="submit">Nachgewiesenen Kontakt korrigieren</button>
            <p v-if="contactResult" role="status">{{ contactResult }}</p>
          </fieldset>
        </form>
      </details>
      <details>
        <summary>
          Unveränderte bisherige Entscheidungen, Beschwerden und Ereignisse
        </summary>
        <pre>{{
          JSON.stringify(
            {
              decisions: record.decisions,
              complaints: record.complaints,
              escalations: record.escalations,
              handling: record.handling,
              handling_events: record.handling_events,
              retention_reviews: record.retention_reviews,
            },
            null,
            2,
          )
        }}</pre>
      </details>
    </template>
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
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 35rem;
  overflow: auto;
  font-size: 0.85rem;
}
</style>
