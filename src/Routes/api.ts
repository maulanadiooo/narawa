import Elysia from "elysia";
import { SessionController } from "../App/Session/Controller";
import { ApikeyMiddleware } from "../Middleware/apikey.middleware";

export const ApiController = new Elysia({prefix: "/api"})
    .use(ApikeyMiddleware)
    .use(SessionController)