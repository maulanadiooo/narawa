import Elysia from "elysia";
import { GetQrDataQuery, SendTextBody, SessionCreateDto, SessionParamsDto } from "./Session.types";
import { SessionService } from "./Service";
const sessionService = new SessionService();


const HandleSessionRequest = new Elysia({ prefix: "/:sessionName" })
    .get("/qr", async ({ params, set, query }) => {
        return sessionService.GetQrData({ params, set, query })
    }, {
        params: SessionParamsDto,
        query: GetQrDataQuery
    })
    .get("/status", async ({ params, set }) => {
        return sessionService.GetStatus({ params, set })
    }, {
        params: SessionParamsDto,
    })
    .delete("/", async ({ set, params }) => {
        return sessionService.DeleteSession({ params, set })
    }, {
        params: SessionParamsDto,
    })
    .patch("/", async ({ set, params }) => {
        return sessionService.RestartSession({ params, set })
    }, {
        params: SessionParamsDto,
    })
    .post("/send-text", async ({ set, body, params }) => {
        return sessionService.SendText({ set, body, params })
    }, {
        body: SendTextBody,
        params: SessionParamsDto
    })

export const SessionController = new Elysia({ prefix: "/sessions" })
    .post("/create", async ({ set, body }) => {
        return sessionService.CreateSession({ set, body })
    }, {
        body: SessionCreateDto
    })
    // all start with /:sessionName
    .use(HandleSessionRequest)

