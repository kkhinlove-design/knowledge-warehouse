export const metadata = {
  title: 'Knowledge Warehouse',
  description: 'Policy and research intelligence dashboard',
};

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
