// Helper to build WhatsApp direct chat links according to international format rules
export const buildWhatsAppLink = (number) => {
  if (!number) return null;
  // Strip spaces, dashes, and plus sign
  let cleaned = String(number).replace(/[\s+-]/g, '');
  // If exactly 10 digits, prefix 91 (India country code)
  if (/^\d{10}$/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }
  return `https://wa.me/${cleaned}`;
};
