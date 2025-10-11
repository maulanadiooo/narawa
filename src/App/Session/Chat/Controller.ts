import Elysia from "elysia";
import { SessionParamsDto } from "../Session.types";
import { ReadBodyDto, SendImageDto, SendTextBody, TypingBodyDto } from "./Chat.types";
import { ChatService } from "./Service";
import { ApiKeyHeader } from "../../../Helper/GlobalInterfaceService";
import { sessionMiddleware } from "../../../Middleware/session.middleware";
const chatService = new ChatService();

export const ChatController = new Elysia({ prefix: "/chat" })
    .use(sessionMiddleware)
    .post("/send-text", async ({ set, body, params, session }) => {
        return chatService.SendText({ set, body, params, session })
    }, {
        body: SendTextBody,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Chat'],
            description: "Send Text Message"
        }
    })
    .post("/send-image", async ({ set, body, params, session }) => {
        return chatService.SendImage({ set, body, params, session })
    }, {
        body: SendImageDto,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Chat'],
            description: "Send Image Message"
        }
    })
    .post("/send-document", async ({ set, body, params, session }) => {
        return chatService.SendDocument({ set, body, params, session })
    }, {
        body: SendImageDto,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Chat'],
            description: "Send Document Message"
        }
    })
    .patch("/read", async ({ set, body, params, session }) => {
        return chatService.Read({ set, body, params, session })
    }, {
        body: ReadBodyDto,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Chat'],
            description: "Mark as Read"
        }
    })
    .post("/typing", async ({ set, body, params, session }) => {
        return chatService.Typing({ set, body, params, session })
    }, {
        body: TypingBodyDto,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Chat'],
            description: "Show Typing"
        }
    })
    .patch("/stop-typing", async ({ set, body, params, session }) => {
        return chatService.StopTyping({ set, body, params, session })
    }, {
        body: TypingBodyDto,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Chat'],
            description: "Stop Typing"
        }
    })