import { OPENAI_API_KEY } from '@/js-sdk/config';

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

export default function useOpenAI() {
    return openai;
}
