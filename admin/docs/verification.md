# Verification and release status (historical)

This record predates the native Android migration. Use the [current instructions](../../README.md) for the three standalone apps.

Implementation was verified locally on Windows with Node 24.19, PHP 8.3.20, MySQL 8.0.30, Chrome and Blender 5.1.

## Passed

- TypeScript strict type check for both apps and shared packages.
- Laravel test suite: 21 tests / 79 assertions, using an isolated in-memory SQLite database.
- Python worker validation tests: 6 tests.
- MySQL 8 migrations and demo seed on an isolated local instance.
- Expo customer and supplier Android, iOS and web JavaScript exports.
- Three.js viewer and Tailwind admin builds.
- Browser journey: customer login → part comparison → request → supplier login → quotation → customer acceptance.
- Browser 3D viewer rendering and step controls.
- Browser admin login and catalog rendering.
- Browser inventory editing, catalog-only assistant conversation and imported Blender GLB playback. All 5 browser scenarios passed.
- Docker Compose configuration validation; containers were not run.
- The documented setup command completed, and the development command started both Expo apps, Laravel and the simulation worker. All four HTTP service checks returned 200.
- Actual Blender generation of an animated conceptual GLB.
- Actual Laravel → authenticated Python worker → Blender → private storage → pending-review procedure flow.

Exporting JavaScript is not equivalent to testing an installed Android/iOS app.

## External / unverified

- Live AI provider: no user API key supplied, so provider calls were mocked in tests and catalog-only mode was exercised.
- Docker images/Redis/MinIO: configuration supplied; Docker daemon was unavailable. MySQL itself was tested natively.
- S3 adapter is installed and configured, but no real bucket credentials were supplied.
- No physical Android/iOS device or signed store binary was tested.
- No remote deployment, store publication, remote CI run or mechanically validated repair content.

## Dependency audit

Compatible npm fixes were applied. The selected SDK 54 dependency graph still reports **44 advisories (26 high, 18 moderate)** as of the local audit. Many are inherited through Expo/Metro/Jest/Tailwind build dependencies, including braces/micromatch, node-forge, PostCSS, sprintf-js and uuid. Some advisories cover all currently reported versions of the affected package. A forced audit fix proposes breaking Expo/React Native/Tailwind upgrades, so it was not applied blindly.

This is a tested local implementation, not a production-release certification. Re-run npm audit and composer audit, assess reachable exposure, update the native SDK/tooling together and repeat native/browser checks before release.

## Known scope limits

- The only authored sample assembly is a simplified brake assembly. Real repair correctness is not inferred from animation generation or a database approval flag.
- The admin dispatches the brake animation template. Additional templates are present as worker extension points.
- Notifications are persisted and shown in-app on screen refresh/focus; no OS push delivery.
- Offer acceptance closes a request but does not charge a customer, reserve inventory or create an order.
- Local demo catalog records are not verified OEM compatibility claims.
