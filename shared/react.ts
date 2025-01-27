// This file is part of HFS - Copyright 2021-2023, Massimo Melina <a@rejetto.com> - License https://www.gnu.org/licenses/gpl-3.0.txt

import { createElement as h, Fragment, ReactElement, ReactNode, useCallback, useEffect, useState } from 'react'
import { useIsMounted } from 'usehooks-ts'

export function useStateMounted<T>(init: T) {
    const isMounted = useIsMounted()
    const [v, set] = useState(init)
    const setIfMounted = useCallback((newValue:T | ((previous:T)=>T)) => {
        if (isMounted())
            set(newValue)
    }, [isMounted, set])
    return [v, setIfMounted, isMounted] as [T, typeof setIfMounted, typeof isMounted]
}

export function reactFilter(elements: any[]) {
    return elements.filter(x=> x===0 || x && (!Array.isArray(x) || x.length))
}

export function reactJoin(joiner: string | ReactElement, elements: Parameters<typeof reactFilter>[0]) {
    const ret = []
    for (const x of reactFilter(elements))
        ret.push(x, joiner)
    ret.splice(-1,1)
    return dontBotherWithKeys(ret)
}

export function dontBotherWithKeys(elements: ReactNode[]): (ReactNode|string)[] {
    return elements.map((e,i)=>
        !e || typeof e === 'string' ? e
            : Array.isArray(e) ? dontBotherWithKeys(e)
                : h(Fragment, { key:i, children:e }) )
}

/* the idea is that you need a job done by a worker, but the worker will execute only after it collected jobs for some time
    by other "users" of the same worker, like other instances of the same component, but potentially also different components.
    User of this hook will just be returned with the single result of its own job.
    As an additional feature, results are cached. You can clear the cache by calling cache.clear()
*/
export function useBatch<Job=unknown,Result=unknown>(
    worker: ((jobs: Job[]) => Promise<Result[]>),
    job: undefined | Job,
    { delay=0 }={}
) {
    interface Env {
        batch: Set<Job>,
        cache: Map<Job, Result | null>,
        timeout?: ReturnType<typeof setTimeout>
    }
    const worker2env = (useBatch as any).worker2env ||= worker && new Map<typeof worker, Env>()
    const env = worker && (worker2env.get(worker) || (() => {
        const ret = { batch: new Set<Job>(), cache: new Map<Job, Result>() } as Env
        worker2env.set(worker, ret)
        return ret
    })())
    const [, setRefresher] = useState(0)
    useEffect(() => {
        if (!env) return
        env.timeout ||= setTimeout(async () => {
            env.timeout = undefined
            const jobs = [...env.batch.values()]
            env.batch.clear()
            const res = await worker(jobs)
            let i = 0
            for (const job of jobs)
                env.cache.set(job, res[i++] ?? null)
            setRefresher(x => x + 1)
        }, delay)
    }, [])
    const cached = env?.cache.get(job)
    if (env && cached === undefined)
        env.batch.add(job)
    return { data: cached, ...env } as Env & { data: Result | undefined | null } // so you can cache.clear
}