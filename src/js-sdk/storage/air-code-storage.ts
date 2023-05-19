import { logger } from '@/js-sdk/lib/logger';
import { MessageData, PromptData, StorageManager } from '@/js-sdk/typings';

const { db } = require('aircode');
const MessageDB = db.table('t_message');
const EventDB = db.table('t_event');
const PromptDB = db.table('t_prompt');

export default class AirCodeStorage implements StorageManager {
    async clearAllBySessionId(sessionId: string) {
        return await MessageDB.where({ sessionId }).delete();
    }

    async isSameEvent(eventId: string): Promise<boolean> {
        if (!eventId) return false;
        const count = await EventDB.where({ eventId }).count();
        if (count === 0) await EventDB.save({ eventId });
        return count > 0;
    }

    async findMessagesBySessionId(sessionId: string): Promise<Array<MessageData>> {
        return await MessageDB.where({ sessionId }).sort({ createdAt: 1 }).find();
    }

    async findLastMessagesBySessionId(sessionId: string): Promise<MessageData> {
        return await MessageDB.where({ sessionId }).sort({ createdAt: -1 }).findOne();
    }

    async saveMessage(data: MessageData): Promise<void> {
        return await MessageDB.save(data);
    }

    async clearEventData(): Promise<void> {
        const from = new Date(Date.now() - 3 * 60 * 60 * 1000);
        return await EventDB.where({
            createdAt: db.lt(from)
        }).delete();
    }

    async findPromptByTitle(title: string): Promise<PromptData> {
        return await PromptDB.where({ title }).findOne();
    }
}
