import { init } from '@nimiq/mini-app-sdk'

const LUNA_PER_NIM = 100000

let providerPromise = null

// Lazily create (and cache) the provider connection. Calling init() itself
// requires no user confirmation — only listAccounts()/sendBasicTransaction*
// do — so this is safe to call on load per the mini-apps skill's rules.
function getProvider() {
  if (!providerPromise) {
    providerPromise = init({ timeout: 10_000 })
  }
  return providerPromise
}

export function isInsideNimiqPay() {
  return typeof window !== 'undefined' && !!window.nimiqPay
}

export function nimToLuna(nim) {
  return Math.round(nim * LUNA_PER_NIM)
}

export function normalizeAddress(raw) {
  return String(raw || '').replace(/\s+/g, '').toUpperCase()
}

export function isValidAddress(raw) {
  return /^NQ\d{2}[0-9A-Z]{32}$/.test(normalizeAddress(raw))
}

export function formatAddress(raw) {
  return normalizeAddress(raw).replace(/(.{4})/g, '$1 ').trim()
}

export function shortAddress(raw) {
  const compact = normalizeAddress(raw)
  if (compact.length <= 12) return compact
  return compact.slice(0, 6) + '…' + compact.slice(-6)
}

// Only call this from a user-initiated tap (a "Connect wallet" button press),
// never on page load, per the approval-dialog UX rule: listAccounts()
// triggers a native confirmation dialog.
export async function connectHostWallet() {
  const nimiq = await getProvider()
  const accounts = await nimiq.listAccounts()
  if (!accounts || accounts.length === 0) {
    throw new Error('No Nimiq account is available in this wallet.')
  }
  return accounts[0]
}

// Sends the Host's stake to the Challenger's address, only after the round
// is fully decided. Always triggers a native Nimiq Pay approval dialog that
// the Host must confirm — nothing moves until they do.
export async function payoutStake({ recipient, amountNim, memo }) {
  const nimiq = await getProvider()
  const params = { recipient: formatAddress(recipient), value: nimToLuna(amountNim) }
  if (memo) {
    return nimiq.sendBasicTransactionWithData({ ...params, data: memo })
  }
  return nimiq.sendBasicTransaction(params)
}
