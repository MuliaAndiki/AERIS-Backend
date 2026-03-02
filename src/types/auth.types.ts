export interface Auth {
  id: string;
  email: string;
  fullName: string;
  password: string;
  token?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  otp?: string;
  expOtp?: Date;
  isVerify?: boolean;
}

export type JwtPayload = Pick<Auth, "id" | "email" | "role" | "fullName">;
export type PickRegister = Pick<
  Auth,
  "email" | "fullName" | "password" | "role"
>;
export type PickLogin = Pick<Auth, "email" | "password">;
export type PickLogout = Pick<Auth, "id">;
