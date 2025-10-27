export namespace TWebsocket {
    export interface IWebsocketMessage {
        type: "ping" | "message" | "error" | "event" | "subs";
        event: "get_sessions" | "create_session" | "subs" | "delete_session",
        data: any
    }
}