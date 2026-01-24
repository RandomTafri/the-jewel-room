// This file is shared configuration. 
// For Frontend: It can be served or copied. Since this is a template, we will make it available to backend.
// Frontend will fetch config from an endpoint or have a specific public config.

module.exports = {
    appName: "Shree Roop Creative",
    currencySymbol: "₹",
    supportEmail: "shreeroopcreative@gmail.com",
    supportPhone: "+918397803333",

    // Toggles
    enableCOD: true,
    enableOnlinePayment: true,
    enableDiscounts: true,

    // Razorpay (Public key only here, secret in env)
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",

    // WhatsApp
    whatsappNumber: "918397803333", // No + or spaces

    // Theme Colors (Default Ivory/Gold feel)
    theme: {
        primary: "#d4af37", // Gold
        secondary: "#fbf6e5", // Ivory
        text: "#333333",
        accent: "#c9a12c"
    }
};
