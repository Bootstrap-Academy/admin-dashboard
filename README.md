# Bootstrap Academy Admin Dashboard
The internal admin dashboard of [Bootstrap Academy](https://bootstrap.academy/).

If you would like to submit a bug report or feature request, or are looking for general information about the project or the publicly available instances, please refer to the [Bootstrap-Academy repository](https://github.com/Bootstrap-Academy/Bootstrap-Academy).

## Development Setup
1. Install [Node.js and npm](https://nodejs.org/)
2. Clone this repository and `cd` into it.
3. Run `npm install` to install the dependencies.
4. Run `npm run dev` to start a development server listening on http://localhost:3000/.

## Validation

Use the lockfile and Node version selected in the workflows:

```sh
npm ci
npm run lint
npm run typecheck
npm test
bash build.sh
npm run test:browser
```

`typecheck` checks TypeScript sources with Nuxt's generated configuration. The unit and browser suites exercise Vue component behavior; this command does not typecheck Vue templates.

Browser tests serve the existing `dist` build, use isolated synthetic API responses and block external requests. Install Chromium and set `CHROMIUM_PATH` if it is not on your PATH. The runner owns and removes its temporary profiles and local servers. It reports each tested case group. Authenticated acceptance against the deployed Test API remains a separate release check.
