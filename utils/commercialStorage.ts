type Store = Pick<
  Storage,
  "length" | "key" | "getItem" | "setItem" | "removeItem"
>;
const prefixes = [
  "bootstrap.staff-determination.v1.",
  "bootstrap.staff-hold-review.v1.",
];
const own = (key: string | null): key is string =>
  !!key && prefixes.some((p) => key.startsWith(p));
function entries(store: Store) {
  const result: [string, string][] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (!own(key)) continue;
    const raw = store.getItem(key);
    if (raw !== null) result.push([key, raw]);
  }
  return result;
}

/** Older builds kept journals in localStorage. Each tab works on its own
 * byte-identical copy, so every open tab can still warn about and export them;
 * an existing tab copy may carry later progress and is never overwritten.
 * The durable original goes only with a server confirmation (`removeItem` of the
 * returned store) or after the logout export was confirmed. Exact replays of the
 * same command are idempotent on the server, so copies cannot execute twice. */
export function commercialStore(local: Store, tab: Store): Store {
  try {
    for (const [key, raw] of entries(local)) {
      try {
        if (tab.getItem(key) === null) tab.setItem(key, raw);
      } catch {
        /* The original stays durable and is part of the logout export. */
      }
    }
  } catch {
    /* Unreadable durable storage leaves this tab's own journals usable. */
  }
  return {
    get length() {
      return tab.length;
    },
    key: (index: number) => tab.key(index),
    getItem: (key: string) => tab.getItem(key),
    setItem: (key: string, value: string) => tab.setItem(key, value),
    // Controllers remove a journal only after the server confirmed it.
    removeItem(key: string) {
      tab.removeItem(key);
      if (own(key)) local.removeItem(key);
    },
  };
}
export function commercialStorage() {
  return commercialStore(window.localStorage, window.sessionStorage);
}

export function staffBackupRecords(raw: string, prefix: string): string[] {
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return [raw];
  }
  if (value?.version !== 1 || !Array.isArray(value.journals)) return [raw];
  const result: string[] = [];
  for (const entry of value.journals) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "string" ||
      typeof entry[1] !== "string"
    )
      throw Error("import");
    if (entry[0].startsWith(prefix)) result.push(entry[1]);
  }
  if (!result.length) throw Error("import");
  return result;
}

type Work = { busy: () => boolean; snapshot: () => unknown; clear: () => void };
const work = new Set<Work>();
export function registerStaffWork(guard: Work) {
  work.add(guard);
  return () => work.delete(guard);
}
export function staffWorkSnapshot(local: Store, tab: Store) {
  const tabbed = entries(tab);
  return {
    version: 1,
    // An unchanged tab copy of a durable original is exported once.
    journals: [
      ...entries(local).filter(
        ([key, raw]) => !tabbed.some(([k, v]) => k === key && v === raw),
      ),
      ...tabbed,
    ],
    forms: [...work].map((g) => g.snapshot()).filter(Boolean),
  };
}
export function hasStaffWork(local: Store, tab: Store) {
  const saved = staffWorkSnapshot(local, tab);
  return saved.journals.length > 0 || saved.forms.length > 0;
}
export type StaffLogoutBlock = "busy" | "changed";
export async function prepareStaffLogout(options: {
  local: Store;
  tab: Store;
  save: (raw: string) => Promise<boolean> | boolean;
  current?: () => boolean;
  /** Explains a refusal the person did not choose; cancelling stays silent. */
  blocked?: (reason: StaffLogoutBlock) => void;
}) {
  const busy = () => {
    if (![...work].some((g) => g.busy())) return false;
    options.blocked?.("busy");
    return true;
  };
  if (options.current?.() === false || busy()) return false;
  const snapshot = staffWorkSnapshot(options.local, options.tab);
  if (
    (snapshot.journals.length || snapshot.forms.length) &&
    !(await options.save(JSON.stringify(snapshot, null, 2)))
  )
    return false;
  // A form or request may have changed while the download was being confirmed.
  if (options.current?.() === false || busy()) return false;
  if (
    JSON.stringify(staffWorkSnapshot(options.local, options.tab)) !==
    JSON.stringify(snapshot)
  ) {
    options.blocked?.("changed");
    return false;
  }
  for (const store of [options.local, options.tab]) {
    for (const [key] of entries(store)) {
      store.removeItem(key);
      if (store.getItem(key) !== null) throw Error("storage");
    }
  }
  for (const guard of work) guard.clear();
  return true;
}
