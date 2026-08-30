/**
 * Links into the Factorio Blueprint Editor at https://fbe.factorygamefan.com/,
 * the actively maintained fork of teoxoy/factorio-blueprint-editor.
 *
 * The editor takes its input from a single `source` query parameter, which is
 * either a raw blueprint string (anything starting with `0`) or a URL on one of
 * the sites it knows how to fetch from (Factorio Prints, Factorio School,
 * Pastebin, Hastebin, gist, GitLab, FactorioBin, Google Docs).
 */

export const FACTORIO_BLUEPRINT_EDITOR_URL = 'https://fbe.factorygamefan.com/';

/**
 * The Factorio Prints API, which answers a raw blueprint string as text and can
 * address one blueprint inside a book by position. The editor passes an `/api/`
 * path through untouched (FactoryGameFan/factorio-blueprint-editor#276), so a
 * link built on it stays short no matter how large the blueprint is.
 */
export const FACTORIOPRINTS_BLUEPRINT_DATA_URL = 'https://factorioprints.xyz/api/blueprintData';

/**
 * Cloudflare rejects requests whose URL exceeds 16 KB, and the editor is hosted
 * on a Cloudflare Worker. Stay well under that so intermediate proxies and
 * browsers do not truncate the link either.
 */
export const MAX_EDITOR_URL_LENGTH = 8000;

const POSITION_INDEX_REGEX = /^[1-9][0-9]*$/;

interface EditorUrlOptions {
	/** Factorio Prints API url addressing exactly the blueprint on screen. */
	apiSourceUrl?: string;
	/** Serialized blueprint string, exactly what the editor should load. */
	blueprintString?: string;
	/** URL the blueprint was fetched from, for the editor to fetch itself. */
	sourceUrl?: string;
}

/**
 * SHA-1 hex digest, the sha the Factorio Prints API keys blueprints by.
 *
 * Returns undefined rather than throwing when the digest is unavailable.
 * `crypto.subtle` exists only in a secure context, so any page served over
 * plain http from something other than localhost — a LAN or tailnet preview —
 * has none, and the editor link falls back to the blueprint string there.
 */
export async function blueprintSha1(blueprintString: string): Promise<string | undefined> {
	// The DOM types declare `crypto.subtle` as always present, which is what made
	// this a runtime error rather than a compile error, so the cast is the point:
	// it restores the `undefined` the browser actually hands back.
	const subtle = globalThis.crypto.subtle as SubtleCrypto | undefined;
	if (subtle == null) {
		return undefined;
	}

	try {
		const bytes = new TextEncoder().encode(blueprintString);
		const digest = await subtle.digest('SHA-1', bytes);

		return Array.from(new Uint8Array(digest))
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
	} catch {
		return undefined;
	}
}

/**
 * Converts a playground selection path to an API position.
 *
 * The playground numbers a book's blueprints from 1; the API numbers them from
 * 0. Returns undefined for the root blueprint, which has no position, and for
 * anything that is not a path of 1-based indexes.
 */
export function toPositionPath(selection?: string): string | undefined {
	if (selection == null || selection === '') {
		return undefined;
	}

	const parts = selection.split('.');
	const positions: string[] = [];

	for (const part of parts) {
		if (!POSITION_INDEX_REGEX.test(part)) {
			return undefined;
		}
		positions.push((Number(part) - 1).toString());
	}

	return positions.join('.');
}

/**
 * Builds the Factorio Prints API url for a blueprint the API already holds.
 *
 * Returns undefined when a blueprint inside a book is selected but its position
 * cannot be read, rather than linking the whole book: that would quietly open a
 * different blueprint than the one on screen.
 */
export function buildApiSourceUrl(sha?: string, selection?: string): string | undefined {
	if (sha == null || sha === '') {
		return undefined;
	}

	const base = `${FACTORIOPRINTS_BLUEPRINT_DATA_URL}/${sha}`;
	if (selection == null || selection === '') {
		return base;
	}

	const position = toPositionPath(selection);
	if (position === undefined) {
		return undefined;
	}

	return `${base}/position/${position}`;
}

function buildSourceUrl(source: string): string {
	// The editor reads the parameter as `p.split('=')[1]` before decoding it, so
	// a bare `=` (base64 padding) would silently truncate the blueprint string.
	// encodeURIComponent escapes `=`, `+` and `/`, all of which the editor's
	// decodeURIComponent restores.
	return `${FACTORIO_BLUEPRINT_EDITOR_URL}?source=${encodeURIComponent(source)}`;
}

/**
 * Builds a link that opens a blueprint in the Factorio Blueprint Editor.
 *
 * The API url comes first: it is short, and it addresses a nested selection
 * exactly. The blueprint string is next, for blueprints the API does not hold,
 * and the source URL last, for blueprints too large to fit in a URL. Returns
 * undefined when none of them fits.
 */
export function buildEditorUrl({apiSourceUrl, blueprintString, sourceUrl}: EditorUrlOptions): string | undefined {
	for (const source of [apiSourceUrl, blueprintString, sourceUrl]) {
		if (source == null || source === '') {
			continue;
		}

		const url = buildSourceUrl(source);
		if (url.length <= MAX_EDITOR_URL_LENGTH) {
			return url;
		}
	}

	return undefined;
}
