import { GET, PATCH } from './fetch';

/**
 * Cancellation and withdrawal declarations handed in through the public forms
 * of the website (§ 312k BGB, § 356a BGB).
 *
 * The listing and the processing endpoint both require administrative
 * privileges, which the backend only grants to a session that was created with
 * a second factor.
 */

export const useDeclarations = () => useState<any[]>('declarations', () => []);
export const useTotalDeclarations = () => useState('totalDeclarations', () => 0);

export const DECLARATION_KINDS = ['CANCELLATION', 'WITHDRAWAL'];

export async function getDeclarations(query: {
  kind?: string;
  limit: number;
  offset: number;
}) {
  try {
    const response: any = await GET('/contracts/declarations', {
      limit: query.limit,
      offset: query.offset,
      ...(query.kind ? { kind: query.kind } : {}),
    });

    useDeclarations().value = response?.declarations ?? [];
    useTotalDeclarations().value = response?.total ?? 0;

    return [response, null];
  } catch (error: any) {
    return [null, error?.data ?? null];
  }
}

/**
 * Record that a declaration has been dealt with. A field that is not given is
 * left as it is stored, so marking an ordinary cancellation as processed does
 * not throw away the end date the backend determined.
 */
export async function setDeclarationProcessed(
  id: string,
  body: { effective_end?: string | null; note?: string | null }
) {
  try {
    const payload: any = {};
    if (body.effective_end) payload.effective_end = body.effective_end;
    if (body.note) payload.note = body.note;

    const response = await PATCH(`/contracts/declarations/${id}`, payload);

    // Keep the row that is on screen in step with what was stored.
    const declarations = useDeclarations();
    declarations.value = declarations.value.map((declaration: any) =>
      declaration?.id == id ? response : declaration
    );

    return [response, null];
  } catch (error: any) {
    return [null, error?.data ?? null];
  }
}

/**
 * The date picked in a `type="date"` input (`2026-12-31`) as the RFC 3339 UTC
 * timestamp the api expects.
 */
export function toEffectiveEnd(date: string) {
  return date ? `${date}T00:00:00Z` : null;
}

/**
 * Declarations are received and confirmed in Europe/Berlin, so that is the
 * calendar the dashboard shows them in as well.
 */
export const DECLARATION_TIME_ZONE = 'Europe/Berlin';

export function formatDeclarationDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DECLARATION_TIME_ZONE,
  }).format(date);
}

export function formatDeclarationDate(value: string, locale: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: DECLARATION_TIME_ZONE,
  }).format(date);
}
