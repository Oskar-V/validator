// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/**
 * A synchronous validation rule.
 *
 * @template V type of the value being validated (defaults to `unknown`)
 * @template O tuple type of any extra "overload" arguments passed through by the caller
 */
export type RULE_SYNC<V = unknown, O extends unknown[] = unknown[]> =
	(value: V, ...overload: O) => boolean;

/**
 * An asynchronous validation rule.
 *
 * @template V type of the value being validated (defaults to `unknown`)
 * @template O tuple type of any extra "overload" arguments passed through by the caller
 */
export type RULE_ASYNC<V = unknown, O extends unknown[] = unknown[]> =
	(value: V, ...overload: O) => Promise<boolean>;

/**
 * A validation rule which may be either synchronous or asynchronous.
 *
 * @template V type of the value being validated (defaults to `unknown`)
 * @template O tuple type of any extra "overload" arguments passed through by the caller
 */
export type RULE<V = unknown, O extends unknown[] = unknown[]> =
	(value: V, ...overload: O) => boolean | Promise<boolean>;

/** A named set of synchronous rules. Keys are the error messages returned on failure. */
export type RULES_SYNC<V = unknown, O extends unknown[] = unknown[]> = { [rule_name: string]: RULE_SYNC<V, O> };

/** A named set of rules, any of which may be asynchronous. Keys are the error messages returned on failure. */
export type RULES<V = unknown, O extends unknown[] = unknown[]> = { [rule_name: string]: RULE<V, O> };

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/**
 * Maps object keys to a rule set, or to an array of alternative rule sets
 * (the value passes if it satisfies *any* of the alternatives).
 */
export type SCHEMA_SYNC = { [key: string]: RULES_SYNC | RULES_SYNC[] };
export type SCHEMA = { [key: string]: RULES | RULES[] };

/**
 * @arg {boolean} strict --- Don't allow object to have keys not included in the schema
*/
export type SCHEMA_OPTIONS = {
	strict?: boolean
	// break_early?: boolean
};

export type CHECKABLE_OBJECT = { [key: string]: unknown };

// ---------------------------------------------------------------------------
// Result shapes
// ---------------------------------------------------------------------------

/**
 * The result of checking a single schema entry.
 * A plain rule set yields `string[]`; an array of alternative rule sets yields `string[][]`
 * (one error list per alternative, or `[]` if any alternative passed).
 */
export type CHECKED_RULES<R> = R extends readonly unknown[] ? string[][] : string[];

/**
 * The result of checking a schema: one entry per schema key, with a shape that
 * depends on that key's rule set. When `strict: true` is used, keys not present in
 * the schema may also appear with the value `['Key not allowed']`.
 */
export type CHECKED_SCHEMA_SYNC<S extends SCHEMA = SCHEMA> =
	{ [K in keyof S]: CHECKED_RULES<S[K]> } & { [extra_key: string]: string[] | string[][] };

export type CHECKED_SCHEMA<S extends SCHEMA = SCHEMA> = Promise<CHECKED_SCHEMA_SYNC<S>>;

// ---------------------------------------------------------------------------
// Sync / async inference
// ---------------------------------------------------------------------------

/**
 * Classifies a rule by its declared return type:
 * - `'sync'`   – returns `boolean`
 * - `'async'`  – returns `Promise<boolean>`
 * - `'either'` – declared as returning `boolean | Promise<boolean>` (e.g. annotated as `RULE`),
 *                so it can't be determined statically
 */
export type RULE_KIND<R> =
	R extends (...args: never[]) => infer Ret
	? [Ret] extends [boolean] ? 'sync'
	: [Ret] extends [Promise<boolean>] ? 'async'
	: 'either'
	: never;

/** Union of the kinds of every rule in a rule set (or in an array of rule sets). */
export type RULES_KIND<R> =
	R extends readonly (infer E)[] ? RULES_KIND<E>
	: R extends object ? RULE_KIND<R[keyof R]>
	: never;

/** Union of the kinds of every rule in a schema. */
export type SCHEMA_KIND<S> = RULES_KIND<S[keyof S]>;

/**
 * Wraps a result type according to the kinds found in a rule set / schema:
 * any definitely-async rule => `Promise<X>`; all sync => `X`; otherwise `X | Promise<X>`.
 */
export type MAYBE_ASYNC<K, X> =
	'async' extends K ? Promise<X>
	: 'either' extends K ? X | Promise<X>
	: X;
