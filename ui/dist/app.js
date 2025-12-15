// Go-Knife4j Frontend Application
let swaggerData = null;
let currentApi = null;
let isDarkMode = false;
let config = {};
let globalHeaders = []; // 用户自定义的全局请求头

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    await loadSwagger();
    setupSearch();
    loadGlobalHeadersFromStorage();
});

// Load configuration
async function loadConfig() {
    try {
        const res = await fetch('./config.json');
        config = await res.json();
        document.getElementById('doc-title').textContent = config.title || 'API Docs';
        document.title = config.title || 'API Documentation';
        if (config.darkMode) {
            toggleTheme();
        }
    } catch (e) {
        console.log('Using default config');
    }
}

// Load Swagger JSON
async function loadSwagger() {
    try {
        const res = await fetch('./swagger.json');
        swaggerData = await res.json();
        renderApiList();
    } catch (e) {
        document.getElementById('api-list').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-circle text-2xl"></i>
                <p class="mt-2">加载失败，请检查 swagger.json</p>
            </div>
        `;
    }
}

// Render API list grouped by tags
function renderApiList(filter = '') {
    const container = document.getElementById('api-list');
    const paths = swaggerData.paths || {};
    const tags = swaggerData.tags || [];
    
    // Group APIs by tag
    const grouped = {};
    const filterLower = filter.toLowerCase();
    
    for (const [path, methods] of Object.entries(paths)) {
        for (const [method, api] of Object.entries(methods)) {
            if (method === 'parameters') continue;
            
            const apiTags = api.tags || ['默认'];
            const summary = api.summary || '';
            const searchText = `${path} ${summary} ${method}`.toLowerCase();
            
            if (filter && !searchText.includes(filterLower)) continue;
            
            for (const tag of apiTags) {
                if (!grouped[tag]) grouped[tag] = [];
                grouped[tag].push({ path, method, api });
            }
        }
    }
    
    // Render
    let html = '';
    for (const [tag, apis] of Object.entries(grouped)) {
        const tagInfo = tags.find(t => t.name === tag) || { name: tag, description: '' };
        html += `
            <div class="tag-group mb-2">
                <div class="px-3 py-2 font-medium flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" onclick="toggleGroup(this)">
                    <span><i class="fas fa-folder text-yellow-500 mr-2"></i>${tagInfo.name}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full" style="background: var(--bg-tertiary)">${apis.length}</span>
                </div>
                <div class="tag-apis pl-2">
        `;
        
        for (const { path, method, api } of apis) {
            const methodClass = `method-${method.toLowerCase()}`;
            html += `
                <div class="api-item flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm" 
                     onclick="selectApi('${path}', '${method}')" data-path="${path}" data-method="${method}">
                    <span class="${methodClass} px-2 py-0.5 rounded text-white text-xs font-bold uppercase" style="min-width: 50px; text-align: center">${method}</span>
                    <span class="truncate flex-1" title="${api.summary || path}">${api.summary || path}</span>
                </div>
            `;
        }
        
        html += '</div></div>';
    }
    
    container.innerHTML = html || '<p class="text-center py-8" style="color: var(--text-secondary)">没有找到接口</p>';
}

// Toggle tag group
function toggleGroup(el) {
    const apis = el.nextElementSibling;
    apis.style.display = apis.style.display === 'none' ? 'block' : 'none';
}

// Setup search
function setupSearch() {
    const input = document.getElementById('search-input');
    let timeout;
    input.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => renderApiList(e.target.value), 200);
    });
}

// Select API
function selectApi(path, method) {
    // Update active state
    document.querySelectorAll('.api-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.api-item[data-path="${path}"][data-method="${method}"]`)?.classList.add('active');
    
    const api = swaggerData.paths[path][method];
    currentApi = { path, method, api };
    
    // Show detail panel
    document.getElementById('welcome-panel').classList.add('hidden');
    document.getElementById('api-detail-panel').classList.remove('hidden');
    
    // Update header
    document.getElementById('detail-method').textContent = method.toUpperCase();
    document.getElementById('detail-method').className = `method-${method} px-3 py-1 rounded text-white text-sm font-bold uppercase`;
    document.getElementById('detail-path').textContent = path;
    document.getElementById('detail-summary').textContent = api.summary || '未命名接口';
    document.getElementById('detail-description').textContent = api.description || '暂无描述';
    
    // Deprecated
    const deprecatedEl = document.getElementById('detail-deprecated');
    if (api.deprecated) {
        deprecatedEl.classList.remove('hidden');
    } else {
        deprecatedEl.classList.add('hidden');
    }
    
    // Update current api info
    document.getElementById('current-api-info').innerHTML = `
        <h2 class="text-lg font-semibold">${api.summary || path}</h2>
        <p class="text-sm" style="color: var(--text-secondary)">${method.toUpperCase()} ${path}</p>
    `;
    
    // Render parameters
    renderParameters(api);
    
    // Render request body
    renderRequestBody(api);
    
    // Render debug panel
    renderDebugPanel(api, path);
    
    // Clear response
    document.getElementById('response-content').textContent = '点击"发送请求"查看响应结果';
    document.getElementById('response-info').classList.add('hidden');
}

