import { proto, WASocket } from '@whiskeysockets/baileys';

// Session related types
export interface ISession {
  id: string;
  sessionName: string;
  phoneNumber?: string;
  status: SessionStatus;
  qrCode?: string;
  authState?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastSeen?: Date;
  webhookUrl?: string;
}

export type SessionStatus = 'connecting' | 'connected' | 'disconnected' | 'qr_required';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface CreateSessionRequest {
  sessionName: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  sessionName: string;
  status: SessionStatus;
}

export interface QRCodeResponse {
  qrCode: string;
  sessionName: string;
  status: SessionStatus;
}

export interface SessionStatusResponse {
  sessionName: string;
  status: SessionStatus;
  phoneNumber?: string;
  isActive: boolean;
  lastSeen?: Date;
}

export interface SendMessageRequest {
  to: string;
  message: string;
}

export interface SendFileRequest {
  to: string;
  caption?: string;
}

export interface SendImageRequest {
  to: string;
  caption?: string;
}

export interface SendMessageResponse {
  messageId: string;
  to: string;
  fileName?: string;
}

// Webhook types
export interface WebhookEvent {
  id: string;
  sessionId: string;
  eventType: WebhookEventType;
  data: any;
  timestamp: string;
}

export type WebhookEventType = 
  | 'session.connected'
  | 'session.retry'
  | 'session.disconnected'
  | 'message.received'
  | 'message.update'
  | 'message.sent'
  | 'session.conflict';

export interface IWebhookSendData {
  sessionId: string;
  webhookUrl?: string;
  eventType: WebhookEventType;
  eventData: any;
}

export interface WebhookPayload {
  id: string;
  sessionId: string;
  eventType: WebhookEventType;
  data: {
    sessionName: string;
    messageId?: string;
    from?: string;
    message?: proto.IMessage;
    update?: any;
    phoneNumber?: string;
    timestamp: string;
  };
  timestamp: string;
}

export interface SetWebhookRequest {
  webhookUrl: string;
}

export interface WebhookEventsQuery {
  sessionId?: string;
  status?: 'pending' | 'sent' | 'failed';
  limit?: number;
  offset?: number;
}

// Database types
export interface SessionData {
  id: string;
  session_name: string;
  phone_number?: string;
  status: SessionStatus;
  qr_code?: string;
  auth_state?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_seen?: Date;
  webhook_url?: string;
}

export interface MessageData {
  id: string;
  session_id: string;
  message_id?: string;
  to_number: string;
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  content?: string;
  file_path?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export interface WebhookEventData {
  id: string;
  session_id: string;
  event_type: WebhookEventType;
  event_data: string;
  webhook_url?: string;
  status: 'pending' | 'sent' | 'failed';
  retry_count: number;
  created_at: Date;
}


export interface SessionManagerData {
  socket: WASocket;
  session: ISession;
  saveCreds: () => Promise<void>;
}

export interface MessageData {
  url: string;
  caption?: string;
  fileName?: string;
  mimetype?: string;
}

// Express types
export interface AuthenticatedRequest extends Request {
  session?: ISession;
}

export type ExpressHandler = (req: Request, res: Response) => Promise<void>;
export type AuthenticatedHandler = (req: AuthenticatedRequest, res: Response) => Promise<void>;

// Error types
export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Configuration types
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  webhookUrl?: string;
  logLevel: string;
  database: DatabaseConfig;
}
