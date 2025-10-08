# NaraWa - WhatsApp API using Baileys & Elysia.js

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0%2B-black.svg)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)

> A robust, production-ready WhatsApp API implementation built with Baileys and Elysia.js, featuring multi-session support, MySQL database integration, and comprehensive webhook functionality.

## Features

### Core Features
- **Multi-Session Support** - Manage multiple WhatsApp accounts simultaneously
- **QR Code Authentication** - Secure WhatsApp Web-based authentication
- **MySQL Integration** - Persistent session storage and management
- **Webhook Support** - Real-time message and event notifications
- **API Key Authentication** - Secure API access with SHA512 hashing
- **Media Handling** - Support for images, documents, and file uploads
- **S3 Storage** - Optional AWS S3 integration for media storage
- **Auto-reconnection** - Intelligent session recovery and reconnection
- **Comprehensive Logging** - Structured logging with Pino
- **OpenAPI Documentation** - Auto-generated API documentation

### Message Features
- **Send Text Messages** - Rich text messaging with formatting
- **Send Images** - Image sharing with captions
- **Send Documents** - File sharing capabilities
- **Read Receipts** - Mark messages as read
- **Typing Indicators** - Show/hide typing status
- **Message Quotes** - Reply to specific messages
- **Message Status** - Track delivery and read status

## Prerequisites

- **Bun** 1.2.20+ or **Node.js** 18+
- **MySQL** 8+
- **WhatsApp Account** (for authentication)

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/narawa.git
cd narawa
```

### 2. Install Dependencies
```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

### 3. Environment Configuration
Copy the example environment file and configure it:
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=whatsapp_sessions

# Server Configuration
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info

# API Security
KEY_SHA512=your_sha512_hashed_api_key

# Application URL
WEBSITE_URL=http://localhost:3000

# Media Storage
SAVE_MEDIA=true
SAVE_MEDIA_TO=local # or 's3'

# S3 Configuration (if using S3)
S3_URL=your_s3_endpoint
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_ENDPOINT=your_s3_endpoint
S3_BUCKET_NAME=your_bucket_name
S3_REGION=your_region
```

### 4. Database Setup
The application will automatically create the required database tables on first run. Ensure your MySQL database exists and is accessible.

### 5. Generate API Key
Generate a secure API key and its SHA512 hash:
```bash
# Example: Generate SHA512 hash of your API key
echo -n "your_secret_api_key" | sha512sum
```

## Usage

### Development Mode
```bash
bun run dev
```

The server will start on `http://localhost:3000` (or your configured port).

## API Documentation

### Authentication
All API requests require the `x-apikey` header with your API key:
```bash
curl -H "x-apikey: your_secret_api_key" http://localhost:3000/api/sessions
```

### Core Endpoints

#### Session Management

**Create a New Session**
```http
POST /api/sessions/create
Content-Type: application/json
x-apikey: your_api_key

{
  "sessionName": "my_session",
  "webhookUrl": "https://your-webhook-url.com/webhook"
}
```

**Get QR Code**
```http
GET /api/sessions/{sessionName}/qr?is_image=true
x-apikey: your_api_key
```

**Check Session Status**
```http
GET /api/sessions/{sessionName}/status
x-apikey: your_api_key
```

**Restart Session**
```http
PATCH /api/sessions/{sessionName}
x-apikey: your_api_key
```

**Delete Session**
```http
DELETE /api/sessions/{sessionName}
x-apikey: your_api_key
```

#### Messaging

**Send Text Message**
```http
POST /api/sessions/{sessionName}/chat/send-text
Content-Type: application/json
x-apikey: your_api_key

{
  "to": "1234567890@s.whatsapp.net",
  "text": "Hello, World!",
  "quotedMessageId": "optional_message_id"
}
```

**Send Image**
```http
POST /api/sessions/{sessionName}/chat/send-image
Content-Type: application/json
x-apikey: your_api_key

{
  "to": "1234567890@s.whatsapp.net",
  "imageUrl": "url",
  "caption": "Optional caption"
}
```

**Send Document**
```http
POST /api/sessions/{sessionName}/chat/send-document
Content-Type: application/json
x-apikey: your_api_key

{
  "to": "1234567890@s.whatsapp.net",
  "fileUrl": "url"
}
```

