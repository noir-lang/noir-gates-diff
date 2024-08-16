import Zip from "adm-zip";
import * as fs from "fs";
import { dirname, resolve } from "path";

import * as artifact from "@actions/artifact";
import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";

import {
  formatBrilligRows,
  formatCircuitRows,
  formatMarkdownDiffNew,
  formatShellBrilligRows,
  formatShellCircuitRows,
  formatShellDiff,
  formatShellDiffBrillig,
} from "./format/program";
import { loadReports, computeProgramDiffs } from "./report";

const token = process.env.GITHUB_TOKEN || core.getInput("token");
const report = core.getInput("report");
const header = core.getInput("header");
const summaryQuantile = parseFloat(core.getInput("summaryQuantile"));
// const sortCriteria = core.getInput("sortCriteria").split(",");
// const sortOrders = core.getInput("sortOrders").split(",");
const baseBranch = core.getInput("base");
const headBranch = core.getInput("head");

const baseBranchEscaped = baseBranch.replace(/[/\\]/g, "-");
const baseReport = `${baseBranchEscaped}.${report}`;

const octokit = getOctokit(token);
const artifactClient = artifact.create();
const localReportPath = resolve(report);

const { owner, repo } = context.repo;
const repository = owner + "/" + repo;

let referenceContent: string;
let refCommitHash: string | undefined;

async function run() {
  // if (!isSortCriteriaValid(sortCriteria)) return;
  // if (!isSortOrdersValid(sortOrders)) return;

  try {
    // Upload the gates report to be used as a reference in later runs.
    await uploadArtifact();
  } catch (error) {
    return core.setFailed((error as Error).message);
  }

  // cannot use artifactClient because downloads are limited to uploads in the same workflow run
  // cf. https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts#downloading-or-deleting-artifacts
  if (context.eventName === "pull_request") {
    try {
      core.startGroup(
        `Searching artifact "${baseReport}" on repository "${repository}", on branch "${baseBranch}"`
      );

      let artifactId: number | null = null;
      // Artifacts are returned in most recent first order.
      for await (const res of octokit.paginate.iterator(octokit.rest.actions.listArtifactsForRepo, {
        owner,
        repo,
      })) {
        const artifact = res.data.find(
          (artifact) => !artifact.expired && artifact.name === baseReport
        );

        if (!artifact) {
          await new Promise((resolve) => setTimeout(resolve, 900)); // avoid reaching the API rate limit

          continue;
        }

        artifactId = artifact.id;
        refCommitHash = artifact.workflow_run?.head_sha;
        core.info(
          `Found artifact named "${baseReport}" with ID "${artifactId}" from commit "${refCommitHash}"`
        );
        break;
      }
      core.endGroup();

      if (artifactId) {
        core.startGroup(
          `Downloading artifact "${baseReport}" of repository "${repository}" with ID "${artifactId}"`
        );
        const res = await octokit.rest.actions.downloadArtifact({
          owner,
          repo,
          artifact_id: artifactId,
          archive_format: "zip",
        });

        const zip = new Zip(Buffer.from(res.data as ArrayBuffer));
        for (const entry of zip.getEntries()) {
          core.info(`Loading gas reports from "${entry.entryName}"`);
          referenceContent = zip.readAsText(entry);
        }
        core.endGroup();
      } else core.error(`No workflow run found with an artifact named "${baseReport}"`);
    } catch (error) {
      return core.setFailed((error as Error).message);
    }
  }

  try {
    core.startGroup("Load gas reports");
    core.info(`Loading gas reports from "${localReportPath}"`);
    const compareContent = fs.readFileSync(localReportPath, "utf8");
    referenceContent ??= compareContent; // if no source gas reports were loaded, defaults to the current gas reports

    core.info(`Mapping compared gas reports`);
    const compareReports = loadReports(compareContent);
    core.info(`Got ${compareReports.programs.length} compare programs`);

    core.info(`Mapping reference gas reports`);
    const referenceReports = loadReports(referenceContent);
    core.info(`Got ${compareReports.programs.length} reference programs`);
    core.endGroup();

    core.startGroup("Compute gas diff");
    const [diffCircuitRows, diffBrilligRows] = computeProgramDiffs(
      referenceReports.programs,
      compareReports.programs
    );

    // NOTE: This is hacky but we are assuming that if a workspace report was generated using
    // `--force-brillig` then we should have a single unconstrained function marked with "main".
    // If we compiled our entire workspace to Brillig then we can generate a Brillig report instead of a circuit report.
    let brillig_report = false;
    if (
      referenceReports.programs.length > 0 &&
      referenceReports.programs[0].unconstrained_functions.length === 1 &&
      referenceReports.programs[0].unconstrained_functions[0].name === "main"
    ) {
      brillig_report = true;
    }
    console.log("brillig_report: ", brillig_report);

    let numDiffs = diffCircuitRows.length;
    let summaryRows;
    let fullReportRows;
    if (brillig_report) {
      numDiffs = diffBrilligRows.length;
      core.info(`Format Brillig markdown rows`);
      [summaryRows, fullReportRows] = formatBrilligRows(diffBrilligRows, summaryQuantile);
    } else {
      core.info(`Format ACIR markdown rows`);
      [summaryRows, fullReportRows] = formatCircuitRows(diffCircuitRows, summaryQuantile);
    }

    core.info(`Format markdown of ${numDiffs} diffs`);
    // const [summaryRows, fullReportRows] = formatCircuitRows(diffCircuitRows, summaryQuantile);
    const markdown = formatMarkdownDiffNew(
      header,
      repository,
      context.sha,
      summaryRows,
      fullReportRows,
      !brillig_report,
      refCommitHash,
      summaryQuantile
    );
    core.info(`Format shell of ${numDiffs} diffs`);

    let shell;
    if (brillig_report) {
      core.info(`Format Brillig diffs`);
      const [summaryRowsShell, fullReportRowsShell] = formatShellBrilligRows(
        diffBrilligRows,
        summaryQuantile
      );
      shell = formatShellDiffBrillig(
        diffCircuitRows,
        summaryRowsShell,
        fullReportRowsShell,
        summaryQuantile
      );
    } else {
      core.info(`Format ACIR diffs`);
      const [summaryRowsShell, fullReportRowsShell] = formatShellCircuitRows(
        diffCircuitRows,
        summaryQuantile
      );
      shell = formatShellDiff(
        diffCircuitRows,
        summaryRowsShell,
        fullReportRowsShell,
        summaryQuantile
      );
    }

    core.endGroup();

    console.log(shell);

    if (diffCircuitRows.length > 0) {
      core.setOutput("shell", shell);
      core.setOutput("markdown", markdown);
    }
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

async function uploadArtifact() {
  const headBranchEscaped = headBranch.replace(/[/\\]/g, "-");
  const outReport = `${headBranchEscaped}.${report}`;

  core.startGroup(`Upload new report from "${localReportPath}" as artifact named "${outReport}"`);
  const uploadResponse = await artifactClient.uploadArtifact(
    outReport,
    [localReportPath],
    dirname(localReportPath),
    {
      continueOnError: false,
    }
  );

  if (uploadResponse.failedItems.length > 0) throw Error("Failed to upload gas report.");

  core.info(`Artifact ${uploadResponse.artifactName} has been successfully uploaded!`);
  core.endGroup();
}

run();
