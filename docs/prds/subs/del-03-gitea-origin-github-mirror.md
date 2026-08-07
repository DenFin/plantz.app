---
id: DEL-03
epic: EPIC-PLANTZ-DELIVERY
title: Gitea as Origin, GitHub as Mirror
status: blocked
priority: P0
depends_on: []
repo: plantz
loopable: true
---

# [DEL-03] Gitea as Origin, GitHub as Mirror

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-DELIVERY](../epics/epic-delivery.md)

## 1. Goal

`origin` points at Gitea, the full history is pushed there, and every push to `main` is
mirrored to GitHub. This is the prerequisite for DEL-04: Gitea Actions only runs on code
that lives in Gitea.

This sub-PRD mostly changes remote configuration rather than files. The push to Gitea must
carry `main`, `feat/plantz-program` and every tag, so nothing is left behind on GitHub
only.

## 2. Current State (verified 2026-08-07)

- `git remote -v` in the working copy: `origin git@github.com:DenFin/plantz.app.git`.
- Gitea 1.25.1 runs at `192.168.178.43:3000`, SSH host alias `gitea`.
- `tea` 0.14.2 is installed with a login named `invoi` pointing at that instance as user
  `dennis`.
- The repository `dennis/plantz.app` exists on that instance:
  - `empty: true`
  - `mirror: false`
  - `default_branch: main`
  - `has_actions: true`, `has_packages: true`
  - SSH URL `git@192.168.178.43:dennis/plantz.app.git`
- `homelab-root/TODOS.md` carries an open item: a push mirror for gitea to GitHub or
  Codeberg, to close the gap between two USB backup dates. This sub-PRD satisfies it for
  plantz.

## 3. Scope

### 3.1 In Scope

- Push the full history of `main`, all tags and all remaining branches to
  `dennis/plantz.app` on Gitea.
- Rename the current `origin` to `github`, and make Gitea the new `origin`.
- Configure a push mirror in Gitea from `dennis/plantz.app` to
  `github.com/DenFin/plantz.app`, using a GitHub token with `repo` scope.
- Verify the mirror by pushing a commit to Gitea and confirming it lands on GitHub.
- Update the clone URL in the README if one is documented there.

### 3.2 Out of Scope

- Archiving or deleting the GitHub repository. Q-D1 in the parent epic settled on keeping
  it as the off-site copy.
- Migrating issues, pull requests or releases. There are none worth moving.
- Moving any other repository to Gitea.
- Changing the SSH key setup. The `gitea` host alias already authenticates.

## 4. Implementation Notes

**Order matters.** Push to Gitea before repointing `origin`. If the push fails, nothing has
changed and the working copy still has a working remote.

```bash
git remote rename origin github
git remote add origin git@192.168.178.43:dennis/plantz.app.git
git push origin --all
git push origin --tags
git branch --set-upstream-to=origin/main main
```

**The mirror needs a token, not an SSH key.** Gitea push mirrors authenticate over HTTPS.
Create a GitHub personal access token with `repo` scope and enter it in the repository
settings under Settings, Repository, Mirror Settings, or via the API. The token is a
credential: it belongs in the Gitea mirror config and nowhere else in this repo.

**Mirror interval.** Gitea also pushes a mirror immediately after each push when
configured as a push mirror, and on the interval as a fallback. Eight hours is a
reasonable interval; the immediate push is what actually keeps it current.

**Verification of the mirror is not optional.** A mirror that silently fails is worse than
no mirror, because it is believed. The DoD requires one observed round trip.

## 5. Definition of Done

- [ ] `git remote -v` shows `origin` on `192.168.178.43` and `github` on `github.com`.
- [ ] `dennis/plantz.app` on Gitea reports `empty: false` and its `main` head equals the
      local `main` head.
- [ ] Every local branch and tag exists on Gitea.
- [ ] A push mirror to `github.com/DenFin/plantz.app` is configured and enabled.
- [ ] A commit pushed to Gitea appears on GitHub without a manual push.
- [ ] The README, if it names a clone URL, names the Gitea one.

