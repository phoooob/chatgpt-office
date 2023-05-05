import { OPENAI_API_KEY } from '@/js-sdk/config';

const { Configuration, OpenAIApi } = require('openai');

let openai = null;
export default function useOpenAI() {
    if (!openai) {
        const configuration = new Configuration({
            apiKey: OPENAI_API_KEY
        });
        openai = new OpenAIApi(configuration);
    }
    return openai;
}
