import { Static, t } from "elysia";
import { IGlobalInterfaceService } from "../../Helper/GlobalInterfaceService";

export const SessionCreateDto = t.Object({
    sessionName: t.String({
        error: "Session name is required"
    })
})

export interface ISessionCreate extends IGlobalInterfaceService {
    body: Static<typeof SessionCreateDto>
}