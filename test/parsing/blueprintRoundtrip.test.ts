import {describe, expect, it} from 'vitest';

import {deserializeBlueprint, serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';
import { readFixtureFile, getFixtureFiles } from '../fixtures/utils';

// Test a single blueprint case with both string and JSON roundtrips
function testBlueprintRoundtrip(name: string) {
    const stringPath = `txt/${name}.txt`;
    const jsonPath = `json/${name}.json`;

    // Direct deserialization comparison
    it(`${name}.txt deserializes to match ${name}.json exactly`, () => {
        const blueprintStr = readFixtureFile(stringPath);
        const jsonText = readFixtureFile(jsonPath);
        const deserialized = deserializeBlueprint(blueprintStr);
        const expectedJson = JSON.parse(jsonText) as BlueprintString;

        try {
            expect(deserialized).toEqual(expectedJson);
        } catch (error) {
            console.error(JSON.stringify(deserialized, null, 2));
            throw error;
        }
    });

    // String roundtrip
    it(`can roundtrip ${name} blueprint string`, () => {
        const original = readFixtureFile(stringPath);
        console.log('Original string length:', original.length);
        const decoded = deserializeBlueprint(original);
        const roundtripped = serializeBlueprint(decoded);
        console.log('Round tripped string length:', roundtripped.length);
        expect(roundtripped).toBe(original);
    });

    // JSON roundtrip
    it(`can roundtrip ${name} blueprint through json`, () => {
        const jsonText = readFixtureFile(jsonPath);
        const originalJson = JSON.parse(jsonText) as BlueprintString;
        const encoded = serializeBlueprint(originalJson);
        const decoded = deserializeBlueprint(encoded);
        expect(decoded).toEqual(originalJson);
    });

    // String-JSON equivalence
    it(`${name} blueprint string decodes to match json`, () => {
        const blueprintStr = readFixtureFile(stringPath);
        const jsonText = readFixtureFile(jsonPath);
        const fromString = deserializeBlueprint(blueprintStr);
        const fromJson = JSON.parse(jsonText) as BlueprintString;
        expect(fromString).toEqual(fromJson);
    });
}

describe('blueprint roundtrip tests', () => {
    // Run all test cases
    const fixtures = getFixtureFiles();
    expect(fixtures.length).toBeGreaterThan(0); // Sanity check that we found fixtures

    fixtures.forEach(fixture => {
        describe(fixture, () => {
            testBlueprintRoundtrip(fixture);
        });
    });
});
