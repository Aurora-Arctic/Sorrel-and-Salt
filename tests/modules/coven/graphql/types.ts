export interface CreateInvitationResult {
  createInvitation: {
    id: string;
    email: string;
    role: 'viewer' | 'member';
    workspace: { id: string } | null;
    audit: { createdBy: string };
  };
}
