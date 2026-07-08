# QuantumLanguage Backend

Remote execution API that powers the QuantumLanguage web IDE. It accepts source
code from the frontend, runs it through the `qrun` compiler/interpreter, and
returns the result as JSON.

Expected folder layout (monorepo):

```
QuantumLanguage/
├── backend/     (this project)
├── compiler/    # C++ source; build.bat / build-fast.bat produce qrun.exe here
└── frontend/
```

`resolveQrunPath()` looks for the built binary at `../compiler/qrun.exe` and
`../compiler/build/qrun.exe` relative to this folder, or wherever `QRUN_PATH`
points.

## Requirements

- Node.js 18+
- A built `qrun` executable from the QuantumLanguage compiler (optional — see
  [Demo mode](#demo-mode) below if you don't have one yet)

## Setup

```bash
npm install
cp .env.example .env
npm run dev   # nodemon, restarts on file changes
# or
npm start     # plain node
```

The server listens on `PORT` (default `5000`).

## Configuration

All configuration is via environment variables (see `.env.example`):

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `5000` | HTTP port |
| `NODE_ENV` | `development` | Environment name, echoed by `/api/health` |
| `ALLOWED_ORIGINS` | *(empty = allow all)* | Comma-separated list of allowed CORS origins |
| `QRUN_PATH` | *(auto-detected)* | Absolute path to the `qrun` executable |
| `EXEC_TIMEOUT_MS` | `10000` | Kill a running program after this many ms |
| `MAX_CODE_LENGTH` | `20000` | Reject submissions with more characters than this |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window for `/api/execute` |
| `RATE_LIMIT_MAX` | `20` | Max requests per window per IP |

If `QRUN_PATH` isn't set, the server looks for `qrun.exe`/`qrun.bat` in, in order:
the path from `QRUN_PATH`, `../QuantumLanguage/`, `../QuantumLanguage/build/`,
and the backend folder itself.

## API

### `GET /api/health`

```json
{ "status": "ok", "qrunAvailable": true, "environment": "development" }
```

### `POST /api/execute`

Request body:

```json
{ "ext": ".sa", "code": "print(\"hello\");" }
```

`ext` must be one of `.sa`, `.js`, `.py`, `.cpp`, `.c`. `code` is the raw source text
(capped at `MAX_CODE_LENGTH` characters).

Response:

```json
{
  "success": true,
  "hasWarnings": false,
  "output": "hello",
  "error": null,
  "compiledOutput": "hello",
  "compilerError": null
}
```

On failure, `success` is `false` and `error`/`compilerError` describe the
problem (syntax error, execution timeout, missing compiler, etc). This
endpoint is rate-limited per IP via `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX`.

## Demo mode

If `qrun` hasn't been built yet, the two sample programs shipped in the
frontend IDE (the `SecureServer`/`socket` example and the
`checkSimilarity`/`levenshtein` example) still produce correct output — the
server computes them directly instead of shelling out. Everything else
requires a real `qrun` binary and returns a 500 explaining how to configure
`QRUN_PATH`.

## Security notes

This endpoint executes arbitrary submitted code via `execFile`. Current
mitigations: per-request execution timeout, output size cap, request body
size cap, source length cap, and IP-based rate limiting. There is **no**
process sandboxing (no container, no seccomp, no resource/network isolation)
beyond what `qrun` itself does — do not expose this service to the public
internet without adding one (e.g. run `qrun` inside a locked-down container
or VM with no network access and a CPU/memory ceiling).
