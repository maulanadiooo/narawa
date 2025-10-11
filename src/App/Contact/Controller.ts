import Elysia from "elysia";
import { sessionMiddleware } from "../../Middleware/session.middleware";
import { ContactService } from "./Service";
import { GetContactQuery } from "./Contact.types";
import { SessionParamsDto } from "../Session/Session.types";

const contactService = new ContactService();
export const ContactController = new Elysia({ prefix: "/contact" })
    .use(sessionMiddleware)
    .get("/", async ({ set, session, query, params }) => {
        return contactService.GetContact({ query, session, set, params });
    }, {
        query: GetContactQuery,
        params: SessionParamsDto,
        detail: {
            tags: ['Contact'],
            description: "Get contact with pagination"
        }
    })