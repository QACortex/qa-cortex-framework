# vendor/

Holds `qa-cortex-core.tgz`, the packed `@qa-cortex/core` this project installs until the
package is published to npm. The tarball is a build artifact and is not committed
(`*.tgz` is gitignored).

- Inside the qa-cortex repository: `npm run setup` (does both), or `npm run framework:pack`, then `npm install file:vendor/qa-cortex-core.tgz`.
- Anywhere else: copy a `@qa-cortex/core` tarball here as `qa-cortex-core.tgz`, then `npm install file:vendor/qa-cortex-core.tgz`.

Name the tarball when installing: a plain `npm install` keeps an already installed copy of the
same version, so a re-packed tarball would be ignored.

**Temporary, must be removed before Release 1.** Once `@qa-cortex/core` is published,
`package.json` switches to a normal version range, the lockfile is regenerated from the npm
registry, and this folder and `scripts/pack-framework.mjs` are deleted. The steps are listed in
the automation README under "Setup".
