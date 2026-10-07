import {handleLintRequest, type LintRequest} from './lintProtocol';

// Megabase blueprints take seconds to lint, so linting runs here instead of on the page's thread.
self.addEventListener('message', (event: MessageEvent<LintRequest>) => {
	self.postMessage(handleLintRequest(event.data));
});
