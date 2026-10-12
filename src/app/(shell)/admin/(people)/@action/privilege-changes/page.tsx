// Privilege Changes has no action. A page of its own rather than the slot's
// `default.tsx`: on a tab switch Next keeps a slot's last page where the new
// address has none, which would leave the last tab's action beside the
// heading.
export default function PrivilegeChangesAction() {
  return null;
}
