import {
  ContractReport,
  CircuitReport,
  WorkspaceReport,
  ProgramReport,
  BrilligReport,
} from "../types";

export const parseReport = (content: string): WorkspaceReport => {
  const report = JSON.parse(content);

  report.programs = report.programs?.map(parseProgramReport) ?? [];
  report.contracts = report.contracts?.map(parseContractReport) ?? [];

  if (isWorkspaceReport(report)) {
    return report;
  } else {
    console.log(report);
    throw Error("Report is invalid");
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseProgramReport(report: any): ProgramReport {
  report.functions = report.functions?.map(parseCircuitReport) ?? [];
  report.unconstrained_functions = report.unconstrained_functions?.map(parseBrilligReport) ?? [];

  if (isProgramReport(report)) {
    return report;
  } else {
    console.log(report);
    throw Error(`Program report is invalid: ${report}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseContractReport(report: any): ContractReport {
  report.functions = report.functions?.map(parseCircuitReport) ?? [];

  if (isContractReport(report)) {
    return report;
  } else {
    console.log(report);
    throw Error(`Contract report is invalid: ${JSON.stringify(report)}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCircuitReport(report: any): CircuitReport {
  // Currently this the wrong key is used so we rename it.
  if (typeof report.acir_opcodes !== "undefined" && typeof report.opcodes == "undefined") {
    report.opcodes = report.acir_opcodes;
    delete report.acir_opcodes;
  }

  if (isCircuitReport(report)) {
    return report;
  } else {
    console.log(report);
    throw Error("Circuit report is invalid");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseBrilligReport(report: any): BrilligReport {
  if (isBrilligReport(report)) {
    return report;
  } else {
    console.log(report);
    throw Error("Brillig report is invalid");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isWorkspaceReport(report: any): report is WorkspaceReport {
  return report.programs.every(isProgramReport) && report.contracts.every(isContractReport);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isProgramReport(report: any): report is ProgramReport {
  return (
    typeof report.package_name == "string" &&
    report.functions.every(isCircuitReport) &&
    report.unconstrained_functions.every(isBrilligReport)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isContractReport(report: any): report is ContractReport {
  return typeof report.name == "string" && report.functions.every(isCircuitReport);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isCircuitReport(report: any): report is CircuitReport {
  return (
    typeof report.name == "string" &&
    typeof report.opcodes == "number" &&
    typeof report.circuit_size == "number"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isBrilligReport(report: any): report is BrilligReport {
  return typeof report.name == "string" && typeof report.opcodes == "number";
}
