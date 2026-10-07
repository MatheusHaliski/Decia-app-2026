# Backup and Git disaster recovery

## Purpose and scope

The scheduled Git backup provides a separate copy of the Work Station / DECIA
source repository's commits, branches, tags, and Git history. It is separate
from CI (testing) and CD (publishing the application).

It does **not** back up or restore Firebase, databases, uploads, user files,
Storage, secrets, environment variables, GitHub Secrets, service accounts,
external APIs, integration data, Trello, GitHub integrations, Slack, Jira, or
DECIA application data. No secrets or `.env` files are copied as part of this
workflow.

## Repositories

The repository checkout and its `origin` remote were inspected when this
workflow was added. The current source identity and default branch are:

- Source: `MatheusHaliski/Decia-app-2026`
- Default branch: `main`
- Backup destination: `MatheusHaliski/standard-users-listing-backup001`
- Backup SSH URL: `git@github.com:MatheusHaliski/standard-users-listing-backup001.git`

The source repository name differs from the originally proposed
`standard-users-listing`; use the source identity shown here unless the live
repository is renamed. No existing official backup destination was configured.

## Required credential setup

1. Create a dedicated Ed25519 key pair for this backup destination. For example:

   ```bash
   ssh-keygen -t ed25519 -C "workstation-repository-backup" -f workstation-backup-key -N ""
   ```

   The private key must be used only for this purpose. Do not commit either key
   file or share the private key. The workflow is non-interactive, so its
   private key must not require a passphrase.
2. In the **backup repository**, open
   **Settings → Deploy keys → Add deploy key**. Add the contents of
   `workstation-backup-key.pub` and enable write access. This key must be
   specific to this backup purpose; do not use a personal GitHub password.
3. In the **source repository**, open
   **Settings → Secrets and variables → Actions → New repository secret**.
   Name the secret `BACKUP_SSH_KEY` and set its value to the private key
   (`workstation-backup-key`). Never print or commit it.
4. Remove the local key files securely after configuring both repositories, or
   store them only in an approved secrets manager.

The workflow has only `contents: read` permission on the source. Writes to the
backup repository use this dedicated deploy key. SSH host keys are obtained
from GitHub's metadata endpoint over HTTPS and strict host-key checking remains
enabled.

## Automatic and manual execution

The workflow is **Work Station Repository Backup**:

- On every push to `main`.
- Daily at `03:00 UTC` (`schedule` cron expressions in GitHub Actions use UTC).
- Manually through **GitHub → Actions → Work Station Repository Backup → Run
  workflow**.

Only one backup run is allowed at a time; an in-progress run is not cancelled
when another is requested. Each run fetches all source branches and tags,
pushes refs individually, and checks remote ref object IDs afterward. It does
not prune refs or use mirror/force pushes. A deleted source ref therefore
remains in the backup. A non-fast-forward branch update or conflicting tag
causes the run to fail for investigation instead of silently rewriting the
backup.

## First-run checklist and verification

After creating the destination repository and configuring the deploy key and
secret:

1. Run the workflow manually from the default branch.
2. Confirm the run succeeds and its summary reports the expected repository,
   processed branches/tags, and `Remote verification: PASSED`.
3. On a trusted machine with access, verify refs directly:

   ```bash
   git ls-remote --heads git@github.com:MatheusHaliski/standard-users-listing-backup001.git
   git ls-remote --tags git@github.com:MatheusHaliski/standard-users-listing-backup001.git
   ```

4. Confirm `refs/heads/main` appears. The workflow itself fails if `main` is
   missing or if any source branch/tag it processed does not match the remote.

The implementation does not claim a real backup has run until GitHub Actions
has executed it with the configured secret and destination access.

## Git repository recovery

If the source repository is unavailable:

1. Open the backup repository and verify the required branches and tags are
   present.
2. Clone the backup:

   ```bash
   git clone git@github.com:MatheusHaliski/standard-users-listing-backup001.git workstation-restored
   cd workstation-restored
   ```

3. Inspect refs and history before restoring service:

   ```bash
   git branch --all
   git tag --list
   git log --oneline --decorate -n 20
   ```

4. When a replacement source repository is ready, point `origin` at it and push
   only after reviewing the destination and recovery plan:

   ```bash
   git remote set-url origin git@github.com:MatheusHaliski/Decia-app-2026.git
   ```

This Git clone recovers repository content and history only. It does not restore
application data, Firebase resources, databases, uploads, environment
variables, or secrets; recover those independently from their respective
backups and secret-management systems.

## Future resilience improvements

A Git Bundle can provide an additional portable snapshot, for example
`git bundle create workstation.bundle --all`, restorable with
`git clone workstation.bundle workstation-restored`. No permanent bundle
storage is configured by this workflow; do not store snapshots in this
repository as a substitute for independent retention.

A future design may retain dated bundles (for example
`workstation-2026-10-07.bundle`) in an independently managed storage service
with retention, access control, encryption, and periodic restore tests. That
external storage and retention policy are not part of this implementation.
