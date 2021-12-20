import Koa from 'koa'
import { createReadStream } from 'fs'
import fs from 'fs/promises'

export function serveFile(source: string) : Koa.Middleware {
    return async (ctx) => {
        const { range } = ctx.request.header
        ctx.set('Accept-Ranges', 'bytes')
        if (!range)
            return ctx.body = createReadStream(source)
        const ranges = range.split('=')[1]
        if (ranges.includes(','))
            return ctx.throw(400, 'multi-range not supported')
        let bytes = ranges?.split('-')
        if (!bytes?.length)
            return ctx.throw(400, 'bad range')
        const stat = await fs.stat(source)
        const max = stat.size - 1
        let start = Number(bytes[0])
        let end = Number(bytes[1]) || max
        if (end > max || start > max) {
            ctx.status = 416
            ctx.set('Content-Range', `bytes ${stat.size}`)
            ctx.body = 'Requested Range Not Satisfiable'
            return
        }
        ctx.status = 206
        ctx.set('Content-Range', `bytes ${start}-${end}/${stat.size}`)
        ctx.body = createReadStream(source, { start, end })
    }
}