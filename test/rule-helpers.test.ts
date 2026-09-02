import { describe, test, expect } from 'bun:test'

import { matchesRegex, maxLength, minLength, max, min, stringBetween, numberBetween, acceptAnySync, equals, isOneOf, isInteger, isArray, isInstanceOf, notSync, notAsync, everyElementSync, everyElementAsync, isType } from '../src/helpers'
import { EMAIL_PATTERN } from '../src/patterns';
import { getValueErrors } from '../src';

describe("Regex helper", () => {
	const valid_email = "valid@email.com";
	const invalid_email = "invalid.email@com"
	const non_strings = [
		1,
		null,
		undefined,
		{},
		[], // "typeof []"" crashes bun test runner when used with test.each()
		NaN,
		true,
		() => { }
	]
	test("Passes valid email", () => {
		expect(matchesRegex(EMAIL_PATTERN)(valid_email)).toBe(true)
	})

	test("Fails invalid email", () => {
		expect(matchesRegex(EMAIL_PATTERN)(invalid_email)).toBe(false)
	})

	non_strings.forEach((i) => {
		test(`Fails non-string ${typeof i}`, () => {
			expect(matchesRegex(EMAIL_PATTERN)(i)).toBe(false);
		}, 100)
	})
});

describe('max length helper', () => {
	test('Passes maxLength', () => {
		expect(maxLength(Infinity)("test_string")).toBe(true);
	})

	test('Fails maxLength properly', () => {
		expect(maxLength(0)("test_string")).toBe(false);
	})

	test('Fails for a value without length property', () => {
		expect(maxLength(0)(0)).toBe(false);
	})
});

describe('min length helper', () => {
	test('Passes minLength', () => {
		expect(minLength(0)("test_string")).toBe(true);
	})

	test('Fails minLength properly', () => {
		expect(minLength(Infinity)("test_string")).toBe(false);
	})

	test('Fails for a value without length property', () => {
		expect(minLength(0)(0)).toBe(false);
	})
});

describe('max value helper', () => {
	test('Passes max properly', () => {
		expect(max(10)(5)).toBe(true);
	})
	test('Fails max properly', () => {
		expect(max(5)(10)).toBe(false);
	})
	test('Fails invalid input', () => {
		expect(max(10)('test')).toBe(false);
	})
})

describe('min value helper', () => {
	test('Passes min properly', () => {
		expect(min(5)(10)).toBe(true);
	})
	test('Fails min properly', () => {
		expect(min(10)(5)).toBe(false);
	})
	test('Fails invalid input', () => {
		expect(min(5)('test')).toBe(false);
	})
});

describe('numberBetween helper', () => {
	test('Passes lower value properly', () => {
		expect(numberBetween(10)(2)).toBe(true);
	})
	test('Passes higher value properly', () => {
		expect(numberBetween(10, 1)(2)).toBe(true);
	})
	test('Fails higher value properly', () => {
		expect(numberBetween(10)(11)).toBe(false);
	})
	test('Fails lower value properly', () => {
		expect(numberBetween(10, 5)(1)).toBe(false);
	})
	test('Fails any value for wrong input', () => {
		const values = [-Infinity, 0, Infinity];
		for (let i = 0; i < 20; i++) {
			values.push(Math.random() * 2e9 - 1e9);
		}
		values.forEach((v) => expect(numberBetween(-Infinity, Infinity)(v)).toBe(false))
	})
});

describe('stringBetween helper', () => {
	test('Passes lower value properly', () => {
		expect(stringBetween(10)("string")).toBe(true);
	})
	test('Passes higher value properly', () => {
		expect(stringBetween(10, 1)("string")).toBe(true);
	})
	test('Fails higher value properly', () => {
		expect(stringBetween(10)(11)).toBe(false);
	})
	test('Fails lower value properly', () => {
		expect(stringBetween(10, 5)(1)).toBe(false);
	})
	test('Fails any value for wrong input', () => {
		const values = [-Infinity, 0, Infinity];
		for (let i = 0; i < 20; i++) {
			values.push(Math.random() * 2e9 - 1e9);
		}
		values.forEach((v) => expect(stringBetween(-Infinity, Infinity)(v)).toBe(false))
	})
});

describe('acceptAny rules helper', () => {
	test('Accepts different async rules', () => {
		// TODO implement properly in the future
	})
	test('Accept different sync rules', () => {
		const rules = {
			'Can\'t be 3': acceptAnySync([max(2), min(4)])
		}
		expect(getValueErrors(1, rules)).toBeArrayOfSize(0);
		expect(getValueErrors(3, rules)).toBeArrayOfSize(1);
		expect(getValueErrors('1', rules)).toBeArrayOfSize(1);
	})
})

describe('equals helper', () => {
	test('Passes strictly equal value', () => {
		expect(equals(5)(5)).toBe(true);
	})
	test('Fails different value', () => {
		expect(equals(5)(6)).toBe(false);
	})
	test('Fails loosely equal value of different type', () => {
		expect(equals(5)('5')).toBe(false);
	})
	test('Passes null compared to null', () => {
		expect(equals(null)(null)).toBe(true);
	})
	test('Passes NaN compared to NaN, matching isOneOf', () => {
		expect(equals(NaN)(NaN)).toBe(true);
		expect(isOneOf([NaN])(NaN)).toBe(true);
	})
})

