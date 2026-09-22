import { requirePermission, hasCurrentUserPermission } from "@/lib/auth/server";
import { getAdminCustomers, getAdminLedger } from "@/lib/admin/queries";
import { LedgerView } from "../records/RecordLists";
export default async function AdminLedgerPage() { await requirePermission("ledger.view", { asNotFound: true }); const [ledger, customerData, canRecordPayment] = await Promise.all([getAdminLedger(), getAdminCustomers({}), hasCurrentUserPermission("ledger.record_payment")]); return <LedgerView ageing={ledger.ageing as never} entries={ledger.entries as never} customers={customerData.customers as never} canRecordPayment={canRecordPayment} />; }
