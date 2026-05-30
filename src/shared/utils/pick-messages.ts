export function pickMessages(messages: Record<string, unknown>, keys: string[]) {
    const result: Record<string, unknown> = {};
    for (const key of keys) {
        if (messages[key] !== undefined) {
            result[key] = messages[key];
        }
    }
    return result;
}
