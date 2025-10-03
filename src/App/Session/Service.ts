import { printConsole, sessionManager } from "../..";
import { ResponseApiSuccess } from "../../Helper/ResponseApi";
import { ErrorResponse } from "../../Helper/ResponseError";
import { IDeleteSession, IGetQrData, IGetStatus, IRestartSession, ISendText, ISessionCreate } from "./Session.types";
import qrcode from 'qrcode';
export class SessionService {

    constructor() {
       
    }

    private checkSession = async (sessionName: string) => {
        const session = await sessionManager.sessionModel.findBySessionName(sessionName);
        if (!session) {
            throw new ErrorResponse(404, "SESSION_NOT_FOUND", "Session not found");
        }
        return session;
    }

    CreateSession = async (props: ISessionCreate) => {
        const { set, body } = props;
        const { sessionName, webhookUrl } = body;
        const session = await sessionManager.createSession(sessionName, webhookUrl);

        return ResponseApiSuccess({
            set, data: {
                id: session.id,
                sessionName: session.sessionName,
                status: session.status
            }
        })
    }

    GetQrData = async (props: IGetQrData) => {
        const { set, params, query } = props;
        const { sessionName } = params;
        const session = await this.checkSession(sessionName);

        if (session.status !== 'qr_required' || !session.qrCode) {
            throw new ErrorResponse(400, "SESSION_NOT_READY", `QR code not available, your session status is ${session.status}`);
        }

        if (query.is_image === "true") {
            const qrCodeBase64 = await qrcode.toDataURL(session.qrCode ?? "");
            const base64 = qrCodeBase64.split(",")[1];
            const imageBuffer = Buffer.from(base64, "base64");
            set.headers["Content-Type"] = "image/png";
            set.headers["Content-Length"] = imageBuffer.length.toString();
            set.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            set.headers["Pragma"] = "no-cache";
            set.headers["Expires"] = "0";
            return imageBuffer;
        }

        return ResponseApiSuccess({
            set, data: {
                qr: session.qrCode,
                sessionName: session.sessionName,
                status: session.status
            }
        })

    }

    GetStatus = async (props: IGetStatus) => {
        const { set, params } = props;
        const { sessionName } = params;

        await this.checkSession(sessionName);
        const sessionData = await sessionManager.getSessionStatus(sessionName);
        if (!sessionData) {
            throw new ErrorResponse(404, "SESSION_NOT_FOUND", "Session not found");
        }

        return ResponseApiSuccess({
            set,
            data: sessionData
        })
    }

    DeleteSession = async (props: IDeleteSession) => {
        const { params, set } = props;
        const { sessionName } = params;
        await this.checkSession(sessionName);
        await sessionManager.deleteSession(sessionName);
        return ResponseApiSuccess({
            set,
            data: { message: "Session deleted successfully" }
        })
    }

    RestartSession = async (props: IRestartSession) => {
        const { params, set } = props;
        const { sessionName } = params;
        await this.checkSession(sessionName);
        await sessionManager.restartSession(sessionName);
        return ResponseApiSuccess({
            set,
            data: { message: "Session restarted successfully" }
        })
    }

    SendText = async (props: ISendText) => {
        const { params, set, body } = props;
        const { sessionName } = params;
        const { to, message } = body;
        await this.checkSession(sessionName);
        await sessionManager.sendMessage(sessionName, to, message, 'text');
        return ResponseApiSuccess({
            set,
            data: { message: "Message sent successfully" }
        })
    }
}