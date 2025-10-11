import Elysia from "elysia";
import { ErrorResponse } from "../Helper/ResponseError";
import { sessionManager } from "..";
import { ISession } from "../Types";

export const sessionMiddleware = new Elysia({ name: "sessionMiddleware" })
    .derive({ as: "scoped" }, async ({ params }): Promise<{ session: ISession }> => {
        const { sessionName } = params;
        if (!sessionName) {
            throw new ErrorResponse(400, "SESSION_NAME_REQUIRED", "Session name is required");
        }

        const session = await sessionManager.sessionModel.findBySessionName(sessionName);
        if (!session) {
            throw new ErrorResponse(404, "SESSION_NOT_FOUND", "Session not found");
        }
        return { session };
    })