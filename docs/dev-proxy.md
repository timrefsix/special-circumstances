# Traefik Dev Proxy Workflow

This optional setup lets multiple worktrees run their dev servers on the same port while routing requests by hostname. It relies on a shared Traefik reverse proxy container and per-worktree dev containers.

## One-time proxy bootstrap

1. Change to the parent workspaces directory (the one containing the different worktrees).
2. Start the Traefik proxy defined at `../docker-compose.yml`:

   ```sh
   docker compose up -d
   ```

   Traefik listens on port 80 for app traffic and exposes its dashboard at <http://localhost:8080>. The stack creates/reuses a Docker network named `devproxy`.

## Running this worktree in a container

From the `special-circumstances-scripting` folder run:

```sh
docker compose up
```

The compose file will:

- install dependencies inside a Node 20 container
- start `npm run dev` bound to all interfaces on port 5173
- register the service with Traefik using the hostname `special-circumstances-scripting.localhost`

Once the container is healthy, open <http://special-circumstances-scripting.localhost> to reach the dev server. The `.localhost` suffix resolves to `127.0.0.1` automatically, so no `/etc/hosts` edits are required.

## Multiple worktrees

For another worktree:

1. Copy `docker-compose.yml` and adjust:
   - `VITE_DEV_HOST`
   - the Traefik labels (`routers` / `services` names and host rule)
2. Run `docker compose up` from that folder.
3. Visit the matching `*.localhost` URL.

Traefik’s proxy keeps port 80 constant even though each dev container still listens on its own internal port.

## Stopping containers

- `docker compose down` (in a worktree) stops its dev container.
- `docker compose down` (in the parent directory) stops Traefik.

## Notes

- File watching inside the container uses polling (`CHOKIDAR_USEPOLLING=1`), which trades a bit of CPU for consistent updates when files are edited on the host.
- The per-worktree compose file mounts `node_modules` into a named volume so container installs do not pollute the host tree. Remove `node_modules_cache` via `docker volume rm` if you need a clean slate.

## Playwright tests against Traefik

By default `npm run test:e2e` starts its own Vite server on `127.0.0.1:4173`. To run the Playwright suite against the container managed by Traefik instead, export these variables before executing the tests:

```sh
export PLAYWRIGHT_SKIP_WEBSERVER=1
export PLAYWRIGHT_BASE_URL=http://special-circumstances-scripting.localhost

npm run test:e2e
```

- `PLAYWRIGHT_SKIP_WEBSERVER=1` tells Playwright not to spawn its own dev server.
- `PLAYWRIGHT_BASE_URL` points the tests to the Traefik host (port 80).

If you bind a different hostname in another worktree, adjust the URL accordingly.
