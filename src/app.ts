import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

// Config & Middleware
import { env } from '@config/env';
import { errorHandler } from '@middleware/error.middleware';
import { loggingHandler } from '@middleware/logging.middleware';
import { notFoundHandler } from '@middleware/notFound.middleware';
import { requestContextMiddleware } from '@middleware/requestContext.middleware';
import { createVisitorCookieMiddleware } from '@middleware/visitorCookie';
import { VisitorService } from '@shared/services/visitor.service';

// Modules
import { createHealthRouter } from '@modules/health';
import { createEntriesRouter } from '@modules/entries';
import { createAdminRouter } from './modules/admin/admin.routes';
import { createConfigRouter } from './modules/config/config.routes';

const app = express();
const visitorService = new VisitorService();

// 1. Security & Request Parsing Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.COOKIE_SIGNING_SECRET));

// 2. Logging Middleware
app.use(loggingHandler);
app.use(requestContextMiddleware);
app.use(createVisitorCookieMiddleware(visitorService));

// 3. API Routes
app.use('/api/v1/health', createHealthRouter());
app.use('/api/v1', createEntriesRouter());
app.use('/api/v1', createAdminRouter());
app.use('/api/v1', createConfigRouter());

// 4. 404 & Global Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
