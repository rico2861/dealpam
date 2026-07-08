import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');
  private readonly isProd = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Une erreur interne est survenue.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as any).message ?? message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      // P2002 = contrainte unique violée (ex: slug/sku déjà pris) — le nom du
      // champ est dans exception.meta.target, utile a afficher plutot qu'un
      // message generique qui ne dit pas quoi corriger.
      const target = (exception.meta as any)?.target;
      message = exception.code === 'P2002' && target
        ? `Cette valeur existe déjà (${Array.isArray(target) ? target.join(', ') : target}).`
        : 'Requête invalide.';
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      // Le message brut de Prisma pointe le champ fautif (ex: "Argument `sizes`:
      // Invalid value provided. Expected String[]…") — on l'extrait pour donner
      // un message exploitable au lieu d'un "Données invalides." muet qui ne
      // permet ni au vendeur ni a nous de savoir quel champ corriger.
      const fieldMatch = exception.message.match(/Argument `([^`]+)`/) ?? exception.message.match(/Unknown argument `([^`]+)`/);
      message = fieldMatch
        ? `Donnée invalide pour le champ "${fieldMatch[1]}".`
        : 'Données invalides.';
    }

    // Full details always go to server logs, never to the client in production
    this.logger.error(
      `${request.method} ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      statusCode: status,
      message,
      // Stack traces / raw error details never leak to the client in production
      ...(this.isProd ? {} : { debug: exception instanceof Error ? exception.message : exception }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
