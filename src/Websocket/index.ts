import Elysia from "elysia";
import { printConsole, sessionManager } from "..";
import { IsValidHeaderApiKey } from "../Helper/Crypto";
import { TWebsocket } from "./type";
import { WebsocketService } from "./service";
import { SessionService } from "../App/Session/Service";


const websocketService = new WebsocketService();

const sessionService = new SessionService();
export const WebsocketController = new Elysia({ prefix: "/ws" })
    .ws("/", {
        async open(ws) {
            if (Bun.env.ACTIVE_WEBSOCKET !== "true") {
                ws.close();
            }
            const data = ws.data;
            const query = data.query
            const apikey = query.key;
            if (!apikey) {
                ws.close();
            }

            if (!IsValidHeaderApiKey(apikey)) {
                ws.close();
            }
            ws.subscribe("websocket");
        },
        async message(ws, message) {
            const data = ws.data;
            const query = data.query
            const apikey = query.key;
            if (!apikey) {
                ws.close();
            }

            if (!IsValidHeaderApiKey(apikey)) {
                ws.close();
            }
            if (typeof message === "object") {
                const data = message as TWebsocket.IWebsocketMessage;
                if (data.type === "ping") {
                    ws.send("PONG");
                    return
                }
                if (data.type === "event" && data.event === "get_sessions") {
                    const sessions = await websocketService.getAllSession();
                    ws.send(JSON.stringify({
                        type: "event",
                        event: "session_list",
                        data: sessions
                    }));
                    ws.send(JSON.stringify({
                        type: "message",
                        event: "message",
                        data: {
                            type: "success",
                            message: "Sessions fetched successfully",
                        }
                    }))
                    return
                } else if (data.type === "event" && data.event === "create_session") {
                    const { sessionName, webhookUrl, rejectCall } = data.data;
                    ws.subscribe(sessionName)
                    const session = await sessionManager.createSession(sessionName, webhookUrl, undefined, rejectCall);
                    ws.send(JSON.stringify({
                        type: "event",
                        event: "session_created",
                        data: session
                    }));
                    return
                } else if (data.type === "subs" && data.event === "subs") {
                    const  dataSession  = data.data;
                    for (const session of dataSession) {
                        printConsole.info(`Subscribing to session ${session.sessionName}`);
                        ws.subscribe(session.sessionName)
                    }
                    return
                } else if (data.type === "event" && data.event === "delete_session") {
                    const { sessionName } = data.data;
                    await sessionManager.deleteSession(sessionName);
                    ws.unsubscribe(sessionName);
                    return
                }
            }
        }
    })