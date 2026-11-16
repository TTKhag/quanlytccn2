import { v4 as uuidv4 } from 'uuid';

export const generateId = (): string => uuidv4();

export const generateTransactionId = (): string => `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;

export const generateLinkedId = (): string => `LNK-${uuidv4().slice(0, 8).toUpperCase()}`;
