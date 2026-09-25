# Rules: SheDrive 2.0

## TypeScript Strict Flags
- `noImplicitAny: true`
- `strictNullChecks: true`
- `strict: true`

## Development Rules
- 0% crash tolerance.
- No direct client API keys; all secrets must go through the backend or secure environment variables.
- No native Gradle hacks; rely on Expo managed workflow where possible.
- No timer-based polling loops; use event-driven or socket-based updates.
