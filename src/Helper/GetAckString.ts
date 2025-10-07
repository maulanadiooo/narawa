import { proto } from "@whiskeysockets/baileys";

export const getAckString = (status: proto.WebMessageInfo.Status | null | undefined):string => {
    if (!status) {
        return 'unknown';
    }
    switch (status) {
        case proto.WebMessageInfo.Status.PENDING:
            return 'pending';
        case proto.WebMessageInfo.Status.SERVER_ACK:
            return 'sent';
        case proto.WebMessageInfo.Status.DELIVERY_ACK:
            return 'delivered';
        case proto.WebMessageInfo.Status.READ:
            return 'read';
        case proto.WebMessageInfo.Status.PLAYED:
            return 'played';
        default:
            return 'error';
    }
}