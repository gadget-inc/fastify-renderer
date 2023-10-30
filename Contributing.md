# Contributing to fastify-renderer

See below for information on how fastify-renderer's community is governed.

## Development

### Running a development server for a test app

To run a local dev server that mounts the monorepo version of `fastify-render` in a test app, run

```shell
pnpm -F=simple-react dev
```

### Running tests

You can run all the tests with:

```shell
pnpm test
```

You can run a specific test file with:

```shell
pnpm test packages/test-apps/simple-react/test/some-test-file.spec.ts
```

You can run a specific test case with:

```shell
pnpm test packages/test-apps/simple-react/test/some-test-file.spec.ts -- -t "the case name"
```

#### Debugging Playwright tests

Playwright supports a handy debug environment variable:

```shell
PWDEBUG=1 pnpm test packages/test-apps/simple-react/test/some-test-file.spec.ts
```

This pops open a headful browser for running tests, and a UI for stepping through each execution element as it happens.

## Releases

Bump the version with `npm version <minor|major|patch>` then commit the change to git. When your changes get pushed/merged to `main` on github, Github Actions will run the `release` workflow and automatically publish the release to NPM.

## fastify-renderer is an OPEN Open Source Project

## What?

Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

### I want to be a collaborator!

If you think you meet the above criteria and we have not invited you yet, we are sorry!
Feel free reach out to a [Lead Maintainer](https://github.com/fastify/fastify#team) privately with
a few links to your valuable contributions.
Read the [GOVERNANCE](GOVERNANCE.md) to get more information.

## Rules

There are a few basic ground-rules for contributors:

1. **No `--force` pushes** on `master` or modifying the Git history in any way after a PR has been merged.
1. **Non-master branches** ought to be used for ongoing work.
1. **External API changes and significant modifications** ought to be subject to an **internal pull-request** to solicit feedback from other contributors.
1. Internal pull-requests to solicit feedback are _encouraged_ for any other non-trivial contribution but left to the discretion of the contributor.
1. Contributors should attempt to adhere to the prevailing code-style.
1. At least two contributors, or one core member, must approve pull-requests prior to merging.
1. All integrated CI services must be green before a pull-request can be merged.
1. SemVer-major changes in this repository must be merged by a lead maintainer.
1. In case it is not possible to reach consensus in a pull-request, the decision is left to the lead maintainers team.

## Plugins

The contributors to the Fastify's plugins must attend the same rules of the Fastify repository with few adjustments:

1. A release can be published by any member.
1. The plugin version must follow the [semver](https://semver.org/) specification.
1. The Node.js compatibility must match with the Fastify's master branch.
1. The new release must have the changelog information stored in the GitHub release.
   For this scope we suggest to adopt a tool like [`releasify`](https://github.com/fastify/releasify) to archive this.
1. PR opened by bots (like Greenkeeper) can be merged if the CI is green and the Node.js versions supported are the same of the plugin.

## Changes to this arrangement

This is an experiment and feedback is welcome! This document may also be subject to pull-requests or changes by contributors where you believe you have something valuable to add or change.

<a id="developers-certificate-of-origin"></a>

## Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

- (a) The contribution was created in whole or in part by me and I
  have the right to submit it under the open source license
  indicated in the file; or

- (b) The contribution is based upon previous work that, to the best
  of my knowledge, is covered under an appropriate open source
  license and I have the right under that license to submit that
  work with modifications, whether created in whole or in part
  by me, under the same open source license (unless I am
  permitted to submit under a different license), as indicated
  in the file; or

- (c) The contribution was provided directly to me by some other
  person who certified (a), (b) or (c) and I have not modified
  it.

- (d) I understand and agree that this project and the contribution
  are public and that a record of the contribution (including all
  personal information I submit with it, including my sign-off) is
  maintained indefinitely and may be redistributed consistent with
  this project or the open source license(s) involved.
