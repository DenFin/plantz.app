---
id: DEL-02
epic: EPIC-PLANTZ-DELIVERY
title: Test Runner & Lint Gate
status: done
priority: P0
depends_on: []
repo: plantz
loopable: true
---

# [DEL-02] Test Runner & Lint Gate

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-DELIVERY](../epics/epic-delivery.md)

## 1. Goal

`pnpm test` exists, runs `app/components/BaseHeadline/BaseHeadline.test.ts`, and passes.
DEL-04 has a command to call.

## 2. Current State (verified against `main` 4d935f8)

- `app/components/BaseHeadline/BaseHeadline.test.ts` exists.
- `package.json` has no `test` script. Scripts are `build`, `dev`, `generate`, `preview`,
  `postinstall`, `lint`, `lint:fix`.
- No test runner appears in `dependencies` or `devDependencies`.
- The test file has therefore never executed. Whether it currently passes is unknown.
- `amqplib` and `@types/amqplib` are dependencies. `grep -r "amqplib" server/ app/` returns
  no usage.

## 3. Scope

### 3.1 In Scope

- Install `vitest` and `@nuxt/test-utils` plus the peer dependencies Nuxt 4 requires for
  component testing.
- Add a vitest config that resolves Nuxt aliases, so `~/` and `#imports` work in tests.
- Add `test` and `test:watch` scripts to `package.json`.
- Make `BaseHeadline.test.ts` pass. If the test itself is wrong rather than the code,
  fix the test and say so in the commit body.
- Remove `amqplib` and `@types/amqplib` from `package.json`.

### 3.2 Out of Scope

- Writing new tests. Coverage for care logging arrives with CARE-01, written alongside the
  feature.
- Coverage thresholds or reporting.
- End-to-end or browser tests.
- Changing `eslint.config.mjs`. Lint already works.

## 4. Implementation Notes

- `@nuxt/test-utils` is the supported path for testing Nuxt components. A bare vitest
  setup will fail on Nuxt auto-imports the moment a component uses one.
- Environment: `nuxt` for component tests. Server-side tests added later can use `node`
  via a per-file directive.
- If `BaseHeadline.test.ts` turns out to test something that no longer exists, deleting it
  is not an acceptable outcome. Rewrite it against the current component: it is the only
  test in the repo and DEL-04 needs a non-empty run to be meaningful.
- Removing `amqplib` touches `pnpm-lock.yaml`. Commit the lockfile.

## 5. Definition of Done

- [ ] `pnpm test` exits 0 and reports at least one passing test.
- [ ] The run includes `BaseHeadline.test.ts` by name in its output.
- [ ] `pnpm lint` still exits 0.
- [ ] `pnpm build` still succeeds.
- [ ] `amqplib` no longer appears in `package.json` or `pnpm-lock.yaml`.

## 6. Verification

```bash
pnpm install
pnpm test                 # expect: exit 0, BaseHeadline named in the output
pnpm lint                 # expect: exit 0
pnpm build                # expect: exit 0
grep -c amqplib package.json   # expect: 0
```

## 7. Risks

| Risk | Mitigation |
|------|------------|
| `BaseHeadline.test.ts` fails because it was written against an older component | Rewrite it against the current component rather than deleting it |
| `@nuxt/test-utils` pulls a large dependency tree into CI | Accepted. It is the supported path and CI caches pnpm already, as the invoi runs show |
| Removing `amqplib` breaks a runtime import nothing grepped for | `pnpm build` in the DoD would fail on a missing module |

## 8. Open Questions

None. Q-D2 and Q-D3 in the parent epic do not touch this sub-PRD.

## 9. Implementation Notes Added During the Work

- **D-D10** Section 3.2 says "Lint already works". It did not. On `4d935f8` the command
  `pnpm lint` exits 1 with 98 errors, and the DoD requires it to exit 0, so the errors had
  to be cleared as part of this sub-PRD. What was wrong, and how it was fixed:
  - 40 `node/prefer-global/process` and `node/prefer-global/buffer`: added the explicit
    `import process from 'node:process'` and `import { Buffer } from 'node:buffer'` the
    rule asks for, across nine files.
  - 17 `unused-imports/no-unused-vars`: unused `event` parameters dropped from five
    handlers; genuinely unused declarations in `app/pages/plants/[id].vue` renamed with the
    leading underscore the rule allows. Nothing was deleted, because dead code in a page is
    a separate decision from a lint gate.
  - 4 Vue template errors: a missing `:key` in `app/pages/rooms/index.vue`, an unused
    `index` binding, and a `v-if` sitting on the same element as a `v-for`. The last one
    became `v-for="… in plant.data[0].photos ?? []"`, which renders the same and drops the
    guard the rule objects to.
  - The rest (trailing spaces, comma dangle, import order) came out with `pnpm lint:fix`.
  - The 29 remaining `no-console` findings are warnings, not errors, and do not affect the
    exit code. They stay.
- **D-D11** `BaseHeadline.test.ts` never ran, and it could not have: it imported the
  component as `../../../components/BaseHeadline/BaseHeadline.vue`, a path from before the
  Nuxt 4 move into `app/`. Corrected to `./BaseHeadline.vue`. The assertion was
  `expect(header).toBeDefined()`, which passes even when the element is absent, since
  `find()` always returns a wrapper object. It now asserts `header.exists()` and the
  rendered text, which is what the test name claims to check.
- **D-D12** `pnpm test` runs `vitest run --reporter=verbose`. The default reporter prints
  only the summary when stdout is not a terminal, so the DoD line "the run includes
  `BaseHeadline.test.ts` by name in its output" fails in CI with the default. `test:watch`
  keeps the default reporter.
