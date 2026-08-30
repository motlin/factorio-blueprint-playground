import {afterEach, describe, expect, it, vi} from 'vite-plus/test';

import {
	blueprintSha1,
	buildApiSourceUrl,
	buildEditorUrl,
	FACTORIO_BLUEPRINT_EDITOR_URL,
	FACTORIOPRINTS_BLUEPRINT_DATA_URL,
	MAX_EDITOR_URL_LENGTH,
	toPositionPath,
} from '../../src/lib/factorioBlueprintEditor';

describe('buildEditorUrl', () => {
	it('returns undefined when there is nothing to link to', () => {
		expect(buildEditorUrl({})).toBeUndefined();
		expect(buildEditorUrl({blueprintString: '', sourceUrl: ''})).toBeUndefined();
	});

	it('builds a source link from a blueprint string', () => {
		const url = buildEditorUrl({blueprintString: '0eNq'});

		expect(url).toBe(`${FACTORIO_BLUEPRINT_EDITOR_URL}?source=0eNq`);
	});

	it('percent-encodes characters the editor would otherwise mis-parse', () => {
		// The editor reads the param as `p.split('=')[1]`, so a bare `=` in the
		// value truncates the blueprint string. `+` has to survive decoding too.
		const url = buildEditorUrl({blueprintString: '0eN+q/A=='});

		expect(url).toBe(`${FACTORIO_BLUEPRINT_EDITOR_URL}?source=0eN%2Bq%2FA%3D%3D`);

		const value = url?.slice(`${FACTORIO_BLUEPRINT_EDITOR_URL}?source=`.length) ?? '';
		expect(value).not.toContain('=');
		expect(decodeURIComponent(value)).toBe('0eN+q/A==');
	});

	it('prefers the blueprint string over the source url', () => {
		const url = buildEditorUrl({
			blueprintString: '0eNq',
			sourceUrl: 'https://factorioprints.com/view/-KnQ865j-qQ21WoUPbd3',
		});

		expect(url).toBe(`${FACTORIO_BLUEPRINT_EDITOR_URL}?source=0eNq`);
	});

	it('falls back to the source url when the blueprint string is too long to link', () => {
		const url = buildEditorUrl({
			blueprintString: `0${'A'.repeat(MAX_EDITOR_URL_LENGTH)}`,
			sourceUrl: 'https://factorioprints.com/view/-KnQ865j-qQ21WoUPbd3',
		});

		expect(url).toBe(
			`${FACTORIO_BLUEPRINT_EDITOR_URL}?source=https%3A%2F%2Ffactorioprints.com%2Fview%2F-KnQ865j-qQ21WoUPbd3`,
		);
	});

	it('returns undefined when nothing fits within the url length limit', () => {
		const url = buildEditorUrl({
			blueprintString: `0${'A'.repeat(MAX_EDITOR_URL_LENGTH)}`,
			sourceUrl: `https://example.com/${'a'.repeat(MAX_EDITOR_URL_LENGTH)}`,
		});

		expect(url).toBeUndefined();
	});

	it('keeps generated urls within the length limit', () => {
		const url = buildEditorUrl({blueprintString: `0${'A'.repeat(MAX_EDITOR_URL_LENGTH - 100)}`});

		expect(url).toBeDefined();
		expect(url?.length).toBeLessThanOrEqual(MAX_EDITOR_URL_LENGTH);
	});
});

describe('toPositionPath', () => {
	it('has no position for the root blueprint', () => {
		expect(toPositionPath()).toBeUndefined();
		expect(toPositionPath('')).toBeUndefined();
	});

	it('converts the app 1-based path to the api 0-based position', () => {
		expect(toPositionPath('1')).toBe('0');
		expect(toPositionPath('2.1')).toBe('1.0');
		expect(toPositionPath('3.2.1')).toBe('2.1.0');
	});

	it('rejects paths that are not 1-based indexes', () => {
		expect(toPositionPath('0')).toBeUndefined();
		expect(toPositionPath('-1')).toBeUndefined();
		expect(toPositionPath('1.x')).toBeUndefined();
		expect(toPositionPath('1..2')).toBeUndefined();
	});
});

describe('buildApiSourceUrl', () => {
	const sha = 'fb7b59ab6efb271f4345315b537104b428b54857';

	it('needs a sha', () => {
		expect(buildApiSourceUrl(undefined, '1')).toBeUndefined();
		expect(buildApiSourceUrl('', '1')).toBeUndefined();
	});

	it('addresses the whole blueprint when nothing is selected', () => {
		expect(buildApiSourceUrl(sha)).toBe(`${FACTORIOPRINTS_BLUEPRINT_DATA_URL}/${sha}`);
	});

	it('addresses one blueprint inside a book by position', () => {
		expect(buildApiSourceUrl(sha, '2.1')).toBe(`${FACTORIOPRINTS_BLUEPRINT_DATA_URL}/${sha}/position/1.0`);
	});

	it('refuses to fall back to the whole book when the selection is unreadable', () => {
		// Linking the book here would silently open a different blueprint.
		expect(buildApiSourceUrl(sha, 'nonsense')).toBeUndefined();
	});
});

describe('buildEditorUrl source preference', () => {
	const apiSourceUrl = `${FACTORIOPRINTS_BLUEPRINT_DATA_URL}/fb7b59ab6efb271f4345315b537104b428b54857/position/1.0`;

	it('prefers the api url over the blueprint string', () => {
		const url = buildEditorUrl({
			apiSourceUrl,
			blueprintString: '0eNq',
			sourceUrl: 'https://factorioprints.com/view/x',
		});

		expect(url).toBe(`${FACTORIO_BLUEPRINT_EDITOR_URL}?source=${encodeURIComponent(apiSourceUrl)}`);
	});

	it('leaves the api url readable to the editor once decoded', () => {
		const url = buildEditorUrl({apiSourceUrl});
		const value = url?.slice(`${FACTORIO_BLUEPRINT_EDITOR_URL}?source=`.length) ?? '';

		expect(value).not.toContain('=');
		expect(decodeURIComponent(value)).toBe(apiSourceUrl);
	});

	it('falls back to the blueprint string when there is no api url', () => {
		const url = buildEditorUrl({blueprintString: '0eNq'});

		expect(url).toBe(`${FACTORIO_BLUEPRINT_EDITOR_URL}?source=0eNq`);
	});
});

describe('blueprintSha1', () => {
	it('matches the sha the factorioprints api keys blueprints by', async () => {
		// The api reports this digest as blueprintString.sha.
		expect(await blueprintSha1('0eNq')).toBe('24bd7dd969a8c26bfbd82fa02118a8b3d0f27dc0');
	});
});

describe('blueprintSha1 outside a secure context', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('gives up instead of throwing when SubtleCrypto is missing', async () => {
		// Served over plain http on a LAN or tailnet address, `crypto.subtle` is
		// undefined: it is secure-context only.
		vi.stubGlobal('crypto', {});

		await expect(blueprintSha1('0eNq')).resolves.toBeUndefined();
	});

	it('gives up when the digest itself fails', async () => {
		vi.stubGlobal('crypto', {
			subtle: {
				digest: async () => Promise.reject(new Error('not allowed')),
			},
		});

		await expect(blueprintSha1('0eNq')).resolves.toBeUndefined();
	});
});