describe('isOneOf helper', () => {
	test('Passes included value', () => {
		expect(isOneOf(['a', 'b'])('a')).toBe(true);
	})
	test('Fails excluded value', () => {
		expect(isOneOf(['a', 'b'])('c')).toBe(false);
	})
	test('Fails loosely equal value of different type', () => {
		expect(isOneOf([1, 2])('1')).toBe(false);
	})
	test('Fails everything with default empty list', () => {
		expect(isOneOf()('a')).toBe(false);
	})
})

describe('isInteger helper', () => {
	test('Passes integer', () => {
		expect(isInteger()(5)).toBe(true);
	})
	test('Passes negative integer', () => {
		expect(isInteger()(-5)).toBe(true);
	})
	test('Fails float', () => {
		expect(isInteger()(5.5)).toBe(false);
	})
	test('Fails numeric string', () => {
		expect(isInteger()('5')).toBe(false);
	})
	test('Fails NaN and Infinity', () => {
		expect(isInteger()(NaN)).toBe(false);
		expect(isInteger()(Infinity)).toBe(false);
	})
})

describe('isArray helper', () => {
	test('Passes array', () => {
		expect(isArray()([1, 2])).toBe(true);
	})
	test('Passes empty array', () => {
		expect(isArray()([])).toBe(true);
	})
	test('Fails object', () => {
		expect(isArray()({})).toBe(false);
	})
	test('Fails string', () => {
		expect(isArray()('[]')).toBe(false);
	})
	test('Fails null', () => {
		expect(isArray()(null)).toBe(false);
	})
})

describe('isInstanceOf helper', () => {
	test('Passes direct instance', () => {
		expect(isInstanceOf(Date)(new Date())).toBe(true);
	})
	test('Passes subclass instance', () => {
		expect(isInstanceOf(Error)(new TypeError())).toBe(true);
	})
	test('Fails plain object', () => {
		expect(isInstanceOf(Date)({})).toBe(false);
	})
	test('Fails primitive', () => {
		expect(isInstanceOf(Date)(5)).toBe(false);
	})
})

describe('notSync helper', () => {
	test('Inverts a failing rule', () => {
		expect(notSync(isType('string'))(5)).toBe(true);
	})
	test('Inverts a passing rule', () => {
		expect(notSync(isType('string'))('a')).toBe(false);
	})
	test('Passes when the wrapped rule throws', () => {
		const throwing = (i: unknown) => {
			if (typeof i !== 'string') throw new TypeError('not a string');
			return i.length > 3;
		};
		expect(notSync(throwing)(5)).toBe(true);
		expect(notSync(throwing)('long enough')).toBe(false);
	})
})

describe('notAsync helper', () => {
	test('Inverts a failing async rule', async () => {
		const result = notAsync(async () => false)('anything');
		expect(result).toBeInstanceOf(Promise);
		expect(await result).toBe(true);
	})
	test('Inverts a passing async rule', async () => {
		expect(await notAsync(async () => true)('anything')).toBe(false);
	})
	test('Passes when the wrapped rule throws or rejects', async () => {
		expect(await notAsync(async () => { throw new Error('boom') })('anything')).toBe(true);
		expect(await notAsync(() => { throw new Error('boom') })('anything')).toBe(true);
	})
})

describe('everyElementSync helper', () => {
	test('Passes when every element passes', () => {
		expect(everyElementSync(isType('number'))([1, 2, 3])).toBe(true);
	})
	test('Passes empty array', () => {
		expect(everyElementSync(isType('number'))([])).toBe(true);
	})
	test('Fails when one element fails', () => {
		expect(everyElementSync(isType('number'))([1, '2', 3])).toBe(false);
	})
	test('Fails non-array value', () => {
		expect(everyElementSync(isType('number'))(5)).toBe(false);
	})
	test('Fails sparse-array holes like the async variant does', () => {
		expect(everyElementSync(isType('number'))([1, , 3])).toBe(false);
		expect(everyElementSync(isType('number'))(new Array(3))).toBe(false);
	})
})

describe('everyElementAsync helper', () => {
	const isEven = async (i: unknown) => typeof i === 'number' && i % 2 === 0;
	test('Passes when every element passes', async () => {
		const result = everyElementAsync(isEven)([2, 4, 6]);
		expect(result).toBeInstanceOf(Promise);
		expect(await result).toBe(true);
	})
	test('Fails when one element fails', async () => {
		expect(await everyElementAsync(isEven)([2, 3, 4])).toBe(false);
	})
	test('Fails non-array value', async () => {
		expect(await everyElementAsync(isEven)(5)).toBe(false);
	})
	test('Stops invoking the rule after the first failure', async () => {
		let calls = 0;
		const counting = async (i: unknown) => {
			calls++;
			return typeof i === 'number';
		};
		expect(await everyElementAsync(counting)(['bad', 1, 2])).toBe(false);
		expect(calls).toBe(1);
	})
})


