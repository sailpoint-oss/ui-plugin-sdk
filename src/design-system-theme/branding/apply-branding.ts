/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */
import { buildSpdsBrandingCss, buildSpdsOverrideCss } from './branding-css';
import type { SpdsBrandingConfig } from './branding.model';
import { resolveSpdsBranding } from './resolve-branding';

/**
 * Id of the branding style element. The document, not module state, tracks the active element, so a second copy of
 * this package replaces the first copy's element instead of adding another.
 */
const SPDS_BRANDING_STYLE_ID = 'spds-branding';

/**
 * Writes a resolved brand into the current document as one style element.
 *
 * A missing `brand` applies compact SPDS defaults. The function writes one `<style id="spds-branding">` element to
 * `document.head`. A later call removes the existing element, then inserts a new one. The returned function removes
 * only the element created by that call, so a disposer from an earlier call leaves a later call's branding in place.
 * Calling it again does nothing. A missing `document` or `document.head` returns a no-op and does not throw.
 * @param brand Optional partial brand. Omitted fields use SPDS defaults.
 * @returns A function that removes this call's style element. A second call does nothing.
 */
export function applySpdsBranding(brand?: SpdsBrandingConfig): () => void {
	const resolved = resolveSpdsBranding(brand);

	if (typeof document === 'undefined' || document.head == null) {
		return () => undefined;
	}

	document.getElementById(SPDS_BRANDING_STYLE_ID)?.remove();

	const style = document.createElement('style');
	style.id = SPDS_BRANDING_STYLE_ID;
	style.textContent = `${buildSpdsBrandingCss(resolved)}${buildSpdsOverrideCss()}`;
	document.head.appendChild(style);

	return () => style.remove();
}
