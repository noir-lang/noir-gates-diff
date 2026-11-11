# Noir Gates Diff Reporter

- Easily compare the circuit sizes and Brillig bytecode sizes of your Noir programs automatically on each of your Pull Requests!

## Getting started

### Automatically generate a gates report diff on every PR

Add a workflow (`.github/workflows/noir-gates-diff.yml`):

```yaml
name: Report gates diff

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  compare_gates_reports:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      # lets the action list and download the reports uploaded by earlier runs (needed on private repositories)
      actions: read
      # lets the sticky comment step comment on the pull request
      pull-requests: write
    steps:
      - uses: actions/checkout@v7

      - name: Install Nargo
        uses: noir-lang/noirup@v0.1.5
        with:
          toolchain: 1.0.0

      # Also install `bb` (Barretenberg) here: ACIR circuit sizes are measured with `bb gates`.

      # Placeholder: replace this with your own steps writing a gates report (see "Report format" below)
      # to a file named gates_report.json.
      - name: Generate gates report
        run: ./scripts/build-gates-report.sh # <- your own script; the report file name should be unique in your repository!

      - name: Compare gates reports
        id: gates_diff
        uses: noir-lang/noir-gates-diff@4fbb881edf2977d43f44b1a877c235dda9e6e7ec # main (no release has been tagged yet)
        with:
          report: gates_report.json
          summaryQuantile: 0.9 # only display the 10% most significant circuit size diffs in the summary (defaults to 20%)

      - name: Add gates diff to sticky comment
        # pull requests from forks get a read-only token, which cannot comment
        if: github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository
        uses: marocchino/sticky-pull-request-comment@v3
        with:
          # delete the comment in case changes no longer impact circuit sizes
          delete: ${{ !steps.gates_diff.outputs.markdown }}
          message: ${{ steps.gates_diff.outputs.markdown }}
```

> :information_source: **An error will appear at first run!**<br/>
> 🔴 <em>**Error:** No workflow run found with an artifact named "main.gates_report.json"</em><br/>
> As the action is expecting a comparative file stored on the base branch and cannot find it (because the action never ran on the target branch and thus has never uploaded any gates report)

---

## How it works

On every run, the action uploads the report file as an artifact named `<head>.<report>` (for example `my-branch.gates_report.json`), so that later runs can use it as a reference. Any `/` or `\` in the branch name is replaced with `-`.

On `pull_request` events, the action then downloads the most recent unexpired artifact named `<base>.<report>` from the repository (for example `main.gates_report.json`, uploaded by a run on the base branch), compares it with the freshly generated report, and stores the results in the action's outputs as shell and as markdown. On any other event it stops after the upload, so the workflow also needs to run on pushes to the base branch to keep the reference report up to date.

You can then do whatever you want with the results!

> **Our recommendation:** Automatically submit a sticky comment displaying the gates diff!

---

## Report format

The report is a JSON file in the format produced by `nargo info --json`, with a `circuit_size` added to every ACIR function:

```json
{
  "programs": [
    {
      "package_name": "my_program",
      "functions": [{ "name": "main", "opcodes": 1234, "circuit_size": 5678 }],
      "unconstrained_functions": [{ "name": "main", "opcodes": 42 }]
    }
  ]
}
```

- Every program needs a `package_name`.
- Every entry in `functions` needs a `name`, an `opcodes` count (`acir_opcodes` is accepted in its place, as reported by `bb gates`) and a `circuit_size`.
- Every entry in `unconstrained_functions` needs a `name` and an `opcodes` count.
- `functions` and `unconstrained_functions` may be omitted or empty.
- Programs are matched by `package_name`, and only the first function in each list is compared.
- A top-level `contracts` list is accepted but is not included in the diff.

A report missing any required field fails the action, for example with `Circuit report is invalid`.

Circuit sizes come from Barretenberg rather than Nargo: run `bb gates -b <compiled program>` on each compiled program and combine the results into a report. The raw `bb gates` output has neither a `package_name` nor function `name`s, so the script building the report must add them (the scripts linked below set each function's `name` to `"main"`). For a Brillig report (`brillig_report: true`), `nargo info --force-brillig --json` can be used directly once its `functions` lists are emptied, for example with `jq '.programs[].functions = []'`. [noir-lang/noir-library-starter](https://github.com/noir-lang/noir-library-starter) has a complete benchmarking workflow and scripts generating both reports.

---

## Options

### `report` _{string}_

The name of the file, in the workspace root, where the gates report has been written. It is also part of the name of the uploaded artifact, so it must not contain any of the characters that artifact names reject: `/ \ " : < > | * ?`.
Only necessary when generating multiple gates reports on the same repository.

⚠️ Make sure this file uniquely identifies a gates report, to avoid messing up with a gates report of another workflow on the same repository!

_Defaults to: `gates_report.json`_

### `base` _{string}_

The gates diff reference branch name, used to fetch the previous gates report to compare the freshly generated gates report to.

_Defaults to: `${{ github.base_ref || github.ref_name }}`_

### `head` _{string}_

The gates diff target branch name, used to upload the freshly generated gates report.

_Defaults to: `${{ github.head_ref || github.ref_name }}`_

### `token` _{string}_

The GitHub token allowing the action to list and download the gates reports uploaded by earlier runs. You should not need to customize this, as the action already has access to the default GitHub Actions token. If the `GITHUB_TOKEN` environment variable is set, it is used instead of this input.

_Defaults to: `${{ github.token }}`_

### `header` _{string}_

The top section displayed in the markdown output. Can be used to identify multiple gates diffs in the same PR or add metadata/information to the markdown output.

_Defaults to:_

```markdown
# Changes to circuit sizes
```

### `summaryQuantile` _{number}_

The quantile threshold used to select the most significant diffs displayed in the summary top section, by relative change in circuit size (or in Brillig opcodes when `brillig_report` is `true`).

_Defaults to: `0.8`_

### `brillig_report` _{boolean}_

Whether to compare the Brillig opcodes of `unconstrained_functions` instead of the ACIR opcodes and circuit sizes of `functions`.

_Defaults to: `false`_

### `brillig_report_bytes` _{boolean}_

Whether the Brillig report contains bytecode sizes in bytes rather than opcode counts. This only changes the column headings of the output.

_Defaults to: `false`_

## Outputs

### `shell`

The gates diff between the base gates report and the freshly generated gates report, specifically formatted for shell display.

### `markdown`

The gates diff between the base gates report and the freshly generated gates report, specifically formatted for markdown display.

Both outputs are empty when the reports show no difference, and on events other than `pull_request`.

## ⚠️ Known limitations

> **Library gates reports**<br/>
> Nargo does not compile library crates into circuits. To measure a library, report on binary packages or on functions exported with `nargo export` that call it.

This repository is maintained independently from [Nargo](https://github.com/noir-lang/noir) and may not work as expected with all versions of `nargo`.

## Credits

This action is derived from [Rubilmax/foundry-gas-diff](https://github.com/Rubilmax/foundry-gas-diff) by Romain Milon, released under the MIT license.
