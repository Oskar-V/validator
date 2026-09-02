// Functions which affect a whole rule set - to be used inside schema objects

import type { RULE, RULES } from '@types';
import { isAsyncFunction } from 'core';

/**
 * Re-declares each rule so that the parameters of the returned rule are `V` instead of the
 * original rule's parameters, while keeping the original return type (sync stays sync,
 * async stays async).
 */
type REWRAPPED<R extends RULES<never>, V> = {
	[K in keyof R]: R[K] extends (value: never, ...overload: infer O) => infer Ret
	? (value: V, ...overload: O) => Ret
	: never
};

/**
 * Rebuild a rule set with each rule wrapped by `wrap`, keeping sync rules sync and async
 * rules async so `getValueErrors`/`getSchemaErrors` still pick the correct execution path.
 * Every rule-set wrapper must go through this, so that invariant lives in one place.
 * Detection only sees the `async` keyword; a plain rule returning a Promise stays on the
 * sync path, where the core executor fails it closed.
 */
const wrapRules = <OUT>(rules: RULES<never>, wrap: (rule: RULE, value: unknown, overload: unknown[]) => boolean | Promise<boolean>): OUT =>
	Object.fromEntries(Object.entries(rules).map(([key, rule]) => [
		key,
		isAsyncFunction(rule)
			? async (i: unknown, ...overload: unknown[]) => wrap(rule as RULE, i, overload)
			: (i: unknown, ...overload: unknown[]) => wrap(rule as RULE, i, overload),
	])) as OUT;

/**
 * Wraps every rule so that an `undefined` value always passes.
 * Sync rules stay sync and async rules stay async, so `getValueErrors`/`getSchemaErrors`
 * still pick the correct execution path.
 */
export const allowUndefined = <R extends RULES>(rules: R): R =>
	wrapRules<R>(rules, (rule, i, overload) => typeof i === 'undefined' ? true : rule(i, ...overload));

/**
 * Wraps every rule so that a `null` value always passes.
 * Sync rules stay sync and async rules stay async, so `getValueErrors`/`getSchemaErrors`
 * still pick the correct execution path.
 */
export const allowNull = <R extends RULES>(rules: R): R =>
	wrapRules<R>(rules, (rule, i, overload) => i === null ? true : rule(i, ...overload));

/**
 * Wraps every rule so that the value is passed through `fn` before being validated.
 * The rules may be typed against the *output* of `fn`; the returned rules accept `unknown`.
 * Sync rules stay sync and async rules stay async, so `getValueErrors`/`getSchemaErrors`
 * still pick the correct execution path.
 */
export const preprocess = <V, R extends RULES<V>>(fn: (value: unknown) => V, rules: R): REWRAPPED<R, unknown> =>
	wrapRules<REWRAPPED<R, unknown>>(rules, (rule, i, overload) => rule(fn(i), ...overload));
