import '@testing-library/jest-dom';
import {cleanup} from '@testing-library/react';
import {afterEach, vi} from 'vitest';

afterEach(() => {
	cleanup();
});

class MockIDBCursor {}
class MockIDBKeyRange {}
class MockIDBTransaction {
	objectStore() {
		return mockObjectStore;
	}
}
const mockObjectStore = {
	put: vi.fn().mockReturnValue({result: undefined}),
	get: vi.fn().mockReturnValue({result: undefined}),
	delete: vi.fn().mockReturnValue({result: undefined}),
	clear: vi.fn().mockReturnValue({result: undefined}),
	getAll: vi.fn().mockReturnValue({result: []}),
	getAllKeys: vi.fn().mockReturnValue({result: []}),
	index: vi.fn().mockReturnValue({
		get: vi.fn().mockReturnValue({result: undefined}),
		getAll: vi.fn().mockReturnValue({result: []}),
		getAllKeys: vi.fn().mockReturnValue({result: []}),
	}),
	createIndex: vi.fn(),
};

const mockDB = {
	objectStoreNames: ['blueprints-by-sha', 'most-recent'],
	transaction: vi.fn().mockReturnValue(new MockIDBTransaction()),
	close: vi.fn(),
	createObjectStore: vi.fn().mockReturnValue(mockObjectStore),
	deleteObjectStore: vi.fn(),
};

// TODO 2025-04-18: Don't mock IndexedDB
class MockIDBRequest extends EventTarget {
	result = mockDB;
	error: Error | null = null;
	source: unknown = null;
	transaction: IDBTransaction | null = null;
	readyState: 'pending' | 'done' = 'pending';
	onupgradeneeded: ((this: IDBRequest, ev: Event) => void) | null = null;
	onsuccess: ((this: IDBRequest, ev: Event) => void) | null = null;
	onerror: ((this: IDBRequest, ev: Event) => void) | null = null;
}

global.indexedDB = {
	open: vi.fn().mockImplementation(() => {
		const request = new MockIDBRequest() as unknown as IDBOpenDBRequest;
		setTimeout(() => {
			request.readyState = 'done';
			const event = new Event('success');
			request.dispatchEvent(event);
			if (request.onsuccess) {
				request.onsuccess.call(request, event);
			}
		}, 0);
		return request;
	}),
	deleteDatabase: vi.fn().mockImplementation(() => {
		const request = new MockIDBRequest() as unknown as IDBOpenDBRequest;
		setTimeout(() => {
			request.readyState = 'done';
			const event = new Event('success');
			request.dispatchEvent(event);
			if (request.onsuccess) {
				request.onsuccess.call(request, event);
			}
		}, 0);
		return request;
	}),
};

// TODO 2025-04-18: Don't mock indexeddb
global.IDBKeyRange = MockIDBKeyRange;
global.IDBCursor = MockIDBCursor;

// TODO 2025-04-18: Don't mock crypto api
Object.defineProperty(global.crypto, 'subtle', {
	value: {
		...global.crypto.subtle,
		digest: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
	},
	configurable: true,
});
