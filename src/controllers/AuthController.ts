import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  PickRegister,
  PickLogin,
  JwtPayload,
  PickForgotPassword,
  PickVerify,
  PickSendOtp,
  PickResetPassword,
} from "@/types/auth.types";
import prisma from "prisma/client";
import { AppContext } from "@/contex/appContex";
import { generateOtp } from "@/utils/generateOtp";
import { sendOTPEmail } from "@/utils/sendEmail";
// import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import { sanitizeUser } from "@/utils/sanitizeUser";

// const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

class AuthController {
  public async register(c: AppContext) {
    try {
      const auth = c.body as PickRegister;
      const { email, phone } = auth;
      if (!auth.fullName || !auth.password) {
        return c.json?.(
          { status: 400, message: "All fields are required" },
          400,
        );
      }

      if (!auth.email && !auth.phone) {
        return c.json?.(
          {
            status: 400,
            message: "email or phone is required",
          },
          400,
        );
      }

      const isAlreadyRegistered = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { phone }],
        },
      });

      if (isAlreadyRegistered) {
        return c.json?.(
          { status: 400, message: "Email already registered" },
          400,
        );
      }

      const hashedPassword = await bcryptjs.hash(auth.password, 10);
      let newUsers;

      if (auth.email) {
        const otp = generateOtp(6);
        const otpExpiress = new Date(Date.now() + 5 * 60 * 1000);
        newUsers = await prisma.user.create({
          data: {
            fullName: auth.fullName,
            password: hashedPassword,
            role: auth.role || "PARENT",
            email: auth.email,
            phone: auth.phone,
            otp: otp,
            expOtp: otpExpiress,
            isVerify: false,
          },
        });
        await sendOTPEmail(email, otp);
        return c.json?.(
          {
            status: 201,
            message: "successfully registered using email",
            data: sanitizeUser(newUsers),
          },
          201,
        );
      }
      if (phone) {
        newUsers = await prisma.user.create({
          data: {
            fullName: auth.fullName,
            password: hashedPassword,
            phone: phone,
            role: auth.role || "PARENT",
            isVerify: true,
          },
        });
        return c.json?.(
          {
            status: 201,
            message: "successfully registered using phone",
            data: sanitizeUser(newUsers),
          },
          201,
        );
      }
      return c.json?.(
        {
          status: 400,
          message: "Invalid register request",
        },
        400,
      );
    } catch (error) {
      console.error(error);
      return c.json?.(
        {
          status: 500,
          message: "Server Internal Error",
          error: error instanceof Error ? error.message : error,
        },
        500,
      );
    }
  }

  public async login(c: AppContext) {
    try {
      const auth = c.body as PickLogin;
      const { email, phone } = auth;

      if (!auth.password) {
        return c.json?.(
          {
            status: 400,
            message: "password is required",
          },
          400,
        );
      }

      if (!auth.email && !auth.phone) {
        return c.json?.(
          {
            status: 400,
            message: "email or phone is required",
          },
          400,
        );
      }

      const selectLogin = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { phone }],
        },
      });

      if (!selectLogin) {
        return c.json?.(
          {
            status: 400,
            message: "email or phone not registered",
          },
          400,
        );
      }

      if (!selectLogin.isVerify) {
        return c.json?.(
          {
            status: 400,
            message: "account not verified",
          },
          400,
        );
      }

      const validatePassword = await bcryptjs.compare(
        auth.password,
        selectLogin.password!,
      );
      if (!validatePassword) {
        return c.json?.(
          {
            status: 400,
            message: "Email or Phone & Password Not Match",
          },
          400,
        );
      }

      await prisma.userSession.deleteMany({
        where: {
          userId: selectLogin.id,
        },
      });

      const ipAddress =
        c.headers["x-forwarded-for"]?.split(",")[0] ||
        c.headers["x-real-ip"] ||
        c.headers["cf-connecting-ip"] ||
        "unknown";

      const session = await prisma.userSession.create({
        data: {
          userId: selectLogin.id,
          userAgent: c.headers["user-agent"] ?? "unknown",
          ipAddress: ipAddress,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const payload: JwtPayload = {
        id: selectLogin.id,
        sessionId: session.id,
        role: selectLogin.role,
      };
      if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      await prisma.user.update({
        where: { id: selectLogin.id },
        data: { token },
      });

      return c.json?.(
        {
          status: 200,
          data: { ...sanitizeUser(selectLogin), token },
          message: "Login successfully",
        },
        200,
      );
    } catch (error) {
      console.error(error);
      return c.json?.(
        {
          status: 500,
          message: "Internal server error",
          error: error instanceof Error ? error.message : error,
        },
        500,
      );
    }
  }

  public async logout(c: AppContext) {
    try {
      const auth = c.user as JwtPayload;

      if (!auth?.id) {
        return c.json?.({ status: 401, message: "Unauthorized" }, 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: auth.id },
        select: {
          id: true,
        },
      });

      if (!user) {
        return c.json?.({ status: 404, message: "Account not found" }, 404);
      }

      const session = await prisma.userSession.findFirst({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
        },
      });

      if (!session) {
        return c.json?.(
          {
            status: 404,
            message: "session not found",
          },
          404,
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { token: null },
      });

      await prisma.userSession.delete({
        where: {
          id: session.id,
          userId: user.id,
        },
      });

      return c.json?.(
        {
          status: 200,
          message: "Account logged out successfully",
        },
        200,
      );
    } catch (error) {
      console.error(error);
      return c.json?.(
        {
          status: 500,
          message: "Internal server error",
          error: error instanceof Error ? error.message : error,
        },
        500,
      );
    }
  }
  public async forgotPassword(c: AppContext) {
    try {
      const auth = c.body as PickForgotPassword;
      const { email, phone } = auth;
      if (!auth.email && !auth.phone) {
        return c.json?.(
          {
            status: 400,
            message: "Email Required",
          },
          400,
        );
      }
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { phone }],
        },
      });

      if (!user) {
        return c.json?.(
          {
            status: 404,
            message: "Email & Phone Not Found",
          },
          404,
        );
      }
      let newForgot;
      if (email) {
        const otp = generateOtp(6);
        const otpExpiress = new Date(Date.now() + 5 * 60 * 1000);
        await sendOTPEmail(auth.email, otp);

        newForgot = await prisma.user.update({
          where: {
            email: auth.email,
          },
          data: {
            otp: otp,
            expOtp: otpExpiress,
          },
        });

        return c.json?.(
          {
            status: 200,
            data: sanitizeUser(newForgot),
            message: "successfully found email",
          },
          200,
        );
      }
      if (phone) {
        newForgot = await prisma.user.findFirst({
          where: {
            phone: phone,
          },
        });
        return c.json?.(
          {
            status: 200,
            message: "successfully found phone",
            data: newForgot ? sanitizeUser(newForgot) : null,
          },
          200,
        );
      }
    } catch (error) {
      console.error(error);
      return c.json?.(
        {
          status: 500,
          message: "Server Internal Error",
          error: error instanceof Error ? error.message : error,
        },
        500,
      );
    }
  }
  public async verifyOtp(c: AppContext) {
    try {
      const auth = c.body as PickVerify;
      if (!auth.email || !auth.otp) {
        return c.json?.(
          {
            status: 400,
            message: "Email & Otp requaired",
          },
          400,
        );
      }
      const user = await prisma.user.findFirst({
        where: {
          email: auth.email,
          otp: auth.otp,
        },
      });

      if (!user) {
        return c.json?.(
          {
            status: 404,
            message: "Email or OTP Not Found / OTP Failed",
          },
          404,
        );
      }

      if (user.expOtp && new Date() > new Date(user.expOtp)) {
        return c.json?.(
          {
            status: 400,
            message: "OTP has expired. Please request a new one.",
          },
          400,
        );
      }

      const updateUser = await prisma.user.update({
        where: { id: user!.id },
        data: { isVerify: true, otp: null, expOtp: null },
      });

      return c.json?.(
        {
          status: 200,
          message: "OTP verified successfully",
          data: sanitizeUser(updateUser),
        },
        200,
      );
    } catch (error) {
      console.error(error);
      return c.json?.(
        {
          status: 500,
          message: "Server Internal Error",
          error: error instanceof Error ? error.message : error,
        },
        500,
      );
    }
  }

  public async resendOtp(c: AppContext) {
    try {
      const auth = c.body as PickSendOtp;
      if (!auth.email) {
        return c.json?.(
          {
            status: 400,
            message: "Email is required",
          },
          400,
        );
      }
      const user = await prisma.user.findFirst({
        where: {
          email: auth.email,
        },
      });

      if (!user) {
        return c.json?.(
          {
            status: 404,
            message: "Account Not Found",
          },
          404,
        );
      }

      const otp = generateOtp(6);
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

      const newOtp = await prisma.user.update({
        where: { id: user.id },
        data: { otp: otp, expOtp: otpExpires },
      });

      await sendOTPEmail(auth.email, otp);

      return c.json?.(
        {
          status: 200,
          message: "OTP resent successfully",
          data: sanitizeUser(newOtp),
        },
        200,
      );
    } catch (error) {
      console.error(error);
      return c.json?.(
        {
          status: 500,
          message: "Server Internal Error",
          error: error instanceof Error ? error.message : error,
        },
        500,
      );
    }
  }
  public async resetPassword(c: AppContext) {
    try {
      const auth = c.body as PickResetPassword;
      const { email, phone } = auth;
      if (!auth.password) {
        return c.json?.(
          {
            status: 400,
            message: "New password is required",
          },
          400,
        );
      }
      if (!auth.email && !auth.phone) {
        return c.json?.(
          {
            status: 400,
            message: "email or phone is required",
          },
          400,
        );
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { phone }],
        },
      });
      if (!user) {
        return c.json?.(
          {
            status: 404,
            message: "Account not found",
          },
          404,
        );
      }
      if (!user.isVerify) {
        return c.json?.(
          {
            status: 400,
            message: "Account not verified",
          },
          400,
        );
      }

      const hashedPassword = await bcryptjs.hash(auth.password, 10);

      const newPassword = await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return c.json?.(
        {
          status: 200,
          message: "Password reset successfully",
          data: sanitizeUser(newPassword),
        },
        200,
      );
    } catch (error) {
      console.error(error);
      return c.json?.(
        {
          status: 500,
          message: "Server Internal Error",
          error: error instanceof Error ? error.message : error,
        },
        500,
      );
    }
  }
  // public async LoginWithGoogle(c: AppContext) {
  //   try {
  //     const { code } = c.body as { code: string };

  //     if (!code) {
  //       return c.json?.(
  //         {
  //           status: 400,
  //           message: "Google authorization code is required",
  //         },
  //         400,
  //       );
  //     }

  //     const tokenResponse = await axios.post(
  //       "https://oauth2.googleapis.com/token",
  //       {
  //         code,
  //         client_id: process.env.GOOGLE_CLIENT_ID,
  //         client_secret: process.env.GOOGLE_CLIENT_SECRET,
  //         redirect_uri: "postmessage",
  //         grant_type: "authorization_code",
  //       },
  //       {
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //       },
  //     );

  //     const { id_token } = tokenResponse.data;

  //     if (!id_token) {
  //       return c.json?.(
  //         {
  //           status: 400,
  //           message: "Failed to retrieve Google id_token",
  //         },
  //         400,
  //       );
  //     }

  //     const ticket = await googleClient.verifyIdToken({
  //       idToken: id_token,
  //       audience: process.env.GOOGLE_CLIENT_ID,
  //     });

  //     const payload = ticket.getPayload();

  //     if (!payload || !payload.email) {
  //       return c.json?.(
  //         {
  //           status: 400,
  //           message: "Invalid Google token payload",
  //         },
  //         400,
  //       );
  //     }

  //     const { email, name } = payload;

  //     let user = await prisma.user.findUnique({
  //       where: { email },
  //     });

  //     if (!user) {
  //       user = await prisma.user.create({
  //         data: {
  //           email,
  //           fullName: name ?? "Google User",
  //           role: "PARENT",
  //           isVerify: true,
  //           password: null,
  //         },
  //       });
  //     }

  //     await prisma.userSession.deleteMany({
  //       where: { userId: user.id },
  //     });

  //     const ipAddress =
  //       c.headers["x-forwarded-for"]?.split(",")[0] ||
  //       c.headers["x-real-ip"] ||
  //       c.headers["cf-connecting-ip"] ||
  //       "unknown";

  //     const session = await prisma.userSession.create({
  //       data: {
  //         userId: user.id,
  //         userAgent: c.headers["user-agent"] ?? "unknown",
  //         ipAddress,
  //         expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  //       },
  //     });

  //     if (!process.env.JWT_SECRET) {
  //       throw new Error("JWT_SECRET not set");
  //     }

  //     const jwtPayload: JwtPayload = {
  //       id: user.id,
  //       sessionId: session.id,
  //       role: user.role,
  //     };

  //     const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
  //       expiresIn: "1d",
  //     });

  //     await prisma.user.update({
  //       where: { id: user.id },
  //       data: { token },
  //     });

  //     return c.json?.(
  //       {
  //         status: 200,
  //         message: "Login with Google successfully",
  //         data: {
  //           ...sanitizeUser(user),
  //           token,
  //         },
  //       },
  //       200,
  //     );
  //   } catch (error) {
  //     console.error(error);
  //     return c.json?.(
  //       {
  //         status: 500,
  //         message: "Server Internal Error",
  //         error: error instanceof Error ? error.message : error,
  //       },
  //       500,
  //     );
  //   }
  // }
}

export default new AuthController();
