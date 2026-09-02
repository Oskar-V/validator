// Functions which affect a single rule

import type { RULE, RULE_ASYNC, RULE_SYNC } from '../types';

// Type guards
const hasLengthProperty = (obj: unknown): obj is { length: number } =>
	typeof obj === 'string' ||
	(obj !== null && typeof obj === 'object' && 'length' in obj && typeof (obj as { length: unknown }).length === 'number');

export type TYPEOF_RESULT = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function";

// Helpers
export const isType =
	(type: TYPEOF_RESULT): RULE_SYNC =>
		(value: unknown) => typeof value === type

export const matchesRegex = (regex: RegExp): RULE_SYNC =>
	(value: unknown) =>
		typeof value === 'string' && regex.test(value)

export const max = (max_value: number = Infinity): RULE_SYNC =>
	(i: unknown) =>
		typeof i === 'number' && i <= max_value

export const min = (min_value: number = -Infinity): RULE_SYNC =>
	(i: unknown) =>
		typeof i === 'number' && i >= min_value

export const maxLength = (max_length: number = Infinity): RULE_SYNC =>
	(i: unknown) =>
		hasLengthProperty(i) && i.length <= max_length

export const minLength = (min_length: number = 0): RULE_SYNC =>
	(i: unknown) =>
		hasLengthProperty(i) && i.length >= min_length

export const stringBetween = (max = Infinity, min = 0): RULE_SYNC =>
	(s: unknown) =>
		typeof s === 'string' && s.length >= min && s.length <= max

export const numberBetween = (max = Infinity, min = -Infinity): RULE_SYNC =>
	(i: unknown) =>
		typeof i === 'number' && i >= min && i <= max

/** Equality using SameValueZero semantics (`===`, except `NaN` equals `NaN`) - the same comparison `isOneOf` uses. */
export const equals = (expected: unknown): RULE_SYNC =>
	(i: unknown) => i === expected || (Number.isNaN(expected as number) && Number.isNaN(i as number))

/** Membership in `allowed_values`, using SameValueZero semantics - the same comparison `equals` uses. */
export const isOneOf = (allowed_values: unknown[] = []): RULE_SYNC => {
	const allowed = new Set(allowed_values);
	return (i: unknown) => allowed.has(i);
}

export const isInteger = (): RULE_SYNC =>
	(i: unknown) => Number.isInteger(i)

export const isArray = (): RULE_SYNC =>
	(i: unknown) => Array.isArray(i)

export const isInstanceOf = (constructor: abstract new (...args: never[]) => unknown): RULE_SYNC =>
	(i: unknown) => i instanceof constructor

/** Inverts the given rule; a throwing rule counts as failed, so its negation passes. The rule must be synchronous. */
export const notSync = <V = unknown, O extends unknown[] = unknown[]>(rule: RULE_SYNC<V, O>): RULE_SYNC<V, O> =>
	(i: V, ...overload: O) => {
		try {
			return !rule(i, ...overload);
		} catch {
			return true;
		}
	}

/**
 * Inverts the given rule; a throwing/rejecting rule counts as failed, so its negation passes.
 * Always async - a single async rule switches the whole rule set onto the async execution
 * path, so prefer `notSync` unless the wrapped rule is genuinely async.
 */
export const notAsync = <V = unknown, O extends unknown[] = unknown[]>(rule: RULE<V, O>): RULE_ASYNC<V, O> =>
	async (i: V, ...overload: O) => {
		try {
			return !(await rule(i, ...overload));
		} catch {
			return true;
		}
	}

/** Passes if the value is an array and every element (holes included) passes the given rule. Stops at the first failure. The rule must be synchronous. */
export const everyElementSync = <E = unknown, O extends unknown[] = unknown[]>(rule: RULE_SYNC<E, O>): RULE_SYNC<unknown, O> =>
	(i: unknown, ...overload: O) => {
		if (!Array.isArray(i)) return false;
		// Indexed loop instead of .every so sparse-array holes are validated as undefined
		for (let index = 0; index < i.length; index++) {
			if (!rule(i[index] as E, ...overload)) return false;
		}
		return true;
	}

/**
 * Passes if the value is an array and every element (holes included) passes the given rule.
 * Elements are checked sequentially, stopping at the first failure, so an early invalid
 * element in an attacker-sized array doesn't fan out rule calls for the rest of it.
 * Always async - a single async rule switches the whole rule set onto the async execution
 * path, so prefer `everyElementSync` unless the element rule is genuinely async.
 */
export const everyElementAsync = <E = unknown, O extends unknown[] = unknown[]>(rule: RULE<E, O>): RULE_ASYNC<unknown, O> =>
	async (i: unknown, ...overload: O) => {
		if (!Array.isArray(i)) return false;
		for (let index = 0; index < i.length; index++) {
			if (!(await rule(i[index] as E, ...overload))) return false;
		}
		return true;
	}

/** Passes if *any* of the given rules passes. Always async. */
export const acceptAnyAsync = <V = unknown, O extends unknown[] = unknown[]>(rules: RULE<V, O>[] = []): RULE_ASYNC<V, O> =>
	async (i: V, ...overload: O) =>
		(await Promise.all(rules.map(rule => rule(i, ...overload)))).some(e => e)

/** Passes if *any* of the given rules passes. All rules must be synchronous. */
export const acceptAnySync = <V = unknown, O extends unknown[] = unknown[]>(rules: RULE_SYNC<V, O>[] = []): RULE_SYNC<V, O> =>
	(i: V, ...overload: O) =>
		rules.map((rule) => rule(i, ...overload)).some(e => e)
