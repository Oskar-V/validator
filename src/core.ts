import type {
	RULES,
	RULES_SYNC,
	SCHEMA,
	SCHEMA_SYNC,
	SCHEMA_OPTIONS,
	CHECKABLE_OBJECT,
	CHECKED_SCHEMA,
	CHECKED_SCHEMA_SYNC,
	RULES_KIND,
	SCHEMA_KIND,
	MAYBE_ASYNC,
} from './types';

const DEFAULT_SCHEMA_OPTIONS: SCHEMA_OPTIONS = {
	strict: false,
	// break_early: false // To be implemented
};

const UNKNOWN_ERROR = 'Unknown error occurred';

/**
 * Detect if a function is async or not
 *
 * @param {unknown} fn the function to inspect
 * @returns {boolean} true if `fn` is declared with the `async` keyword, otherwise false
 */
export const isAsyncFunction = (fn: unknown): fn is (...args: never[]) => Promise<unknown> =>
	typeof fn === 'function' && fn.constructor.name === 'AsyncFunction'

/**
 * Detect if a RULES object has any async rules in it
 *
 * @param {RULES|RULES[]} rules a rules object
 * @returns {boolean} true if any of the rules is an async function otherwise false
 */
export const hasAsyncFunction = (rules: { [key: string]: unknown } | { [key: string]: unknown }[]): boolean => {
	if (Array.isArray(rules)) {
		return rules.some((e) =>
			Object.values(e).some(isAsyncFunction)
		)
	}
	return Object.values(rules).some(isAsyncFunction)
};

/**
 * Check the input against all provided validation rules asynchronously
 *
 * @param {V} value the value to check
 * @param {RULES<V>} rules rules object to use for validating the provided value
 * @param {unknown[]} overload array of extra values the validator rules might need to properly validate the value
 * @returns {Promise<string[]>} a list of rule names which failed validation
 */
export const getValueErrorsAsync = async <V>(
	value: V,
	rules: RULES<V>,
	...overload: unknown[]
): Promise<string[]> => {
	const results: { [key: string]: boolean } = {};
	const pending: Promise<unknown>[] = [];
	for (const [key, rule] of Object.entries(rules)) {
		// Insert the key immediately so the error order matches the rule order
		results[key] = false;
		if (isAsyncFunction(rule)) {
			// Truly async rules still run concurrently
			pending.push(
				(rule(value, ...overload) as Promise<boolean>)
					.then((result) => { results[key] = Boolean(result) })
					.catch(() => { results[key] = false }));
			continue;
		}
		// Sync rules run inline - no promise allocation or microtask hop
		try {
			const result: unknown = rule(value, ...overload);
			if (result !== null && (typeof result === 'object' || typeof result === 'function') && typeof (result as { then?: unknown }).then === 'function') {
				// A sync-declared rule returning a thenable is still awaited here,
				// matching the previous promise-wrapped behavior
				pending.push(
					Promise.resolve(result as Promise<boolean>)
						.then((r) => { results[key] = Boolean(r) })
						.catch(() => { results[key] = false }));
			} else {
				results[key] = Boolean(result);
			}
		} catch {
			results[key] = false;
		}
	}

	if (pending.length) await Promise.allSettled(pending);

	// Filter out the non empty errors and map to an array
	const failed: string[] = [];
	for (const [key, val] of Object.entries(results)) {
		if (!val) failed.push(key);
	}
	return failed;
}

/**
 * Check a schema against all provided validation rules asynchronously
 *
 * @param {CHECKABLE_OBJECT} object_to_check object to be validated
 * @param {S} schema schema to validate against
 * @param {SCHEMA_OPTIONS} options options affecting how the rules are run
 * @param {unknown[]} overload array of extra values the validator rules might need to properly validate the value
 * @returns {CHECKED_SCHEMA<S>} an object containing keys and their respective lists of failed rule names
 */
export const getSchemaErrorsAsync = async <S extends SCHEMA>(
	object_to_check: CHECKABLE_OBJECT,
	schema: S,
	options: SCHEMA_OPTIONS = DEFAULT_SCHEMA_OPTIONS,
	...overload: unknown[]
): CHECKED_SCHEMA<S> => {
	const errors: { [key: string]: string[] | string[][] } = {};
	const validationPromises: Promise<void>[] = [];
	Object.entries<RULES | RULES[]>(schema).forEach(([key, rules]) => {
		let promise: Promise<void>;
		if (Array.isArray(rules)) {
			promise = Promise.allSettled(
				rules.map((rule_set) => getValueErrorsAsync(object_to_check[key], rule_set, ...overload)))
				.then((result) => {
					const tmp = result.map((e) => {
						if (e.status === 'fulfilled')
							return e.value
						return [UNKNOWN_ERROR]
					});

					if (tmp.some((e) => !e.length))
						errors[key] = []
					else
						errors[key] = tmp
				})
				.catch((error: unknown) => {
					if (error instanceof Error) {
						errors[key] = [error.message]
					} else {
						errors[key] = [UNKNOWN_ERROR]
					}
				})
		} else {
			promise = getValueErrorsAsync(object_to_check[key], rules, ...overload)
				.then((result) => { errors[key] = result })
				.catch((error: unknown) => {
					errors[key] = [error instanceof Error ? error.message : UNKNOWN_ERROR]
				})
		}
		validationPromises.push(promise)
	});

	if (options.strict) {
		const incoming_keys = Object.keys(object_to_check);
		const allowed_keys = new Set(Object.keys(schema));
		const disallowed_keys = incoming_keys.filter((key) => !allowed_keys.has(key));
		disallowed_keys.forEach((key) => { errors[key] = ['Key not allowed'] });
	}

	await Promise.allSettled(validationPromises);
	return errors as CHECKED_SCHEMA_SYNC<S>;
}

