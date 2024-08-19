import _orderBy from "lodash/orderBy";

import {
  ContractDiffReport,
  ContractReport,
  DiffCircuit,
  CircuitReport,
  WorkspaceDiffReport,
  WorkspaceReport,
  ProgramReport,
  BrilligReport,
  DiffBrillig,
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
): WorkspaceDiffReport => {
  const [diffCircuits, diffBrilligs] = computeProgramDiffs(
    sourceReport.programs,
    compareReport.programs
  );
  return {
    programs: diffCircuits,
    unconstrained_functions: diffBrilligs,
    contracts: computeContractDiffs(sourceReport.contracts, compareReport.contracts),
  };
};

export const computeProgramDiffs = (
  sourceReports: ProgramReport[],
  compareReports: ProgramReport[]
): [DiffCircuit[], DiffBrillig[]] => {
  const sourceReportNames = sourceReports.map((report) => report.package_name);
  const commonReportNames = compareReports
    .map((report) => report.package_name)
    .filter((name) => sourceReportNames.includes(name));

  const diffCircuits = commonReportNames
    .map((reportName) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const srcReport = sourceReports.find((report) => report.package_name == reportName)!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const cmpReport = compareReports.find((report) => report.package_name == reportName)!;

      // For now we fetch just the main of each program
      return computeCircuitDiff(srcReport.functions[0], cmpReport.functions[0], reportName);
    })
    .filter((diff) => !isEmptyDiff(diff))
    .sort(
      (diff1, diff2) =>
        Math.max(diff2.circuit_size.percentage) - Math.max(diff1.circuit_size.percentage)
    );

  const diffBrilligs = commonReportNames
    .map((reportName) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const srcReport = sourceReports.find((report) => report.package_name == reportName)!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const cmpReport = compareReports.find((report) => report.package_name == reportName)!;

      if (
        srcReport.unconstrained_functions.length === 0 ||
        cmpReport.unconstrained_functions.length === 0
      ) {
        return {
          name: "",
          opcodes: {
            previous: 0,
            current: 0,
            delta: 0,
            percentage: 0,
          },
        };
      }
      // For now we fetch just the main of each program
      return computeUnconstrainedDiff(
        srcReport.unconstrained_functions[0],
        cmpReport.unconstrained_functions[0],
        reportName
      );
    })
    .filter((diff) => !isEmptyDiffBrillig(diff))
    .sort(
      (diff1, diff2) => Math.max(diff2.opcodes.percentage) - Math.max(diff1.opcodes.percentage)
    );

  return [diffCircuits, diffBrilligs];
};

const computeCircuitDiff = (
  sourceReport: CircuitReport,
  compareReport: CircuitReport,
  // We want the name of the package that represents the entire program in our report
  reportName: string
): DiffCircuit => {
  return {
    name: reportName,
    opcodes: variation(compareReport.opcodes, sourceReport.opcodes),
    circuit_size: variation(compareReport.circuit_size, sourceReport.circuit_size),
  };
};

const computeUnconstrainedDiff = (
  sourceReport: BrilligReport,
  compareReport: BrilligReport,
  // We want the name of the package that represents the entire program in our report
  reportName: string
): DiffBrillig => {
  return {
    name: reportName,
    opcodes: variation(compareReport.opcodes, sourceReport.opcodes),
  };
};

const isEmptyDiff = (diff: DiffCircuit): boolean =>
  diff.opcodes.delta === 0 && diff.circuit_size.delta === 0;

const isEmptyDiffBrillig = (diff: DiffBrillig): boolean => diff.opcodes.delta === 0;

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
  // TODO(https://github.com/noir-lang/noir/issues/4720): Settle on how to display contract functions with non-inlined Acir calls
  // Right now we assume each contract function does not have non-inlined functions.
  // Thus, we simply re-assign each `CircuitReport` to a `ProgramReport` to easily reuse `computeProgramDiffs`
  const sourceFunctionsAsProgram = sourceReport.functions.map((func) => {
    const programReport: ProgramReport = {
      package_name: func.name,
      functions: [func],
      unconstrained_functions: [],
    };
    return programReport;
  });
  const compareFunctionsAsProgram = compareReport.functions.map((func) => {
    const programReport: ProgramReport = {
      package_name: func.name,
      functions: [func],
      unconstrained_functions: [],
    };
    return programReport;
  });
  const [functionDiffs] = computeProgramDiffs(sourceFunctionsAsProgram, compareFunctionsAsProgram);

  return {
    name: sourceReport.name,
    functions: functionDiffs,
  };
};
