# Arbeitsprotokoll plantz-Programm

Zeitlicher Ablauf der Umsetzung des Programms aus `backlog.md`. Die Zeitstempel stammen
aus den Commits, sind also nachprüfbar mit
`git log --format='%ad %h %s' --date=format:'%Y-%m-%d %H:%M'`.

**Zeitraum:** 2026-08-07 18:30 bis 2026-08-08 13:39, also rund 19 Stunden Kalenderzeit
verteilt auf elf Loop-Durchläufe.

**Ergebnis:** 12 von 15 Sub-PRDs abgeschlossen, eines halb, zwei offen.

---

## Tag 1, 2026-08-07

| Uhrzeit | Sub-PRD | Was passiert ist |
|---------|---------|------------------|
| 18:30 | DEL-01 | Verbindungspool statt Verbindung pro Abfrage, Migrations-Runner beim Start. Acht Handler von `end()` auf `release()` umgestellt. Commit `7b456e6` |
| 18:44 | DEL-02 | Vitest eingerichtet, `BaseHeadline.test.ts` lief nie (Importpfad aus der Zeit vor Nuxt 4). Alle 98 Lint-Fehler beseitigt. Commit `ee865c9` |
| 18:59 | DEL-03 | Als blockiert eingetragen: kein SSH-Key auf dem Gitea-Konto, Port 222 statt 22, kein GitHub-Token. Commit `c2ccf3d` |
| 19:30 | DEL-03 | Nach deiner Rückmeldung gelöst: Key registriert, `gitea`-Remote angelegt, Push-Mirror zu GitHub. Round-Trip nach 5 s bestätigt. Commit `5d22956` |
| 19:32 | DEL-04 | Gitea-Actions-Pipeline. Commit `bde94bb` |
| 19:41 | DEL-04 | Erster Lauf rot: 806.861 Lint-Fehler aus `.pnpm-store` im Workspace. Commit `092bbcb` |
| 19:46 | DEL-04 | Zweiter Lauf rot: Heap-Limit 1,4 GB auf der 2,8-GB-VM. Auf 2 GB angehoben. Commit `d271885` |
| 20:09 | DEL-05 | Deploy nach terry über `docker save` per SSH statt Registry-Pull, nach deiner Entscheidung. `deploy.sh` gelöscht. Commits `ff0de15`, `873c42e` |
| 20:19 | DEL-04/05 | Registry-Login: der automatische `GITEA_TOKEN` wird abgelehnt, Personal Access Token als Secret. Commit `c561a2a` |
| ~20:30 | DEL-04/05 | Erster vollständiger Durchlauf auf `main` grün, terry läuft das gebaute Image |
| 21:12 | CARE-01 | Pflege-Ereignisse: Migration 005, zwei Endpunkte, `useCare()`, Pflegeknöpfe ohne Modal. Commit `0c4287d` |
| 23:57 | CARE-02 | Erinnerungen von Ende zu Ende. Migration 006, fünf Endpunkte, Wiederholung ab Abschlusszeitpunkt. Commit `4bd3e43` |

## Tag 2, 2026-08-08

| Uhrzeit | Sub-PRD | Was passiert ist |
|---------|---------|------------------|
| 07:39 | CARE-03 | Status überhaupt änderbar gemacht, jede Änderung wird protokolliert. Migration 008, ein einziger Schreibweg. `$5`-Lücke im PUT beseitigt. Commit `c97c86c` |
| 12:17 | CARE-04 | Gießintervalle und Überfälligkeit. Migration 007, eine Definition mit drei Zugängen. PUT schreibt nur noch Felder, die im Body stehen. Commit `64a0a5a` |
| 12:31 | INS-01 | `/metrics` mit 22 Metriken und 60-s-Sampler. Migration 009. Commit `25f2a2a` |
| 12:33 | — | Merge nach `main`, Pipeline grün, terry bekommt CARE und INS-01. Merge `2b21f89` |
| 12:50 | INS-02 | Prometheus-Job auf cerf. Commit `7955046` in `homelab-root` |
| 12:51 | INS-02 | Status eingetragen. Commit `19ef133` |
| 13:32 | INS-03 | Grafana-Board `Service: Plantz`, sechs Bänder, 17 Panels. Commit `1d63d62` in `homelab-root`, Status `d76866b` |
| 13:39 | OPS-03 | Repository-Hälfte: OpenRouter-Schlüssel aus dem Client-Bundle. Commit `e6a42cf` |
| ~13:45 | — | Loop gestoppt: die drei verbliebenen OPS-Punkte brauchen dich |

---

## Stand je Sub-PRD