// Render parameters table
function renderParameters(api) {
    const params = api.parameters || [];
    const tbody = document.getElementById('params-table');
    const noParams = document.getElementById('no-params');
    
    if (params.length === 0) {
        tbody.innerHTML = '';
        noParams.classList.remove('hidden');
        return;
    }
    
    noParams.classList.add('hidden');
    tbody.innerHTML = params.map(p => `
        <tr style="border-bottom: 1px solid var(--border)">
            <td class="py-2 px-3 font-mono text-blue-500">${p.name}</td>
            <td class="py-2 px-3"><span class="px-2 py-0.5 rounded text-xs" style="background: var(--bg-tertiary)">${p.in}</span></td>
            <td class="py-2 px-3">${p.type || p.schema?.type || 'object'}</td>
            <td class="py-2 px-3">${p.required ? '<span class="text-red-500">*必填</span>' : '可选'}</td>
            <td class="py-2 px-3" style="color: var(--text-secondary)">${p.description || '-'}</td>
        </tr>
    `).join('');
}

// Render request body
function renderRequestBody(api) {
    const section = document.getElementById('request-body-section');
    const content = document.getElementById('request-body-content');
    
    if (!api.requestBody && !api.parameters?.some(p => p.in === 'body')) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    
    // Try to get schema
    let schema = null;
    if (api.requestBody?.content?.['application/json']?.schema) {
        schema = api.requestBody.content['application/json'].schema;
    } else {
        const bodyParam = api.parameters?.find(p => p.in === 'body');
        if (bodyParam?.schema) {
            schema = bodyParam.schema;
        }
    }
    
    if (schema) {
        const example = generateExample(schema);
        content.textContent = JSON.stringify(example, null, 2);
    } else {
        content.textContent = '// 请求体结构';
    }
}

// Generate example from schema
function generateExample(schema, depth = 0) {
    if (depth > 5) return {};
    
    if (schema.$ref) {
        const refPath = schema.$ref.replace('#/definitions/', '').replace('#/components/schemas/', '');
        const refSchema = swaggerData.definitions?.[refPath] || swaggerData.components?.schemas?.[refPath];
        if (refSchema) return generateExample(refSchema, depth + 1);
        return {};
    }
    
    if (schema.example !== undefined) return schema.example;
    
    switch (schema.type) {
        case 'string':
            return schema.enum ? schema.enum[0] : 'string';
        case 'integer':
        case 'number':
            return 0;
        case 'boolean':
            return true;
        case 'array':
            return schema.items ? [generateExample(schema.items, depth + 1)] : [];
        case 'object':
        default:
            const obj = {};
            if (schema.properties) {
                for (const [key, prop] of Object.entries(schema.properties)) {
                    obj[key] = generateExample(prop, depth + 1);
                }
            }
            return obj;
    }
}

// Render debug panel
function renderDebugPanel(api, path) {
    const params = api.parameters || [];
    const container = document.getElementById('debug-params-container');
    const bodyContainer = document.getElementById('debug-body-container');
    
    // Render global headers (渲染全局请求头)
    renderGlobalHeaders();
    
    // Render parameter inputs
    const nonBodyParams = params.filter(p => p.in !== 'body');
    if (nonBodyParams.length > 0) {
        container.innerHTML = nonBodyParams.map(p => `
            <div class="mb-3">
                <label class="block text-sm font-medium mb-1">
                    ${p.name} 
                    <span class="text-xs px-1.5 py-0.5 rounded" style="background: var(--bg-tertiary)">${p.in}</span>
                    ${p.required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                <input type="text" class="input-field w-full rounded-lg px-3 py-2" 
                       data-param="${p.name}" data-in="${p.in}" 
                       placeholder="${p.description || p.name}">
            </div>
        `).join('');
    } else {
        container.innerHTML = '';
    }
    
    // Show body input for POST/PUT/PATCH
    const hasBody = api.requestBody || params.some(p => p.in === 'body');
    if (hasBody) {
        bodyContainer.classList.remove('hidden');
        const bodyParam = params.find(p => p.in === 'body');
        const schema = api.requestBody?.content?.['application/json']?.schema || bodyParam?.schema;
        if (schema) {
            document.getElementById('debug-body').value = JSON.stringify(generateExample(schema), null, 2);
        }
    } else {
        bodyContainer.classList.add('hidden');
    }
}

