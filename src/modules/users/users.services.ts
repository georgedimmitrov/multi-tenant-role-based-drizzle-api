import { InferModel, and, eq } from "drizzle-orm";
import argon2 from "argon2";
import { roles, users, usersToRoles } from "../../db/schema";
import { db } from "../../db";

export async function createUser(data: InferModel<typeof users, "insert">) {
  const hashedPassword = await argon2.hash(data.password);

  const result = await db
    .insert(users)
    .values({
      ...data,
      password: hashedPassword,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      applicationId: users.applicationId,
    });

  return result[0];
}

export async function getUsersByApplication(applicationId: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.applicationId, applicationId));

  return result;
}

export async function assignRoleToUser(
  data: InferModel<typeof usersToRoles, "insert">
) {
  const result = await db.insert(usersToRoles).values(data).returning();

  return result[0];
}

export async function getUserByEmail({
  email,
  applicationId,
}: {
  email: string;
  applicationId: string;
}) {
  const result = await db
    // SELECT FROM users
    // WHERE users.email = email AND users.applicationId = applicationId
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      applicationId: users.applicationId,
      roleId: roles.id,
      password: users.password,
      permissions: roles.permissions,
    })
    .from(users)
    .where(and(eq(users.email, email), eq(users.applicationId, applicationId)))
    // LEFT JOIN usersToRoles
    // ON usersToRoles.userId = users.id
    // AND usersToRoles.applicationId = users.applicationId
    .leftJoin(
      usersToRoles,
      and(
        eq(usersToRoles.userId, users.id),
        eq(usersToRoles.applicationId, users.applicationId)
      )
    )
    // LEFT JOIN roles
    // ON roles.id = usersToRoles.roleId
    .leftJoin(roles, eq(roles.id, usersToRoles.roleId));

  if (!result.length) {
    return null;
  }

  const user = result.reduce((acc, curr) => {
    if (!acc.id) {
      return {
        ...curr,
        permissions: new Set(curr.permissions),
      };
    }

    if (!curr.permissions) {
      return acc;
    }

    for (const permission of curr.permissions) {
      acc.permissions.add(permission);
    }

    return acc;
  }, {} as Omit<(typeof result)[number], "permissions"> & { permissions: Set<string> });

  return { ...user, permissions: Array.from(user.permissions) };
}
