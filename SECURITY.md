# Security policy — Hoople lite

Hoople lite is a public-source prototype. **Do not submit real participant records, credentials, payment data, biometric identifiers, private event photos or other personal data** to the browser demo. `#play=` URLs contain client-readable experience details (including demo quiz/QR validation); they are not access-controlled public event URLs.

## Report a vulnerability privately

Please use GitHub's **private vulnerability reporting** feature on this repository if enabled. If unavailable, contact the repository owner through an existing private channel. Do not open a public issue containing an exploit, real credentials, personal data, or a live affected endpoint. Include affected revision, reproduction using dummy data, impact and suggested mitigation. Maintainers should acknowledge, triage, fix, test and coordinate disclosure before publication.

## Supported environments

The intended backend runtime is a supported Node.js LTS release: Node 24.22.1+ on the 24.x line or Node 26.12.1+ on the 26.x line. Prefer Node 24 for deployment compatibility. Keep npm package locks and the base operating-system image patched. PHP is **not part of this repository**; separate PHP workloads on shared infrastructure require their own security updates.

## Production gate

The API code and current browser editor are **not production-approved**. Before real customer usage, complete the checks in [docs/SECURITY_HARDENING.md](docs/SECURITY_HARDENING.md), independently verify authentication and tenant RLS, test backups/restores, provision secrets and deploy an actual server-authoritative event/participant backend. No payment, biometric, media-upload or trusted QR workflows are enabled here.
