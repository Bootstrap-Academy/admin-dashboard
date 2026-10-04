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

/** Move old journals only after a byte-identical tab copy has been verified.
 * Conflicting or unreadable histories stay available for an explicit export. */
export function migrateCommercialStorage(local: Store, tab: Store) {
  for (const [key, raw] of entries(local)) {
    const current = tab.getItem(key);
    if (current !== null && current !== raw) throw Error("storage");
    tab.setItem(key, raw);
    if (tab.getItem(key) !== raw) throw Error("storage");
    local.removeItem(key);
    if (local.getItem(key) !== null) throw Error("storage");
  }
  return tab;
}
export function commercialStorage() {
  return migrateCommercialStorage(window.localStorage, window.sessionStorage);
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
  return {
    version: 1,
    journals: [...entries(local), ...entries(tab)],
    forms: [...work].map((g) => g.snapshot()).filter(Boolean),
  };
}
export function hasStaffWork(local: Store, tab: Store) {
  const saved = staffWorkSnapshot(local, tab);
  return saved.journals.length > 0 || saved.forms.length > 0;
}
export async function prepareStaffLogout(options: {
  local: Store;
  tab: Store;
  save: (raw: string) => Promise<boolean> | boolean;
  current?: () => boolean;
}) {
  if (options.current?.() === false || [...work].some((g) => g.busy()))
    return false;
  const snapshot = staffWorkSnapshot(options.local, options.tab);
  if (
    (snapshot.journals.length || snapshot.forms.length) &&
    !(await options.save(JSON.stringify(snapshot, null, 2)))
  )
    return false;
  // A form or request may have changed while the download was being confirmed.
  if (
    options.current?.() === false ||
    [...work].some((g) => g.busy()) ||
    JSON.stringify(staffWorkSnapshot(options.local, options.tab)) !==
      JSON.stringify(snapshot)
  )
    return false;
  for (const store of [options.local, options.tab]) {
    for (const [key] of entries(store)) {
      store.removeItem(key);
      if (store.getItem(key) !== null) throw Error("storage");
    }
  }
  for (const guard of work) guard.clear();
  return true;
}