**Mark as Read**
```http
PATCH /api/sessions/{sessionName}/chat/read
Content-Type: application/json
x-apikey: your_api_key

{
  "to": "1234567890@s.whatsapp.net",
  "messageIds": "array_of_message_ids" # optional, if null all stored message will read
}
```

**Show Typing**
```http
POST /api/sessions/{sessionName}/chat/typing
Content-Type: application/json
x-apikey: your_api_key

{
  "to": "1234567890@s.whatsapp.net"
}
```

**Stop Typing**
```http
PATCH /api/sessions/{sessionName}/chat/stop-typing
Content-Type: application/json
x-apikey: your_api_key

{
  "to": "1234567890@s.whatsapp.net"
}
```

### Response Format

All API responses follow this structure:
```json
{
  "status": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    // Response data here
  }
}
```

Error responses:
```json
{
  "status": false,
  "statusCode": 400,
  "message": "Error description",
}
```

## Webhook Events

Configure webhook URLs to receive real-time updates:

### Exapmle Webhook Format
```json
{
  "id": "123123123",
  "sessionId": "my_session",
  "eventType": "session.connected",
  "timestamp": "unix_teimstamp",
  "data": object_event_data
}
```

## Project Structure

```
src/
 App/
    Session/
        Chat/
           Controller.ts      # Chat endpoint controllers
           Service.ts         # Chat business logic
           Chat.types.ts      # Chat type definitions
        Controller.ts          # Session endpoint controllers
        Service.ts             # Session business logic
        Session.types.ts       # Session type definitions
 Config/
    database.ts                # Database configuration
    init_sql.ts               # Database initialization
 Helper/
    Crypto.ts                  # Encryption utilities
    PrintConsole.ts           # Logging utilities
    ResponseApi.ts            # API response helpers
    ResponseError.ts          # Error handling
    ServerInstance.ts         # Server utilities
    UploadFileToS3.ts         # S3 upload functionality
    uuid.ts                   # UUID generation
 Middleware/
    apikey.middleware.ts      # API key authentication
 Models/
    Session.ts                # Session database model
 Routes/
    api.ts                    # API route definitions
 Session/
    MysqlAuth.ts              # MySQL authentication store
    SessionManager.ts         # Core session management
    utils.ts                  # Session utilities
 Types/
    index.ts                  # Global type definitions
 Webhook/
    WebhookService.ts         # Webhook functionality
 index.ts                      # Application entry point
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Database host | localhost | Yes |
| `DB_PORT` | Database port | 3306 | Yes |
| `DB_USER` | Database username | root | Yes |
| `DB_PASSWORD` | Database password | | Yes |
| `DB_NAME` | Database name | whatsapp_sessions | Yes |
| `PORT` | Server port | 3000 | No |
| `NODE_ENV` | Environment | development | No |
| `LOG_LEVEL` | Logging level | info | No |
| `KEY_SHA512` | API key hash | | Yes |
| `WEBSITE_URL` | Application URL | | Yes |
| `SAVE_MEDIA` | Save media files | false | No |
| `SAVE_MEDIA_TO` | Media storage type | local | No |
| `S3_*` | S3 configuration | | If using S3 |

##  Security

- **API Key Authentication**: All endpoints require valid API key
- **SHA512 Hashing**: API keys are hashed for security
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Secure error responses without sensitive data
- **CORS Configuration**: Configurable CORS policies

##  Troubleshooting

### Common Issues

**1. Database Connection Failed**
- Verify database credentials in `.env`
- Ensure MySQL server is running
- Check network connectivity

**2. QR Code Not Generated**
- Check if session exists
- Verify session status is `qr_required`
- Restart the session if needed

**3. Webhook Not Receiving Events**
- Verify webhook URL is accessible
- Check webhook URL format
- Monitor server logs for errors

**4. API Key Authentication Failed**
- Verify API key matches the hashed value
- Check `x-apikey` header format
- Regenerate API key if needed

### Debug Mode
Enable debug logging:
```env
LOG_LEVEL=debug
```

## > Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain comprehensive error handling
- Add appropriate logging
- Update documentation for new features
- Write tests for new functionality

## License

This project is licensed under the MIT License.

##  Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API implementation
- [Elysia.js](https://elysiajs.com/) - Fast and lightweight web framework
- [Bun](https://bun.sh/) - Fast JavaScript runtime


## Changelog

### v1.0.0
- Initial release
- Multi-session support
- MySQL integration
- Webhook functionality
- Media handling
- API key authentication

---
