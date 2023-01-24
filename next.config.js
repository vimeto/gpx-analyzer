/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    MapboxAccessTokenDev: process.env.MapboxAccessTokenDev
  }
}

module.exports = nextConfig
