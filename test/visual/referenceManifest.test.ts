import {describe, expect, it} from 'vite-plus/test';

import {referenceManifestSchema} from '../../scripts/visual-conformance/config';
import referenceManifestJson from '../../scripts/visual-conformance/reference-manifest.json';

describe('Factorio reference manifest', () => {
	it('tracks every expired reference without claiming local comparison evidence', () => {
		const manifest = referenceManifestSchema.parse(referenceManifestJson);

		expect(
			manifest.references.map(({dimensions, id, path, sha256, status}) => ({
				dimensions,
				id,
				path,
				sha256,
				status,
			})),
		).toStrictEqual(
			[
				'BP-01',
				'BP-02',
				'BP-03',
				'BP-04',
				'BP-05',
				'BP-06',
				'BP-07',
				'BP-08',
				'UP-01',
				'UP-02',
				'UP-03',
				'UP-04',
				'UP-05',
			].map((id) => ({
				dimensions: null,
				id,
				path: `.llm/game-ui-references/2.1.12/${id}.png`,
				sha256: null,
				status: 'missing-local-file',
			})),
		);
	});
});