## 6. Verification

```bash
git remote -v
# expect: origin -> git@192.168.178.43:dennis/plantz.app.git
#         github -> git@github.com:DenFin/plantz.app.git

curl -s http://192.168.178.43:3000/api/v1/repos/dennis/plantz.app | grep -o '"empty":[a-z]*'
# expect: "empty":false

git ls-remote origin main | cut -f1
git rev-parse main
# expect: identical

# Mirror round trip
git commit --allow-empty -m "chore: verify gitea to github mirror"
git push origin main
sleep 30
git ls-remote github main | cut -f1
# expect: the new SHA
```

## 7. Risks

| Risk | Mitigation |
|------|------------|
| The GitHub token is committed by accident | It is entered in Gitea's UI or API and never touches the repository |
| A push mirror overwrites GitHub history | Both sides currently have the same history. Push after verifying `git ls-remote` on both |
| Gitea becomes a single point of failure for the code | That is what the mirror is for. GitHub keeps a full copy |
| The `insecure-registries` HTTP setup means the git remote is also plain HTTP | Only for the registry. Git uses SSH on port 22 to `192.168.178.43`, which is authenticated and encrypted |

## 8. Open Questions

- [ ] **Q-D1** (parent epic) settled: GitHub stays as a mirror target, it is the only
      off-site copy of the code.

## 9. Blocked

Nothing in section 3.1 was executed. Nothing was pushed, no remote was renamed, no mirror
was configured. The working copy still has GitHub as `origin`, exactly as before. Three
findings from 2026-08-07, in the order they block the work:

- **B-D1 No SSH key is registered on the Gitea account, so no push is possible.**
  Section 2 records the host alias `gitea` as working, and section 3.2 puts the SSH key
  setup out of scope. Both hold for the wrong thing. The alias is a shell login to the VM
  as user `dennis` (`IdentityFile ~/.ssh/gitea_vm`), and it works. Git pushes authenticate
  as the `git` user against Gitea, which is a separate check, and it fails:

  ```
  ssh -T git@192.168.178.43        → Permission denied (publickey,password)
  GET /api/v1/user/keys            → []
  ```

  The account has zero keys. Registering `~/.ssh/gitea_vm.pub` through the API would fix
  it and the stored `tea` token has admin rights, but section 3.2 rules that change out of
  scope, so it needs a decision rather than an assumption.

- **B-D2 The SSH URL in section 4 points at the wrong daemon.** Gitea reports its
  `ssh_url` as `git@192.168.178.43:dennis/plantz.app.git`, which resolves to port 22. Port
  22 on that host is the Debian VM's own sshd, which greets with `Linux gitlab`. Gitea's
  SSH listens on port 222:

  ```
  port 22  → open, Debian sshd (VM login)
  port 222 → open, publickey only (Gitea)
  ```

  So `origin` has to be `ssh://git@192.168.178.43:222/dennis/plantz.app.git`, not the URL
  in section 4. The verification block in section 6 expects the port-22 form and would
  have to change with it.

- **B-D3 The GitHub personal access token for the push mirror does not exist yet.**
  Section 3.1 needs a token with `repo` scope, entered in Gitea. It has to be created by
  hand on github.com under Settings, Developer settings, Personal access tokens. Without
  it the mirror cannot be configured, which takes out two DoD items: the mirror itself and
  the observed round trip.

What was verified as still true: Gitea 1.25.1 answers at `192.168.178.43:3000`, `tea`
0.14.2 authenticates as `dennis` with admin rights, and `dennis/plantz.app` exists with
`empty: true`, `mirror: false`, `default_branch: main`, `has_actions: true`.

One scope item is a no-op rather than blocked: section 3.1 asks for the clone URL in the
README to be updated. The README documents no clone URL, so there is nothing to change.
