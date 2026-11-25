import { z } from 'zod';

/**
 * Japanese fallback for every zod issue that has no message of its own. Without it a bare
 * `.int()` / `.min()` / `.max()` showed zod's English default on screen (CRM UT D-02 No9,
 * D-03 No7 / No8). Field-specific messages still win over this.
 */
z.config(z.locales.ja());
