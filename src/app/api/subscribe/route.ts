import { NextRequest, NextResponse } from 'next/server'
const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_LIST_ID = parseInt(process.env.BREVO_LIST_ID || '11')
const WELCOME_TEMPLATE_ID = 11
export async function POST(request: NextRequest) {
  try {
    const { email, source } = await request.json()
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    if (!BREVO_API_KEY) return NextResponse.json({ error: 'Newsletter not configured' }, { status: 500 })
    const contactResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST', headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_API_KEY },
      body: JSON.stringify({ email, listIds: [BREVO_LIST_ID], attributes: { SOURCE: source || 'petpalhq', SIGNUP_DATE: new Date().toISOString() }, updateEnabled: true }),
    })
    const contactData = await contactResponse.json().catch(() => ({}))
    const isAlreadySubscribed = contactData.code === 'duplicate_parameter'
    if (!contactResponse.ok && !isAlreadySubscribed) return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    if (!isAlreadySubscribed) {
      await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_API_KEY },
        body: JSON.stringify({ templateId: WELCOME_TEMPLATE_ID, to: [{ email }], params: { EMAIL: email } }) }).catch(() => {})
    }
    return NextResponse.json({ success: true, message: isAlreadySubscribed ? "Already subscribed!" : 'Welcome! Check your inbox.' })
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
