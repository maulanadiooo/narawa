import Elysia from "elysia";
import { SessionParamsDto } from "../Session.types";
import { ReadBodyDto, SendImageDto, SendTextBody, TypingBodyDto } from "./Chat.types";
import { ChatService } from "./Service";
import { ApiKeyHeader } from "../../../Helper/GlobalInterfaceService";
const chatService = new ChatService();

export const ChatController = new Elysia({ prefix: "/chat" })

    .post("/send-text", async ({ set, body, params }) => {
        return chatService.SendText({ set, body, params })
    }, {
        body: SendTextBody,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Chat'],
            description: "Send Text Message"
        }
    })
    .post("/send-image", async ({ set, body, params }) => {
        return chatService.SendImage({ set, body, params })
    }, {
        body: SendImageDto,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Chat'],
            description: "Send Image Message"
        }
    })
    .post("/send-document", async ({ set, body, params }) => {
        return chatService.SendDocument({ set, body, params })
    }, {
        body: SendImageDto,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Chat'],
            description: "Send Document Message"
        }
    })
    .patch("/read", async ({ set, body, params }) => {
        return chatService.Read({ set, body, params })
    }, {
        body: ReadBodyDto,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Chat'],
            description: "Mark as Read"
        }
    })
    .post("/typing", async ({ set, body, params }) => {
        return chatService.Typing({ set, body, params })
    }, {
        body: TypingBodyDto,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Chat'],
            description: "Show Typing"
        }
    })
    .patch("/stop-typing", async ({ set, body, params }) => {
        return chatService.StopTyping({ set, body, params })
    }, {
        body: TypingBodyDto,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Chat'],
            description: "Stop Typing"
        }
    })