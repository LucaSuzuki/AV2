import { PrismaClient, Prisma } from '../generated/prisma/client';
export type PrismaClientOuTx = PrismaClient | Prisma.TransactionClient;
export interface Ator { sub: string; usuario: string; papel: string; jti?: string; }