// Render global headers display in debug panel (渲染调试面板中的全局请求头显示)
function renderGlobalHeaders() {
    const container = document.getElementById('global-headers-container');
    const list = document.getElementById('global-headers-list');
    
    const activeHeaders = globalHeaders.filter(h => h.key && h.value);
    
    if (activeHeaders.length > 0) {
        container.classList.remove('hidden');
        list.innerHTML = activeHeaders.map(h => `
            <div class="flex items-center gap-2 py-1">
                <span class="text-blue-500">${escapeHtml(h.key)}:</span>
                <span style="color: var(--text-secondary)">${escapeHtml(maskValue(h.key, h.value))}</span>
            </div>
        `).join('');
    } else {
        container.classList.add('hidden');
    }
}

// Load global headers from localStorage (从本地存储加载全局请求头)
function loadGlobalHeadersFromStorage() {
    try {
        const saved = localStorage.getItem('qingfeng_global_headers');
        if (saved) {
            globalHeaders = JSON.parse(saved);
        } else if (config.globalHeaders && config.globalHeaders.length > 0) {
            // 如果本地没有保存，使用后端预设的默认值
            globalHeaders = [...config.globalHeaders];
        }
        updateHeadersCount();
    } catch (e) {
        console.log('Failed to load global headers from storage');
    }
}

// Save global headers to localStorage (保存全局请求头到本地存储)
function saveGlobalHeadersToStorage() {
    try {
        localStorage.setItem('qingfeng_global_headers', JSON.stringify(globalHeaders));
    } catch (e) {
        console.log('Failed to save global headers to storage');
    }
}

