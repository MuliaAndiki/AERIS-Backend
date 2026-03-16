import { RoleType } from "@prisma/client";

export interface Auth {
  id: string;
  email: string;
  fullName: string;
  password: string;
  phone: string;
  token?: string;
  role: RoleType;
  avaUrl: string;
  createdAt: Date;
  updatedAt: Date;
  otp?: string;
  expOtp?: Date;
  isVerify?: boolean;
  activateToken?: string;
  activateExp?: string;
}

export type JwtPayload = Pick<Auth, "id" | "role">;
export type PickRegister = Pick<
  Auth,
  "email" | "fullName" | "password" | "role" | "phone"
>;
export type PickLogin = Pick<Auth, "email" | "password" | "phone" | "id">;
export type PickID = Pick<Auth, "id">;
export type PickForgotPassword = Pick<Auth, "email" | "phone">;
export type PickVerify = Pick<Auth, "email" | "otp">;
export type PickSendOtp = Pick<Auth, "email">;
export type PickResetPassword = Pick<Auth, "email" | "password" | "phone">;
export type PickUpdateProfile = Pick<
  Auth,
  "email" | "fullName" | "avaUrl" | "phone"
>;
export type PickUpdatePassword = Pick<Auth, "password">;
export type PickActiveAccount = Pick<Auth, "activateToken" | "password">;
export type PickLoginAllReady = Pick<Auth, "token">;
