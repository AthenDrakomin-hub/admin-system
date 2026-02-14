# 新浪财经免费行情接口

## 接口说明

✅ **完全免费** - 无需 API Key  
✅ **实时数据** - 延迟约15秒  
✅ **支持A股和港股**  
✅ **无调用限制**  

## 实现位置

- `lib/sina-quote.ts` - 新浪财经接口封装
- `lib/market.ts` - 行情服务（已接入）
- `app/api/market/route.ts` - 行情API
- `app/admin/market/page.tsx` - 行情展示页面

## API 使用

### 1. 获取单个股票行情

```typescript
import { fetchSinaQuote } from '@/lib/sina-quote';

const quote = await fetchSinaQuote('600000'); // 浦发银行
// 返回：{ symbol, name, price, change, changePercent, volume, amount, ... }
```

### 2. 批量获取行情

```typescript
import { fetchSinaQuotes } from '@/lib/sina-quote';

const quotes = await fetchSinaQuotes(['600000', '000001', '600519']);
// 返回：Quote[]
```

### 3. 搜索股票

```typescript
import { searchStock } from '@/lib/sina-quote';

const results = await searchStock('浦发');
// 返回：[{ symbol: '600000', name: '浦发银行', type: 'A股' }]
```

## HTTP API

### 获取单个股票

```bash
GET /api/market?symbol=600000
```

### 批量获取

```bash
GET /api/market?symbols=600000,000001,600519
```

### 搜索股票

```bash
GET /api/market?search=浦发
```

## 数据格式

```typescript
interface SinaQuote {
  symbol: string;          // 股票代码
  name: string;            // 股票名称
  price: number;           // 最新价
  open: number;            // 开盘价
  close: number;           // 昨收价
  high: number;            // 最高价
  low: number;             // 最低价
  volume: number;          // 成交量（手）
  amount: number;          // 成交额（元）
  change: number;          // 涨跌额
  changePercent: number;   // 涨跌幅（%）
  timestamp: string;       // 时间戳
}
```

## 股票代码格式

### A股
- 上海：`600000` → `sh600000`
- 深圳：`000001` → `sz000001`
- 创业板：`300001` → `sz300001`

### 港股
- `00700` → `hk00700`

## 缓存策略

- 使用 Vercel KV 缓存
- 缓存时间：5分钟
- 自动刷新

## 行情页面功能

✅ 实时行情展示  
✅ 自动刷新（每5秒）  
✅ 涨跌颜色标识  
✅ 成交量/成交额  
✅ 手动刷新按钮  

## 注意事项

1. **延迟**：数据延迟约15秒
2. **交易时间**：仅交易时间段有实时数据
3. **稳定性**：新浪接口稳定，但建议添加错误处理
4. **跨域**：服务端调用，无跨域问题

## 扩展功能

可以继续添加：
- K线数据
- 分时数据
- 历史数据
- 财务数据
- 公告信息

## 示例代码

```typescript
// 在任意组件中使用
const [quote, setQuote] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    const res = await fetch('/api/market?symbol=600000');
    const data = await res.json();
    if (data.success) {
      setQuote(data.data);
    }
  };
  
  fetchData();
  const interval = setInterval(fetchData, 5000);
  return () => clearInterval(interval);
}, []);
```

## 测试

访问：http://localhost:3000/admin/market

查看实时行情数据