// Update headers count badge (更新请求头数量徽章)
function updateHeadersCount() {
    const count = globalHeaders.filter(h => h.key && h.value).length;
    const badge = document.getElementById('headers-count');
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// Open global headers modal (打开全局请求头弹窗)
function openGlobalHeadersModal() {
    document.getElementById('global-headers-modal').classList.remove('hidden');
    renderGlobalHeadersInputs();
}

// Close global headers modal (关闭全局请求头弹窗)
function closeGlobalHeadersModal() {
    document.getElementById('global-headers-modal').classList.add('hidden');
}

// Render global headers inputs in modal (渲染弹窗中的请求头输入框)
function renderGlobalHeadersInputs() {
    const container = document.getElementById('global-headers-inputs');
    
    if (globalHeaders.length === 0) {
        globalHeaders.push({ key: '', value: '' });
    }
    
    container.innerHTML = globalHeaders.map((h, i) => `
        <div class="flex gap-2 items-center" data-index="${i}">
            <input type="text" class="input-field flex-1 rounded-lg px-3 py-2 text-sm" 
                   placeholder="Header Key (如 Authorization)" 
                   value="${escapeHtml(h.key)}"
                   onchange="updateGlobalHeader(${i}, 'key', this.value)">
            <input type="text" class="input-field flex-1 rounded-lg px-3 py-2 text-sm" 
                   placeholder="Header Value (如 Bearer xxx)" 
                   value="${escapeHtml(h.value)}"
                   onchange="updateGlobalHeader(${i}, 'value', this.value)">
            <button onclick="removeGlobalHeader(${i})" class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('');
}

// Add a new global header row (添加新的请求头行)
function addGlobalHeader() {
    globalHeaders.push({ key: '', value: '' });
    renderGlobalHeadersInputs();
}

// Update a global header (更新请求头)
function updateGlobalHeader(index, field, value) {
    globalHeaders[index][field] = value;
}

// Remove a global header (删除请求头)
function removeGlobalHeader(index) {
    globalHeaders.splice(index, 1);
    renderGlobalHeadersInputs();
}

// Save global headers (保存全局请求头)
function saveGlobalHeaders() {
    // Filter out empty headers
    globalHeaders = globalHeaders.filter(h => h.key || h.value);
    saveGlobalHeadersToStorage();
    updateHeadersCount();
    closeGlobalHeadersModal();
    
    // Re-render if an API is selected
    if (currentApi) {
        renderGlobalHeaders();
    }
}

// Clear all global headers (清空所有请求头)
function clearGlobalHeaders() {
    globalHeaders = [];
    saveGlobalHeadersToStorage();
    updateHeadersCount();
    renderGlobalHeadersInputs();
    
    // Re-render if an API is selected
    if (currentApi) {
        renderGlobalHeaders();
    }
}

// Mask sensitive header values (遮蔽敏感值)
function maskValue(key, value) {
    const sensitiveKeys = ['authorization', 'token', 'api-key', 'apikey', 'secret', 'password'];
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        if (value.length > 10) {
            return value.substring(0, 6) + '****' + value.substring(value.length - 4);
        }
        return '****';
    }
    return value;
}

// Escape HTML to prevent XSS (转义 HTML)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Encode header value to ensure ASCII-safe (编码 header 值确保 ASCII 安全)
function encodeHeaderValue(value) {
    // 检查是否包含非 ASCII 字符
    if (/[^\x00-\x7F]/.test(value)) {
        // 对非 ASCII 字符进行 URI 编码
        return encodeURIComponent(value);
    }
    return value;
}

// Send request
async function sendRequest() {
    if (!currentApi) return;
    
    const { path, method, api } = currentApi;
    let url = (swaggerData.basePath || '') + path;
    
    // Collect parameters
    const queryParams = new URLSearchParams();
    const headers = { 'Content-Type': 'application/json' };
    
    // Apply user-defined global headers (应用用户自定义的全局请求头)
    globalHeaders.forEach(h => {
        if (h.key && h.value) {
            // 确保 header 值只包含 ASCII 字符，非 ASCII 字符进行编码
            headers[h.key] = encodeHeaderValue(h.value);
        }
    });
    
    document.querySelectorAll('#debug-params-container input').forEach(input => {
        const name = input.dataset.param;
        const location = input.dataset.in;
        const value = input.value;
        
        if (!value) return;
        
        if (location === 'path') {
            url = url.replace(`{${name}}`, encodeURIComponent(value));
        } else if (location === 'query') {
            queryParams.append(name, value);
        } else if (location === 'header') {
            headers[name] = encodeHeaderValue(value);
        }
    });
    
    if (queryParams.toString()) {
        url += '?' + queryParams.toString();
    }
    
    // Get body
    let body = null;
    const bodyInput = document.getElementById('debug-body');
    if (!document.getElementById('debug-body-container').classList.contains('hidden') && bodyInput.value) {
        try {
            body = bodyInput.value;
        } catch (e) {
            alert('请求体 JSON 格式错误');
            return;
        }
    }
    
    // Send request
    const startTime = Date.now();
    try {
        const res = await fetch(url, {
            method: method.toUpperCase(),
            headers,
            body: body
        });
        
        const duration = Date.now() - startTime;
        const data = await res.text();
        
        // Update response
        document.getElementById('response-info').classList.remove('hidden');
        document.getElementById('response-status').textContent = res.status;
        document.getElementById('response-status').className = `px-3 py-1 rounded text-white text-sm font-bold ${res.ok ? 'bg-green-500' : 'bg-red-500'}`;
        document.getElementById('response-time').textContent = `${duration}ms`;
        
        try {
            document.getElementById('response-content').textContent = JSON.stringify(JSON.parse(data), null, 2);
        } catch {
            document.getElementById('response-content').textContent = data;
        }
    } catch (e) {
        document.getElementById('response-info').classList.remove('hidden');
        document.getElementById('response-status').textContent = 'Error';
        document.getElementById('response-status').className = 'px-3 py-1 rounded text-white text-sm font-bold bg-red-500';
        document.getElementById('response-time').textContent = '';
        document.getElementById('response-content').textContent = e.message;
    }
}

// Toggle theme
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.className = isDarkMode ? 'dark' : 'light';
    document.getElementById('theme-icon').className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
}

// Export documentation
function exportDoc() {
    if (!swaggerData) return;
    
    const blob = new Blob([JSON.stringify(swaggerData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'swagger.json';
    a.click();
    URL.revokeObjectURL(url);
}
