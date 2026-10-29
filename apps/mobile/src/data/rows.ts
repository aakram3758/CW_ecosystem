/**
 * The row types the branch screens pass around, in one place that is not the mock.
 *
 * These aliases used to live in the branch mock module, which every branch screen imported from
 * — so the screens depended on the mock for their *types* as well as their data, and the mock could
 * not be deleted without touching all of them. They are the generated types either way; this file
 * just gives them a home that outlives phase A.
 */

import type { Database } from '@/data/database.types';

type Tables = Database['public']['Tables'];

export type BranchRow = Tables['branches']['Row'];
export type MaterialRow = Tables['materials']['Row'];
export type SubtypeRow = Tables['material_subtypes']['Row'];
export type RequestRow = Tables['requests']['Row'];
export type RequestListRow = Database['public']['Views']['request_list']['Row'];
export type EventRow = Tables['request_events']['Row'];
export type AttemptRow = Tables['visit_attempts']['Row'];
export type NotificationRow = Tables['notifications']['Row'];
export type ReasonRow = Tables['reasons']['Row'];
export type ChainRow = Tables['chains']['Row'];
export type CityRow = Tables['cities']['Row'];
export type DistrictRow = Tables['districts']['Row'];

/**
 * `branch_create_request`'s arguments, with the two the generator gets wrong widened.
 *
 * The type generator marks every argument without a SQL default as required and non-null. Two of
 * these legitimately take null: `p_subtype_id`, when the material has no active subtypes, and
 * `p_note`, which the function turns into null itself with `nullif(trim(p_note), '')`. The SQL
 * signature is the truth, so they are widened here rather than cast at each call site.
 */
export type CreateRequestArgs =
  Omit<Database['public']['Functions']['branch_create_request']['Args'], 'p_subtype_id' | 'p_note'>
  & { p_subtype_id: string | null; p_note: string | null };

/** The same for `branch_update_request`, which has the same `p_note`. */
export type EditRequestArgs =
  Omit<Database['public']['Functions']['branch_update_request']['Args'], 'p_note'>
  & { p_note: string | null };
