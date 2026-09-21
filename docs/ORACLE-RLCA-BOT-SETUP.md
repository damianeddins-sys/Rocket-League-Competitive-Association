# Final Oracle RLCA Bot Setup

Do not perform these steps until the preparation report supplies the reviewed
40-character worker commit SHA. No Oracle resource is required before that point.

Oracle references:

- [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Arm-Based Compute](https://docs.oracle.com/en-us/iaas/Content/Compute/References/arm.htm)
- [Creating an Instance and providing cloud-init user data](https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/launchinginstance.htm)
- [OCI CLI `--user-data-file`](https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/compute/instance/launch.html)

Oracle documents `VM.Standard.A1.Flex` as an Arm-based Always Free-eligible shape
with flexible OCPU and memory allocation. Capacity varies by home region. Always
Free instances have no uptime SLA and can be reclaimed under Oracle's idle-resource
policy, so this is a free host rather than a guarantee of uninterrupted service.

## 1. Prepare the reviewed cloud-init file

From a clean checkout of the reviewed revision, replace the one commit placeholder:

```sh
REVIEWED_SHA="<REVIEWED_COMMIT_SHA_FROM_PREPARATION_REPORT>"
test "${#REVIEWED_SHA}" -eq 40
sed "s/__RLCA_REVIEWED_COMMIT_SHA__/${REVIEWED_SHA}/" \
  deploy/oracle/cloud-init.yaml > /tmp/rlca-cloud-init.yaml
```

Confirm `/tmp/rlca-cloud-init.yaml` contains no Discord token, worker secret,
database URL, password, or other credential.

## 2. Create the VM in Oracle Console

1. Use the OCI account's **home region** and an availability domain with available
   Always Free Ampere capacity.
2. Create one Compute instance using **VM.Standard.A1.Flex**.
3. Allocate **1 OCPU and 4 GB RAM** initially.
4. Select an Always Free-eligible **Ubuntu 24.04 LTS Arm64** image.
5. Use a public subnet with outbound internet access. Do not open an application
   port; the worker initiates Discord Gateway and HTTPS connections.
6. Add only the operator's SSH public key. Restrict inbound SSH to the operator's
   IP where practical.
7. Under advanced options, upload `/tmp/rlca-cloud-init.yaml` as the initialization
   script/user data. Oracle Console performs the required encoding.
8. Create the instance.

Cloud-init automatically installs the pinned Node.js Arm64 runtime, creates the
non-root `rlca` user, checks out the exact reviewed commit, installs production
dependencies, validates worker syntax, installs and enables systemd, and records
the deployed revision. It intentionally does not contain secrets and therefore
does not start the Gateway yet.

## 3. Perform the one final secure setup

After the instance reports Running and cloud-init has completed, connect once using
SSH and run:

```sh
sudo /usr/local/sbin/finalize-discord-worker
```

The command securely prompts for only:

- Discord bot token
- Discord guild ID
- RLCA backend URL (accept the production default)
- the existing Vercel `DISCORD_WORKER_SECRET`

Input is not echoed. The script writes `/etc/rlca/discord-worker.env` as
`root:root` mode `0600`, validates the Discord identity and guild, verifies the
matching worker secret and live database through the website preflight endpoint,
rebuilds production dependencies, starts systemd, and waits for real Gateway health.
It exits nonzero unless the Gateway, guild, commands, applications storage, staff
role-sync storage, database, and uptime checks all pass.

## 4. Final verification

The finalizer prints the non-sensitive health report. Confirm Discord visibly shows
the RLCA bot ONLINE, then invoke:

```text
/health
/help
/apply
/applications
/application
/standings
/stats
```

Run the prepared recovery tests:

```sh
sudo systemctl restart rlca-discord-worker
rlca-discord-worker-status

sudo systemctl kill --signal=SIGKILL rlca-discord-worker
sleep 15
rlca-discord-worker-status

sudo reboot
```

After the reboot, reconnect only to run:

```sh
rlca-discord-worker-status
sudo journalctl -u rlca-discord-worker -n 100 --no-pager
```

Completion requires the service to be active, a fresh backend heartbeat, the
configured guild connected, Discord showing ONLINE, and the real commands working.
Registration alone is not acceptance.
