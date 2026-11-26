/**
 * Department-based permissions, enforced on every API route.
 * Mirrors the existing ERP departments (sales, backend, operations, accounts, executive).
 */
export type Department = 'sales' | 'backend' | 'operations' | 'accounts' | 'executive';

export type Permission =
  | 'finance.view'            // see tour financials & reports
  | 'finance.view_costs'      // see supplier-side detail
  | 'cost.write'              // create/edit cost lines (expected amounts, service completion, actuals)
  | 'cost.override_expected'  // override a calculated expected amount (reason mandatory)
  | 'cost.verify'             // verify / approve cost lines (sets verified amount)
  | 'bill.write'              // record vendor bills
  | 'bill.approve'
  | 'payment.write'           // record supplier payments
  | 'receipt.write'           // record client collections, invoices, credit notes
  | 'revenue.request'         // request discount / additional revenue
  | 'revenue.approve'
  | 'recon.write'             // open/update discrepancy cases
  | 'recon.resolve'
  | 'tour.close'
  | 'finance.post_closure'    // change records of a financially closed tour (reason mandatory)
  | 'master.manage'           // expense heads / categories
  | 'settings.manage'
  | 'import.run';

const ALL: Permission[] = [
  'finance.view', 'finance.view_costs', 'cost.write', 'cost.override_expected', 'cost.verify', 'bill.write', 'bill.approve',
  'payment.write', 'receipt.write', 'revenue.request', 'revenue.approve', 'recon.write', 'recon.resolve', 'tour.close',
  'finance.post_closure', 'master.manage', 'settings.manage', 'import.run',
];

const BY_DEPARTMENT: Record<Department, Permission[]> = {
  // Sales: revenue side only; cannot touch supplier bills or verified expenses.
  sales: ['finance.view', 'revenue.request'],
  // Operations: records costs, uploads bills, responds to alerts. No approvals, no payments.
  operations: ['finance.view', 'finance.view_costs', 'cost.write', 'bill.write', 'recon.write'],
  // Accounts: verification, reconciliation, payments, collections, closure.
  accounts: [
    'finance.view', 'finance.view_costs', 'cost.write', 'cost.override_expected', 'cost.verify', 'bill.write', 'bill.approve',
    'payment.write', 'receipt.write', 'revenue.request', 'recon.write', 'recon.resolve', 'tour.close', 'import.run',
  ],
  // Backend/admin: master data, imports, settings.
  backend: ['finance.view', 'finance.view_costs', 'master.manage', 'import.run', 'settings.manage'],
  // Management: everything, including exceptional approvals.
  executive: ALL,
};

const MANAGER_EXTRA: Partial<Record<Department, Permission[]>> = {
  accounts: ['revenue.approve', 'finance.post_closure', 'settings.manage', 'master.manage'],
  sales: [],
  operations: ['cost.override_expected'],
};

export function permissionsFor(department: Department, isManager: boolean): Set<Permission> {
  return new Set([...(BY_DEPARTMENT[department] ?? []), ...(isManager ? MANAGER_EXTRA[department] ?? [] : [])]);
}
