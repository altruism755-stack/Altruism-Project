export type UserRole = "volunteer" | "supervisor" | "org_admin";

export type OrgStatus = "pending" | "approved" | "rejected";

export interface User {
  id: number;
  email: string;
  role: UserRole;
  is_platform_admin?: boolean;
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}
