import { PLANNED_PRICING_DESCRIPTION } from "./storefront";

export const OPERATOR_NAME = "QubitSells";
export const SUPPORT_EMAIL = "support@qubitsells.com";

// Customer-facing information about the service and its actual data handling.
export const PUBLIC_INFORMATION = {
  about: {
    title: "A little thought. A lasting feeling.",
    intro: "QubitSells is a home for personalized digital gifts: illustrated web experiences with your words, photos, and optional interactions, made to share by link.",
    sections: [
      ["Made for someone in particular", "Choose a design, personalize the names and message, add supported photos or tools, and choose when the link expires. You are creating a webpage, not purchasing a downloadable video."],
      ["Gifting comes first", "A couple connection is not required to create or receive a gift. The current illustrated collection is mostly romantic; preview the story before choosing it for a friend or family member."],
      ["And a private space for two", "Couple Space is a separate part of QubitSells for relationship profiles, date ideas, and time capsules. Private account features require sign-in, and shared capsules require partner consent."],
      ["Our website", `${OPERATOR_NAME} operates qubitsells.com. For questions about your account, templates, or orders, contact ${SUPPORT_EMAIL}.`],
    ],
  },
  contact: {
    title: "A little help, when you need it.",
    intro: "Find guidance for creating a gift, opening a shared link, and managing your private content.",
    sections: [
      ["How to reach us", `Email ${SUPPORT_EMAIL} for help with your ${OPERATOR_NAME} account, templates, or orders. Include your order reference where relevant and a short description of what you need help with.`],
      ["A link is not opening", "Ask the sender to check the link and its expiry. An expired or deleted template cannot be opened. A shared template link does not require recipient sign-in, but private Couple Space and capsules do."],
      ["Managing or deleting a gift", "Use the original browser or your private creator management link. Keep that management link private: it grants access to creator controls. Published gifts cannot currently be fully edited; create a replacement when necessary."],
      ["Payments and refunds", `${PLANNED_PRICING_DESCRIPTION} Payments are handled through Stripe-hosted checkout. You can find your orders and their payment status in your personal profile. For payment questions or refund requests, email ${SUPPORT_EMAIL} with your order reference. QubitSells does not store your full card details.`],
      ["Privacy requests", `You can manage your content and delete your account using the controls in your profile. For help with a privacy request, email ${SUPPORT_EMAIL}. Do not include passwords, private media, management links, or payment card details.`],
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: `This policy explains how ${OPERATOR_NAME} handles your information when you use qubitsells.com. Last updated 21 October 2026. For privacy questions, contact ${SUPPORT_EMAIL}.`,
    sections: [
      ["Account and sign-in information", "QubitSells uses Supabase for authentication and application data. If you choose Google sign-in, Supabase receives the profile information Google authorizes, such as your email and basic profile. QubitSells uses your account ID, email, and profile fields for sign-in and account features. The app does not request Gmail, Contacts, Calendar, or Drive access."],
      ["Gift and interaction content", "We process the names, messages, photos, audio, selected music, and optional tool settings you submit to create your gift. Recipient replies, votes, invitation responses, and other supported interactions are stored so the gift creator and authorized participants can use them. Microphone access is requested only when you choose to record audio."],
      ["Shared links and private content", "A template link is accessible to anyone who has it until expiry or deletion; it is not protected by recipient sign-in. Share it carefully. Creator management links grant management access and must stay private. Couple profiles, capsules, and stored private media use separate server-side ownership and membership checks. A couple connection is not required for general gift creation."],
      ["Orders, wishlist, reviews, and notifications", "Orders and wishlists belong to your individual account. Reviews require a paid order and publish your display name, star rating, title, and review text. In-app notifications summarize order updates and template activity without displaying private answers or media. Review requests may appear after a purchase."],
      ["Service providers", "Supabase stores account and application records. Cloudinary processes uploaded media through our server. Selecting or playing external music may contact Free To Use or YouTube, and choosing Google sign-in contacts Google. These providers process the network and content information needed for those features. Stripe processes checkout payments and sends payment-status updates to our server. We store product, duration, payment references, and order status; we do not store full card numbers."],
      ["Cookies, browser storage, and security", "The app uses session cookies, guest upload ownership cookies, and creator management cookies to maintain sign-in and authorize content controls. It also uses browser storage for creator history and app state. The server uses a salted hash of network address information where available to limit abuse. Vercel Web Analytics measures website traffic and usage, and Vercel Speed Insights measures page loading, responsiveness, and layout stability. URLs sent to these services omit query parameters and fragments, and shared gift codes are replaced with a generic path, including in performance route names. Authentication callbacks and API URLs are excluded. The storefront does not add advertising trackers or a mailing list."],
      ["Retention and deletion", "Purchased links remain live for 3, 7, or 30 days from publication, according to the chosen order. Expired links stop working. The cleanup system schedules expired templates, replies, and associated media for removal and retries failed media deletion. Abandoned uploads are scheduled for cleanup after 24 hours. Account and capsule records remain until deleted through their applicable controls; template expiry does not delete a separate account or capsule. Recipient downloads, screenshots, and offline copies cannot be removed remotely."],
      ["Your choices and questions", `You can choose which content to upload, disable optional interactions, and choose a template expiry. Use the original browser or private creator management link to delete a template. Available account and capsule controls allow their owner to manage or delete content subject to shared capsule rules. Email ${SUPPORT_EMAIL} for help with a privacy request.`],
    ],
  },
  terms: {
    title: "Terms of use",
    intro: `These terms apply when you use ${OPERATOR_NAME} at qubitsells.com. Please read them before creating content or making a purchase. Last updated 21 October 2026.`,
    sections: [
      ["What the service provides", "QubitSells lets you personalize a supported illustrated web experience and share it by an expiring link. It does not provide a downloadable video, permanent archive, or unlimited hosting. Private Couple Space and capsule features are separate from gift creation."],
      ["Your content and access", "Only submit material you have permission to use and share. Keep account credentials and creator management links private. Do not use the service to upload unlawful content, impersonate others, harass a recipient, or try to access someone else’s private content. Public gift links can be opened by anyone who has them."],
      ["Availability and expiry", "Choose the gift expiry before generating its link and share it before it expires. An expired or deleted link stops working. Service availability and cleanup depend on the configured hosting and providers; no promise of lifetime hosting or instantaneous deletion of every provider copy is made."],
      ["Personalization and changes", "Preview and edit your gift before generating its link. The current editors do not support full editing of an already published gift. One order covers one published link. A replacement requires a new purchase; you can delete the original using your creator controls. Recipient copies cannot be deleted remotely."],
      ["Pricing and payment", `${PLANNED_PRICING_DESCRIPTION} The 7-day option adds $1 USD to the base price, and the 30-day option adds $1.49 USD to the base price. Review your selected duration and total before completing Stripe-hosted checkout. Only confirmed payments grant access to publish one link. Your selected duration begins on publication. See our refund policy for information about payment issues and refund requests.`],
      ["Contacting us", `${OPERATOR_NAME} operates qubitsells.com. For questions about these terms, your account, or an order, contact ${SUPPORT_EMAIL}. Include your order reference when asking about a purchase.`],
    ],
  },
  "refund-policy": {
    title: "Refund policy",
    intro: `If something is wrong with your ${OPERATOR_NAME} purchase, contact ${SUPPORT_EMAIL} with your order reference and a description of the issue. Last updated 21 October 2026.`,
    sections: [
      ["Before you purchase", `Preview the template and explore its editor before buying. ${PLANNED_PRICING_DESCRIPTION} One confirmed order covers one published link. Your selected duration starts when you publish the link.`],
      ["Requesting a refund", `Email ${SUPPORT_EMAIL} with your order reference, the issue you experienced, and whether you have published the template. We review requests based on the order, payment status, and what was delivered. Sending a request does not automatically cancel an order or delete a published template.`],
      ["Payment issues", `If you notice a duplicate or unexpected charge, keep your Stripe receipt and transaction reference and contact ${SUPPORT_EMAIL}. Never send full card details, passwords, or a creator management link.`],
      ["Your account and content", "Deleting your account or a template does not submit a refund request. Please contact support about the payment separately and keep your order reference so we can locate the purchase."],
    ],
  },
} as const;
