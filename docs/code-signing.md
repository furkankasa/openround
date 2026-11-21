# Code signing policy

Windows downloads are built from tagged sources in this repository by `.github/workflows/release.yml` on GitHub-hosted runners. No binaries are built or uploaded by hand.

The project has applied for free code signing for open-source software from SignPath. Once it is accepted, release artifacts will be signed with: *Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org).*

| Role | Members |
|---|---|
| Committers and reviewers | [@furkankasa](https://github.com/furkankasa) |
| Approvers | [@furkankasa](https://github.com/furkankasa) |

- All maintainers use multi-factor authentication for GitHub and SignPath.
- Only artifacts built by the release workflow from a tagged commit are submitted for signing.
- **Privacy:** OpenRound does not collect or send any data. All calculations run locally. The application makes no network requests.

Until releases are signed, Windows SmartScreen may show "Windows protected your PC" on first run (choose *More info → Run anyway*). The web version at https://furkankasa.github.io/openround/ needs no installation and shows no warning.
