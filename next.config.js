/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  api: { bodyParser: { sizeLimit: "8mb" } }
};
