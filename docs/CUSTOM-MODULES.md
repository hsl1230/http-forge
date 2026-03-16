# 自定义模块加载指南

## 概述

HTTP Forge 的脚本沙箱现在支持加载自定义npm模块！用户可以通过简单的 `npm install` 来扩展沙箱功能。

## 如何使用

### 1. 安装你需要的模块

在workspace根目录执行：

```bash
npm install <module-name>
```

例如：
```bash
npm install axios           # HTTP客户端
npm install dayjs           # 日期处理
npm install jsonpath-plus   # JSON路径查询
npm install faker           # 假数据生成
```

### 2. 在脚本中使用

安装后，可以直接在Pre-request或Post-response脚本中使用：

```javascript
// Pre-request Script 示例
const axios = require('axios');
const dayjs = require('dayjs');

// 使用axios发送请求
const response = await axios.get('https://api.example.com/token');
agl.environment.set('token', response.data.access_token);

// 使用dayjs处理日期
const expiryDate = dayjs().add(1, 'hour').toISOString();
agl.environment.set('tokenExpiry', expiryDate);
```

```javascript
// Post-response Script 示例
const jp = require('jsonpath-plus').JSONPath;
const faker = require('faker');

// 使用JSONPath提取数据
const emails = jp({ path: '$.users[*].email', json: agl.response.json() });
console.log('Found emails:', emails);

// 生成测试数据
const testUser = {
    name: faker.name.findName(),
    email: faker.internet.email()
};
```

## 内置模块

以下模块已经内置，无需安装即可使用：

### 常用工具库
- **lodash** (`_` 或 `require('lodash')`) - 实用工具函数库
- **moment** (`moment` 或 `require('moment')`) - 日期时间处理
- **uuid** (`require('uuid')`) - UUID生成
- **cheerio** (`require('cheerio')`) - HTML解析（类jQuery API）
- **xml2js** (`require('xml2js')`) - XML解析

### 数据验证
- **tv4** (`tv4` 或 `require('tv4')`) - JSON Schema验证（轻量级）
- **ajv** (`ajv` 或 `require('ajv')`) - JSON Schema验证（功能完整）

### 加密/编码
- **crypto** (`crypto` 或 `require('crypto')`) - Node.js crypto模块
- **CryptoJS** - 提供常用加密方法：
  - Hash: `MD5`, `SHA1`, `SHA256`, `SHA512`
  - HMAC: `HmacMD5`, `HmacSHA1`, `HmacSHA256`, `HmacSHA512`
  - 编码: `enc.Base64`, `enc.Utf8`, `enc.Hex`

### Node.js内置
- **querystring** - URL查询字符串解析
- **URL** - URL解析类
- **URLSearchParams** - URL参数操作
- **Buffer** - 二进制数据处理
- **atob** / **btoa** - Base64编解码

## 使用示例

### OAuth HMAC签名

```javascript
// Pre-request: 生成OAuth签名
const timestamp = Math.floor(Date.now() / 1000);
const nonce = require('uuid').v4();

const signatureBase = `${timestamp}\n${nonce}\n${agl.request.url}`;
const signature = CryptoJS.HmacSHA256(signatureBase, agl.environment.get('oauth_secret'));

agl.request.setHeader('Authorization', `OAuth signature="${signature}"`);
```

### JSON Schema验证

```javascript
// Post-response: 验证响应格式
const schema = {
    type: 'object',
    properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' }
    },
    required: ['id', 'name', 'email']
};

const data = agl.response.json();
const valid = tv4.validate(data, schema);

agl.test('Response matches schema', () => {
    if (!valid) {
        throw new Error(tv4.error.message);
    }
});
```

### HTML内容解析

```javascript
// Post-response: 从HTML提取CSRF token
const $ = require('cheerio').load(agl.response.body);
const csrfToken = $('meta[name="csrf-token"]').attr('content');
agl.session.set('csrf', csrfToken);
```

### 日期时间处理

```javascript
// Pre-request: 设置时间范围查询
const moment = require('moment');
const startDate = moment().subtract(7, 'days').format('YYYY-MM-DD');
const endDate = moment().format('YYYY-MM-DD');

agl.request.query.start = startDate;
agl.request.query.end = endDate;
```

## 安全性说明

### 模块白名单机制

1. **内置白名单**：上述内置模块始终可用
2. **Workspace依赖**：只有在workspace的 `package.json` 中声明的依赖才能加载
3. **动态加载**：其他模块会被拦截，提示用户安装

### 最佳实践

1. **只安装必要的模块**：减少依赖可以提高脚本执行速度
2. **使用内置模块优先**：内置模块经过优化，性能更好
3. **版本控制**：在 `package.json` 中锁定版本，避免意外更新

## 常见模块推荐

### HTTP客户端
- **axios** - 强大的HTTP客户端
- **node-fetch** - Fetch API实现

### 数据处理
- **lodash** - ✅ 已内置
- **ramda** - 函数式编程库
- **jsonpath-plus** - JSON路径查询

### 日期时间
- **moment** - ✅ 已内置
- **dayjs** - 轻量级moment替代
- **date-fns** - 模块化日期库

### 数据验证
- **tv4** - ✅ 已内置
- **ajv** - ✅ 已内置
- **joi** - 对象schema验证

### 数据生成
- **faker** - 假数据生成
- **chance** - 随机数据生成
- **uuid** - ✅ 已内置

### 解析器
- **cheerio** - ✅ 已内置 (HTML)
- **xml2js** - ✅ 已内置 (XML)
- **csv-parse** - CSV解析

## 故障排查

### 模块加载失败

**错误信息**：
```
Module 'xxx' is not available. Install it with: npm install xxx
```

**解决方案**：
1. 确保在workspace根目录执行 `npm install xxx`
2. 检查 `package.json` 中是否有该依赖
3. 重启VS Code让ScriptExecutor重新加载模块列表

### 模块存在但加载失败

**错误信息**：
```
Module 'xxx' is in package.json but failed to load: <error details>
```

**解决方案**：
1. 检查模块是否正确安装：`npm list xxx`
2. 尝试重新安装：`npm install xxx --force`
3. 检查模块是否与Node.js版本兼容

## 技术细节

### 实现原理

1. **启动时扫描**：`ScriptExecutor` 初始化时读取 workspace 的 `package.json`
2. **缓存依赖列表**：将 `dependencies` 和 `devDependencies` 缓存到 `availableModules` Set
3. **动态require**：脚本执行时，通过 Node.js 的 `require()` 动态加载模块
4. **隔离沙箱**：所有模块在vm2沙箱中运行，确保安全性

### 源码参考

- **script-executor.ts**：核心实现
  - `loadWorkspaceModules()`: 加载workspace模块列表
  - `createRequireFunction()`: 创建支持动态加载的require函数
  - Constructor参数: `workspacePath?: string`

- **service-bootstrap.ts**：依赖注入配置
  - 传递 `workspaceFolder.uri.fsPath` 给 ScriptExecutor

## 贡献

如果你发现某个常用模块应该成为内置模块，欢迎提交Issue或PR！

---

更新日期：2026-01-08
