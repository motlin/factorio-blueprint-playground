import {useEffect, useState, useRef} from 'react';

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

const DisqusComments = ({identifier, url, title}: DisqusCommentsProps) => {
	const prevIdentifierRef = useRef<string | undefined>();
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!identifier || !url || (prevIdentifierRef.current === identifier && window.DISQUS)) {
			return;
		}

		prevIdentifierRef.current = identifier;

		// If Disqus is already loaded, reset it instead of reloading
		if (window.DISQUS) {
			// eslint-disable-next-line no-console
			console.log('Resetting Disqus for:', identifier);
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

		// If we're not already loading Disqus, load it
		if (!isLoading) {
			// eslint-disable-next-line no-console
			console.log('Loading Disqus for:', identifier);
			setIsLoading(true);

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
				setIsLoading(false);
			};

			document.body.appendChild(script);

			return () => {
				if (prevIdentifierRef.current !== identifier) {
					if (document.body.contains(script)) {
						document.body.removeChild(script);
					}
					delete window.disqus_config;
					setIsLoading(false);
				}
			};
		}
	}, [url, identifier, title, isLoading]);

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
