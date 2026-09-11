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
export const useTotalDeclarations = () =>
  useState('totalDeclarations', () => 0);

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

/** Record a verified external resolution or schedule the original identified agreement.
 * The backend preserves the original declaration and receipt-based rights.
 */
export async function setDeclarationProcessed(
  id: string,
  body: {
		effective_end?: string | null;
		note?: string | null;
		action: string;
		identity_verified: boolean;
		verified_user_id?: string | null;
		renewal_agreement_id?: string | null;
	},
) {
  try {
    const payload: any = {
      action: body.action,
      identity_verified: body.identity_verified,
      verified_user_id: body.verified_user_id,
      renewal_agreement_id: body.renewal_agreement_id,
    };
    if (body.effective_end) payload.effective_end = body.effective_end;
    if (body.note) payload.note = body.note;

    const response = await PATCH(`/contracts/declarations/${id}`, payload);

    // Keep the row that is on screen in step with what was stored.
    const declarations = useDeclarations();
    declarations.value = declarations.value.map((declaration: any) =>
      declaration?.id == id ? response : declaration,
    );

    return [response, null];
  } catch (error: any) {
    return [null, error?.data ?? null];
  }
}

/**
 * An explicitly zoned RFC 3339 timestamp, preserving the confirmed instant.
 */
export function toEffectiveEnd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
