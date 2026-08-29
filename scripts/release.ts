// Cuts a release: bumps the version in package.json and jsr.json, commits,
// tags, and pushes. The push of the v* tag triggers .github/workflows/publish.yaml,
// which tests, builds, and publishes to npm, JSR, and GitHub Packages.
//
// Usage: bun release v1.2.3   (a leading "v" is optional)

import { $ } from 'bun';

const VERSION_FILES = ['package.json', 'jsr.json'];
const RELEASE_BRANCH = 'main';

const fail = (message: string): never => {
	console.error(`\nerror: ${message}`);
	process.exit(1);
};

const arg = process.argv[2] ?? fail('usage: bun release v<major>.<minor>.<patch>');
const version = arg.replace(/^v/, '');
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) fail(`"${arg}" is not a valid semver version`);
const tag = `v${version}`;

// --- Preconditions ---------------------------------------------------------

const branch = (await $`git branch --show-current`.text()).trim();
if (branch !== RELEASE_BRANCH) fail(`releases are cut from ${RELEASE_BRANCH} (currently on "${branch}")`);

// Only the version files may be dirty; the script owns those.
const dirty = (await $`git status --porcelain`.text())
	.split('\n')
	.filter(Boolean)
	.map((line) => line.slice(3))
	.filter((file) => !VERSION_FILES.includes(file));
if (dirty.length) fail(`working tree has uncommitted changes:\n  ${dirty.join('\n  ')}`);

await $`git fetch origin --tags --quiet`;
if ((await $`git tag --list ${tag}`.text()).trim()) fail(`tag ${tag} already exists`);

const behind = (await $`git rev-list --count HEAD..origin/${RELEASE_BRANCH}`.text()).trim();
if (behind !== '0') fail(`${RELEASE_BRANCH} is ${behind} commit(s) behind origin — pull first`);

// --- Bump versions (string replace, so file formatting is preserved) --------

for (const file of VERSION_FILES) {
	const text = await Bun.file(file).text();
	if (!/"version":\s*"[^"]*"/.test(text)) fail(`no "version" field found in ${file}`);
	await Bun.write(file, text.replace(/("version":\s*")[^"]*(")/, `$1${version}$2`));
	console.log(`${file}: version -> ${version}`);
}

// --- Make sure we are not tagging something broken --------------------------

console.log('\nRunning tests...');
await $`bun test`;
console.log('\nBuilding...');
await $`bun run build`;

// --- Commit, tag, push ------------------------------------------------------

await $`git add ${VERSION_FILES}`;
const nothingToCommit = (await $`git diff --cached --quiet`.nothrow()).exitCode === 0;
if (nothingToCommit) {
	console.log(`\nVersion ${version} already committed, only tagging.`);
} else {
	await $`git commit --quiet -m ${`Release ${tag}`}`;
}
await $`git tag -a ${tag} -m ${`Release ${tag}`}`;
await $`git push --atomic origin ${RELEASE_BRANCH} ${tag}`;

console.log(`\nPushed ${tag}. Publishing now runs in GitHub Actions.`);
