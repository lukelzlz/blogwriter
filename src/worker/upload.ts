import type { S3Config, ImageUploadParams, ImageUploadResponse } from '../shared/types';
import { validateSession } from './auth';
import type { Env } from './index';

// 生成唯一文件名
function generateFileName(mimeType: string, pathPrefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  // 处理 MIME 类型，获取扩展名
  let ext = 'png';
  if (mimeType.includes('/')) {
    const parts = mimeType.split('/');
    ext = parts[1] || 'png';
    // 处理特殊情况
    if (ext === 'jpeg') ext = 'jpg';
    if (ext === 'svg+xml') ext = 'svg';
  }
  const prefix = pathPrefix ? `${pathPrefix.replace(/\/$/, '')}/` : '';
  return `${prefix}${timestamp}-${random}.${ext}`;
}

// 将 ArrayBuffer 转换为十六进制字符串
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 计算 SHA256 哈希
async function sha256(data: string | ArrayBuffer): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
  return await crypto.subtle.digest('SHA-256', dataBuffer);
}

// 计算 HMAC-SHA256
async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyBuffer: ArrayBuffer = key instanceof Uint8Array ? (key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer) : (key as ArrayBuffer);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

// 获取签名密钥
async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

// 格式化日期为 AWS 格式
function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

// 格式化日期戳
function formatDateStamp(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

// 构建 S3 URL
function buildS3Url(config: S3Config, key: string): string {
  const endpoint = config.endpoint.replace(/^https?:\/\//, '');
  
  if (config.forcePathStyle) {
    // 路径风格: https://endpoint/bucket/key
    return `https://${endpoint}/${config.bucket}/${key}`;
  } else {
    // 虚拟主机风格: https://bucket.endpoint/key
    return `https://${config.bucket}.${endpoint}/${key}`;
  }
}

// 构建公开访问 URL
function buildPublicUrl(config: S3Config, key: string): string {
  let url: string;
  if (config.publicUrl) {
    const baseUrl = config.publicUrl.replace(/\/$/, '');
    url = `${baseUrl}/${key}`;
  } else {
    url = buildS3Url(config, key);
  }
  // 添加 URL 后缀（如 CDN 图片处理样式）
  if (config.urlSuffix) {
    url = `${url}${config.urlSuffix}`;
  }
  return url;
}

// AWS Signature V4 签名并删除
async function deleteFromS3(
  key: string,
  config: S3Config
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = formatDateStamp(now);
  
  const endpoint = config.endpoint.replace(/^https?:\/\//, '');
  const host = config.forcePathStyle ? endpoint : `${config.bucket}.${endpoint}`;
  const url = buildS3Url(config, key);
  
  // 空 payload 的哈希
  const payloadHash = bufferToHex(await sha256(''));
  
  // 构建规范请求
  const method = 'DELETE';
  const canonicalUri = config.forcePathStyle ? `/${config.bucket}/${key}` : `/${key}`;
  const canonicalQueryString = '';
  
  const headers: Record<string, string> = {
    'host': host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  
  // 按字母顺序排序 header 名称
  const sortedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderNames
    .map(name => `${name}:${headers[name]}\n`)
    .join('');
  const signedHeaders = sortedHeaderNames.join(';');
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  
  // 构建待签名字符串
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const canonicalRequestHash = bufferToHex(await sha256(canonicalRequest));
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  // 计算签名
  const signingKey = await getSignatureKey(
    config.secretAccessKey,
    dateStamp,
    config.region,
    's3'
  );
  const signature = bufferToHex(await hmacSha256(signingKey, stringToSign));
  
  // 构建 Authorization header
  const authorization = `${algorithm} Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  // 发送请求
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': authorization,
        'Host': host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
    });
    
    // S3 DELETE 成功返回 204 No Content
    if (response.ok || response.status === 204 || response.status === 200) {
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error('S3 delete failed:', response.status, errorText);
      return {
        success: false,
        error: `删除失败: ${response.status} - ${errorText}`,
      };
    }
  } catch (error) {
    console.error('S3 delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除请求失败',
    };
  }
}

// AWS Signature V4 签名并上传
async function uploadToS3(
  imageData: ArrayBuffer,
  mimeType: string,
  key: string,
  config: S3Config
): Promise<{ success: boolean; url?: string; error?: string }> {
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = formatDateStamp(now);
  
  const endpoint = config.endpoint.replace(/^https?:\/\//, '');
  const host = config.forcePathStyle ? endpoint : `${config.bucket}.${endpoint}`;
  const url = buildS3Url(config, key);
  
  // 计算 payload 哈希
  const payloadHash = bufferToHex(await sha256(imageData));
  
  // 构建规范请求
  const method = 'PUT';
  const canonicalUri = config.forcePathStyle ? `/${config.bucket}/${key}` : `/${key}`;
  const canonicalQueryString = '';
  
  const headers: Record<string, string> = {
    'host': host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    'content-type': mimeType,
    'content-length': imageData.byteLength.toString(),
  };
  
  // 按字母顺序排序 header 名称
  const sortedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderNames
    .map(name => `${name}:${headers[name]}\n`)
    .join('');
  const signedHeaders = sortedHeaderNames.join(';');
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  
  // 构建待签名字符串
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const canonicalRequestHash = bufferToHex(await sha256(canonicalRequest));
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  // 计算签名
  const signingKey = await getSignatureKey(
    config.secretAccessKey,
    dateStamp,
    config.region,
    's3'
  );
  const signature = bufferToHex(await hmacSha256(signingKey, stringToSign));
  
  // 构建 Authorization header
  const authorization = `${algorithm} Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  // 发送请求
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': authorization,
        'Content-Type': mimeType,
        'Content-Length': imageData.byteLength.toString(),
        'Host': host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
      body: imageData,
    });
    
    if (response.ok || response.status === 200 || response.status === 201) {
      return {
        success: true,
        url: buildPublicUrl(config, key),
      };
    } else {
      const errorText = await response.text();
      console.error('S3 upload failed:', response.status, errorText);
      return {
        success: false,
        error: `上传失败: ${response.status} - ${errorText}`,
      };
    }
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传请求失败',
    };
  }
}

