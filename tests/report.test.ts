import * as fs from "fs";

import { formatMarkdownDiff, formatShellDiff } from "../src/format";
import { loadReports, computeContractDiffs } from "../src/report";

const srcContent = fs.readFileSync("tests/mocks/gas_report.2.json", "utf8");
const cmpContent = fs.readFileSync("tests/mocks/gas_report.1.json", "utf8");

const srcContractReports = loadReports(srcContent).contracts;
const cmpContractReports = loadReports(cmpContent).contracts;

describe("Markdown format", () => {
  // shows how the runner will run a javascript action with env / stdout protocol
  // it("should run action", () => {
  //   const np = process.execPath;
  //   const ip = path.join(__dirname, "..", "dist", "index.js");
  //   console.log(
  //     cp
  //       .execFileSync(np, [ip], {
  //         env: {
  //           ...process.env,
  //           INPUT_WORKFLOWID: "test",
  //           INPUT_BASE: "base",
  //           INPUT_HEAD: "head",
  //           GITHUB_TOKEN: "token",
  //           INPUT_REPORT: "report",
  //         },
  //       })
  //       .toString()
  //   );
  // });

  it("should compare 1 to 2 with markdown format", () => {
    const contractDiffs = computeContractDiffs(srcContractReports, cmpContractReports);
    expect(contractDiffs.length).toBeGreaterThan(0);

    fs.writeFileSync(
      "tests/mocks/1-2.md",
      formatMarkdownDiff(
        "# Changes to gas cost",
        contractDiffs,
        "Rubilmax/foundry-gas-diff",
        "d62d23148ca73df77cd4378ee1b3c17f1f303dbf",
        undefined,
        0.8
      )
    );
  });

  it("should compare 1 to 1 with markdown format", () => {
    const contractDiffs = computeContractDiffs(srcContractReports, srcContractReports);
    expect(contractDiffs.length).toBe(0);

    fs.writeFileSync(
      "tests/mocks/1-1.md",
      formatMarkdownDiff(
        "# Changes to gas cost",
        contractDiffs,
        "Rubilmax/foundry-gas-diff",
        "d62d23148ca73df77cd4378ee1b3c17f1f303dbf"
      )
    );
  });
});

describe("Shell format", () => {
  it("should compare 1 to 1", () => {
    const contractDiffs = computeContractDiffs(srcContractReports, srcContractReports);
    expect(contractDiffs.length).toBe(0);

    console.log(formatShellDiff(contractDiffs));
  });

  it("should compare 1 to 2", () => {
    const contractDiffs = computeContractDiffs(srcContractReports, cmpContractReports);
    expect(contractDiffs.length).toBeGreaterThan(0);

    console.log(formatShellDiff(contractDiffs));
  });

  it("should compare 2 to 1", () => {
    const contractDiffs = computeContractDiffs(cmpContractReports, srcContractReports);
    expect(contractDiffs.length).toBeGreaterThan(0);

    console.log(formatShellDiff(contractDiffs));
  });
});
