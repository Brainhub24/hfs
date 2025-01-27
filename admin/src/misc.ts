// This file is part of HFS - Copyright 2021-2023, Massimo Melina <a@rejetto.com> - License https://www.gnu.org/licenses/gpl-3.0.txt

import { createElement as h, FC, Fragment, ReactNode, KeyboardEvent, forwardRef } from 'react'
import {
    Box,
    Breakpoint,
    ButtonProps,
    CircularProgress,
    IconButton,
    IconButtonProps,
    Link,
    Tooltip, TooltipProps,
    useMediaQuery
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { SxProps } from '@mui/system'
import { Refresh, SvgIconComponent } from '@mui/icons-material'
import { alertDialog, confirmDialog } from './dialog'
import { apiCall } from './api'
import { dontBotherWithKeys, formatPerc, useStateMounted, WIKI_URL } from '@hfs/shared'
import { Promisable } from '@hfs/mui-grid-form'
import { LoadingButton, LoadingButtonProps } from '@mui/lab'
export * from '@hfs/shared'

export function spinner() {
    return h(CircularProgress)
}

export function isWindowsDrive(s?: string) {
    return s && /^[a-zA-Z]:$/.test(s)
}

export function isEqualLax(a: any,b: any): boolean {
    return a == b //eslint-disable-line
        || (a && b && typeof a === 'object' && typeof b === 'object'
            && Object.entries(a).every(([k,v]) => isEqualLax(v, b[k])) )
}

export function modifiedSx(is: boolean) {
    return is ? { outline: '2px solid' } : undefined
}
interface IconBtnProps extends Omit<IconButtonProps, 'disabled'|'title'|'onClick'> {
    title?: ReactNode
    icon: SvgIconComponent
    disabled?: boolean | string
    progress?: boolean | number
    link?: string
    confirm?: string
    tooltipProps?: Partial<TooltipProps>
    onClick: (...args: Parameters<NonNullable<IconButtonProps['onClick']>>) => Promisable<any>
}

export const IconBtn = forwardRef(({ title, icon, onClick, disabled, progress, link, tooltipProps, confirm, ...rest }: IconBtnProps, ref: any) => {
    const [loading, setLoading] = useStateMounted(false)
    if (typeof disabled === 'string')
        title = disabled
    if (link)
        onClick = () => window.open(link)
    let ret: ReturnType<FC> = h(IconButton, {
        ref,
        disabled: Boolean(loading || progress || disabled),
        ...rest,
        async onClick(...args) {
            if (confirm && !await confirmDialog(confirm)) return
            const ret = onClick?.apply(this,args)
            if (ret && ret instanceof Promise) {
                setLoading(true)
                ret.catch(alertDialog).finally(()=> setLoading(false))
            }
        }
    },
        (progress || loading) && progress !== false  // false is also useful to inhibit behavior with loading
            && h(CircularProgress, {
                ...(typeof progress === 'number' ? { value: progress*100, variant: 'determinate' } : null),
                style: { position:'absolute', top: 4, left: 4, width: 32, height: 32 }
            }),
        h(icon)
    )
    if (title)
        ret = h(Tooltip, { title, ...tooltipProps, children: h('span',{},ret) })
    return ret
})

interface BtnProps extends Omit<LoadingButtonProps,'disabled'|'title'|'onClick'> {
    icon: SvgIconComponent
    title?: ReactNode
    disabled?: boolean | string
    progress?: boolean | number
    link?: string
    confirm?: string
    tooltipProps?: TooltipProps
    onClick: (...args: Parameters<NonNullable<ButtonProps['onClick']>>) => Promisable<any>
}
export function Btn({ icon, title, onClick, disabled, progress, link, tooltipProps, confirm, ...rest }: BtnProps) {
    const [loading, setLoading] = useStateMounted(false)
    if (typeof disabled === 'string') {
        title = disabled
        disabled = true
    }
    if (link)
        onClick = () => window.open(link)
    let ret: ReturnType<FC> = h(LoadingButton, {
        variant: 'contained',
        startIcon: h(icon),
        loading: Boolean(loading || progress),
        loadingPosition: 'start',
        loadingIndicator: typeof progress !== 'number' ? undefined
            : h(CircularProgress, { size: '1rem', value: progress*100, variant: 'determinate' }),
        disabled,
        ...rest,
        async onClick(...args) {
            if (confirm && !await confirmDialog(confirm)) return
            const ret = onClick?.apply(this,args)
            if (ret && ret instanceof Promise) {
                setLoading(true)
                ret.catch(alertDialog).finally(()=> setLoading(false))
            }
        }
    })
    if (title)
        ret = h(Tooltip, { title, ...tooltipProps, children: h('span',{},ret) })
    return ret
}

export function iconTooltip(icon: SvgIconComponent, tooltip: ReactNode, sx?: SxProps) {
    return h(Tooltip, { title: tooltip, children: h(icon, { sx: { verticalAlign: 'bottom', ...sx } }) })
}

export function InLink(props:any) {
    return h(Link, { component: RouterLink, ...props })
}

export function Center(props: any) {
    return h(Box, { display:'flex', height:'100%', width:'100%', justifyContent:'center', alignItems:'center',  flexDirection: 'column', ...props })
}

export async function manipulateConfig(k: string, work:(data:any) => any) {
    const cfg = await apiCall('get_config', { only: [k] })
    const was = cfg[k]
    const will = await work(was)
    if (JSON.stringify(was) !== JSON.stringify(will))
        await apiCall('set_config', { values: { [k]: will } })
}

export function typedKeys<T extends {}>(o: T) {
    return Object.keys(o) as (keyof T)[]
}

export function xlate(input: any, table: Record<string, any>) {
    return table[input] ?? input
}

// return true if same size or larger
export function useBreakpoint(breakpoint: Breakpoint) {
    return useMediaQuery((theme: any) => theme.breakpoints.up(breakpoint), { noSsr:true }) // without noSsr, first execution always returns false
}

export function err2msg(code: string) {
    return {
        ENOENT: "Not found",
        ENOTDIR: "Not a folder",
    }[code] || code
}

export function reloadBtn(onClick: any, props?: any) {
    return h(IconBtn, { icon: Refresh, title: "Reload", onClick, ...props })
}

const isMac = navigator.platform.match('Mac')
export function isCtrlKey(ev: KeyboardEvent) {
    return (ev.ctrlKey || isMac && ev.metaKey) && ev.key
}

interface IconProgressProps {
    icon: SvgIconComponent,
    progress: number,
    offset?: number,
    sx?: SxProps,
    addTitle?: ReactNode
}
export function IconProgress({ icon, progress, offset, addTitle, sx }: IconProgressProps) {
    return h(Fragment, {},
        h(icon, { sx: { position:'absolute', ml: '4px' } }),
        h(CircularProgress, {
            value: progress * 100,
            variant: 'determinate',
            size: 32,
            sx: { position: 'absolute' },
        }),
        h(Tooltip, {
            title: h(Fragment, {}, formatPerc(progress), addTitle),
            children: h(CircularProgress, {
                color: 'success',
                value: (offset || 1e-7) * 100,
                variant: 'determinate',
                size: 32,
                sx: { display: 'flex', ...sx }, // workaround: without this the element is has 0 width when the space is crammy (monitor/file)
            }),
        })
    )
}

export function Flex({ gap='.8em', vert=false, children=null, props={}, ...rest }) {
    return h(Box, {
        sx: {
            display: 'flex',
            gap,
            flexDirection: vert ? 'column' : undefined,
            ...rest,
        },
        ...props
    }, children)
}


export function wikiLink(uri: string, content: ReactNode) {
    if (Array.isArray(content))
        content = dontBotherWithKeys(content)
    return h(Link, { href: WIKI_URL + uri, target: 'help' }, content)
}