/** Canned replies for the demo's simulated scouts, picked by keyword. */
export function simulatedReply(scoutFirstName: string, message: string, cheapestPackage: string) {
  const m = message.toLowerCase();
  if (/wheelchair|ramp|step|lift|elevator|scooter/.test(m))
    return `Thanks for asking! I check step-free access in person, including door widths and lifts. Tell me your chair's width and whether you can manage a small step, and I'll tailor everything. My "${cheapestPackage}" is a good place to start.`;
  if (/deaf|sign|asl|bsl|caption|hearing|loop/.test(m))
    return `Happy to help! I can find captioned and interpreted events and places where writing things down is normal. Which dates are you visiting?`;
  if (/blind|vision|sight|tactile|audio/.test(m))
    return `Great question. I describe routes by landmarks, sound and touch, and I'll flag good lighting and tactile paving. Do you travel with a cane or a guide dog?`;
  if (/quiet|sensory|noise|crowd|autis|calm/.test(m))
    return `I plan around quiet hours, calm rooms and low-crowd routes. What times of day tend to work best for you?`;
  if (/price|cost|pay|refund/.test(m))
    return `All payments go through Ramplight's checkout, so please don't send money directly. If a plan doesn't work out, Ramplight support can help with refunds.`;
  return `Hi, it's ${scoutFirstName}! Thanks for your message. I'd love to help you plan. Could you tell me your travel dates and the access needs I should plan around?`;
}
