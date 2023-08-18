import { FastifyInstance } from "fastify";
import { createRoleJsonSchema } from "./roles.schemas";
import { createRoleHandler } from "./roles.controllers";

export async function roleRoutes(app: FastifyInstance) {
  app.post("/", { schema: createRoleJsonSchema }, createRoleHandler);
}
