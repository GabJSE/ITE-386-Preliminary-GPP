export async function validatePhone(countryCode, nationalNumber) {
  // countryCode like +63, nationalNumber like 9123456789 or +639912345678
  if (!nationalNumber) return { valid: false };

  let candidate = String(nationalNumber || '').trim();
  // handle leading 00 -> +
  if (candidate.startsWith('00')) candidate = '+' + candidate.slice(2);

  // build a full E.164 candidate
  let full;
  if (candidate.startsWith('+')) {
    full = candidate;
  } else {
    // normalize country code digits
    const cc = String(countryCode || '').trim();
    const ccDigits = cc.replace(/\D/g, '');
    // strip non-digits from candidate and leading zeros
    let digits = candidate.replace(/\D/g, '');
    digits = digits.replace(/^0+/, '');

    if (ccDigits && digits.startsWith(ccDigits)) {
      // user may have entered country code without +
      full = '+' + digits;
    } else {
      full = (cc.startsWith('+') ? cc : (ccDigits ? '+' + ccDigits : '+')) + digits;
    }
  }

  try {
    const lib = await import('libphonenumber-js');
    const { parsePhoneNumberFromString } = lib;
    const parsed = parsePhoneNumberFromString(full);
    if (!parsed) return { valid: false };
    return { valid: parsed.isValid(), e164: parsed.number };
  } catch (err) {
    // Fallback: simple digit-only length check (not as accurate)
    const digits = (full || '').replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return { valid: false };
    return { valid: true, e164: '+' + digits };
  }
}

// Named export only — avoids anonymous default export lint warnings
