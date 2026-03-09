import app from "@/app";
import jwt from "jsonwebtoken";
import prisma from "prisma/client";

export const initSocket = () => {
  app.ws("/ws", {
    async message(ws, message: unknown) {
      try {
        const data = JSON.parse(message as string);

        if (data.type !== "auth") return;

        const token = data.token;
        if (!token) {
          ws.close();
          return;
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
          id: string;
        };

        const user = await prisma.user.findUnique({
          where: { id: payload.id },
          select: { id: true },
        });

        if (!user) {
          ws.close();
          return;
        }

        ws.subscribe(`user:${user.id}`);
      } catch (err) {
        console.error("WS auth error", err);
        ws.close();
      }
    },
  });
};
