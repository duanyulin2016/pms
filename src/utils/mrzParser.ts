export function charValue(c: string): number {
  if (c === '<') return 0;
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - '0'.charCodeAt(0);
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
  return 0; // Default or error
}

export function checkDigit(data: string): string {
  const weights = [7, 3, 1];
  let total = 0;
  for (let i = 0; i < data.length; i++) {
    total += charValue(data[i]) * weights[i % 3];
  }
  return (total % 10).toString();
}

export function parseName(raw: string): { surname: string; givenNames: string } {
  const sep = raw.indexOf('<<');
  let surnamePart = '';
  let givenPart = '';

  if (sep === -1) {
    surnamePart = raw.replace(/<+$/, '');
  } else {
    surnamePart = raw.substring(0, sep);
    givenPart = raw.substring(sep + 2);
  }

  const surname = surnamePart.replace(/</g, ' ').trim();
  const givenNames = givenPart.replace(/<+$/, '').replace(/</g, ' ').trim();
  return { surname, givenNames };
}

export function estimateIssueDate(birthDateStr?: string | null, expiryDateStr?: string | null) {
  if (!birthDateStr || !expiryDateStr) return null;

  try {
    const birth = new Date(birthDateStr);
    const expiry = new Date(expiryDateStr);

    if (isNaN(birth.getTime()) || isNaN(expiry.getTime())) return null;

    let ageAtExpiry = expiry.getFullYear() - birth.getFullYear();
    if (
      expiry.getMonth() < birth.getMonth() ||
      (expiry.getMonth() === birth.getMonth() && expiry.getDate() < birth.getDate())
    ) {
      ageAtExpiry -= 1;
    }

    const validityYears = ageAtExpiry < 26 ? 5 : 10;
    const issue = new Date(expiry);
    issue.setFullYear(issue.getFullYear() - validityYears);

    const year = issue.getFullYear();
    const month = String(issue.getMonth() + 1).padStart(2, '0');
    const day = String(issue.getDate()).padStart(2, '0');

    return { issueDate: `${year}-${month}-${day}`, validityYears };
  } catch (e) {
    return null;
  }
}

