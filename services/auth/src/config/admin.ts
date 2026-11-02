export const isAdminEmail = (email: string) => {
  const adminEmail = (process.env.ADMIN_EMAIL || "sandeepyadav.dev.94@gmail.com")
    .trim()
    .toLowerCase();
  return email.trim().toLowerCase() === adminEmail;
};
