import { AI, MessageData, StorageManager } from '@/js-sdk/typings';
import { CardParams, MessageCenter } from '@/js-sdk/typings/typing-message';
import { POST_URL } from '@/js-sdk/config';
import axios from 'axios';

export default class Controller {
    private readonly storage: StorageManager;
    private readonly messageCenter: MessageCenter;
    private readonly ai: AI;

    constructor(storage: StorageManager, ai: AI, messageCenter: MessageCenter) {
        this.messageCenter = messageCenter;
        this.storage = storage;
        this.ai = ai;
    }

    private get isInnerCommand() {
        const commands = ['/end', '/help'];
        return commands.includes(this.messageCenter.content);
    }

    async handleCardMessage(params: CardParams) {
        const { type, data } = await this.messageCenter.onCardMessageCommand(params);
        //发送http请求
        if (POST_URL) {
            axios.post(POST_URL, data);
        } else {
            await this[type]();
        }
    }

    async onMessage() {
        try {
            //没有@机器人的群聊消息
            if (this.messageCenter.notMentionedGroupMessage) return;

            //重复事件通知校验
            const sameEvent = await this.storage.isSameEvent(this.messageCenter.eventId);
            if (sameEvent) return;

            // 不是文本消息，不处理
            if (!this.messageCenter.isTextMessage) {
                await this.messageCenter.replyTextMessage('仅支持回复纯文本类型的消息');
                return;
            }

            //回复内置指令消息
            if (this.isInnerCommand) {
                const command = this.messageCenter.content.substring(1);
                await this[command]();
                return;
            }

            //回复AI消息
            await this.sendAIMessage();
        } catch (error) {
            console.log(`ID:onMessage，error：`, error);
        }
    }

    private async transformByPrompt(question: string) {
        const matches = question.match(/^#(.+?)\s(.*)/);
        if (!matches) return question;
        const title = matches[1];
        const rest = matches[2];
        if (!rest) return question;
        const data = await this.storage.findPromptByTitle(title);
        if (!data) return question;
        return data.prompt.replace('{content}', rest);
    }

    private async sendAIMessage() {
        const sessionId = this.messageCenter.sessionId;
        const question = await this.transformByPrompt(this.messageCenter.content);

        //历史记录
        const historyList = await this.storage.findMessagesBySessionId(sessionId);

        //判定是否为重新回答问题
        const repeatLast = await this.sendRepeatMessage(historyList, question);

        //取消最后一次会话的按钮
        const title = `本轮会话第${historyList.length + 1}回合`;
        if (!repeatLast) {
            await Promise.all([
                this.messageCenter.sendUniqueCardMessage({
                    title,
                    content: '思考中，请稍候…',
                    throttle: false
                }),
                this.finishLastState(historyList[historyList.length - 1])
            ]);
        }

        const res = await this.ai.getAnswer(historyList, question, async data => {
            if (!data.content && !data.finished) return;
            const content = data.fullContent;
            //持续更新答案
            if (!data.finished) {
                await this.messageCenter.sendUniqueCardMessage({ title, content, throttle: true });
                return;
            }

            //发送最终的结果
            await this.messageCenter.sendUniqueCardMessage({
                title,
                content,
                throttle: true,
                actions: [
                    {
                        btnText: '再问一遍',
                        type: 'onMessage',
                        data: this.messageCenter.params
                    },
                    {
                        btnText: '结束本轮会话',
                        type: 'end',
                        data: {
                            ...this.messageCenter.params,
                            actionData: {
                                title,
                                content
                            }
                        }
                    }
                ]
            });

            //存储答案
            if (!data.isError) {
                await this.storage.saveMessage({
                    _id: repeatLast?._id,
                    sessionId: this.messageCenter.sessionId,
                    question,
                    answer: data.fullContent,
                    cardMessageId: this.messageCenter.cardMessageId,
                    sort: historyList.length + 1
                });
            }
        });
    }

    private async sendRepeatMessage(historyList: MessageData[], question: string): Promise<MessageData> {
        //判定是否为重新回答问题
        const repeatLast = this.findRepeatLast(historyList, question);
        if (!repeatLast) return null;

        //继续更新之前的卡片
        this.messageCenter.setCardMessageId(repeatLast.cardMessageId);

        //删除最新的消息记录
        historyList.pop();

        //取消最后一次会话的按钮
        const title = `本轮会话第${historyList.length + 1}回合`;
        await this.messageCenter.sendUniqueCardMessage({
            title,
            content: '思考中，请稍候…',
            throttle: false
        });

        return repeatLast;
    }

    private findRepeatLast(historyList: MessageData[], question: string) {
        const last = historyList[historyList.length - 1];
        return !last || last.question !== question ? undefined : last;
    }

    /**
     * 隐藏最后一次会话按钮
     */
    private async finishLastState(last: MessageData) {
        if (!last?.cardMessageId) return;
        return await this.messageCenter.updateCardMessageById(last.cardMessageId, {
            title: `本轮会话第${last.sort}回合`,
            content: last.answer
        });
    }

    /**
     * 结束上一轮对话，开始新的对话
     */
    private async end() {
        const sessionId = this.messageCenter.sessionId;
        const last = await this.storage.findLastMessagesBySessionId(sessionId);
        await Promise.allSettled([
            this.finishLastState(last),
            this.messageCenter.sendTextMessage(
                '本轮会话已结束，非常感谢您的信任，如果您有其他的问题或需求，请随时联系我。'
            ),
            this.storage.clearAllBySessionId(sessionId)
        ]);
    }

    private async help() {
        const cmds = ['1. /end   结束当前这一轮会话，以开始一轮新的会话', '2. /help  获取帮助信息'];
        await this.messageCenter.replyTextMessage(cmds.join('\n'));
    }
}
