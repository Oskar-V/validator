// Functions which affect a whole rule set - to be used inside schema objects

import type { RULES } from '@types';
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
 * Wraps every rule so that an `undefined` value always passes.
 * Sync rules stay sync and async rules stay async, so `getValueErrors`/`getSchemaErrors`
 * still pick the correct execution path.
 */
export const allowUndefined = <R extends RULES>(rules: R): R =>
	Object.entries(rules).reduce((acc, [key, rule]) => {
		if (isAsyncFunction(rule)) {
			return { ...acc, [key]: async (i: unknown, ...overload: unknown[]) => typeof i === 'undefined' ? true : rule(i, ...overload) }
		}
		return { ...acc, [key]: (i: unknown, ...overload: unknown[]) => typeof i === 'undefined' ? true : rule(i, ...overload) }
	}, {} as R);

/**
 * Wraps every rule so that the value is passed through `fn` before being validated.
 * The rules may be typed against the *output* of `fn`; the returned rules accept `unknown`.
 * Sync rules stay sync and async rules stay async, so `getValueErrors`/`getSchemaErrors`
 * still pick the correct execution path.
 */
export const preprocess = <V, R extends RULES<V>>(fn: (value: unknown) => V, rules: R): REWRAPPED<R, unknown> =>
	Object.entries(rules).reduce((acc, [key, rule]) => {
		if (isAsyncFunction(rule)) {
			return { ...acc, [key]: async (i: unknown, ...overload: unknown[]) => rule(fn(i), ...overload) }
		}
		return { ...acc, [key]: (i: unknown, ...overload: unknown[]) => rule(fn(i), ...overload) }
	}, {} as REWRAPPED<R, unknown>);
