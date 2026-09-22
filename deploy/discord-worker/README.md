# RLCA Discord Worker Container

This directory contains the architecture-neutral, production-only dependency lock
used by `Dockerfile.bot`. The container is a fallback and CI validation target;
the production Google Compute Engine deployment uses the systemd package in
`deploy/gcp`.

Build and inspect the required production architecture:

```sh
docker build --platform linux/amd64 -f Dockerfile.bot \
  -t rlca-discord-worker:amd64 .
docker image inspect --format '{{.Architecture}}' \
  rlca-discord-worker:amd64
```

Expected architecture:

```text
amd64
```

The Compose fallback consumes exactly the four values documented in `.env.example`.
Never commit its `.env` file. The worker does not receive a database connection
string and communicates only through the authenticated website API.
