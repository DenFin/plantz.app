---
id: OPS-02
epic: EPIC-PLANTZ-OPS
title: Remote Access via Tunnel
status: open
priority: P2
depends_on: [DEL-05]
repo: terry
loopable: false
---

# [OPS-02] Remote Access via Tunnel

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-OPS](../epics/epic-ops.md)

**`loopable: false`.** This sub-PRD requires a browser login to a third-party account and
a device enrolment on a phone. The loop reports it and stops. The `wizard` skill is the
better fit: it produces a script that walks the human through the steps only they can do.

## 1. Goal

plantz opens on a phone that is not on the home network, and does not open for anything
outside the tunnel. This is the alternative to authentication that D-A1 chose.

## 2. Current State (verified 2026-08-07)

- plantz listens on `192.168.178.27:3000`, reachable from the LAN only.
- There is no authentication of any kind, and none is planned (D-A1).
- terry also runs `nginx-ui` and the homelab has `nginx-proxy-manager` on maggie, so
  reverse-proxy capability exists on the LAN side.
- The README states public deployment as a near-term goal. That goal is what this sub-PRD
  replaces: reachable by Dennis, not reachable by the internet.

## 3. Scope

### 3.1 In Scope

- A tunnel that makes terry reachable from outside the LAN for enrolled devices only.
  Q-O2 recommendation: Tailscale.
- Enrolment of the phone and the laptop.
- Verification that plantz is reachable through the tunnel and not reachable without it.
- Documentation of the setup in `homelab-root`, since it is a host-level change to terry
  and other services will want it.
- A note in the plantz README replacing the "deploy it to a publicly available server"
  goal with what was actually done and why.

### 3.2 Out of Scope

- Public exposure of any kind: no port forwarding, no public DNS record for plantz, no TLS
  certificate, no reverse proxy in front of it.
- Authentication. D-A1. If a second person ever needs access, that decision reopens along
  with this sub-PRD.
- Enrolling the rest of the homelab. plantz is the case that motivated it; the others can
  follow later.
- Exposing `/metrics` outside the LAN. It stays where INS-01 left it.

## 4. Implementation Notes

**Why a tunnel and not a login.** Building authentication for a single user costs session
handling, a login UI, `user_id` on every plant-scoped endpoint, a backfill migration for
plants that currently belong to nobody, and a negative test proving isolation works. A
tunnel costs an install and two device enrolments, and it removes plantz from the public
internet entirely rather than putting a password in front of it. For one user, the tunnel
is strictly better on both effort and exposure.

**Tailscale over Cloudflare.** Q-O2. A Cloudflare tunnel publishes a hostname that anyone
can reach and then gates it. Tailscale publishes nothing. The other homelab hosts can join
the same network later, which the Cloudflare model does not give.

**The negative test matters more than the positive one.** Confirming that plantz opens
through the tunnel is easy and reassuring. Confirming that it does not open from a device
outside the tunnel is the part that proves the design.

**Do not add a reverse proxy "while we are here".** nginx in front of plantz solves nothing
this sub-PRD needs and adds a second place where routing can break.

## 5. Definition of Done

- [ ] A tunnel is running on terry and survives a reboot.
- [ ] The phone reaches plantz over mobile data, with WiFi off.
- [ ] A device not enrolled in the tunnel cannot reach plantz from outside the LAN.
- [ ] No port on terry is forwarded from the router.
- [ ] The setup is documented in `homelab-root`.
- [ ] The plantz README no longer promises a publicly available server, and says what was
      done instead.

## 6. Verification

Manual, by the operator. The loop reports these as a checklist rather than running them.

1. Phone, WiFi off, mobile data on, tunnel connected: plantz loads, a plant page opens, a
   photo displays.
2. Phone, WiFi off, tunnel disconnected: plantz does not load.
3. `ssh terry "systemctl status <tunnel service>"` shows it enabled and running.
4. Router admin page: no port forward to `192.168.178.27`.
5. `ssh terry "reboot"`, wait, then repeat step 1.

## 7. Risks

| Risk | Mitigation |
|------|------------|
| A tunnel account is a third-party dependency for access to a personal app | Access degrades to LAN-only if it fails, which is the current state. Nothing is lost |
| The tunnel is set up and the negative test is skipped | The negative test is step 2 of the verification and the DoD names it separately |
| The tunnel does not come back after a reboot | Step 5 of the verification |
| Someone later adds a port forward "temporarily" | The README note and the documentation in homelab-root state why there is none |

## 8. Open Questions

- [ ] **Q-O2** recommendation applied: Tailscale.
- [ ] **Q-OPS2-1** Should the other terry services (uptime-kuma, adminer, nginx-ui) join
      the tunnel in the same session? Recommendation: yes for uptime-kuma, no for adminer.
      A database admin UI reachable from a phone is a liability with no upside.
