export function sleep(mills: number) {
    return new Promise(resolve => {
        setTimeout(resolve, mills);
    });
}
