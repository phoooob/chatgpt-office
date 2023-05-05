import { Code } from '@/js-sdk/enums';

export function success(message?: string) {
    return { code: Code.SUCCESS, message };
}

export function fail(message: string) {
    return { code: Code.FAIL, message };
}