| # | ID | Titel | Status |
|---|-----|-------|--------|
| 1 | DEL-01 | Data Access & Migration Runner | done |
| 2 | DEL-02 | Test Runner & Lint Gate | done |
| 3 | DEL-03 | Gitea as Origin, GitHub as Mirror | done |
| 4 | DEL-04 | CI Pipeline | done |
| 5 | DEL-05 | Automated Deploy to terry | done |
| 6 | CARE-01 | Care Events | done |
| 7 | CARE-02 | Reminders End to End | done |
| 8 | CARE-03 | Plant Status History | done |
| 9 | CARE-04 | Watering Due Dates | done |
| 10 | INS-01 | Metrics Endpoint & Sampler | done |
| 11 | INS-02 | Prometheus Job on cerf | done |
| 12 | INS-03 | Grafana Board | done |
| 13 | OPS-01 | Backup Postgres & MinIO | offen, braucht USB-Platte |
| 14 | OPS-02 | Remote Access via Tunnel | offen, braucht Tailscale-Login |
| 15 | OPS-03 | Credential Rotation | halb: Repo fertig, terry offen |

Drei Epics vollständig: DELIVERY, CARE, INSIGHT.

---

## Was unterwegs nicht gestimmt hat

Sieben Annahmen in den PRDs oder im Bestand haben sich als falsch erwiesen. Alle sind in
den jeweiligen Sub-PRDs als `D-xx` dokumentiert.

| Fund | Wo | Auswirkung |
|------|----|-----------| 
| Gitea-SSH läuft auf Port 222, nicht 22 | DEL-03, D-D14 | Auf 22 antwortet der sshd der VM. Jeder Push wäre am falschen Dienst gelandet |
| Kein SSH-Key auf dem Gitea-Konto | DEL-03, D-D15 | Das PRD hielt den `gitea`-Alias für ausreichend. Der ist ein Shell-Login, kein Git-Zugang |
| `.pnpm-store` landet im Workspace | DEL-04, D-D22 | 806.861 Lint-Fehler im ersten CI-Lauf |
| Node deckelt den Heap bei 1,4 GB | DEL-04, D-D23 | Build stirbt auf der 2,8-GB-VM mit fatalem OOM |
| Lint war nie grün | DEL-02, D-D10 | Abschnitt 3.2 sagte „Lint already works". Es waren 98 Fehler |
| `BaseHeadline.test.ts` konnte nie gelaufen sein | DEL-02, D-D11 | Importpfad von vor dem Nuxt-4-Umzug, und die Zusicherung ging auch bei fehlendem Element durch |
| PUT zerstörte Daten bei Teil-Anfragen | CARE-04, D-C9 | `{"watering_interval_days":7}` schrieb NULL über den Namen, Anweisung scheiterte, 404 ohne Speicherung |
| OpenRouter-Schlüssel im Client-Bundle | OPS-03 | Unter `runtimeConfig.public`, also für jeden Besucher lesbar. Nur serverseitig genutzt |

---

## Was noch aussteht und warum

| Sub-PRD | Fehlt | Warum nicht automatisierbar |
|---------|-------|------------------------------|
| OPS-01 | restic auf USB-Platte, ein bewiesenes Restore | Die Platte muss physisch an terry. Die Passphrase gehört nicht auf terry |
| OPS-02 | Tailscale einrichten | Browser-Login bei einem fremden Dienst, Geräteaufnahme am Telefon. PRD steht auf `loopable: false` |
| OPS-03 | Passwörter auf terry rotieren | Stoppt App und Datenbank. Laut PRD gehört OPS-01 davor: ohne geprüftes Backup ist ein falsches Passwort ein Risiko statt einer Unannehmlichkeit |

Zwei Punkte, die ich nicht als erledigt behaupte, obwohl sie im DoD stehen:

- **DEL-05:** „Eine kaputte Migration lässt den Container aussteigen und den Deploy rot
  werden." Die Einzelteile sind belegt, die Runde am Stück nicht — sie nimmt plantz für die
  Dauer des Tests aus dem Betrieb.
- **INS-01:** Das Backfill der Fotogrößen über bestehende MinIO-Objekte. Das Script gibt es
  (`pnpm db:backfill-photo-sizes`), es gehört einmal gegen terry ausgeführt.

Ein fremder Blocker, der das Monitoring-Playbook betrifft: der AdGuard-Collector auf cerf
scheitert mit `HTTP Error 401: Unauthorized`. Dadurch endet jeder Playbook-Lauf mit
`failed=1` und die Handler kommen nicht mehr dran. Dokumentiert als `B-I1` in INS-02.
