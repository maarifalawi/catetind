/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  typescript: {
    // Gerbang tipe ikut nyala di build (task 25). `pnpm exec tsc --noEmit` sudah
    // bersih, jadi build tidak boleh lolos dengan tipe rusak. Kalau build nanti
    // gagal karena tipe, PERBAIKI tipenya — jangan matikan gerbang ini lagi.
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