const DIGIT_TO_LETTER: Record<string, string> = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '6': 'G' };
const LETTER_TO_DIGIT: Record<string, string> = { 'O': '0', 'I': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6', 'Q': '0', 'D': '0' };

export function tryCorrectChar(c: string, toDigit: boolean = false): string | null {
  if (toDigit) {
    if (/[0-9]/.test(c)) return c;
    return LETTER_TO_DIGIT[c] || null;
  } else {
    if (/[A-Z]/.test(c)) return c;
    return DIGIT_TO_LETTER[c] || null;
  }
}

export function alignLineByAnchor(line: string, anchor: string, targetIdx: number): { line: string; logs: string[] } {
  const logs: string[] = [];
  const pos = line.indexOf(anchor);
  if (pos === -1) return { line, logs };

  const delta = pos - targetIdx;
  if (delta === 0) return { line, logs };

  if (delta > 0) {
    const chars = line.split('');
    let removed = 0;
    let i = 0;
    while (i < chars.length && removed < delta) {
      if (chars[i] === '<') {
        chars.splice(i, 1);
        removed++;
      } else {
        i++;
      }
    }
    while (removed < delta && chars.length > 0) {
      chars.shift();
      removed++;
    }
    logs.push(`Anchor '${anchor}' moved from ${pos} to ${targetIdx}, deleted ${removed} chars`);
    return { line: chars.join(''), logs };
  } else {
    const insertNum = -delta;
    const newLine = line.substring(0, pos) + '<'.repeat(insertNum) + line.substring(pos);
    logs.push(`Anchor '${anchor}' moved from ${pos} to ${targetIdx}, inserted ${insertNum} '<'`);
    return { line: newLine, logs };
  }
}

export function fixGenderByChecksum(line2List: string[], idx: number = 20): { char: string; logs: string[] } {
  const logs: string[] = [];
  const current = line2List[idx];
  if (current === 'M' || current === 'F') return { char: current, logs };

  for (const candidate of ['M', 'F']) {
    const testLine = [...line2List];
    testLine[idx] = candidate;
    const lineStr = testLine.join('');
    const overallData = lineStr.substring(0, 10) + lineStr.substring(13, 20) + lineStr.substring(21, 28) + lineStr.substring(28, 43);
    if (checkDigit(overallData) === lineStr[43]) {
      logs.push(`Gender fixed from '${current}' to '${candidate}' based on overall checksum`);
      return { char: candidate, logs };
    }
  }
  return { char: current, logs };
}

export function correctOcrErrors(rawMrz: string): { correctedMrz: string; corrections: string[] } {
  const rawClean = rawMrz.replace(/ /g, '<');
  const lines = rawClean.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length !== 2) {
    return { correctedMrz: rawMrz, corrections: ['Cannot correct: input does not have 2 lines'] };
  }

  const corrections: string[] = [];
  let line1 = lines[0].split('');
  let line2 = lines[1].split('');

  const { line: l1Str, logs: logs1 } = alignLineByAnchor(line1.join(''), 'CHN', 2);
  if (logs1.length > 0) {
    corrections.push(...logs1);
    line1 = l1Str.split('');
  }

  const { line: l2Str, logs: logs2 } = alignLineByAnchor(line2.join(''), 'CHN', 10);
  if (logs2.length > 0) {
    corrections.push(...logs2);
    line2 = l2Str.split('');
  }

  const adjustLength = (lst: string[], name: string) => {
    while (lst.length < 44) {
      lst.push('<');
      corrections.push(`${name} length < 44, appended '<'`);
    }
    while (lst.length > 44) {
      if (lst[lst.length - 1] === '<') {
        lst.pop();
        corrections.push(`${name} length > 44, removed trailing '<'`);
      } else {
        const removed = lst.pop();
        corrections.push(`${name} length > 44, forcibly removed trailing '${removed}'`);
      }
    }
  };

  adjustLength(line1, 'Line 1');
  adjustLength(line2, 'Line 2');

  const correctType = (lst: string[], i: number, name: string, toDigit: boolean) => {
    const c = lst[i];
    const isMatched = toDigit ? /[0-9]/.test(c) : /[A-Z]/.test(c);
    if (!isMatched) {
      const corrected = tryCorrectChar(c, toDigit);
      if (corrected) {
        corrections.push(`${name} at pos ${i + 1} corrected from '${c}' to '${corrected}'`);
        lst[i] = corrected;
      }
    }
  };

  if (line1[0] !== 'P') corrections.push(`First char not P, kept as '${line1[0]}'`);
  correctType(line1, 1, 'DocType', false);
  [2, 3, 4].forEach(i => correctType(line1, i, 'Country', false));

  correctType(line2, 9, 'DocNumCheck', true);
  [10, 11, 12].forEach(i => correctType(line2, i, 'Nationality', false));
  [13, 14, 15, 16, 17, 18].forEach(i => correctType(line2, i, 'DOB', true));
  correctType(line2, 19, 'DOBCheck', true);
  
  [21, 22, 23, 24, 25, 26].forEach(i => correctType(line2, i, 'Expiry', true));
  correctType(line2, 27, 'ExpiryCheck', true);
  if (line2[43] !== '<' && !/[0-9]/.test(line2[43])) correctType(line2, 43, 'OverallCheck', true);

  const { char: sexChar, logs: sexLogs } = fixGenderByChecksum(line2, 20);
  if (sexLogs.length > 0) {
    line2[20] = sexChar;
    corrections.push(...sexLogs);
  }

  const tryFixField = (lst: string[], start: number, end: number, expectedCheckIdx: number) => {
    const original = lst.slice(start, end).join('');
    const expected = lst[expectedCheckIdx];
    if (checkDigit(original) === expected) return false;

    for (let i = 0; i < original.length; i++) {
      const c = original[i];
      let charReplaced = original;
      if (/[0-9]/.test(c)) {
        charReplaced = original.substring(0, i) + (DIGIT_TO_LETTER[c] || c) + original.substring(i + 1);
      } else {
        charReplaced = original.substring(0, i) + (LETTER_TO_DIGIT[c] || c) + original.substring(i + 1);
      }
      
      if (charReplaced !== original) {
        if (checkDigit(charReplaced) === expected) {
          for (let j = 0; j < charReplaced.length; j++) {
            lst[start + j] = charReplaced[j];
          }
          corrections.push(`Field [${start}:${end}] fixed via single char replace to '${charReplaced}'`);
          return true;
        }
      }
    }
    return false;
  };

  tryFixField(line2, 0, 9, 9);
  tryFixField(line2, 13, 19, 19);
  tryFixField(line2, 21, 27, 27);

  return { correctedMrz: line1.join('') + '\n' + line2.join(''), corrections };
}