/**
 * Check the input against all provided validation rules synchronously
 *
 * @param {V} value the value to check
 * @param {RULES_SYNC<V>} rules rules object to use for validating the provided value
 * @param {unknown[]} overload array of extra values the validator rules might need to properly validate the value
 * @returns {string[]} a list of rule names which failed validation
 */
export const getValueErrorsSync = <V>(
	value: V,
	rules: RULES_SYNC<V>,
	...overload: unknown[]
): string[] => {
	const failed: string[] = [];
	for (const [key, rule] of Object.entries(rules)) {
		try {
			const result: unknown = rule(value, ...overload);
			// A thenable can't be resolved synchronously - fail closed instead of
			// treating the pending (truthy) promise as a pass
			if (result !== null && (typeof result === 'object' || typeof result === 'function') && typeof (result as { then?: unknown }).then === 'function')
				failed.push(key);
			else if (!result)
				failed.push(key);
		} catch (error) {
			failed.push(key);
		}
	}
	return failed;
}

/**
 * Check a schema against all provided validation rules synchronously
 *
 * @param {CHECKABLE_OBJECT} object object to be validated
 * @param {S} schema schema to validate against
 * @param {SCHEMA_OPTIONS} options options affecting how the rules are run
 * @param {unknown[]} overload array of extra values the validator rules might need to properly validate the value
 * @returns {CHECKED_SCHEMA_SYNC<S>} an object containing keys and their respective lists of failed rule names
 */
export const getSchemaErrorsSync = <S extends SCHEMA_SYNC>(
	object: CHECKABLE_OBJECT,
	schema: S,
	options: SCHEMA_OPTIONS = DEFAULT_SCHEMA_OPTIONS,
	...overload: unknown[]
): CHECKED_SCHEMA_SYNC<S> => {
	const errors: { [key: string]: string[] | string[][] } = {};
	for (const [key, rules] of Object.entries<RULES_SYNC | RULES_SYNC[]>(schema)) {
		if (Array.isArray(rules)) {
			const tmp = rules.map((rule_set) => getValueErrorsSync(object[key], rule_set, ...overload));
			errors[key] = tmp.some((e) => !e.length) ? [] : tmp;
		} else {
			errors[key] = getValueErrorsSync(object[key], rules, ...overload);
		}
	}

	if (options.strict) {
		const incoming_keys = Object.keys(object);
		const allowed_keys = new Set(Object.keys(schema));
		const disallowed_keys = incoming_keys.filter((key) => !allowed_keys.has(key));
		disallowed_keys.forEach((key) => { errors[key] = ['Key not allowed'] });
	}

	return errors as CHECKED_SCHEMA_SYNC<S>;
}

/**
 * Check the input against all provided validation rules, choosing the sync or async
 * implementation based on whether any rule is an `async` function.
 *
 * The return type is inferred from the rules: all-sync rules yield `string[]`,
 * any `async` rule yields `Promise<string[]>`. Rules whose return type is declared
 * as `boolean | Promise<boolean>` (e.g. annotated as `RULE`) yield the union.
 *
 * @param {V} value the value to check
 * @param {R} rules rules object to use for validating the provided value
 * @param {unknown[]} overload array of extra values the validator rules might need to properly validate the value
 * @returns {Promise<string[]>|string[]} a list of rule names which failed validation
 */
export const getValueErrors = <V, R extends RULES<V>>(
	value: V,
	rules: R,
	...overload: unknown[]
): MAYBE_ASYNC<RULES_KIND<R>, string[]> => {
	// The runtime check decides sync vs async; the static type is derived from `R` above.
	const result = hasAsyncFunction(rules)
		? getValueErrorsAsync(value, rules, ...overload)
		: getValueErrorsSync(value, rules as RULES_SYNC<V>, ...overload);
	return result as MAYBE_ASYNC<RULES_KIND<R>, string[]>;
}

// Runtime check for whether a schema has async functions
const isAsyncSchema = (schema: SCHEMA): boolean =>
	Object.values(schema).some(hasAsyncFunction);

/**
 * Check a schema against all provided validation rules, choosing the sync or async
 * implementation based on whether any rule is an `async` function.
 *
 * The return type is inferred from the schema: all-sync rules yield the result object
 * directly, any `async` rule yields a `Promise` of it. Rules whose return type is declared
 * as `boolean | Promise<boolean>` (e.g. a schema annotated as `SCHEMA`) yield the union.
 *
 * @param {CHECKABLE_OBJECT} object object to be validated
 * @param {S} schema schema to validate against
 * @param {SCHEMA_OPTIONS} options options affecting how the rules are run
 * @param {unknown[]} overload array of extra values the validator rules might need to properly validate the value
 * @returns {CHECKED_SCHEMA<S>|CHECKED_SCHEMA_SYNC<S>} an object containing keys and their respective lists of failed rule names
 */
export const getSchemaErrors = <S extends SCHEMA>(
	object: CHECKABLE_OBJECT,
	schema: S,
	options: SCHEMA_OPTIONS = DEFAULT_SCHEMA_OPTIONS,
	...overload: unknown[]
): MAYBE_ASYNC<SCHEMA_KIND<S>, CHECKED_SCHEMA_SYNC<S>> => {
	// The runtime check decides sync vs async; the static type is derived from `S` above.
	const result = isAsyncSchema(schema)
		? getSchemaErrorsAsync(object, schema, options, ...overload)
		: getSchemaErrorsSync(object, schema as SCHEMA_SYNC, options, ...overload);
	return result as MAYBE_ASYNC<SCHEMA_KIND<S>, CHECKED_SCHEMA_SYNC<S>>;
}
