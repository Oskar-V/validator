export const EMAIL_PATTERN = /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{1,}$/;
export const MYSQL_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
export const URL_PATTERN = /^(https?:\/\/)?([^\s$.?#].[^\s]*)\.[a-z]{2,}(\/[^ \t\r\n\v\f]*)?$/i;

// Time patterns - there's going to be a ton of these...
export const ISO_8601_DATETIME_PATTERN_STRICT = /^(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?(?:[+-][0-2]\d:[0-5]\d|Z)?)$/;
export const ISO_8601_DATETIME_PATTERN = /^(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d+)?)?)$/;
export const ISO_8601_TIME_PATTERN = /^(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(Z|[+-](?:2[0-3]|[01][0-9]):([0-5][0-9]))?$/;

export const ISO_8601_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// Shared fragments, so the UUID grammar and the embedded-IPv4 grammar are each defined once
const uuid_source = (version: string) => `[0-9a-f]{8}-[0-9a-f]{4}-${version}[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`;
const IPV4_SOURCE = '(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';

// Versioned UUIDs plus the nil and max UUIDs (RFC 9562 §5.9 / §5.10)
export const UUID_PATTERN = new RegExp(`^(?:${uuid_source('[1-8]')}|0{8}-0{4}-0{4}-0{4}-0{12}|f{8}-f{4}-f{4}-f{4}-f{12})$`, 'i');
export const UUID_V4_PATTERN = new RegExp(`^${uuid_source('4')}$`, 'i');

export const IPV4_PATTERN = new RegExp(`^${IPV4_SOURCE}$`);
export const IPV6_PATTERN = new RegExp('^(?:' + [
	'(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}',
	'(?:[0-9a-f]{1,4}:){1,7}:',
	'(?:[0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}',
	'(?:[0-9a-f]{1,4}:){1,5}(?::[0-9a-f]{1,4}){1,2}',
	'(?:[0-9a-f]{1,4}:){1,4}(?::[0-9a-f]{1,4}){1,3}',
	'(?:[0-9a-f]{1,4}:){1,3}(?::[0-9a-f]{1,4}){1,4}',
	'(?:[0-9a-f]{1,4}:){1,2}(?::[0-9a-f]{1,4}){1,5}',
	'[0-9a-f]{1,4}:(?::[0-9a-f]{1,4}){1,6}',
	':(?:(?::[0-9a-f]{1,4}){1,7}|:)',
	// IPv4-mapped / IPv4-translated (RFC 4291 §2.5.5), e.g. ::ffff:192.168.1.1
	`::(?:ffff(?::0{1,4})?:)?${IPV4_SOURCE}`,
	// IPv4-embedded (RFC 6052), e.g. 64:ff9b::192.0.2.33
	`(?:[0-9a-f]{1,4}:){1,4}:${IPV4_SOURCE}`,
].join('|') + ')$', 'i');
// Separator (":" or "-") must be consistent throughout
export const MAC_ADDRESS_PATTERN = /^[0-9a-f]{2}([:-])(?:[0-9a-f]{2}\1){4}[0-9a-f]{2}$/i;

export const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const E164_PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;
// Official pattern from semver.org
export const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
export const BASE64_PATTERN = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/;
export const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export const CONTAINS_LOWERCASE_CHARACTER_PATTERN = /[a-z]/;
export const CONTAINS_UPPERCASE_CHARACTER_PATTERN = /[A-Z]/;
export const CONTAINS_DIGIT_CHARACTER_PATTERN = /\d/;
export const CONTAINS_SYMBOL_CHARACTER_PATTERN = /[^\w\s]/;
