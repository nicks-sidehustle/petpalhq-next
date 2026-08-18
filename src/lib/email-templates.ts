export const getWelcomeEmailTemplate = (name?: string) => {
  const greeting = name ? `Hi ${name}` : 'Hi there';

  return {
    subject: 'Welcome to PetPalHQ',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to PetPalHQ</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a2440; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e3a6e; margin: 0; font-size: 28px;">PetPal<span style="color: #2db8c5;">HQ</span></h1>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Pet gear, through expert consensus</p>
          </div>

          <div style="background: #fdfaf3; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #1e3a6e; margin: 0 0 15px 0; font-size: 24px;">Welcome aboard.</h2>
            <p style="margin: 0 0 15px 0; font-size: 16px;">${greeting},</p>
            <p style="margin: 0 0 15px 0; font-size: 16px;">Thanks for subscribing to PetPalHQ. You&apos;ve just signed up for what we hope is the most useful pet-gear newsletter you read all year — short, source-backed, and honest about trade-offs.</p>
            <p style="margin: 0; font-size: 16px;">Here&apos;s what to expect:</p>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #2d5036; margin: 0 0 15px 0; font-size: 20px;">What you&apos;ll get:</h3>
            <ul style="padding-left: 20px; margin: 0;">
              <li style="margin-bottom: 10px; font-size: 16px;"><strong>Expert-consensus buying guides:</strong> Aquarium, reptile, and bird-feeder gear scored on five pillars</li>
              <li style="margin-bottom: 10px; font-size: 16px;"><strong>Source-backed picks:</strong> Every recommendation cites the experts behind it</li>
              <li style="margin-bottom: 10px; font-size: 16px;"><strong>Honest trade-offs:</strong> The real downsides we hide nothing about</li>
              <li style="margin-bottom: 10px; font-size: 16px;"><strong>What we passed on:</strong> Why we didn&apos;t pick the obvious choice</li>
            </ul>
          </div>

          <div style="text-align: center; margin-bottom: 30px;">
            <a href="https://petpalhq.com"
               style="background: #1e3a6e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Browse Our Guides
            </a>
          </div>

          <div style="background: #f7eedd; border-left: 4px solid #f29c3a; padding: 15px; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 14px; color: #1e3a6e;">
              <strong>New to a vertical?</strong> Start with our authority hubs — they&apos;re the educational pillar pages that explain the category before showing product picks.
            </p>
          </div>

          <div style="text-align: center; font-size: 14px; color: #666; border-top: 1px solid #e8e0c8; padding-top: 20px;">
            <p style="margin: 0 0 10px 0;">Questions or expert feedback? Just reply to this email — we read every response.</p>
            <p style="margin: 0;">
              The PetPalHQ Team<br>
              <a href="mailto:hello@petpalhq.com" style="color: #1e3a6e;">hello@petpalhq.com</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
${greeting},

Welcome to PetPalHQ. Thanks for subscribing.

Here's what you'll get:
• Expert-consensus buying guides — Aquarium, reptile, and bird-feeder gear scored on five pillars
• Source-backed picks — Every recommendation cites the experts behind it
• Honest trade-offs — The real downsides we hide nothing about
• What we passed on — Why we didn't pick the obvious choice

Visit our website: https://petpalhq.com

Questions or expert feedback? Just reply to this email — we read every response.

The PetPalHQ Team
hello@petpalhq.com
    `
  };
};

/**
 * Restock notification — the single email a visitor signed up for.
 *
 * Two hard constraints baked into this template:
 *   1. NO AMAZON LINK. Amazon's Associates Program Operating Agreement bars
 *      affiliate links in email, and an unattributed raw Amazon link would
 *      hand the sale away for free. The one CTA points at the guide page,
 *      which carries the monetized link and the current price.
 *   2. It promises nothing further. The signup copy said "one email, no
 *      newsletter" — this email says the same thing back and means it. The
 *      sender clears the contact's restock attributes after the send.
 *
 * Register follows the site's editorial voice: plain, specific, no hype.
 */
export const getRestockEmailTemplate = (productName: string, guideUrl: string) => {
  return {
    subject: `Back in stock: ${productName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Back in stock: ${productName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a2440; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e3a6e; margin: 0; font-size: 24px;">PetPal<span style="color: #2db8c5;">HQ</span></h1>
          </div>

          <div style="background: #fdfaf3; padding: 28px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="color: #1e3a6e; margin: 0 0 12px 0; font-size: 20px;">${productName} is buyable again.</h2>
            <p style="margin: 0 0 12px 0; font-size: 16px;">You asked us to tell you when it came back on Amazon. Our daily check found a live listing for it today.</p>
            <p style="margin: 0; font-size: 16px;">We have not re-checked the price for you — the guide page below shows what it is going for right now, alongside the rest of the ranking so you can see whether it is still the right pick.</p>
          </div>

          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${guideUrl}"
               style="background: #f29c3a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              See it in the guide
            </a>
          </div>

          <div style="font-size: 14px; color: #4a5570; border-top: 1px solid #e8e0c8; padding-top: 18px;">
            <p style="margin: 0 0 10px 0;">This is the one email you signed up for. You are not on our newsletter, and we have removed your restock alert now that it has fired.</p>
            <p style="margin: 0;">
              PetPalHQ<br>
              <a href="mailto:editor@petpalhq.com" style="color: #1e3a6e;">editor@petpalhq.com</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `${productName} is buyable again.

You asked us to tell you when it came back on Amazon. Our daily check found a live listing for it today.

We have not re-checked the price for you — the guide page shows what it is going for right now, alongside the rest of the ranking so you can see whether it is still the right pick.

See it in the guide: ${guideUrl}

This is the one email you signed up for. You are not on our newsletter, and we have removed your restock alert now that it has fired.

PetPalHQ
editor@petpalhq.com
`,
  };
};
