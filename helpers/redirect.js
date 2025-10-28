const baseUrl = (process.env.FRONTEND_URL || "http://localhost:5500").replace(/\/$/, "");
const FRONTEND_STATUS_PATH = process.env.FRONTEND_STATUS_PATH 

const redirectToFrontend = (res, status, ref, ticketId = null) => {
  let url = `${baseUrl}${FRONTEND_STATUS_PATH}?reference=${encodeURIComponent(ref)}&status=${encodeURIComponent(status)}`;

  if (status === "success" && ticketId) {
    url += `&ticketId=${encodeURIComponent(ticketId)}`;
  }

  console.log(`Redirecting user to: ${url}`);
  return res.redirect(302, url);
};

module.exports = redirectToFrontend;
