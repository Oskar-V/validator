import { describe, test, expect } from 'bun:test'

import { getSchemaErrors, getValueErrors } from '../src';
import { allowUndefined, allowNull, preprocess } from '../src/helpers'

describe('Test allowUndefined schema helper', () => {
	const passing_key_object = { incoming_key: "string" }
	const failing_key_object = { incoming_key: 123 }
	const undefined_key_object = { undefined_key: 'string' };


	test('Helper doesn\'t alter the underlying function type', async () => {
		const schema = {
			Sync: () => true,
			Async: async () => await Promise.resolve(true),
		};

		const result = allowUndefined(schema);

		// Check that function behavior remains unchanged
		expect(await result.Async()).toBe(await schema.Async());
		expect(result.Sync()).toBe(schema.Sync());

		// Check that async and sync functions retain their types
		expect(result.Async.constructor.name).toBe(schema.Async.constructor.name);
		expect(result.Sync.constructor.name).toBe(schema.Sync.constructor.name);
	});

	test('Undefined value on synchronous rules', () => {
		const schema = {
			incoming_key: allowUndefined({
				"Passes": () => true,
				"Fails": () => false,
				"Is string": (i: unknown) => typeof i === 'string',
			})
		}
		const i = getSchemaErrors(passing_key_object, schema);
		const j = getSchemaErrors(failing_key_object, schema);
		const k = getSchemaErrors(undefined_key_object, schema);

		// Make sure all functions ran as sync
		for (const func of [i, j, k]) {
			expect(func.constructor.name).not.toBe('Promise')
		}

		expect(i).toEqual({ incoming_key: ['Fails'] })
		expect(j).toEqual({ incoming_key: ['Fails', 'Is string'] })
		expect(k).toEqual({ incoming_key: [] })
	})

	test('Undefined value on asynchronous rules', async () => {
		const schema = {
			incoming_key: allowUndefined({
				"Passes": async () => await Promise.resolve(true),
				"Fails": async () => await Promise.resolve(false),
				"Rejects": async () => await Promise.reject(),
				"Is string": async (i: unknown) => await Promise.resolve(typeof i === 'string'),
			})
		};

		const i = getSchemaErrors(passing_key_object, schema);
		const j = getSchemaErrors(failing_key_object, schema);
		const k = getSchemaErrors(undefined_key_object, schema);


		// Make sure all functions ran as async
		for (const func of [i, j, k]) {
			expect(func.constructor.name).toBe('Promise');
		}

		const t = (await Promise.allSettled([i, j, k]))
		const answers = [
			['Fails', 'Rejects'],
			['Fails', 'Rejects', 'Is string'],
			[]
		]
		for (let idx = 0; idx < t.length; idx++) {
			expect(t[idx].status).toEqual("fulfilled");
			// @ts-ignore
			expect(t[idx].value).toEqual({ 'incoming_key': answers[idx] })
		}
	})
});

describe('Test allowNull schema helper', () => {
	test('Null value passes synchronous rules and result stays sync', () => {
		const rules = allowNull({
			"Is string": (i: unknown) => typeof i === 'string',
		});
		const null_result = getValueErrors(null, rules);
		expect(null_result.constructor.name).not.toBe('Promise');
		expect(null_result).toEqual([]);
		expect(getValueErrors(123, rules)).toEqual(['Is string']);
		expect(getValueErrors('a', rules)).toEqual([]);
	})

	test('Null value passes asynchronous rules and result stays async', async () => {
		const rules = allowNull({
			"Is string": async (i: unknown) => await Promise.resolve(typeof i === 'string'),
		});
		const null_result = getValueErrors(null, rules);
		expect(null_result).toBeInstanceOf(Promise);
		expect(await null_result).toEqual([]);
		expect(await getValueErrors(123, rules)).toEqual(['Is string']);
	})

	test('Undefined value still fails the rules', () => {
		const rules = allowNull({
			"Is string": (i: unknown) => typeof i === 'string',
		});
		expect(getValueErrors(undefined, rules)).toEqual(['Is string']);
	})
})

describe('Test preprocess schema helper', () => {
	test('Sync rules stay sync', () => {
		const rules = preprocess((i) => String(i).trim(), { "not empty": (s: string) => s.length > 0 });
		expect(getValueErrors('   ', rules)).toEqual(["not empty"]);
		expect(getValueErrors(' a ', rules)).toEqual([]);
	});

	test('Async rules stay async and their failures are reported', async () => {
		const rules = preprocess((i) => Number(i), { "is even": async (n: number) => n % 2 === 0 });
		const result = getValueErrors('3', rules);
		expect(result).toBeInstanceOf(Promise);
		expect(await result).toEqual(["is even"]);
		expect(await getValueErrors('4', rules)).toEqual([]);
	});
});
