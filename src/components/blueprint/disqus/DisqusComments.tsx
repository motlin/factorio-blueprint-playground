import {useEffect, useId, useRef} from 'react';

import {Panel} from '../../ui';

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
	const containerId = useId();
	const containerRef = useRef<HTMLDivElement>(null);
	const prevIdentifierRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		if (!(identifier && url) || (prevIdentifierRef.current === identifier && window.DISQUS)) {
			return;
		}

		prevIdentifierRef.current = identifier;

		// Temporarily set the container ID to what Disqus expects
		if (containerRef.current) {
			containerRef.current.id = 'disqus_thread';
		}

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
			// Restore unique ID after Disqus processes
			setTimeout(() => {
				if (containerRef.current) {
					containerRef.current.id = containerId;
				}
			}, 100);
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
		script.setAttribute('data-timestamp', Date.now().toString());
		script.async = true;

		script.onload = () => {
			isDisqusLoading = false;
			// Restore unique ID after Disqus loads
			setTimeout(() => {
				if (containerRef.current) {
					containerRef.current.id = containerId;
				}
			}, 100);
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
	}, [url, identifier, title, containerId]);

	if (!(identifier && url)) {
		return null;
	}

	return (
		<Panel title="Comments">
			<div className="mt-8">
				<div
					ref={containerRef}
					id={containerId}
				/>
				<noscript>
					Please enable JavaScript to view the{' '}
					<a
						href="https://disqus.com/?ref_noscript"
						rel="nofollow"
					>
						comments powered by Disqus.
					</a>
				</noscript>
			</div>
		</Panel>
	);
};

export default DisqusComments;