// 处理上传请求
export async function handleUpload(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // 只允许 POST 请求
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // 验证会话 - 防止未授权访问
  const sessionId = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const session = await validateSession(env, sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // 解析请求体
    const body = await request.json() as ImageUploadParams;
    const { imageData, mimeType, config } = body;
    
    // 验证必要参数
    if (!imageData || !mimeType || !config) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // 验证 S3 配置
    if (!config.endpoint || !config.region || !config.accessKeyId || 
        !config.secretAccessKey || !config.bucket) {
      return new Response(JSON.stringify({ error: 'S3 配置不完整' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // 验证 MIME 类型
    if (!mimeType.startsWith('image/')) {
      return new Response(JSON.stringify({ error: '只允许上传图片文件' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // 解码 Base64 图片数据
    let imageBuffer: ArrayBuffer;
    try {
      // 移除可能的 data URL 前缀
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      imageBuffer = bytes.buffer;
    } catch (e) {
      return new Response(JSON.stringify({ error: '图片数据解码失败' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // 检查文件大小（限制 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (imageBuffer.byteLength > maxSize) {
      return new Response(JSON.stringify({ error: '图片大小不能超过 10MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // 生成文件名
    const key = generateFileName(mimeType, config.pathPrefix);
    
    // 上传到 S3
    const result = await uploadToS3(imageBuffer, mimeType, key, config);
    
    if (result.success) {
      const response: ImageUploadResponse = {
        url: result.url!,
        key: key,
      };
      return new Response(JSON.stringify({ data: response }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } else {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  } catch (error) {
    console.error('Upload handler error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : '上传处理失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

// 删除请求参数类型
interface ImageDeleteParams {
  key: string;
  config: S3Config;
}

// 处理删除请求
export async function handleDelete(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // 只允许 DELETE 或 POST 请求
  if (request.method !== 'DELETE' && request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // 验证会话 - 防止未授权访问
  const sessionId = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const session = await validateSession(env, sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // 解析请求体
    const body = await request.json() as ImageDeleteParams;
    const { key, config } = body;
    
    // 验证必要参数
    if (!key || !config) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // 验证 S3 配置
    if (!config.endpoint || !config.region || !config.accessKeyId ||
        !config.secretAccessKey || !config.bucket) {
      return new Response(JSON.stringify({ error: 'S3 配置不完整' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // 删除文件
    const result = await deleteFromS3(key, config);
    
    if (result.success) {
      return new Response(JSON.stringify({ data: { success: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } else {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  } catch (error) {
    console.error('Delete handler error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : '删除处理失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
