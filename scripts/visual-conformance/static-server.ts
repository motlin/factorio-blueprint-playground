import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import path from 'node:path';

const contentTypes = new Map([
	['.css', 'text/css; charset=utf-8'],
	['.html', 'text/html; charset=utf-8'],
	['.ico', 'image/x-icon'],
	['.jpeg', 'image/jpeg'],
	['.jpg', 'image/jpeg'],
	['.js', 'text/javascript; charset=utf-8'],
	['.json', 'application/json; charset=utf-8'],
	['.map', 'application/json; charset=utf-8'],
	['.png', 'image/png'],
	['.svg', 'image/svg+xml'],
	['.webp', 'image/webp'],
	['.woff2', 'font/woff2'],
]);

export async function startStaticServer(rootDirectory: string): Promise<{
	close: () => Promise<void>;
	url: string;
}> {
	const resolvedRoot = path.resolve(rootDirectory);
	const serveRequest = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
		const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
		const pathname = decodeURIComponent(requestUrl.pathname);
		const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
		let filePath = path.resolve(resolvedRoot, relativePath);

		if (!filePath.startsWith(`${resolvedRoot}${path.sep}`) && filePath !== resolvedRoot) {
			response.writeHead(403).end('Forbidden');
			return;
		}

		try {
			const fileStat = await stat(filePath);
			if (fileStat.isDirectory()) {
				filePath = path.join(filePath, 'index.html');
			}
			await stat(filePath);
			response.writeHead(200, {
				'cache-control': 'no-store',
				'content-type': contentTypes.get(path.extname(filePath)) ?? 'application/octet-stream',
			});
			createReadStream(filePath).pipe(response);
		} catch {
			response.writeHead(404).end('Not found');
		}
	};
	const server = createServer((request, response) => {
		void serveRequest(request, response).catch((error: unknown) => {
			response.writeHead(500).end(error instanceof Error ? error.message : 'Static server failure');
		});
	});

	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const address = server.address();
	if (address === null || typeof address === 'string') {
		throw new Error('Expected the visual-conformance server to bind a TCP port.');
	}

	return {
		close: async () => {
			await new Promise<void>((resolve, reject) => {
				server.close((error) => {
					if (error === undefined) resolve();
					else reject(error);
				});
			});
		},
		url: `http://127.0.0.1:${address.port.toString()}`,
	};
}
