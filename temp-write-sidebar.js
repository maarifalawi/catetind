const fs = require('fs');

// Baca file sidebar terlebih dahulu
let content = fs.readFileSync('components/catetind/desktop-sidebar.tsx', 'utf8');

// Tambahkan menu keluarga dan bersama jika belum ada
if (!content.includes('/family') && !content.includes('/joint')) {
 // Temukan bagian akhir array navigasi
 const newMenuItems = `  {
    label: 'Keluarga',
    items: [
      { href: '/family', icon: Users, label: 'Family Wallet' },
    ]
  },
  {
    label: 'Bersama',
    items: [
      { href: '/joint', icon: Heart, label: 'Joint Wallet' },
    ]
  }`;
  
  // Masukkan sebelum penutup array
  content = content.replace(
    /(export const NAVIGATION: NavigationItem\[\] = \[)/,
    `$1\n${newMenuItems}`
  );
}

fs.writeFileSync('components/catetind/desktop-sidebar.tsx', content, 'utf8');
console.log('sidebar updated');

// Hapus file script ini
fs.unlinkSync('temp-write-sidebar.js');