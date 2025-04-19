import {useEffect, useRef} from 'react';

import {Panel} from './ui';

interface DisqusConfig {
	page: {
		identifier: string;
		url: string;
		title?: string;
	};
}

interface DisqusWindow extends Window {
	DISQUS?: {
		reset: (config: {reload: boolean; config: () => void}) => void;
	};
	disqus_config?: () => void;
}

interface DisqusCommentsProps {
	identifier?: string;
	url?: string;
	title?: string;
}

declare const window: DisqusWindow;

let isDisqusLoading = false;

const DisqusComments = ({identifier, url, title}: DisqusCommentsProps) => {
	const prevIdentifierRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		if (!identifier || !url || (prevIdentifierRef.current === identifier && window.DISQUS)) {
			return;
		}

		prevIdentifierRef.current = identifier;

		// If Disqus is already loaded, reset it instead of reloading
		if (window.DISQUS) {
			window.DISQUS.reset({
				reload: true,
				config: function (this: DisqusConfig) {
					this.page.identifier = identifier;
					this.page.url = url;
					if (title) this.page.title = title;
				},
			});
			return;
		}

		if (isDisqusLoading) {
			return;
		}

		isDisqusLoading = true;

		window.disqus_config = function (this: DisqusConfig) {
			this.page.url = url;
			this.page.identifier = identifier;
			if (title) this.page.title = title;
		};

		const script = document.createElement('script');
		script.src = 'https://factorio-blueprints.disqus.com/embed.js';
		script.setAttribute('data-timestamp', (+new Date()).toString());
		script.async = true;

		script.onload = () => {
			isDisqusLoading = false;
		};

		document.body.appendChild(script);

		return () => {
			if (prevIdentifierRef.current !== identifier) {
				if (document.body.contains(script)) {
					document.body.removeChild(script);
				}
				delete window.disqus_config;
				isDisqusLoading = false;
			}
		};
	}, [url, identifier, title]);

	if (!identifier || !url) {
		return null;
	}

	return (
		<Panel title="Comments">
			<div className="mt-8">
				<div id="disqus_thread" />
				<noscript>
					Please enable JavaScript to view the{' '}
					<a href="https://disqus.com/?ref_noscript" rel="nofollow">
						comments powered by Disqus.
					</a>
				</noscript>
			</div>
		</Panel>
	);
};

export default DisqusComments;
