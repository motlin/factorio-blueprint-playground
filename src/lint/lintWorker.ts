import type {BlueprintJobRequest} from '../workers/blueprintJobRunner';
import {handleLintRequest} from './lintProtocol';

// Megabase blueprints take seconds to lint, so linting runs here instead of on the page's thread.
self.addEventListener('message', (event: MessageEvent<BlueprintJobRequest>) => {
	self.postMessage(handleLintRequest(event.data));
});
