import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

export async function registrarSwagger(app: FastifyInstance) {
  await app.register(swagger, { openapi: {
    info: { title: 'Greencode AV2', version: '2.0.0', description: 'Logística reversa de resíduos eletrônicos.' },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    security: [{ bearerAuth: [] }],
  } });
  await app.register(swaggerUI, { routePrefix: '/docs' });
}
