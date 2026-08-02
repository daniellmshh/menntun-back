import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../common/types";
import { GradesService } from "./grades.service";

const schoolId = "school-a";
const baseUser = (role: UserRole): RequestUser => ({
  id: "user-a", supabaseUid: "auth-a", email: "user@example.com", role, schoolId, firstName: "Test", lastName: "User",
});

describe("GradesService access boundaries", () => {
  const service = new GradesService();
  const findMany = jest.spyOn(prisma.studentProfile, "findMany");

  beforeEach(() => findMany.mockReset());

  it("limits parent students to ParentStudent links in the active school", async () => {
    findMany.mockResolvedValue([] as never);
    await service.getMyStudents(baseUser(UserRole.PARENT));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        user: { schoolId },
        parentLinks: { some: { parentProfile: { userId: "user-a" } } },
      }),
    }));
  });

  it("limits a student to their own profile", async () => {
    findMany.mockResolvedValue([] as never);
    await service.getMyStudents(baseUser(UserRole.STUDENT));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-a", user: { schoolId } } }));
  });

  it("rejects roles that do not belong to the family portal", async () => {
    await expect(service.getMyStudents(baseUser(UserRole.TEACHER))).rejects.toBeInstanceOf(ForbiddenException);
    expect(findMany).not.toHaveBeenCalled();
  });
});
