# Backups and restore

## What is saved, and when

Every night at 02:30 Nepal time, and automatically before every update:

| Part | What's in it |
| --- | --- |
| Database | Bookings, payments, receipts, bills, credit notes, customers, enquiries, messages, reviews, guides, departures, staff accounts, settings |
| content | The published website content |
| uploads | All photos and videos uploaded in the admin |
| private | Travellers' documents, message attachments, trip photos, the receipt signature and stamp (all encrypted) |

**How long:** every night for 14 days, plus every Sunday for 13 weeks (about
3 months). Unchanged photos are shared between copies, so 3 months of backups
take little more space than one.

**Checked:** every database copy is read back after it is made. If it can't
be read, the backup stops with an error and an update won't start.

**Log:** `/srv/basecamp/backups/backup.log`, one line per night:

```
2026-11-07-204500 backup ok: database 2.7M, all backups 84M, disk free 93G
```

The hosting company's 4 included backups come on top of this. They save the
whole server, so they are good for "the server is broken". Make one about once a
week in their customer panel.

## The key you must keep

`ENCRYPTION_KEY` in `/srv/basecamp/.env` locks the travellers' documents,
details and messages, and the keys saved in the admin. **Keep a copy in your
password manager.** If the server is ever rebuilt, put the same key back,
otherwise the encrypted parts of a backup can't be read.

## Restore

List the backups:

```bash
bash /srv/basecamp/repo/deploy/restore.sh list
```

Put everything back from the newest backup:

```bash
sudo bash /srv/basecamp/repo/deploy/restore.sh all latest
```

Or from a particular one (a name from the list), or only the database, or only the files:

```bash
sudo bash /srv/basecamp/repo/deploy/restore.sh db 2026-11-07-204500
```

```bash
sudo bash /srv/basecamp/repo/deploy/restore.sh files 2026-11-07-204500
```

The restore asks you to type YES. It first makes a safety backup of how things
are right now, so a restore can always be undone. Then it stops the site for
about a minute and starts it again.

## Off-site copy (recommended)

A copy away from the server protects against problems with the server or the
hosting company. The backup copies itself to any storage rclone supports, and
can encrypt it on the way, so the storage company can't read it.

One example: a Hetzner Storage Box (from about €3.20 a month, Germany). Other
options are Backblaze B2, Cloudflare R2, Google Drive or another server.

1. Order the Storage Box and switch on SSH access in its settings.
2. On the server, as the basecamp user, run `rclone config`:
   - `n` new remote, name `offsite`, type `sftp`, host `uXXXXXX.your-storagebox.de`, port `23`, the user and password of the box.
   - `n` new remote, name `offsite-crypt`, type `crypt`, remote `offsite:basecamp`, and choose two long passwords (keep both in your password manager).
3. Add this line to `/srv/basecamp/.env`:

   ```
   BACKUP_REMOTE=offsite-crypt:
   ```

4. Test it once by hand:

   ```bash
   sudo -u basecamp bash /srv/basecamp/repo/deploy/backup.sh
   ```

   The last lines must say `off-site copy ok`.

To bring an off-site copy back to the server, copy it into
`/srv/basecamp/backups` with `rclone copy offsite-crypt:db /srv/basecamp/backups/db`,
then use `restore.sh` as above.
