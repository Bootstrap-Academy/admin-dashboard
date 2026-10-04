import { hasStaffWork, commercialStorage } from "../utils/commercialStorage";
import {
  determinationSaved,
  determinationJson,
} from "../composables/commercialDetermination";
import { holdSaved } from "../composables/commercialHoldReview";

export default defineNuxtPlugin((app) => {
  try {
    const tab = commercialStorage();
    const keys = Array.from({ length: tab.length }, (_, i) => tab.key(i));
    for (const key of keys) {
      if (!key) continue;
      try {
        const raw = tab.getItem(key);
        if (raw === null) continue;
        // Old qualified receipts are already on the server. Imported receipts
        // are separately marked unconfirmed by the existing controllers.
        const confirmed = key.startsWith("bootstrap.staff-determination.v1.")
          ? determinationSaved(determinationJson(raw, false)).receipts.length >
            0
          : key.startsWith("bootstrap.staff-hold-review.v1.") &&
            holdSaved(JSON.parse(raw)).confirmed;
        if (confirmed) tab.removeItem(key);
      } catch {
        /* Unknown originals stay available for recovery/export. */
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
