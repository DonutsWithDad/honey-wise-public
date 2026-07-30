/**
 * Client-side mirrors of the HoneyWise API contracts. Property names match the
 * API's camelCase JSON exactly (see HoneyWise.Api Contracts/User.cs & Login.cs).
 */

/** Credentials sent to POST /Users/login. */
export interface LoginRequest {
  userName: string;
  password: string;
}

/** Payload sent to POST /Users to register a new account. */
export interface CreateUserRequest {
  firstName?: string;
  lastName: string;
  userName: string;
  email?: string;
  password: string;
  // `plan` is intentionally omitted: the server owns it and defaults to "free".
}

/** Body returned by POST /Users on success (201 Created). */
export interface CreateUserResponse {
  id: string;
}

/** The signed-in user's profile, returned by GET /Users/me. */
export interface UserProfile {
  id: string;
  firstName?: string;
  lastName: string;
  userName: string;
  email?: string;
  plan: string;
}

/** Payload sent to PUT /Users/me/username. */
export interface UpdateUserNameRequest {
  userName: string;
}

/** Payload sent to PUT /Users/me/password. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
