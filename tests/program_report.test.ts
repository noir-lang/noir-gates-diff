import * as fs from "fs";

import {
  formatBrilligRows,
  formatCircuitRows,
  formatMarkdownDiff,
  formatShellBrilligRows,
  formatShellCircuitRows,
  formatShellDiff,
  formatShellDiffBrillig,
} from "../src/format/program";
import { computeProgramDiffs, loadReports } from "../src/report";

const srcContent = fs.readFileSync("tests/mocks/gas_report.2.json", "utf8");
const cmpContent = fs.readFileSync("tests/mocks/gas_report.1.json", "utf8");

const srcContractReports = loadReports(srcContent).programs;
const cmpContractReports = loadReports(cmpContent).programs;

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
    const [circuitDiffs, brilligDiffs] = computeProgramDiffs(
      srcContractReports,
      cmpContractReports
    );
    expect(circuitDiffs.length).toBeGreaterThan(0);

    const [summaryRows, fullReportRows] = formatCircuitRows(circuitDiffs, 0.8);
    fs.writeFileSync(
      "tests/mocks/1-2-program-acir.md",
      formatMarkdownDiff(
        "# Changes to gas cost",
        "Rubilmax/foundry-gas-diff",
        "d62d23148ca73df77cd4378ee1b3c17f1f303dbf",
        summaryRows,
        fullReportRows,
        true,
        undefined,
        0.8
      )
    );

    const [summaryRowsBrillig, fullReportRowsBrillig] = formatBrilligRows(brilligDiffs, 0.8);
    fs.writeFileSync(
      "tests/mocks/1-2-program-brillig.md",
      formatMarkdownDiff(
        "# Changes to gas cost",
        "Rubilmax/foundry-gas-diff",
        "d62d23148ca73df77cd4378ee1b3c17f1f303dbf",
        summaryRowsBrillig,
        fullReportRowsBrillig,
        false,
        undefined,
        0.8
      )
    );
  });

  it("should compare 1 to 1 with markdown format", () => {
    const [circuitDiffs, brilligDiffs] = computeProgramDiffs(
      srcContractReports,
      srcContractReports
    );
    expect(circuitDiffs.length).toBe(0);

    const [summaryRows, fullReportRows] = formatCircuitRows(circuitDiffs, 0.8);
    fs.writeFileSync(
      "tests/mocks/1-1-program-acir.md",
      formatMarkdownDiff(
        "# Changes to gas cost",
        "Rubilmax/foundry-gas-diff",
        "d62d23148ca73df77cd4378ee1b3c17f1f303dbf",
        summaryRows,
        fullReportRows,
        true
      )
    );

    const [summaryRowsBrillig, fullReportRowsBrillig] = formatBrilligRows(brilligDiffs, 0.8);
    fs.writeFileSync(
      "tests/mocks/1-1-program-brillig.md",
      formatMarkdownDiff(
        "# Changes to gas cost",
        "Rubilmax/foundry-gas-diff",
        "d62d23148ca73df77cd4378ee1b3c17f1f303dbf",
        summaryRowsBrillig,
        fullReportRowsBrillig,
        false,
        undefined,
        0.8
      )
    );
  });
});

describe("Shell format", () => {
  it("should compare 1 to 1", () => {
    const [circuitDiffs, brilligDiffs] = computeProgramDiffs(
      srcContractReports,
      srcContractReports
    );
    expect(circuitDiffs.length).toBe(0);

    const [summaryRows, fullReportRows] = formatShellCircuitRows(circuitDiffs);
    console.log(formatShellDiff(circuitDiffs, summaryRows, fullReportRows));

    const [summaryRowsBrillig, fullReportRowsBrillig] = formatShellBrilligRows(brilligDiffs);
    console.log(formatShellDiffBrillig(brilligDiffs, summaryRowsBrillig, fullReportRowsBrillig));
  });

  it("should compare 1 to 2", () => {
    const [circuitDiffs, brilligDiffs] = computeProgramDiffs(
      srcContractReports,
      cmpContractReports
    );
    expect(circuitDiffs.length).toBeGreaterThan(0);

    const [summaryRows, fullReportRows] = formatShellCircuitRows(circuitDiffs);
    console.log(formatShellDiff(circuitDiffs, summaryRows, fullReportRows));

    const [summaryRowsBrillig, fullReportRowsBrillig] = formatShellBrilligRows(brilligDiffs);
    console.log(formatShellDiffBrillig(brilligDiffs, summaryRowsBrillig, fullReportRowsBrillig));
  });

  // This test is just to make sure that we are accurately resetting our reference
  // report in case it gets malformed
  it("should compare fresh report", () => {
    const srcContractReports = cmpContractReports.map((program) => {
      const circuitReport = { name: "main", opcodes: 1, circuit_size: 1 };
      const unconstrainedReport = { name: "main", opcodes: 1 };
      const programReport = {
        package_name: program.package_name,
        functions: [circuitReport],
        unconstrained_functions: [unconstrainedReport],
      };
      return programReport;
    });
    const [circuitDiffs, brilligDiffs] = computeProgramDiffs(
      srcContractReports,
      cmpContractReports
    );
    expect(circuitDiffs.length).toBeGreaterThan(0);

    const [summaryRows, fullReportRows] = formatShellCircuitRows(circuitDiffs);
    console.log(formatShellDiff(circuitDiffs, summaryRows, fullReportRows));

    const [summaryRowsBrillig, fullReportRowsBrillig] = formatShellBrilligRows(brilligDiffs);
    console.log(formatShellDiffBrillig(brilligDiffs, summaryRowsBrillig, fullReportRowsBrillig));
  });

  it("should compare 2 to 1", () => {
    const [circuitDiffs, brilligDiffs] = computeProgramDiffs(
      cmpContractReports,
      srcContractReports
    );
    expect(circuitDiffs.length).toBeGreaterThan(0);

    const [summaryRows, fullReportRows] = formatShellCircuitRows(circuitDiffs);
    console.log(formatShellDiff(circuitDiffs, summaryRows, fullReportRows));

    const [summaryRowsBrillig, fullReportRowsBrillig] = formatShellBrilligRows(brilligDiffs);
    console.log(formatShellDiffBrillig(brilligDiffs, summaryRowsBrillig, fullReportRowsBrillig));
  });
});
