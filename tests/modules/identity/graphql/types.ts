export interface ListedUserNode {
  id: string;
  name: string;
  email: string;
  role: string;
  canCreateWorkspace: boolean;
  emailVerified: boolean;
  providers: string[];
  audit: { createdAt: string };
}

export interface UsersQueryResult {
  users: {
    edges: { cursor: string; node: ListedUserNode }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

export interface GrantedUserResult {
  grantWorkspaceCreation: { id: string; canCreateWorkspace: boolean };
}

export interface RevokedUserResult {
  revokeWorkspaceCreation: { id: string; canCreateWorkspace: boolean };
}

export interface LedgerUser {
  id: string;
  name: string;
}

export interface PrivilegeChangeNode {
  id: string;
  subject: LedgerUser | null;
  privilege: string;
  change: string;
  via: string;
  note: string | null;
  actor: LedgerUser | null;
  audit: { createdAt: string };
}

export interface PrivilegeChangesResult {
  privilegeChanges: {
    edges: { cursor: string; node: PrivilegeChangeNode }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}
