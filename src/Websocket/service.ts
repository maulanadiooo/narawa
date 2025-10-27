import { serverInstance } from "../Helper/ServerInstance";
import { Session } from "../Models/Session"

const sessionModel = new Session()

export class WebsocketService {
    getAllSession = async () => {
        const sessions = await sessionModel.findAll();
        return sessions.map((session) => session.toJSON());
    }

    publishEvent = async (topic: string, data: string) => {
        if (Bun.env.ACTIVE_WEBSOCKET === "true") {
            serverInstance?.publish(topic, data)
        }
    }
}