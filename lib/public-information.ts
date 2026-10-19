import { PLANNED_PRICING_DESCRIPTION } from "./storefront";

export const OPERATOR_NAME = "QubitSells";
export const SUPPORT_EMAIL = "support@qubitsells.com";

// Factual descriptions of the current implementation, not promises about an
// unconfigured payment provider, corporate identity, or permanent hosting.
export const PUBLIC_INFORMATION = {
  about: {
    title: "A little thought. A lasting feeling.",
    intro: "QubitSells is a home for personalized digital gifts: illustrated web experiences with your words, photos, and optional interactions, made to share by link.",
    sections: [
      ["Made for someone in particular", "Choose a design, personalize the names and message, add supported photos or tools, and choose when the link expires. You are creating a webpage, not purchasing a downloadable video."],
      ["Gifting comes first", "A couple connection is not required to create or receive a gift. The current illustrated collection is mostly romantic; preview the story before choosing it for a friend or family member."],
      ["And a private space for two", "Couple Space is a separate part of QubitSells for relationship profiles, date ideas, and time capsules. Private account features require sign-in, and shared capsules require partner consent."],
      ["Our website", `${OPERATOR_NAME} is the website and operator name. Our intended public domain is qubitsells.com. Domain and support mailbox activation are pending.`],
    ],
  },
  contact: {
    title: "A little help, when you need it.",
    intro: "Find guidance for creating a gift, opening a shared link, and managing your private content.",
    sections: [
      ["Contact", `The planned ${OPERATOR_NAME} support email is support@qubitsells.com. The domain and mailbox are being set up; delivery is not yet confirmed. There is no separate support form or live chat in this version.`],
      ["A link is not opening", "Ask the sender to check the link and its expiry. An expired or deleted template cannot be opened. A shared template link does not require recipient sign-in, but private Couple Space and capsules do."],
      ["Managing or deleting a gift", "Use the original browser or your private creator management link. Keep that management link private: it grants access to creator controls. Published gifts cannot currently be fully edited; create a replacement when necessary."],
      ["Payments and refunds", `${PLANNED_PRICING_DESCRIPTION} Stripe checkout is not integrated yet, and this version does not collect payment. No order or payment success is created by the storefront buttons.`],
      ["Privacy requests", "Use the content and account deletion controls available in the app. Once the support mailbox is active, you can email it for help. Do not include passwords, private media, management links, or payment card details in a request."],
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: `This page explains the data flows implemented in ${OPERATOR_NAME}. Last updated 19 October 2026. The intended website is qubitsells.com; the support mailbox is support@qubitsells.com and is pending activation.`,
    sections: [
      ["Account and sign-in information", "QubitSells uses Supabase for authentication and application data. If you choose Google sign-in, Supabase receives the profile information Google authorizes, such as your email and basic profile. QubitSells uses your account ID, email, and profile fields for sign-in and account features. The app does not request Gmail, Contacts, Calendar, or Drive access."],
      ["Gift and interaction content", "We process the names, messages, photos, audio, selected music, and optional tool settings you submit to create your gift. Recipient replies, votes, invitation responses, and other supported interactions are stored so the gift creator and authorized participants can use them. Microphone access is requested only when you choose to record audio."],
      ["Shared links and private content", "A template link is accessible to anyone who has it until expiry or deletion; it is not protected by recipient sign-in. Share it carefully. Creator management links grant management access and must stay private. Couple profiles, capsules, and stored private media use separate server-side ownership and membership checks. A couple connection is not required for general gift creation."],
      ["Service providers", "Supabase stores account and application records. Cloudinary processes uploaded media through our server. Selecting or playing external music may contact Free To Use or YouTube, and choosing Google sign-in contacts Google. These providers process the network and content information needed for those features. Stripe is planned for payment processing, but no Stripe checkout is integrated in this version."],
      ["Cookies, browser storage, and security", "The app uses session cookies, guest upload ownership cookies, and creator management cookies to maintain sign-in and authorize content controls. It also uses browser storage for creator history and app state. The server uses a salted hash of network address information where available to limit abuse. The current storefront does not add advertising trackers, analytics scripts, or a mailing list."],
      ["Retention and deletion", "Template creation requires an expiry between 1 hour and 30 days; the featured editors offer 1, 3, 7, or 30 days. Expired links stop working. The cleanup system schedules expired templates, replies, and associated media for removal and retries failed media deletion. Abandoned uploads are scheduled for cleanup after 24 hours. Account and capsule records remain until deleted through their applicable controls; template expiry does not delete a separate account or capsule. Recipient downloads, screenshots, and offline copies cannot be removed remotely."],
      ["Your choices and questions", `You can choose which content to upload, disable optional interactions, and choose a template expiry. Use the original browser or private creator management link to delete a template. Available account and capsule controls allow their owner to manage or delete content subject to shared capsule rules. Contact ${OPERATOR_NAME} at the planned support address once its mailbox is active for help with a privacy request.`],
    ],
  },
  terms: {
    title: "Terms of use",
    intro: `These terms describe the current ${OPERATOR_NAME} service. Last updated 19 October 2026. Commercial checkout is not yet available.`,
    sections: [
      ["What the service provides", "QubitSells lets you personalize a supported illustrated web experience and share it by an expiring link. It does not provide a downloadable video, permanent archive, or unlimited hosting. Private Couple Space and capsule features are separate from gift creation."],
      ["Your content and access", "Only submit material you have permission to use and share. Keep account credentials and creator management links private. Do not use the service to upload unlawful content, impersonate others, harass a recipient, or try to access someone else’s private content. Public gift links can be opened by anyone who has them."],
      ["Availability and expiry", "Choose the gift expiry before generating its link and share it before it expires. An expired or deleted link stops working. Service availability and cleanup depend on the configured hosting and providers; no promise of lifetime hosting or instantaneous deletion of every provider copy is made."],
      ["Personalization and changes", "Preview and edit your gift before generating its link. The current editors do not support full editing of an already published gift. You can create a replacement and delete the original using your creator controls. Recipient copies cannot be deleted remotely."],
      ["Pricing and payment", `${PLANNED_PRICING_DESCRIPTION} The 7-day option adds $1 USD to the base price, and the 30-day option adds $1.49 USD to the base price. Stripe is the intended provider, but paid checkout and payment confirmation are not implemented. Existing free creation and sharing remain available during setup. A purchase must show its final price and duration before any payment is confirmed.`],
      ["Before commercial launch", `${OPERATOR_NAME} is both the website and operator name. The applicable jurisdiction, active support mailbox, and payment and refund processes must be finalized before paid sales begin.`],
    ],
  },
  "refund-policy": {
    title: "Refund policy",
    intro: `${OPERATOR_NAME} paid checkout is not yet enabled. This version does not collect a template payment or issue payment confirmations.`,
    sections: [
      ["Current offering", `The existing template editors and sharing tools remain free while payment setup is in progress. ${PLANNED_PRICING_DESCRIPTION} There is no payment to refund for use of the current free tools.`],
      ["Future purchases", "Stripe is the intended payment provider. Before paid checkout opens, the final price, link duration, support channel, and refund process must be shown and confirmed. No automatic refund, money-back guarantee, or blanket refusal of refunds is promised here."],
      ["An unexpected charge", "This version has no payment checkout. If you believe a charge relates to QubitSells, keep the provider receipt and transaction reference. Once the support mailbox is active, contact support@qubitsells.com. Never send full card details, passwords, or a creator management link."],
    ],
  },
} as const;
