export const getAdminEmail = () =>
  (process.env.ADMIN_EMAIL || "sandeepyadav.dev.94@gmail.com").trim().toLowerCase();
