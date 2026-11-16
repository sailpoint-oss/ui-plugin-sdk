/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */

/**
 * Prefix for SailPoint Design System CSS variables (`--spds-*`).
 */
export const SPDS_PREFIX = 'spds' as const;

/**
 * Class added to the document element while the dark color scheme is active.
 */
export const SPDS_DARK_MODE_CLASS_NAME = 'spds-dark' as const;

/**
 * Selector for the dark mode class. Derived from the class name so the two cannot drift.
 */
export const SPDS_DARK_MODE_SELECTOR = `.${SPDS_DARK_MODE_CLASS_NAME}` as const;
