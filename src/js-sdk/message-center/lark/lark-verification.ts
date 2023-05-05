import { logger } from '@/js-sdk/lib/logger';
import { Code } from '@/js-sdk/enums';

export function larkVerification(params) {
    const { challenge, type } = params;
    logger(`ID:7，处理飞书校验 params：`, params);
    return { challenge, code: Code.SUCCESS };
}
