import { invoiceState } from './invoices';
import { todayIso } from './records';
import { useStore } from './store';

/** How many sent invoices are past their due date, for the tab badge. */
export function useOverdueInvoices(): number {
  const { invoices } = useStore();
  const today = todayIso();
  return invoices.filter((i) => invoiceState(i, today) === 'overdue').length;
}
