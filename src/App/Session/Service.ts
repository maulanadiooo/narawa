import { ResponseApiSuccess } from "../../Helper/ResponseApi";
import SessionManager from "../../Session/SessionManager";
import { ISessionCreate } from "./Session.types";

export class SessionService extends SessionManager {

    CreateSession = async (props: ISessionCreate) => {
        const { set, body } = props;
        const { sessionName } = body;
        const session = await this.createSession(sessionName);

        return ResponseApiSuccess({
            set, data: {
                id: session.id,
                sessionName: session.sessionName,
                status: session.status
            }
        })
    }
}