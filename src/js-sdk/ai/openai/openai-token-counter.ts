import { logger } from '@/js-sdk/lib/logger';
import { Prompts } from '@/js-sdk/typings';
import { OPENAI_MODEL_MAX_TOKEN } from '@/js-sdk/config';

const { encode } = require('gpt-3-encoder');

export function countToken(text) {
    return encode(text).length;
}

export function countTokenByPrompts(prompts: Prompts) {
    return prompts.reduce((total, item) => {
        total += 4;
        Object.entries(item).forEach(([key, value]) => {
            total += countToken(value);
            if (key === 'name') total -= 1;
        });
        return total;
    }, 0);
}

export function getMaxTokenByPrompts(prompts: Prompts) {
    const totalTokens = countTokenByPrompts(prompts);
    return OPENAI_MODEL_MAX_TOKEN - totalTokens - 10;
}
