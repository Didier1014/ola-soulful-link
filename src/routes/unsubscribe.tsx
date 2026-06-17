import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
})

function UnsubscribePage() {
  const { token } = Route.useSearch()
  const [state, setState] = useState<'loading' | 'valid' | 'already' | 'invalid' | 'done' | 'error'>('loading')

  useEffect(() => {
    if (!token) { setState('invalid'); return }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid === true) setState('valid')
        else if (d.reason === 'already_unsubscribed') setState('already')
        else setState('invalid')
      })
      .catch(() => setState('error'))
  }, [token])

  const confirm = async () => {
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await r.json()
      if (d.success) setState('done')
      else if (d.reason === 'already_unsubscribed') setState('already')
      else setState('error')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-3">RedoxPay</h1>
        {state === 'loading' && <p className="text-muted-foreground">A validar...</p>}
        {state === 'valid' && (
          <>
            <p className="text-foreground mb-6">Confirmar cancelamento de subscrição de emails do RedoxPay?</p>
            <button onClick={confirm} className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Confirmar cancelamento
            </button>
          </>
        )}
        {state === 'done' && <p className="text-foreground">✅ Cancelado. Não receberás mais emails nesta morada.</p>}
        {state === 'already' && <p className="text-muted-foreground">Esta morada já foi cancelada anteriormente.</p>}
        {state === 'invalid' && <p className="text-muted-foreground">Link inválido ou expirado.</p>}
        {state === 'error' && <p className="text-destructive">Ocorreu um erro. Tenta novamente.</p>}
      </div>
    </div>
  )
}
