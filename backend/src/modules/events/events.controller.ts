import { Controller, Post, Body, Req, Res, HttpCode } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private svc: EventsService) {}

  @Post()
  @HttpCode(202)
  async log(@Body() body: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const userId    = req.user?.id || null;
    const sessionId = body.sessionId || req.headers['x-session-id'] || 'anon';
    // Fire-and-forget — do not await, return immediately
    this.svc.logEvent({ ...body, userId, sessionId }).catch(() => {});
    return { ok: true };
  }

  @Post('batch')
  @HttpCode(202)
  async logBatch(@Body() body: { events: any[] }, @Req() req: any) {
    const userId    = req.user?.id || null;
    const sessionId = req.headers['x-session-id'] || 'anon';
    this.svc.logBatch(body.events.map(e => ({ ...e, userId, sessionId }))).catch(() => {});
    return { ok: true };
  }
}
