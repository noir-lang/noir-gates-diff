import * as core from "@actions/core";

export interface CircuitReport {
  name: string;
  acir_opcodes: number;
  circuit_size: number;
}

export interface ProgramReport {
  functions: CircuitReport[];
}

export interface ContractReport {
  name: string;
  functions: ProgramReport[];
}

export interface WorkspaceReport {
  programs: ProgramReport[];
  contracts: ContractReport[];
}

// Temporary workspace to get CI to pass when comparing against the old master report
export interface OldWorkspaceReport {
  programs: CircuitReport[];
  contracts: ContractReport[];
}

export interface WorkspaceDiffReport {
  programs: DiffProgram[];
  contracts: ContractDiffReport[];
}

export interface ContractDiffReport {
  name: string;
  functions: DiffProgram[];
}

export interface DiffProgram {
  name: string;
  acir_opcodes: DiffCell;
  circuit_size: DiffCell;
}

export interface DiffCell {
  previous: number;
  current: number;
  delta: number;
  percentage: number;
}

export type SortCriterion = keyof DiffProgram;
export type SortOrder = "asc" | "desc";

const validSortCriteria = ["name", "acir_opcodes", "circuit_size"] as SortCriterion[];
const validSortOrders = ["asc", "desc"] as SortOrder[];

export const isSortCriteriaValid = (sortCriteria: string[]): sortCriteria is SortCriterion[] => {
  const invalidSortCriterion = sortCriteria.find(
    (criterion) => !validSortCriteria.includes(criterion as SortCriterion)
  );
  if (invalidSortCriterion) core.setFailed(`Invalid sort criterion "${invalidSortCriterion}"`);

  return !invalidSortCriterion;
};

export const isSortOrdersValid = (sortOrders: string[]): sortOrders is SortOrder[] => {
  const invalidSortOrder = sortOrders.find(
    (order) => !validSortOrders.includes(order as SortOrder)
  );
  if (invalidSortOrder) core.setFailed(`Invalid sort order "${invalidSortOrder}"`);

  return !invalidSortOrder;
};
