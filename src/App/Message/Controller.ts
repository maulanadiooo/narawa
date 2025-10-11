import Elysia from "elysia";
import { sessionMiddleware } from "../../Middleware/session.middleware";
import { GetMessageQuery } from "./Message.types";
import { MessageService } from "./Service";
import { SessionParamsDto } from "../Session/Session.types";

const messageService = new MessageService();
export const MessageController = new Elysia({ prefix: "/message" })
    .use(sessionMiddleware)
    .get("/", async ({ set, session, query, params }) => {
        return messageService.GetMessage({ query, session, set, params });
    }, {
        query: GetMessageQuery,
        params: SessionParamsDto,
        detail: {
            tags: ['Message'],
            description: "Get message with pagination, only available if message is stored, set env SAVE_HISTORY_MESSAGE=true"
        }
    })