# Final Google Cloud RLCA Bot Setup

Do not perform these steps until the preparation report supplies the reviewed
40-character commit SHA and confirms the deployment package is ready.

Current official references:

- [Google Cloud Free Tier limits](https://docs.cloud.google.com/free/docs/free-cloud-features)
- [Create a VM from a public image](https://docs.cloud.google.com/compute/docs/instances/create-vm-from-public-image)
- [Add SSH keys to VMs](https://docs.cloud.google.com/compute/docs/connect/add-ssh-keys)
- [GCE cloud-init `user-data` metadata](https://docs.cloud-init.io/en/latest/reference/datasources/gce.html)
- [External IPv4 pricing](https://cloud.google.com/vpc/network-pricing)

An eligible adult account holder must own the Google Cloud account, accept its
terms, complete any age/identity requirements, and control the billing account.
Do not bypass account or age requirements.

## 1. Prepare the reviewed cloud-init value

From a clean checkout of the reviewed revision:

```sh
REVIEWED_SHA="<REVIEWED_COMMIT_SHA_FROM_PREPARATION_REPORT>"
test "${#REVIEWED_SHA}" -eq 40
sed "s/__RLCA_REVIEWED_COMMIT_SHA__/${REVIEWED_SHA}/" \
  deploy/gcp/cloud-init.yaml > /tmp/rlca-gcp-cloud-init.yaml
```

Confirm the rendered file contains no token, password, worker secret, or database
URL.

## 2. Create the VM

1. Open [Google Cloud Console](https://console.cloud.google.com/compute/instances).
2. Select or create the adult account holder's project and attach its billing
   account. Enable the **Compute Engine API** only.
3. Select **Create instance**.
4. Name it `rlca-discord-worker`.
5. Choose a Free Tier-supported region: `us-central1` is recommended; `us-west1`
   and `us-east1` are also currently eligible. Choose any available zone in that
   region.
6. Select **General purpose → E2 → e2-micro**. Use a regular non-Spot,
   non-preemptible VM. Do not add GPUs or other accelerators.
7. Select **Ubuntu 24.04 LTS Minimal, x86/64 (AMD64)**.
8. Change the boot disk type to **Standard persistent disk (`pd-standard`)** and
   keep total standard persistent disk allocation at or below **30 GB**. Do not
   enable snapshots, regional disks, SSD, balanced disk, or Hyperdisk.
9. Use the default VPC or one basic VPC/subnet. Assign one **ephemeral external
   IPv4 address** so the worker can reach GitHub, Discord, and Vercel. Do not
   reserve a static address. Do not allow HTTP or HTTPS ingress. Restrict SSH
   ingress to the operator's public IP where practical.
10. Add the operator's existing public SSH key through instance metadata. Never
    upload or paste the private key.
11. Under **Advanced options → Management → Metadata**, add custom metadata:
    - Key: `user-data`
    - Value: the complete contents of `/tmp/rlca-gcp-cloud-init.yaml`

    Use the `user-data` metadata key, not the startup-script field; Ubuntu
    cloud-init reads that key through its GCE datasource.
12. Review the estimated monthly cost carefully, then create exactly one VM.

### Free Tier boundary

Google currently includes one non-preemptible `e2-micro` VM-month across
`us-west1`, `us-central1`, and `us-east1`, 30 GB-months of `pd-standard`, and
1 GB of eligible North American outbound transfer. The limits are combined per
billing account and can change.

An attached external IPv4 address is currently billed separately at approximately
`$0.005/hour` after its very small free allowance. Therefore this required
public-IPv4 topology is **not guaranteed to have a $0 bill**, even when compute
and disk remain within Free Tier. If absolutely no paid SKU is acceptable, stop
before creating the VM. Budget alerts notify but do not cap charges.

## 3. Complete the one manual setup step

Wait for cloud-init to finish, then open one SSH session to the VM and run:

```sh
sudo /usr/local/sbin/finalize-discord-worker
```

Enter only the four prompted production values:

- Discord bot token
- Discord guild ID
- RLCA backend URL (accept the production default)
- existing production Discord worker secret

Input is not echoed. Do not place these values in chat, cloud-init, Git, command
arguments, or screenshots.

## 4. Verify

The finalizer exits successfully only after the database, Discord identity, guild,
commands, applications storage, staff-sync storage, Gateway, and uptime checks pass.
Then run:

```sh
cat /etc/rlca/worker-revision
sudo systemctl is-enabled rlca-discord-worker
sudo systemctl is-active rlca-discord-worker
rlca-discord-worker-status
sudo journalctl -u rlca-discord-worker -n 100 --no-pager
```

Confirm Discord visibly shows the RLCA bot ONLINE and invoke `/health`, `/help`,
`/apply`, `/applications`, `/application`, `/player`, `/team`, `/roster`, `/mmr`,
`/standings`, and `/stats` using legitimate production options.
