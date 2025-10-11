import Elysia from "elysia";
import { GetQrDataQuery, PairingCodeQuery, SessionCreateDto, SessionParamsDto } from "./Session.types";
import { SessionService } from "./Service";
import { ChatController } from "./Chat/Controller";
import { ApiKeyHeader } from "../../Helper/GlobalInterfaceService";
import { sessionMiddleware } from "../../Middleware/session.middleware";
import { ContactController } from "../Contact/Controller";
import { MessageController } from "../Message/Controller";
const sessionService = new SessionService();


const HandleSessionRequest = new Elysia({ prefix: "/:sessionName" })
    .use(sessionMiddleware)
    .get("/qr", async ({ params, set, query, session }) => {
        return sessionService.GetQrData({ params, set, query, session })
    }, {
        params: SessionParamsDto,
        query: GetQrDataQuery,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Session'],
            description: "Get QR String, query is_image is optional"
        }
    })
    .get("/code", async ({ params, set, query, session }) => {
        return sessionService.GetPairingCode({ params, set, query, session })
    }, {
        params: SessionParamsDto,
        query: PairingCodeQuery,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Session'],
            description: "Get Pairing Code"
        }
    })
    .get("/status", async ({ params, set, session }) => {
        return sessionService.GetStatus({ params, set, session })
    }, {
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Session'],
            description: "Check Session Status"
        }
    })
    .delete("/", async ({ set, params, session }) => {
        return sessionService.DeleteSession({ params, set, session })
    }, {
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Session'],
            description: "Delete Session"
        }
    })
    .patch("/", async ({ set, params, session }) => {
        return sessionService.RestartSession({ params, set, session })
    }, {
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Session'],
            description: "Restart Session"
        }
    })
    .use(ChatController)
    .use(ContactController)
    .use(MessageController)

export const SessionController = new Elysia({ prefix: "/sessions" })
    .post("/create", async ({ set, body }) => {
        return sessionService.CreateSession({ set, body })
    }, {
        body: SessionCreateDto,
        headers: ApiKeyHeader, detail: {
            tags: ['Session'],
            description: `# Create session \n
webhookUrl is optional \n
## If you want using pairing code, phoneNumber is required \n
Recommended is still using QR code, sometime pairing code not work, I have no idea why

`
        }
    })
    // all start with /:sessionName
    .use(HandleSessionRequest)

