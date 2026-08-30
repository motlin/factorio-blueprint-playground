import type React from 'react';

export const LinkGreen = ({href, children}: {href: string; children: React.ReactNode}) => (
	<a
		href={href}
		target="_blank"
		rel="noopener noreferrer"
		className="button-green-right"
		style={{display: 'inline-flex', alignItems: 'center'}}
	>
		{children}
	</a>
);
