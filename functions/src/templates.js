export function welcomeEmailTemplate({ name, role }) {
  const roleTitle = role === "seller" ? "Seller / Broker" : "Customer";
  const safeName = name || "there";
  return {
    subject: "Welcome to MovEasy - Account verified",
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.5; color:#0f172a;">
        <h2 style="margin:0 0 12px;">Welcome to MovEasy, ${safeName}!</h2>
        <p>Your email has been verified and your <strong>${roleTitle}</strong> account is active.</p>
        <p>What you can do next:</p>
        <ul>
          <li>Explore verified listings in Bengaluru</li>
          <li>Use map filters for rent, BHK, furnishing, and parking</li>
          <li>Track leads and assignment updates</li>
        </ul>
        <p style="margin-top:16px;">Need help? Reply to this email and our team will assist you.</p>
        <p style="margin-top:24px;color:#334155;">- Team MovEasy</p>
      </div>
    `,
  };
}
