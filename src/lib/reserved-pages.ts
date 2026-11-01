/**
 * Old WordPress page addresses that now have their own designed page (or are
 * plugin screens that redirect). Their imported text isn't shown, so the admin
 * labels them and the SEO check skips them.
 */
export const RESERVED_PAGES = new Set([
  "home", "about-us", "our-team", "contact-us", "customize-trip", "booking", "checkout", "testimonials",
  "blogs", "destination", "activities", "trip-types", "thank-you", "online-payment", "online-payment-form",
  "search-result", "review-listing-page", "wishlist", "user-dashboard", "travelers-information",
  "thanking-you", "enquiry-received", "enquiry-thankyou-page", "success", "cancel",
]);
