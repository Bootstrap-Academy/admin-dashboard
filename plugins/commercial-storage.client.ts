import { hasStaffWork, commercialStorage } from "../utils/commercialStorage";
import {
  determinationSaved,
  determinationJson,
} from "../composables/commercialDetermination";
import { holdSaved } from "../composables/commercialHoldReview";

// Old qualified receipts are already on the server. Imported receipts are
// separately marked unconfirmed by the existing controllers.
function confirmed(key: string, raw: string | null) {
  if (raw === null) return false;
  try {
    return key.startsWith("bootstrap.staff-determination.v1.")
      ? determinationSaved(determinationJson(raw, false)).receipts.length > 0
      : key.startsWith("bootstrap.staff-hold-review.v1.") &&
          holdSaved(JSON.parse(raw)).confirmed;
  } catch {
    return false; // Unknown originals stay available for recovery/export.
  }
}

export default defineNuxtPlugin((app) => {
  try {
    const local = window.localStorage,
      tab = commercialStorage();
    const keys = new Set<string>();
    for (const store of [local, tab])
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key) keys.add(key);
      }
    for (const key of keys) {
      try {
        // A confirmation in either copy settles the command; removal covers both.
        if (confirmed(key, tab.getItem(key)) || confirmed(key, local.getItem(key)))
          tab.removeItem(key);
      } catch {
        /* Unremovable copies stay available for recovery/export. */
      }
    }
  } catch {
    /* Existing journals remain available for export at logout. */
  }
  const warn = (event: BeforeUnloadEvent) => {
    try {
      if (!hasStaffWork(window.localStorage, window.sessionStorage)) return;
    } catch {
      /* Unreadable journals cannot be assumed saved. */
    }
    event.preventDefault();
    event.returnValue = "";
  };
  window.addEventListener("beforeunload", warn);
  app.vueApp.onUnmount(() => window.removeEventListener("beforeunload", warn));
});
