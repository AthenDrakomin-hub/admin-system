import '../public/assets/styles/globals.css';

export const metadata = {
  title: '银河证券-证裕交易单元管理系统',
  description: '中国银河证券 - 证裕投资交易单元 Admin 管理后台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
