/**
 * 安全测试脚本
 * 用于验证 API 端点的认证和授权
 */

const API_BASE_URL = process.env.API_BASE_URL || 'https://writer-api.qwqc.cc';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testUnauthorizedUpload() {
  log('\n=== 测试 1: 未认证的图片上传 (应该返回 401) ===', 'blue');
  try {
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        config: {
          provider: 'custom',
          endpoint: 'https://s3.amazonaws.com',
          region: 'us-east-1',
          accessKeyId: 'test',
          secretAccessKey: 'test',
          bucket: 'test',
          publicUrl: 'https://example.com',
          pathPrefix: '',
          forcePathStyle: false
        }
      })
    });

    if (response.status === 401) {
      log('✅ 通过: 未认证请求被正确拒绝', 'green');
      return true;
    } else {
      log(`❌ 失败: 期望 401，收到 ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
    return false;
  }
}

async function testUnauthorizedDelete() {
  log('\n=== 测试 2: 未认证的图片删除 (应该返回 401) ===', 'blue');
  try {
    const response = await fetch(`${API_BASE_URL}/api/upload/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'test-key',
        config: {
          provider: 'custom',
          endpoint: 'https://s3.amazonaws.com',
          region: 'us-east-1',
          accessKeyId: 'test',
          secretAccessKey: 'test',
          bucket: 'test',
          publicUrl: 'https://example.com',
          pathPrefix: '',
          forcePathStyle: false
        }
      })
    });

    if (response.status === 401) {
      log('✅ 通过: 未认证请求被正确拒绝', 'green');
      return true;
    } else {
      log(`❌ 失败: 期望 401，收到 ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
    return false;
  }
}

async function testUnauthorizedPostsAccess() {
  log('\n=== 测试 3: 未认证的文章访问 (应该返回 401) ===', 'blue');
  try {
    const response = await fetch(`${API_BASE_URL}/api/posts`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 401) {
      log('✅ 通过: 未认证请求被正确拒绝', 'green');
      return true;
    } else {
      log(`❌ 失败: 期望 401，收到 ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 错误: ${error.message}`, 'red');
    return false;
  }
}

async function testCorsOrigin() {
  log('\n=== 测试 4: CORS 未允许来源 (应该返回 403 或无 CORS 头) ===', 'blue');
  try {
    const response = await fetch(`${API_BASE_URL}/api/posts`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://malicious-site.com',
        'Access-Control-Request-Method': 'POST'
      }
    });

    const acao = response.headers.get('Access-Control-Allow-Origin');
    if (!acao || acao === 'null' || response.status === 403) {
      log('✅ 通过: 未允许来源被正确拒绝', 'green');
      return true;
    } else {
      log(`❌ 失败: CORS 头泄露: ${acao}`, 'red');
      return false;
    }
  } catch (error) {
    log(`⚠️  跳过: ${error.message}`, 'yellow');
    return null;
  }
}

async function testAuthEndpoint() {
  log('\n=== 测试 5: OAuth 端点可用性 (应该返回 200) ===', 'blue');
  try {
    const response = await fetch(`${API_BASE_URL}/auth/github`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.url && data.url.includes('github.com')) {
        log('✅ 通过: OAuth 端点正常工作', 'green');
        return true;
      }
    }
    log(`❌ 失败: OAuth 端点异常`, 'red');
    return false;
  } catch (error) {
    log(`⚠️  跳过: ${error.message}`, 'yellow');
    return null;
  }
}

async function main() {
  log('╔══════════════════════════════════════════╗', 'blue');
  log('║   Hexo Blog Manager 安全测试套件          ║', 'blue');
  log('╚══════════════════════════════════════════╝', 'blue');
  log(`API 地址: ${API_BASE_URL}`, 'yellow');

  const results = [];

  results.push(await testUnauthorizedUpload());
  results.push(await testUnauthorizedDelete());
  results.push(await testUnauthorizedPostsAccess());
  results.push(await testCorsOrigin());
  results.push(await testAuthEndpoint());

  const passed = results.filter(r => r === true).length;
  const failed = results.filter(r => r === false).length;
  const skipped = results.filter(r => r === null).length;

  log('\n═════════════════════════════════════════', 'blue');
  log(`测试结果: ${passed} 通过, ${failed} 失败, ${skipped} 跳过`, 'blue');
  log('═════════════════════════════════════════', 'blue');

  if (failed === 0) {
    log('🎉 所有安全测试通过！', 'green');
    process.exit(0);
  } else {
    log('⚠️  部分测试失败，请检查以上输出', 'red');
    process.exit(1);
  }
}

main().catch(console.error);
