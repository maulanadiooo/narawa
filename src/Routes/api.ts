import Elysia from "elysia";
import { SessionController } from "../App/Session/Controller";

export const ApiController = new Elysia({prefix: "/api"})
    .use(SessionController)