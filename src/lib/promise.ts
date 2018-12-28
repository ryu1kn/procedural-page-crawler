type ProcessFn<T, R> = (result: R, item: T, index: number) => Promise<R>;

export function sequence<T, R>(items: T[], initial: R, processItem: ProcessFn<T, R>): Promise<R> {
    return items.reduce(
        async (result: Promise<R>, item: T, index: number) => processItem(await result, item, index),
        Promise.resolve(initial)
    );
}
