import type { Bi } from '../api';

/** Populate only with verified Harbour Joy client work and approved feedback. */
export interface SalesClientCase {
  id: string;
  service: 'buying' | 'selling';
  need: Bi;
  process: Bi;
  result: Bi;
  feedback?: Bi;
}

// No company cases or client quotes have been supplied. Empty collections render nothing.
export const salesClientCases: readonly SalesClientCase[] = [];
