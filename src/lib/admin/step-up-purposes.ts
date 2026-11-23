/**
 * Kinds of sensitive change that need a fresh authenticator code and a
 * confirmation. A code confirms one kind only, so a code typed to delete a
 * photo can't be reused to change payment keys. Safe in the browser.
 */
export const STEP_UP = {
  users: "Team accounts",
  settings: "Settings",
  keys: "Payment and email keys",
  delete: "Deleting for good",
  replace: "Replacing a photo everywhere",
  redirect: "Redirects",
  money: "Receipts and credit notes",
  newsletter: "Sending the newsletter",
} as const;
export type StepUpPurpose = keyof typeof STEP_UP;
export const STEP_UP_SECONDS = 120;
