/**
 * Every automatic email, with the wording it starts with. The office can
 * change subject, heading, text and button label in Admin → Emails; the
 * {{placeholders}} are filled in when the email is sent.
 */
export type TemplateDef = {
  key: string;
  name: string;
  /** Who receives it, shown in the admin. */
  to: "traveller" | "office" | "team member" | "subscriber";
  vars: string[];
  subject: string;
  heading: string;
  body: string;
  button?: string;
};

export const TEMPLATES: TemplateDef[] = [
  {
    key: "enquiry-received",
    name: "Enquiry received",
    to: "traveller",
    vars: ["name", "reference", "trip"],
    subject: "We've received your enquiry ({{reference}})",
    heading: "Namaste {{name}}, thank you for writing to us",
    body: "Your message has reached our office in Kathmandu. One of our trip planners will reply personally, usually within a few hours and always within one working day.\n\nIf it is urgent, WhatsApp us on +977 985 102 9616 and quote **{{reference}}**.",
  },
  {
    key: "enquiry-office",
    name: "New enquiry (office alert)",
    to: "office",
    vars: ["name", "reference", "kind", "trip", "email", "phone"],
    subject: "New {{kind}} enquiry from {{name}} ({{reference}})",
    heading: "New enquiry: {{name}}",
    body: "A new enquiry arrived from the website. Reply from the admin so it is tracked.",
    button: "Open in admin",
  },
  {
    key: "booking-received",
    name: "Booking received (with payment link)",
    to: "traveller",
    vars: ["name", "reference", "trip", "date", "pax", "total", "due"],
    subject: "Your booking for {{trip}} ({{reference}})",
    heading: "Thank you, {{name}}. Your trip is reserved",
    body: "We have reserved **{{trip}}** starting **{{date}}** for {{pax}}. To secure your place, please complete the payment of **{{due}}** through our secure payment partner WeTravel.\n\nOnce your payment is received we will confirm your booking and send your pre-departure information.",
    button: "Pay securely",
  },
  {
    key: "booking-request",
    name: "Booking request received (no payment link)",
    to: "traveller",
    vars: ["name", "reference", "trip", "date", "pax", "total", "due"],
    subject: "Your booking request for {{trip}} ({{reference}})",
    heading: "Thank you, {{name}}. We have your booking request",
    body: "We have your request for **{{trip}}** starting **{{date}}** for {{pax}}. Our team is checking availability and will send your secure payment link within one working day.",
  },
  {
    key: "booking-office",
    name: "New booking (office alert)",
    to: "office",
    vars: ["name", "reference", "trip", "date", "pax", "total", "due", "email", "phone"],
    subject: "New booking {{reference}}: {{trip}}, {{date}}",
    heading: "New booking from {{name}}",
    body: "A traveller booked online. Check the departure and follow up from the admin.",
    button: "Open booking",
  },
  {
    key: "payment-received",
    name: "Payment received",
    to: "traveller",
    vars: ["name", "reference", "trip", "date", "amount", "balance"],
    subject: "Payment received for {{trip}} ({{reference}})",
    heading: "We've received your payment, {{name}}",
    body: "Thank you. We have received **{{amount}}** for **{{trip}}** starting **{{date}}**.\n\nRemaining balance: **{{balance}}**.\n\nYour trip planner will be in touch with your pre-departure information.",
  },
  {
    key: "payment-office",
    name: "Payment received (office alert)",
    to: "office",
    vars: ["name", "reference", "trip", "amount", "balance"],
    subject: "Payment {{amount}} received: {{reference}}",
    heading: "Payment received from {{name}}",
    body: "WeTravel reported a payment of {{amount}} for {{trip}}. Balance now {{balance}}.",
    button: "Open booking",
  },
  {
    key: "booking-confirmed",
    name: "Booking confirmed",
    to: "traveller",
    vars: ["name", "reference", "trip", "date"],
    subject: "Confirmed: {{trip}} on {{date}}",
    heading: "Your trip is confirmed, {{name}}!",
    body: "Everything is set for **{{trip}}** starting **{{date}}**. Our team will meet you at Tribhuvan International Airport.\n\nBefore you travel:\n\n- Check your passport is valid for six months after arrival\n- Arrange travel insurance that covers trekking to your maximum altitude\n- Bring two passport photos for permits\n\nIf you have any questions, simply reply to this email.",
  },
  {
    key: "payment-reminder",
    name: "Payment reminder",
    to: "traveller",
    vars: ["name", "reference", "trip", "date", "due"],
    subject: "Reminder: payment for {{trip}} ({{reference}})",
    heading: "A friendly reminder, {{name}}",
    body: "Your place on **{{trip}}** starting **{{date}}** is held for you. The payment of **{{due}}** is still open. You can pay securely with the button below.",
    button: "Pay securely",
  },
  {
    key: "newsletter-welcome",
    name: "Newsletter welcome",
    to: "subscriber",
    vars: [],
    subject: "Welcome to Base Camp Adventure",
    heading: "Namaste, and welcome!",
    body: "Thank you for joining us. A few times a year we'll send seasonal trip ideas, trekking guides and our festival offers. No spam, ever.",
    button: "Browse our trips",
  },
  {
    key: "review-request",
    name: "Review request (after the trip)",
    to: "traveller",
    vars: ["name", "trip"],
    subject: "How was {{trip}}?",
    heading: "Dhanyabad, {{name}}!",
    body: "We hope you came home with wonderful memories of **{{trip}}**. A short review helps other travellers and means a lot to our guides and porters.",
    button: "Write a review",
  },
  {
    key: "password-reset",
    name: "Password reset",
    to: "team member",
    vars: ["name"],
    subject: "Reset your Base Camp admin password",
    heading: "Reset your password",
    body: "Hi {{name}}, someone asked to reset the password for your Base Camp Adventure admin account. The link below works once, for 30 minutes.\n\nIf this wasn't you, ignore this email: your password has not changed.",
    button: "Choose a new password",
  },
  {
    key: "password-changed",
    name: "Password changed",
    to: "team member",
    vars: ["name", "when"],
    subject: "Your admin password was changed",
    heading: "Your password was changed",
    body: "Hi {{name}}, the password for your admin account was changed on {{when}} (Nepal time) and every device was signed out.\n\nIf this was not you, contact the account owner straight away.",
  },
  {
    key: "user-invite",
    name: "Invitation to the admin",
    to: "team member",
    vars: ["name", "inviter"],
    subject: "You're invited to the Base Camp Adventure admin",
    heading: "Welcome to the team, {{name}}",
    body: "{{inviter}} has created an admin account for you. Choose your password with the button below (the link works for 3 days), then set up two-step sign-in with an authenticator app on your phone.",
    button: "Set my password",
  },
];

export const templateDef = (key: string) => TEMPLATES.find((t) => t.key === key);

export const fill = (s: string, vars: Record<string, string | number | null | undefined>) =>
  s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => (vars[k] === undefined || vars[k] === null ? "" : String(vars[k])));
