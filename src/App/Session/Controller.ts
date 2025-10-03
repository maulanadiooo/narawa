import Elysia from "elysia";
import { SessionCreateDto } from "./Session.types";
import { SessionService } from "./Service";
const sessionService = new SessionService();

export const SessionController = new Elysia({ prefix: "/sessions" })
    .post("/create", async ({ set, body }) => {
        return sessionService.CreateSession({ set, body })
    }, {
        body: SessionCreateDto
    })