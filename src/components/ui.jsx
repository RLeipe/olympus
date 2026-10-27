import { useEffect, useRef, useState } from 'react'
import { CheckIcon, ChevronDownIcon, MinusIcon, PlusIcon, XIcon } from './icons'

export function PageHeader({ eyebrow, title, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5 md:mb-7">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="title text-3xl md:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  )
}

export function Loading({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-3 h-64 text-ink-faint text-sm font-medium">
      <span className="w-4 h-4 rounded-full border-2 border-ink-faint/30 border-t-ink-soft animate-spin" />
      {label}
    </div>
  )
}

const BANNER_TONES = {
  warn: 'bg-partial/10 text-partial border-partial/25',
  error: 'bg-missed/10 text-missed border-missed/25',
  success: 'bg-accent/15 text-accent-strong border-accent/40'
}

export function Banner({ tone = 'warn', onClose, children }) {
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm font-medium flex justify-between items-start gap-3 ${BANNER_TONES[tone]}`}>
      <div className="min-w-0">{children}</div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
          <XIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// Pill-shaped segmented control: options are [value, label] pairs
export function Segmented({ value, options, onChange, size = 'md' }) {
  const height = size === 'sm' ? 'h-8 text-xs' : 'h-9 text-sm'
  return (
    <div className="inline-flex bg-sunken rounded p-1 gap-0.5">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          onClick={() => onChange(optionValue)}
          aria-pressed={value === optionValue}
          className={`${height} px-3.5 rounded-sm font-semibold transition
            ${value === optionValue ? 'bg-line text-ink' : 'text-ink-soft hover:text-ink'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// Dropdown in the app's style; a native <select> opens the phone's own picker.
// options are { value, label }.
export function Select({ id, value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const list = useRef(null)
  const selected = options.find(option => option.value === value)

  useEffect(() => {
    if (!open) return
    const onPointer = e => { if (!root.current?.contains(e.target)) setOpen(false) }
    const onKey = e => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="relative flex-1 min-w-0">
      <button
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input flex items-center justify-between gap-2 text-left font-semibold"
      >
        <span className={`truncate ${selected ? '' : 'text-ink-faint font-normal'}`}>{selected?.label || placeholder}</span>
        <ChevronDownIcon className={`w-4 h-4 shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul ref={list} role="listbox" className="absolute z-30 inset-x-0 mt-1 max-h-72 overflow-y-auto card shadow-pop py-1">
          {options.map(option => {
            const active = option.value === value
            return (
              <li key={option.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => { onChange(option.value); setOpen(false) }}
                  className={`w-full h-11 px-4 flex items-center justify-between gap-3 text-left transition
                    ${active ? 'bg-sunken text-accent-strong font-semibold' : 'text-ink hover:bg-sunken'}`}
                >
                  <span className="truncate">{option.label}</span>
                  {active && <CheckIcon className="w-4 h-4 shrink-0" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// Number field with big −/+ buttons for one-handed logging. An empty field starts from `start`.
export function Stepper({ label, hint, value, onChange, step = 1, min = 0, start, suffix, decimal = false, placeholder }) {
  function bump(direction) {
    const current = value === '' || value == null ? null : Number(value)
    const base = current === null || Number.isNaN(current) ? (start ?? min) : current + step * direction
    const next = Math.max(min, Math.round(base * 100) / 100)
    onChange(String(next))
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        {hint && <div className="text-xs text-ink-faint">{hint}</div>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button type="button" onClick={() => bump(-1)} className="icon-btn h-11 w-11" aria-label={`Less ${label}`}>
          <MinusIcon />
        </button>
        <div className="relative w-[5.5rem]">
          <input
            type="number"
            inputMode={decimal ? 'decimal' : 'numeric'}
            step={decimal ? 'any' : 1}
            min={min}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label={label}
            className={`w-full h-11 rounded-xl bg-transparent text-center num text-3xl font-semibold
              placeholder:text-ink-faint/60 focus:outline-none focus:bg-sunken ${suffix ? 'pr-5' : ''}`}
          />
          {suffix && (
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-faint pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        <button type="button" onClick={() => bump(1)} className="icon-btn h-11 w-11" aria-label={`More ${label}`}>
          <PlusIcon />
        </button>
      </div>
    </div>
  )
}

// Bottom sheet on phones, centered dialog on larger screens
export function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end md:items-center justify-center md:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="bg-surface w-full md:max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl md:rounded-3xl shadow-pop
          px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line md:hidden" />
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold min-w-0">{title}</h2>
          <button onClick={onClose} className="icon-btn h-9 w-9 shrink-0" aria-label="Close">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
