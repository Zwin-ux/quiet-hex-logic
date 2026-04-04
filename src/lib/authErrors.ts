function errorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Request failed';
  const candidate = error as Record<string, unknown>;
  const raw =
    (typeof candidate.message === 'string' && candidate.message) ||
    (typeof candidate.error_description === 'string' && candidate.error_description) ||
    (typeof candidate.error === 'string' && candidate.error) ||
    'Request failed';
  return raw.trim();
}

export function isAnonymousAuthDisabledError(error: unknown): boolean {
  return /anonymous sign-ins are disabled/i.test(errorMessage(error));
}

export function guestAuthMessage(error: unknown, signedInAction = 'continue'): string {
  if (isAnonymousAuthDisabledError(error)) {
    return `Guest mode is off on this deployment. Sign in to ${signedInAction}.`;
  }
  return errorMessage(error);
}
