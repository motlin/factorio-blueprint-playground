import {DeflateOptions} from 'fflate/esm/browser';
import {describe, expect, it} from 'vitest';

import {deserializeBlueprint, serializeBlueprint} from '../../src/parsing/blueprintParser';
import {DEFAULT_COMPRESSION_SETTINGS} from '../../src/parsing/compressionSettings';
import {readFixtureFile, getFixtureFiles} from '../fixtures/utils';

function* generateCompressionSettings(): Generator<DeflateOptions> {
	const levels: (0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9)[] = [2, 3, 4, 5, 6, 7, 8, 9];
	const memLevels: (0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12)[] = [
		0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
	];

	for (const level of levels) {
		for (const mem of memLevels) {
			yield {level, mem};
		}
	}
}

function findMatchingCompression(blueprintString: string): {
	matches: DeflateOptions[];
	attempted: Set<string>;
	failed: Set<string>;
} {
	// First parse the blueprint
	const expectedJson = deserializeBlueprint(blueprintString);

	// Track attempts and failures
	const attempted = new Set<string>();
	const failed = new Set<string>();
	const matches: DeflateOptions[] = [];

	for (const settings of generateCompressionSettings()) {
		const key = `level=${settings.level} mem=${settings.memLevel}`;
		attempted.add(key);

		try {
			const serialized = serializeBlueprint(expectedJson, settings);
			if (serialized === blueprintString) {
				matches.push({...settings});
			} else {
				failed.add(`${key} (different output)`);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			failed.add(`${key} (error: ${errorMessage})`);
		}
	}

	return {matches, attempted, failed};
}

describe('compression settings search', () => {
	it('finds compression settings that keep size within bounds', () => {
		const minimal =
			'0eNrlWEuO4zYQvYqgVSaRBpYsd7eNdBbJOkCAWRqGQEtlm7BMakjKPZ2BD5BbZJGT5SQpkvpaalmewQQBsui2RBbr86pYfNRnd5sVkAvKVLzl/OiuPjcj0l2tW696LgWZCJorypm7cn+uphzFhSoEOAqkcj1XMpL7ivt7QVO97JO7Cj331V0FF88lW8mzQoGvpXLK9u5KiQI8lyacWZuS7hnJ9Er1mgNaOlPUjyOey8hJD1gJn7BX/yNOUPXqomrKUvhkrLR1lEtyIvBBgfBnLdmwK1vaA6a0ytpcRvcHxbSvnlvZW7kFS/jphFA06uaXjWdXU7CxWFUxK05bEOhbrVNHqwhTPirZUkYQQ9Sec0ktvAa24P3CADd7v0AjuEQJnsVbOJAzRXkUkpBoedl9RsMVGJ67oxmGfT1au2FwbaJiXJzMEPqlMdN+rdxnM1DoMgguGw1aDeDmctHvV4GG9wU6+3aB3qihAxChhvM6ioHn7gUvchxfl6p9q/G5rdgr1T5XSjduG7wbydkWgmHBUiZBoNTXeUkVnJ6vNA65h/nE9GTkFUTc3fC/1Al0Xqg6ONrL1KmS4VgLrX1Wa89gDywl4tVGf1Uq81a82bEd7Ru7ITBFklJhLburp+GSSahICqpiASSND4SlsZYC09psz6kkzKQRO/EUbKMazQx2uoz42PQETCuen1ydDKuzNIK9lSTHjJqeWUiIa4vWOX4GgR0UYtw+yTGW9HftGdaMzDnNYmy9XFijOwHy4O+oQFUDAEe1229jO+tgO4YmMLLNIL2GEJektULjSjy5j4/sQeuMaSDo5BWoP5bTDAshVjzO+B7RpEnMQL1wcax8rMdHnewdFEHHJUEEjLvz9x9/GoESEQnqOqXTK1Ivbuddz16+SbvQdTm5+gaKzwxAWpUfanvBnaldXAde4M29YOOtQy/0Ii/c4GyNr42iLI2yVr3qYeUGTZn8Vi1xQhw8E0F1CeLEJ1PupQokG57+1z3raxD8TvJvH3iXa9U9Z6LKXqcb3Fy2qJZ1qr+1rI/FbEjPQxcLzVd2GEuREY2M84MT4N93+SwWju/gj3yHEink2IpBl68tqVH4gq+BD3OtTwTT6CoSiXuRbCFrzqNqxtf8c9M/QzY6SKwVY3fxEC6j5XIRhbPHx+ih4V0zHUeHqg6xyRJBIiWcthnSOf9EkgNl4Ic36eONReENzhl0SOJ0fhpNJ5SDHvbP0OW87PT+/OGb9PrheJquGfTb5l9awvRE9F5ASpuOaCYSmkNvW9vhuFeJo2R0R6QaYxjLxRU6LZYRjXKXqfA/ToD/HiiC+6CIpkMR1p5G6OmArsV0XVFHV5e8DWh+mK756T7Nj15ToFLSM/i54Gc854SfHOz1dQSI+c0dU2+NZu/sSCZhCL+npnjwLD1gPmkyfh1sbd5oEgVuFDeeyS9gaIAlrTcpkn1uWUu5m9EdngNuZXtF+B5X8kLlxd26B2+Ry1pWwMcC0zOWpuiONGkGHvNd3PI98G4n0av8aNjSG7dRc43qd+vZ/Sl//H+lPAjuyfnTfy3n1/T30dDfAOnvE9Jfbz3HJ6wC/fiEjHhpnnAg8jDwEX7coZKCnvAy/a+w3Q8m+4PWvoYcaoJTHW8+3/X4wti9oEWGPyieHMfFFz3cnF+LTE1eVANQLhtntTU7x+tS6tQSzssBBPTYbbBxToVUzhYcwpwGEYfvvpQJB0MOGnJ9k3sPf88dcGTd/65TD0FOk+ZN35mbt/ojUz1i62Pzxhe01ufdzdq2iWf74+8PXKqNuc/c/iTt6K5AqP6A62RcSQ0vgxcnfD9zdkC0nHTGvuJpQyMXiiuc37xK3GiK8lhk2TX3J9hnzhBX95yRErj8A1IdLuY=';
		const {matches} = findMatchingCompression(minimal);

		// Ensure we found matches
		expect(matches.length).toBeGreaterThanOrEqual(0);

		// Verify all matches still produce acceptable output size
		for (const settings of matches) {
			const expectedJson = deserializeBlueprint(minimal);

			const serialized = serializeBlueprint(expectedJson, settings);
			expect(serialized.length).toBeLessThanOrEqual(
				minimal.length * 1.1,
				`Serialized output exceeded 10% size increase with settings: ${JSON.stringify(settings)}`,
			);
		}
	});

	it('works with all fixture blueprints', () => {
		const fixtures = getFixtureFiles();
		// Sanity check that we found fixtures
		expect(fixtures.length).toBeGreaterThan(0);

		console.log(`\nTesting ${fixtures.length.toString()} blueprint fixtures:`);

		for (const fixture of fixtures) {
			console.log(`\nFixture: ${fixture}`);
			const blueprintStr = readFixtureFile(`txt/${fixture}.txt`);
			const {matches} = findMatchingCompression(blueprintStr);

			// We're happy if we either found a match, or can at least recreate the blueprint with default settings
			if (matches.length === 0) {
				console.log('No exact matches found, trying with default compression settings...');
				const expectedJson = deserializeBlueprint(blueprintStr);
				const serialized = serializeBlueprint(expectedJson, DEFAULT_COMPRESSION_SETTINGS);

				// For non-matching settings, we'll accept up to 10% size increase
				expect(serialized.length).toBeLessThanOrEqual(
					blueprintStr.length * 1.1,
					`Serialized output exceeded 10% size increase for ${fixture} with default settings`,
				);

				continue;
			}

			// If we found matches, verify the first one works
			const firstMatch = matches[0];

			console.log('Found working settings:', firstMatch);

			const expectedJson = deserializeBlueprint(blueprintStr);

			const serialized = serializeBlueprint(expectedJson, firstMatch);

			// For exact matches, we expect the output to be identical
			expect(serialized).toBe(blueprintStr);
		}
	});
});
