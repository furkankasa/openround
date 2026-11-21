# Code signing policy

Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org).

*Status: the project has applied to the SignPath Foundation open-source programme. Until it is accepted, releases are not signed.*

## What is signed

- `OpenRound-<version>-setup.exe` (NSIS installer) and the `OpenRound.exe` application inside it
- `OpenRound-<version>-portable.exe` (inside the portable zip)

Only these artifacts are signed. They are built by the [release workflow](../.github/workflows/release.yml) on GitHub-hosted runners from a published release of this public repository. No binary is built or uploaded by hand. The product name in the signed files is always *OpenRound*, and the product version matches the release tag.

Bundled third-party components (Electron, Clipper, the Archivo typeface) are open source and are not represented as OpenRound code.

## Team roles

| Role | Members |
|---|---|
| Authors (may change source code without further review) | [@furkankasa](https://github.com/furkankasa) |
| Reviewers (review every change from outside contributors) | [@furkankasa](https://github.com/furkankasa) |
| Approvers (approve every signing request) | [@furkankasa](https://github.com/furkankasa) |

Every change from outside contributors is reviewed in a pull request before it is merged. Every team member uses multi-factor authentication for GitHub and SignPath.

## Privacy

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it. All calculations run locally, and project files are saved only where the user chooses. The bundled components (Electron, Clipper, Archivo) do not collect or send data.

## Install and uninstall

The installer adds Start menu and desktop shortcuts for the current user and registers a standard uninstaller (*Settings → Apps → Installed apps → OpenRound → Uninstall*). The portable version writes nothing to the system. OpenRound does not change system settings.

## Before signing

Until releases are signed, Windows SmartScreen may show "Windows protected your PC" on first run (choose *More info → Run anyway*). The [web version](https://furkankasa.github.io/openround/) needs no installation.
