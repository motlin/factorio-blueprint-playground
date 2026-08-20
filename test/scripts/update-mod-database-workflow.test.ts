/// <reference types="vite-plus/client" />

import {describe, expect, it} from 'vite-plus/test';

import buildModDatabaseSource from '../../scripts/mod-db/build-mod-db.ts?raw';
import workflowText from '../../.github/workflows/update-mod-database.yml?raw';

describe('update mod database workflow', () => {
	it('regenerates the game UI specification before the database that consumes it', () => {
		expect({
			consumesSpecification: buildModDatabaseSource.includes("from '../../src/generated/game-ui-spec.json'"),
			specificationBeforeDatabase:
				workflowText.indexOf('vp run generate:game-ui-spec') < workflowText.indexOf('vp run generate:mod-db'),
		}).toStrictEqual({
			consumesSpecification: true,
			specificationBeforeDatabase: true,
		});
	});
});
