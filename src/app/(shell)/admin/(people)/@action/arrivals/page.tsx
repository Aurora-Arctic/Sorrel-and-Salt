import { ArrivalsActions } from '../../../../../../components/AdminCards/arrivals';
import { requireAdminSession } from '../../../../../../lib/request-session';

// Download CSV, beside the page's heading while Arrivals is open.
export default async function ArrivalsAction() {
  await requireAdminSession();
  return <ArrivalsActions />;
}
