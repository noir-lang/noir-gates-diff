import * as core from "@actions/core";

export interface CircuitReport {
  name: string;
  opcodes: number;
  circuit_size: number;
}

export interface BrilligReport {
  name: string;
  opcodes: number;
}

export interface ProgramReport {
  // Name of the program package
  package_name: string;
  functions: CircuitReport[];
  unconstrained_functions: BrilligReport[];
}

export interface ContractReport {
  name: string;
  // TODO(https://github.com/noir-lang/noir/issues/4720): Settle on how to display contract functions with non-inlined Acir calls
  functions: CircuitReport[];
}

export interface WorkspaceReport {
  programs: ProgramReport[];
  contracts: ContractReport[];
}

export interface WorkspaceDiffReport {
  programs: DiffCircuit[];
  unconstrained_functions: DiffBrillig[];
  contracts: ContractDiffReport[];
}

export interface ContractDiffReport {
  name: string;
  functions: DiffCircuit[];
}

export interface DiffCircuit {
  name: string;
  opcodes: DiffCell;
  circuit_size: DiffCell;
}

export interface DiffBrillig {
  name: string;
  opcodes: DiffCell;
}

export interface DiffCell {
  previous: number;
  current: number;
  delta: number;
  percentage: number;
}

export type SortCriterion = keyof DiffCircuit;
export type SortOrder = "asc" | "desc";

const validSortCriteria = ["name", "opcodes", "circuit_size"] as SortCriterion[];
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
