import { OPENAI_API_MODEL, OPENAI_MODEL_MAX_TOKEN } from '@/js-sdk/config';
import { logger } from '@/js-sdk/lib/logger';
import { countTokenByPrompts } from '@/js-sdk/ai/openai/openai-token-counter';
import { AI, MessageData, OnProgress } from '@/js-sdk/typings';
import { Roles } from '@/js-sdk/enums';
import useOpenAI from '@/js-sdk/ai/openai/openai-client';

const openai = useOpenAI();

export default class Openai implements AI {
    /**
     * 创建会话消息
     */
    async getAnswer(historyList: Array<MessageData>, content: string, onProgress: OnProgress): Promise<void> {
        try {
            const messages = this.createFullPrompts(historyList, content);
            const max_tokens = OPENAI_MODEL_MAX_TOKEN;
            const option = {
                model: OPENAI_API_MODEL,
                messages,
                stream: true,
                max_tokens,
                temperature: 0.8
            };
            logger(`ID:30，option：`, option);

            const stream = await openai.chat.completions.create(option);

            //读取流数据
            const contents = [];
            let preContent = '';
            //@ts-ignore
            for await (const resultData of stream) {
                try {
                    const { delta, finish_reason } = resultData.choices[0];
                    const suffix = this.getSuffix(finish_reason);
                    const curContent = `${delta.content ? delta.content : ''}${suffix ? suffix : ''}`;
                    if (curContent) contents.push(curContent);
                    const fullContent = contents.join('');
                    onProgress({
                        finished: false,
                        content: fullContent.replace(preContent, ''),
                        fullContent
                    });

                    preContent = contents.join('');
                } catch (error) {
                    console.error('Could not JSON parse stream message', resultData, error);
                }
            }

            //结束
            const fullContent = contents.join('');
            onProgress({
                finished: true,
                content: fullContent.replace(preContent, ''),
                fullContent
            });
        } catch (error) {
            const errorMsg = await this.onStreamError(error);
            onProgress({
                content: errorMsg,
                fullContent: errorMsg,
                finished: true,
                isError: true
            });
            return Promise.reject(errorMsg);
        }
    }

    private onStreamError(error): Promise<string> {
        return new Promise((resolve, reject) => {
            //网络请求错误
            if (!error.response?.status) {
                console.error('error.message', error.message);
                return resolve(error.message);
            }
            //请求API错误
            console.error(error.response.status, error.message);
            error.response.data.on('data', data => {
                const message = data.toString();
                try {
                    const parsed = JSON.parse(message);
                    console.error('An error occurred during OpenAI request: ', parsed.error.message);
                    return resolve(parsed.error.message);
                } catch (error) {
                    console.error('An error occurred during OpenAI request: ', message);
                    return resolve('调用openai接口异常');
                }
            });
        });
    }

    private getSuffix(reason: string) {
        const map = {
            content_filter: '（内容被AI部分过滤，未完整显示）',
            length: '（由于连续会话长度限制，内容未完整返回，请使用/end指令结束本轮会话，以便获取完整的回答）',
            null: ''
        };
        return map[reason] || '';
    }

    private createPrompts(historyList: Array<MessageData>, content: string) {
        const prompts = this.createFullPrompts(historyList, content);
        const user = prompts[prompts.length - 1];
        const minCount = countTokenByPrompts([user]);
        let count = Math.floor(OPENAI_MODEL_MAX_TOKEN * 0.9) - minCount;
        return prompts.filter((item, index) => {
            if (index === prompts.length - 1) return true;
            const curCount = countTokenByPrompts([item]);
            if (count - curCount > 0) {
                count -= curCount;
                return true;
            }
            //不再追加任何内容
            count = -1;
            return false;
        });
    }

    private createFullPrompts(historyList: Array<MessageData>, content: string) {
        const prompts = historyList.reduce((prompts, data) => {
            prompts.push({ role: Roles.USER, content: data.question });
            prompts.push({ role: Roles.ASSISTANT, content: data.answer });
            return prompts;
        }, []);
        return [...prompts, { role: Roles.USER, content }];
    }
}
