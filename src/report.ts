import _orderBy from "lodash/orderBy";

import {
  ContractDiffReport,
  ContractReport,
  DiffProgram,
  ProgramReport,
  WorkspaceDiffReport,
  WorkspaceReport,
} from "./types";

export const variation = (current: number, previous: number) => {
  const delta = current - previous;

  return {
    previous,
    current,
    delta,
    percentage: previous !== 0 ? (100 * delta) / previous : Infinity,
  };
};

export const loadReports = (content: string): WorkspaceReport => {
  return JSON.parse(content);
};

export const computedWorkspaceDiff = (
  sourceReport: WorkspaceReport,
  compareReport: WorkspaceReport
): WorkspaceDiffReport => ({
  programs: computeProgramDiffs(sourceReport.programs, compareReport.programs),
  contracts: computeContractDiffs(sourceReport.contracts, compareReport.contracts),
});

export const computeProgramDiffs = (
  sourceReports: ProgramReport[],
  compareReports: ProgramReport[]
): DiffProgram[] => {
  const sourceReportNames = sourceReports.map((report) => report.name);
  const commonReportNames = compareReports
    .map((report) => report.name)
    .filter((name) => sourceReportNames.includes(name));

  return commonReportNames
    .map((reportName) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const srcReport = sourceReports.find((report) => report.name == reportName)!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const cmpReport = compareReports.find((report) => report.name == reportName)!;

      return computeProgramDiff(srcReport, cmpReport);
    })
    .filter((diff) => !isEmptyDiff(diff))
    .sort(
      (diff1, diff2) =>
        Math.max(diff2.circuit_size.percentage) - Math.max(diff1.circuit_size.percentage)
    );
};

const computeProgramDiff = (
  sourceReport: ProgramReport,
  compareReport: ProgramReport
): DiffProgram => {
  return {
    name: sourceReport.name,
    acir_opcodes: variation(compareReport.acir_opcodes, sourceReport.acir_opcodes),
    circuit_size: variation(compareReport.circuit_size, sourceReport.circuit_size),
  };
};

const isEmptyDiff = (diff: DiffProgram): boolean =>
  diff.acir_opcodes.delta === 0 && diff.circuit_size.delta === 0;

export const computeContractDiffs = (
  sourceReports: ContractReport[],
  compareReports: ContractReport[]
): ContractDiffReport[] => {
  const sourceReportNames = sourceReports.map((report) => report.name);
  const commonReportNames = compareReports
    .map((report) => report.name)
    .filter((name) => sourceReportNames.includes(name));

  return commonReportNames
    .map((reportName) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const srcReport = sourceReports.find((report) => report.name == reportName)!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const cmpReport = compareReports.find((report) => report.name == reportName)!;

      return computeContractDiff(srcReport, cmpReport);
    })
    .filter((diff) => diff.functions.length > 0)
    .sort(
      (diff1, diff2) =>
        Math.max(
          ...diff2.functions.map((functionDiff) => Math.abs(functionDiff.circuit_size.percentage))
        ) -
        Math.max(
          ...diff1.functions.map((functionDiff) => Math.abs(functionDiff.circuit_size.percentage))
        )
    );
};

const computeContractDiff = (
  sourceReport: ContractReport,
  compareReport: ContractReport
): ContractDiffReport => {
  const functionDiffs = computeProgramDiffs(sourceReport.functions, compareReport.functions);

  return {
    name: sourceReport.name,
    functions: functionDiffs,
  };
};
