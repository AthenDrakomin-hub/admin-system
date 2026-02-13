import '../public/assets/styles/globals.css';

export const metadata = {
  title: 'ZY投资管理系统',
  description: '证券交易管理后台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
