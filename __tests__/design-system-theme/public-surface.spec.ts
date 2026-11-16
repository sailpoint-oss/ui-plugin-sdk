/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import * as publicApi from '../../src/design-system-theme/public-api';

const PACKAGE_ROOT = join(__dirname, '../..');
const SRC_DIR = join(PACKAGE_ROOT, 'src/design-system-theme');

const FORBIDDEN_SOURCE_TOKENS: (string | RegExp)[] = [
	'localstorage',
	'sessionstorage',
	'mutationobserver',
	'behaviorsubject',
	'rxjs',
	'@angular',
	'horizon',
	'--hz-',
	'mfe',
	'app shell',
	// Whole word only, so ordinary English that contains these letters stays allowed.
	/\bisc\b/,
	'coip'
];

/**
 * Lists non-spec TypeScript sources under `src`, including nested directories.
 * @param directory Directory to scan.
 * @returns Absolute paths of implementation files.
 */
function listImplementationSources(directory: string): string[] {
	const files: string[] = [];

	for (const entry of readdirSync(directory)) {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) {
			files.push(...listImplementationSources(path));
			continue;
		}

		if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
			files.push(path);
		}
	}

	return files;
}

/**
 * Asserts that lowercased text matches none of the forbidden source tokens.
 * String tokens match as substrings. A regular expression matches as written.
 * @param contents Text to scan. Compared after lowercasing.
 */
function expectNoForbiddenTokens(contents: string): void {
	const normalized = contents.toLowerCase();

	for (const token of FORBIDDEN_SOURCE_TOKENS) {
		expect(normalized).not.toMatch(token);
	}
}

describe('SPDS theme public surface', () => {
	it('exports the color-scheme constants and helpers', () => {
		expect(Object.keys(publicApi).sort()).toEqual(
			[
				'SPDS_DARK_MODE_CLASS_NAME',
				'SPDS_DARK_MODE_SELECTOR',
				'SPDS_PREFIX',
				'applySpdsBranding',
				'applySpdsColorScheme',
				'listenToColorSchemeChange'
			].sort()
		);
		expect(publicApi).not.toHaveProperty('SPDS_THEME_PACKAGE_NAME');
	});

	it('keeps package.json free of runtime dependencies', () => {
		const packageJsonPath = join(PACKAGE_ROOT, 'package.json');
		const packageJsonText = readFileSync(packageJsonPath, 'utf8');
		const packageJson = JSON.parse(packageJsonText) as {
			dependencies?: unknown;
			peerDependencies?: Record<string, string>;
			devDependencies?: Record<string, string>;
		};

		expect(packageJson.dependencies).toBeUndefined();
		expect(packageJsonText.toLowerCase()).not.toContain('rxjs');
		expect(packageJsonText).not.toContain('@primeuix/themes');
		expect(packageJson.peerDependencies).toBeUndefined();
		expect(packageJson.devDependencies?.['@primeuix/themes']).toBeUndefined();
	});

	it('keeps forbidden runtime and product names out of implementation sources', () => {
		const sources = listImplementationSources(SRC_DIR);

		expect(sources.length).toBeGreaterThan(0);

		for (const path of sources) {
			expectNoForbiddenTokens(readFileSync(path, 'utf8'));
		}
	});

	it('matches standalone isc and keeps substring matching for every other token', () => {
		const iscToken = FORBIDDEN_SOURCE_TOKENS.find(
			(token): token is RegExp => token instanceof RegExp && token.source === '\\bisc\\b'
		);

		if (iscToken == null) {
			throw new Error('Expected a whole-word isc token');
		}

		for (const allowed of ['disclosure', 'discard', 'miscellaneous']) {
			expectNoForbiddenTokens(allowed);
		}

		for (const forbidden of ['isc', 'ISC', '@sailpoint/isc', 'isc-ui']) {
			expect(forbidden.toLowerCase()).toMatch(iscToken);
		}

		expect('built with horizon tokens').toMatch('horizon');
	});
});
