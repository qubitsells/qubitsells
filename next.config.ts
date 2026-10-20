import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/templates/spooky",
        destination: "/templates/spooky-the-haunted-waltz",
        permanent: false,
      },
      {
        source: "/templates/haunted-waltz",
        destination: "/templates/spooky-the-haunted-waltz",
        permanent: false,
      },
      {
        source: "/templates/the-haunted-waltz",
        destination: "/templates/spooky-the-haunted-waltz",
        permanent: false,
      },
      {
        source: "/templates/halloween-haunted-waltz",
        destination: "/templates/spooky-the-haunted-waltz",
        permanent: false,
      },
      {
        source: "/templates/starlit",
        destination: "/templates/starlit-story",
        permanent: false,
      },
      {
        source: "/templates/starlitstory",
        destination: "/templates/starlit-story",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key:"X-Content-Type-Options",value:"nosniff" },
      { key:"Referrer-Policy",value:"no-referrer" },
      { key:"X-Frame-Options",value:"DENY" },
      { key:"Permissions-Policy",value:"camera=(), microphone=(self), geolocation=()" },
      { key:"Content-Security-Policy",value:"base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'" },
    ] }, ...["t", "love", "profile", "my-templates", "couple-space", "creator-center", "time-capsule", "checkout", "login", "signup", "reset-password", "auth", "api"].map(path => ({ source: `/${path}/:path*`, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }))];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.freetouse.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "eu.data.freetouse.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "data.freetouse.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
