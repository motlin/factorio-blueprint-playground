import databaseJson from '../../generated/mod-db.json';
import type {BlueprintJobRequest} from '../../workers/blueprintJobRunner';
import {handleModDetectionRequest} from './modDetectionProtocol';
import type {ModDatabase} from './types';

// The database and the scan of a megabase book are both large, so detection runs here instead of on the page's thread.
const database: ModDatabase = databaseJson;

self.addEventListener('message', (event: MessageEvent<BlueprintJobRequest>) => {
	self.postMessage(handleModDetectionRequest(event.data, database));
});
