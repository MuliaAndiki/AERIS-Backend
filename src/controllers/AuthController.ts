import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { verifyToken } from "@/middlewares/auth";
import {
  PickRegister,
  PickLogin,
  PickLogout,
  JwtPayload,
} from "@/types/auth.types";
import prisma from "prisma/client";

class AuthController {
  public async register(c: any) {
    try {
      const auth: PickRegister = c.body;

      if (!auth.email || !auth.fullName || !auth.password) {
        c.set.status = 400;
        return { message: "All fields are required" };
      }

      const isAlreadyRegistered = await prisma.user.findUnique({
        where: { email: auth.email },
      });

      if (isAlreadyRegistered) {
        c.set.status = 400;
        return { message: "Email already registered" };
      }

      const hashedPassword = await bcryptjs.hash(auth.password, 10);

      const newUser = await prisma.user.create({
        data: {
          email: auth.email,
          fullName: auth.fullName,
          password: hashedPassword,
          role: auth.role || "user",
        },
      });

      return {
        status: 201,
        data: newUser,
        message: "Account successfully registered",
      };
    } catch (error) {
      console.error(error);
      return { status: 500, message: "Internal server error" };
    }
  }

  public async login(c: any) {
    try {
      const auth: PickLogin = c.body;

      if (!auth.email || !auth.password) {
        return c.json({ status: 400, message: "All fields are required" }, 400);
      }

      const user = await prisma.user.findUnique({
        where: { email: auth.email },
      });
      if (!user)
        return c.json({ status: 404, message: "Account not found" }, 404);

      const validatePassword = await bcryptjs.compare(
        auth.password,
        user.password
      );
      if (!validatePassword)
        return c.json({ status: 400, message: "Wrong email or password" }, 400);

      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      };
      if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      await prisma.user.update({ where: { id: user.id }, data: { token } });

      return c.json({
        status: 200,
        data: { ...user, token },
        message: "Login successfully",
      });
    } catch (error) {
      console.error(error);
      return c.json({ status: 500, message: "Internal server error" }, 500);
    }
  }

  public logout = [
    verifyToken(),
    async (c: any) => {
      try {
        const { id }: PickLogout = c.user;
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user)
          return c.json({ status: 404, message: "Account not found" }, 404);

        await prisma.user.update({ where: { id }, data: { token: null } });
        return c.json({
          status: 200,
          message: "Account logged out successfully",
        });
      } catch (error) {
        console.error(error);
        return c.json({ status: 500, message: "Internal server error" }, 500);
      }
    },
  ];
}

export default new AuthController();
