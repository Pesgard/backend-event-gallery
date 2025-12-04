const INVITE_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const INVITE_CODE_LENGTH = 8;

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_CHARS.charAt(
      Math.floor(Math.random() * INVITE_CODE_CHARS.length),
    );
  }
  return code;
}

export function isValidInviteCode(code: string): boolean {
  if (!code || code.length !== INVITE_CODE_LENGTH) return false;
  return /^[A-Z0-9]{8}$/.test(code);
}