export function parseChinesePassportMrz(mrz: string) {
  const cleanMrz = mrz.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanMrz.split('\n').filter(l => l.trim().length > 0);
  
  if (lines.length !== 2 || lines[0].length !== 44 || lines[1].length !== 44) {
    return { error: 'MRZ must be exactly 2 lines of 44 characters' };
  }

  const line1 = lines[0];
  const line2 = lines[1];

  const docType = line1.substring(0, 2);
  const issuingCountry = line1.substring(2, 5);
  const nameInfo = parseName(line1.substring(5, 44));

  const docNumber = line2.substring(0, 9);
  const docCheck = line2[9];
  const nationality = line2.substring(10, 13);
  const birthDateRaw = line2.substring(13, 19);
  const birthCheck = line2[19];
  const sex = line2[20];
  const expiryDateRaw = line2.substring(21, 27);
  const expiryCheck = line2[27];
  const personalNumber = line2.substring(28, 42);
  const personalCheck = line2[42];
  const overallCheck = line2[43];

  const docCheckCalc = checkDigit(docNumber);
  const birthCheckCalc = checkDigit(birthDateRaw);
  const expiryCheckCalc = checkDigit(expiryDateRaw);
  
  let personalCheckCalc = '<';
  if (personalNumber !== '<'.repeat(14)) {
    personalCheckCalc = checkDigit(personalNumber);
  }

  const overallData = line2.substring(0, 10) + line2.substring(13, 20) + line2.substring(21, 28) + line2.substring(28, 43);
  const overallCheckCalc = checkDigit(overallData);

  const parseDate = (yymmdd: string) => {
    try {
      const yy = parseInt(yymmdd.substring(0, 2), 10);
      const mm = parseInt(yymmdd.substring(2, 4), 10);
      const dd = parseInt(yymmdd.substring(4, 6), 10);
      
      if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;

      const now = new Date();
      const century = (yy <= ((now.getFullYear() % 100) + 10)) ? 2000 : 1900;
      
      return `${century + yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    } catch {
      return null;
    }
  };

  const birthDateIso = parseDate(birthDateRaw);
  const expiryDateIso = parseDate(expiryDateRaw);
  const issueInfo = estimateIssueDate(birthDateIso, expiryDateIso);

  return {
    documentType: docType,
    issuingCountry: issuingCountry,
    surname: nameInfo.surname,
    givenNames: nameInfo.givenNames,
    documentNumber: docNumber.replace(/</g, '').trim(),
    documentNumberCheckDigit: docCheck,
    nationality: nationality,
    birthDateRaw: birthDateRaw,
    birthDate: birthDateIso,
    birthDateCheckDigit: birthCheck,
    sex: sex,
    expiryDateRaw: expiryDateRaw,
    expiryDate: expiryDateIso,
    expiryDateCheckDigit: expiryCheck,
    issueDate: issueInfo ? issueInfo.issueDate : null,
    validityYears: issueInfo ? issueInfo.validityYears : null,
    personalNumber: personalNumber.replace(/</g, '').trim() || null,
    personalNumberCheckDigit: personalCheck !== '<' ? personalCheck : null,
    overallCheckDigit: overallCheck,
    checks: {
      documentNumberValid: docCheck === docCheckCalc,
      birthDateValid: birthCheck === birthCheckCalc,
      expiryDateValid: expiryCheck === expiryCheckCalc,
      personalNumberValid: (personalCheckCalc === '<' || personalCheck === personalCheckCalc),
      overallValid: overallCheck === overallCheckCalc
    }
  };
}

export function parseChinesePassportMrzWithOcrFix(rawMrz: string) {
  const { correctedMrz, corrections } = correctOcrErrors(rawMrz);
  const result = parseChinesePassportMrz(correctedMrz);
  return { ...result, ocrCorrections: corrections, correctedMrz };
}
