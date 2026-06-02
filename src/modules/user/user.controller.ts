import { AppContext } from "@/context/appContext";
import { ErrorHandling, HttpResponse } from "@/context/error";
import prisma from "prisma/client";
import { safeUserSelect } from "@/utils/sanitizeUser";
import { JwtPayload, PickUpdateProfile } from "@/modules/auth/auth.types";

class UserController {
  /**
   * GET /user/me
   * Returns the currently authenticated user's profile
   */
  public async getMe(c: AppContext) {
    try {
      const auth = c.user as JwtPayload;
      if (!auth?.id) {
        return HttpResponse(c).unauthorized("Unauthorized");
      }

      const user = await prisma.user.findUnique({
        where: { id: auth.id },
        select: {
          ...safeUserSelect,
          location: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              city: true,
              state: true,
              country: true,
              latitude: true,
              longitude: true,
              radius: true,
              createdAt: true,
            },
          },
        },
      });

      if (!user) {
        return HttpResponse(c).notFound("User not found");
      }

      const latestLocation = user.location?.[0] ?? null;

      return HttpResponse(c).ok(
        {
          ...user,
          location: undefined,
          latestLocation,
        },
        "User profile retrieved",
      );
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }

  /**
   * PUT /user/edit-profile
   * Updates the currently authenticated user's profile
   */
  public async editProfile(c: AppContext) {
    try {
      const auth = c.user as JwtPayload;
      if (!auth?.id) {
        return HttpResponse(c).unauthorized("Unauthorized");
      }

      const body = c.body as PickUpdateProfile;

      // Build update data — only include fields that are provided
      const updateData: Record<string, any> = {};

      if (body.fullName !== undefined && body.fullName.trim() !== "") {
        updateData.fullName = body.fullName.trim();
      }

      if (body.email !== undefined) {
        // Check if email is already taken by another user
        if (body.email.trim() !== "") {
          const existingUser = await prisma.user.findFirst({
            where: {
              email: body.email.trim(),
              NOT: { id: auth.id },
            },
          });
          if (existingUser) {
            return HttpResponse(c).badRequest(
              "Email is already in use by another account",
            );
          }
          updateData.email = body.email.trim();
        }
      }

      if (body.phone !== undefined) {
        if (body.phone.trim() !== "") {
          const existingUser = await prisma.user.findFirst({
            where: {
              phone: body.phone.trim(),
              NOT: { id: auth.id },
            },
          });
          if (existingUser) {
            return HttpResponse(c).badRequest(
              "Phone number is already in use by another account",
            );
          }
          updateData.phone = body.phone.trim();
        }
      }

      if (body.avaUrl !== undefined) {
        updateData.avaUrl = body.avaUrl;
      }

      if (Object.keys(updateData).length === 0) {
        return HttpResponse(c).badRequest("No valid fields to update");
      }

      const updatedUser = await prisma.user.update({
        where: { id: auth.id },
        data: updateData,
        select: safeUserSelect,
      });

      return HttpResponse(c).ok(updatedUser, "Profile updated successfully");
    } catch (error) {
      return ErrorHandling(c, error);
    }
  }
}

export default new UserController();
