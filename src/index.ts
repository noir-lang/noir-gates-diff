import * as fs from "fs";
import { resolve } from "path";

import * as core from "@actions/core";
import { context } from "@actions/github";

import { uploadArtifact, findPreviousArtifact } from "./artifact";
import {
  formatBrilligRows,
  formatCircuitRows,
  formatMarkdownDiff,
  formatShellBrilligRows,
  formatShellCircuitRows,
  formatShellDiff,
  formatShellDiffBrillig,
} from "./format/program";
import { computeProgramDiffs } from "./report";
import { DiffBrillig, DiffCircuit, WorkspaceReport } from "./types";

const token = process.env.GITHUB_TOKEN || core.getInput("token");
const report = core.getInput("report");
const header = core.getInput("header");
const brillig_report = core.getInput("brillig_report");
const brillig_report_bytes = core.getInput("brillig_report_bytes");
const summaryQuantile = parseFloat(core.getInput("summaryQuantile"));
// const sortCriteria = core.getInput("sortCriteria").split(",");
// const sortOrders = core.getInput("sortOrders").split(",");
const baseBranch = core.getInput("base");
const headBranch = core.getInput("head");

const baseBranchEscaped = baseBranch.replace(/[/\\]/g, "-");
const baseReport = `${baseBranchEscaped}.${report}`;

const localReportPath = resolve(report);

const { owner, repo } = context.repo;
const repository = owner + "/" + repo;

async function run() {
  // if (!isSortCriteriaValid(sortCriteria)) return;
  // if (!isSortOrdersValid(sortOrders)) return;

  try {
    // Upload the gates report to be used as a reference in later runs.
    await uploadArtifact(headBranch, report);
  } catch (error) {
    return core.setFailed((error as Error).message);
  }

  let referenceContent: string;
  let refCommitHash: string;
  if (context.eventName === "pull_request") {
    // If we're on a pull request then we want to pull the most recent report from the base branch.
    try {
      [refCommitHash, referenceContent] = await findPreviousArtifact(
        token,
        baseReport,
        repository,
        baseBranch
      );
    } catch (error) {
      return core.setFailed((error as Error).message);
    }
  } else {
    // If we don't have a comparison branch then we cannot make a diff so return early.
    core.info(`Ending early as no report to compare against`);
    return;
  }

  try {
    const [referenceReports, compareReports] = loadReports(referenceContent);

    core.startGroup("Compute gates diff");
    const [diffCircuitRows, diffBrilligRows] = computeProgramDiffs(
      referenceReports.programs,
      compareReports.programs
    );
    core.endGroup();

    const numDiffs = brillig_report ? diffBrilligRows.length : diffCircuitRows.length;
    if (numDiffs == 0) {
      core.info(`Ending early as reports diff shows no difference`);
      return;
    }

    const [shell, markdown] = formatReport(diffCircuitRows, diffBrilligRows, refCommitHash);

    console.log(shell);

    if (numDiffs > 0) {
      core.setOutput("shell", shell);
      core.setOutput("markdown", markdown);
    }
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

function loadReports(referenceContent: string): [WorkspaceReport, WorkspaceReport] {
  core.startGroup("Load gas reports");
  core.info(`Loading gas reports from "${localReportPath}"`);
  const compareContent = fs.readFileSync(localReportPath, "utf8");

  core.info(`Mapping compared gas reports`);
  const compareReports: WorkspaceReport = JSON.parse(compareContent);
  core.info(`Got ${compareReports.programs.length} compare programs`);

  core.info(`Mapping reference gas reports`);
  const referenceReports: WorkspaceReport = JSON.parse(referenceContent);
  core.info(`Got ${compareReports.programs.length} reference programs`);
  core.endGroup();

  return [referenceReports, compareReports];
}

function formatReport(
  diffCircuitRows: DiffCircuit[],
  diffBrilligRows: DiffBrillig[],
  refCommitHash: string
): [string, string] {
  core.startGroup("Formatting diff");

  let summaryRows;
  let fullReportRows;
  if (brillig_report) {
    core.info(`Format Brillig markdown rows`);
    [summaryRows, fullReportRows] = formatBrilligRows(diffBrilligRows, summaryQuantile);
  } else {
    core.info(`Format ACIR markdown rows`);
    [summaryRows, fullReportRows] = formatCircuitRows(diffCircuitRows, summaryQuantile);
  }

  core.info(`Format markdown of ${fullReportRows.length} diffs`);
  const markdown = formatMarkdownDiff(
    header,
    repository,
    context.sha,
    summaryRows,
    fullReportRows,
    !brillig_report,
    brillig_report_bytes == "true",
    refCommitHash,
    summaryQuantile
  );
  core.info(`Format shell of ${fullReportRows.length} diffs`);

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
      brillig_report_bytes == "true",
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

  return [shell, markdown];
}

run();
