import Zip from "adm-zip";
import { dirname, resolve } from "path";

import {DefaultArtifactClient} from '@actions/artifact'
import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";

const { owner, repo } = context.repo;

// cannot use artifactClient because downloads are limited to uploads in the same workflow run
// cf. https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts#downloading-or-deleting-artifacts
export async function findPreviousArtifact(
  token: string,
  baseReport: string,
  repository: string,
  baseBranch: string
): Promise<[string, string]> {
  core.startGroup(
    `Searching artifact "${baseReport}" on repository "${repository}", on branch "${baseBranch}"`
  );

  const octokit = getOctokit(token);

  let count = 100;
  let artifactId: number | null = null;
  let refCommitHash: string | undefined = undefined;
  // Artifacts are returned in most recent first order.
  for await (const res of octokit.paginate.iterator(octokit.rest.actions.listArtifactsForRepo, {
    owner,
    repo,
  })) {
    if (count == 0) {
      break;
    }
    const artifact = res.data.find((artifact) => !artifact.expired && artifact.name === baseReport);
    count = count - 1;
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

    let referenceContent = "";
    const zip = new Zip(Buffer.from(res.data as ArrayBuffer));
    for (const entry of zip.getEntries()) {
      core.info(`Loading gas reports from "${entry.entryName}"`);
      referenceContent = zip.readAsText(entry);
    }
    core.endGroup();
    return [refCommitHash as string, referenceContent];
  } else {
    core.error(`No workflow run found with an artifact named "${baseReport}"`);
    throw Error(`No workflow run found with an artifact named "${baseReport}"`);
  }
}

export async function uploadArtifact(headBranch: string, report: string) {
  const headBranchEscaped = headBranch.replace(/[/\\]/g, "-");
  const outReport = `${headBranchEscaped}.${report}`;

  const localReportPath = resolve(report);

  const artifactClient = new DefaultArtifactClient()

  core.startGroup(`Upload new report from "${localReportPath}" as artifact named "${outReport}"`);
  const uploadResponse = await artifactClient.uploadArtifact(
    outReport,
    [localReportPath],
    dirname(localReportPath),
  );


  core.info(`Artifact ${uploadResponse.id} has been successfully uploaded!`);
  core.endGroup();
}
