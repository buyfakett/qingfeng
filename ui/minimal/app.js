// QingFeng Swagger Frontend Application
// 版本号从后端注入
let QINGFENG_VERSION = '1.3.0';

let swaggerData = null;
let currentApi = null;
let isDarkMode = false;
let currentThemeColor = 'blue';
let config = {};
let globalHeaders = [];
let tokenExtractRules = [];
let environments = [];
let currentEnvIndex = 0;
let bodyTemplates = {}; // 请求体模板

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    loadThemeFromStorage();
    loadUIThemeFromStorage();
    await loadConfig();
    await loadSwagger();
    setupSearch();
    loadGlobalHeadersFromStorage();
    loadTokenExtractRulesFromStorage();
    loadBodyTemplates();
    displayVersion();
    setupKeyboardShortcuts();
});

// Display version in footer
function displayVersion() {
    const footer = document.querySelector('aside > div:last-child');
    if (footer) {
        footer.innerHTML = `Powered by <a href="https://github.com/delfDog/QingFeng" class="text-blue-500 hover:underline">青峰</a> · v${QINGFENG_VERSION}`;
    }
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K: 聚焦搜索框
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
        }
        // Escape: 关闭弹窗
        if (e.key === 'Escape') {
            closeGlobalHeadersModal();
            closeTokenExtractModal();
            closeThemeModal();
            closeUIThemeModal();
        }
    });
}

// Load configuration
async function loadConfig() {
    try {
        const res = await fetch('./config.json');
        config = await res.json();
        document.getElementById('doc-title').textContent = config.title || 'API Docs';
        document.title = config.title || 'API Documentation';
        
        // 注入版本号
        if (config.qingfengVersion) {
            QINGFENG_VERSION = config.qingfengVersion;
        }
        
        // 加载自定义 Logo
        if (config.logo) {
            setupCustomLogo(config.logo, config.logoLink);
        }
        
        // 加载环境配置
        if (config.environments && config.environments.length > 0) {
            environments = config.environments;
            loadCurrentEnvFromStorage();
            setupEnvironmentSelector();
        }
        
        // 检查本地存储是否有主题设置
        const savedDarkMode = localStorage.getItem('qingfeng_dark_mode');
        if (savedDarkMode === null) {
            // 本地存储没有值，使用配置文件的值作为初始值
            isDarkMode = config.darkMode || false;
            applyTheme();
            // 保存到本地存储，以便下次刷新时保持一致
            saveThemeToStorage();
        }
        // 如果本地存储有值，不做任何操作，因为主题已经在页面加载时从本地存储恢复了
    } catch (e) {
        console.log('Using default config');
    }
}

// 设置自定义 Logo
function setupCustomLogo(logo, link) {
    const titleEl = document.getElementById('doc-title');
    if (!titleEl) return;
    
    const parent = titleEl.parentElement;
    
    // 如果logo为空，保留默认状态，只更新标题文本
    if (!logo) {
        titleEl.textContent = config.title || 'API Docs';
        return;
    }
    
    // 处理base64格式的logo
    let logoSrc = logo;
    if (!logo.startsWith('http') && !logo.startsWith('data:')) {
        // 检查是否为base64字符串
        if (/^[A-Za-z0-9+/=]+$/.test(logo)) {
            // 默认使用png格式，用户可以自行添加完整的data URI
            logoSrc = `data:image/png;base64,${logo}`;
        }
    }
    
    const logoHtml = `
        <${link ? `a href="${link}" target="_blank"` : 'span'} class="flex items-center gap-2">
            <img src="${logoSrc}" alt="Logo" class="h-8 w-8 object-contain rounded border-none">
            <span id="doc-title">${config.title || 'API Docs'}</span>
        </${link ? 'a' : 'span'}>
    `;
    
    // 完全替换父元素的内容，移除所有原有元素
    parent.innerHTML = '';
    parent.innerHTML = logoHtml;
}

// 设置环境选择器
function setupEnvironmentSelector() {
    const headerEl = document.querySelector('.desktop-header') || document.querySelector('header');
    if (!headerEl || environments.length === 0) return;
    
    const envSelector = document.createElement('div');
    envSelector.className = 'flex items-center gap-2 mr-4';
    envSelector.innerHTML = `
        <i class="fas fa-server text-sm" style="color: var(--text-secondary)"></i>
        <select id="env-selector" onchange="switchEnvironment(this.value)" 
                class="input-field px-3 py-1.5 rounded-lg text-sm cursor-pointer">
            ${environments.map((env, i) => `
                <option value="${i}" ${i === currentEnvIndex ? 'selected' : ''}>${env.name}</option>
            `).join('')}
        </select>
    `;
    
    const firstChild = headerEl.firstChild;
    headerEl.insertBefore(envSelector, firstChild);
}

// 切换环境
function switchEnvironment(index) {
    currentEnvIndex = parseInt(index);
    saveCurrentEnvToStorage();
    showToast(`已切换到: ${environments[currentEnvIndex].name}`);
}

// 获取当前环境的 baseUrl
function getCurrentBaseUrl() {
    if (environments.length > 0 && environments[currentEnvIndex]) {
        return environments[currentEnvIndex].baseUrl;
    }
    return swaggerData?.basePath || '';
}

// 保存当前环境到 storage
function saveCurrentEnvToStorage() {
    try {
        localStorage.setItem('qingfeng_current_env', currentEnvIndex.toString());
    } catch (e) {}
}

// 从 storage 加载当前环境
function loadCurrentEnvFromStorage() {
    try {
        const saved = localStorage.getItem('qingfeng_current_env');
        if (saved !== null) {
            const index = parseInt(saved);
            if (index >= 0 && index < environments.length) {
                currentEnvIndex = index;
            }
        }
    } catch (e) {}
}

// Load Swagger JSON
async function loadSwagger() {
    const container = document.getElementById('api-list');
    try {
        const res = await fetch('./swagger.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        swaggerData = await res.json();
        renderApiList();
    } catch (e) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-3"></i>
                <p class="text-red-500 font-medium">加载失败</p>
                <p class="text-sm mt-2" style="color: var(--text-secondary)">
                    请检查 swagger.json 是否存在<br>
                    <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mt-2 inline-block">${e.message}</code>
                </p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 rounded-lg text-sm" style="background: var(--primary); color: white">
                    <i class="fas fa-redo mr-2"></i>重试
                </button>
            </div>
        `;
    }
}

// Render API list grouped by tags with multi-level support
function renderApiList(filter = '') {
    const container = document.getElementById('api-list');
    const paths = swaggerData.paths || {};
    const tags = swaggerData.tags || [];
    
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
    
    // Build multi-level tree structure
    const tree = buildTagTree(grouped, tags);
    
    // Render tree
    const html = renderTagTree(tree, 0);
    
    if (!html) {
        container.innerHTML = `<p class="text-center py-8" style="color: var(--text-secondary)">
            ${filter ? '没有找到匹配的接口' : '暂无接口'}
        </p>`;
    } else {
        container.innerHTML = html;
    }
}

// Build hierarchical tree from flat tags
// Tags like "Admin-User", "Admin-Auth" become { Admin: { User: [...], Auth: [...] } }
function buildTagTree(grouped, tagInfos) {
    const tree = {};
    
    for (const [tag, apis] of Object.entries(grouped)) {
        const parts = tag.split('-');
        let current = tree;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;
            
            if (!current[part]) {
                current[part] = {
                    _name: parts.slice(0, i + 1).join('-'),
                    _displayName: part,
                    _apis: [],
                    _children: {}
                };
            }
            
            if (isLast) {
                current[part]._apis = apis;
                // Get tag description if available
                const tagInfo = tagInfos.find(t => t.name === tag);
                if (tagInfo?.description) {
                    current[part]._description = tagInfo.description;
                }
            }
            
            current = current[part]._children;
        }
    }
    
    return tree;
}

// Render tree recursively
function renderTagTree(tree, level) {
    let html = '';
    
    for (const [key, node] of Object.entries(tree)) {
        const hasChildren = Object.keys(node._children).length > 0;
        const hasApis = node._apis.length > 0;
        const totalCount = countApisInNode(node);
        const isExpanded = getGroupState(node._name);
        const indent = level > 0 ? 'ml-3' : '';
        
        if (hasChildren) {
            // This is a parent folder
            html += `
                <div class="tag-group mb-1 ${indent}">
                    <div class="px-3 py-2 font-medium flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" 
                         onclick="toggleGroup(this)" data-tag="${escapeHtml(node._name)}">
                        <span class="flex items-center gap-2">
                            <i class="fas fa-folder text-yellow-500"></i>
                            <span>${escapeHtml(node._displayName)}</span>
                        </span>
                        <span class="text-xs px-2 py-0.5 rounded-full" style="background: var(--bg-tertiary)">${totalCount}</span>
                    </div>
                    <div class="tag-children" style="display: ${isExpanded ? 'block' : 'none'}">
                        ${hasApis ? renderApiItems(node._apis, level + 1) : ''}
                        ${renderTagTree(node._children, level + 1)}
                    </div>
                </div>
            `;
        } else if (hasApis) {
            // This is a leaf folder with APIs
            html += `
                <div class="tag-group mb-1 ${indent}">
                    <div class="px-3 py-2 font-medium flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" 
                         onclick="toggleGroup(this)" data-tag="${escapeHtml(node._name)}">
                        <span class="flex items-center gap-2">
                            <i class="fas fa-folder text-yellow-500"></i>
                            <span>${escapeHtml(node._displayName)}</span>
                        </span>
                        <span class="text-xs px-2 py-0.5 rounded-full" style="background: var(--bg-tertiary)">${node._apis.length}</span>
                    </div>
                    <div class="tag-apis" style="display: ${isExpanded ? 'block' : 'none'}">
                        ${renderApiItems(node._apis, level + 1)}
                    </div>
                </div>
            `;
        }
    }
    
    return html;
}

// Render API items
function renderApiItems(apis, level) {
    const indent = level > 0 ? 'ml-3' : '';
    return apis.map(({ path, method, api }) => {
        const methodClass = `method-${method.toLowerCase()}`;
        const deprecated = api.deprecated ? 'opacity-50' : '';
        return `
            <div class="api-item flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${deprecated} ${indent}" 
                 onclick="selectApi('${path}', '${method}')" data-path="${path}" data-method="${method}">
                <span class="${methodClass} px-2 py-0.5 rounded text-white text-xs font-bold uppercase" style="min-width: 50px; text-align: center">${method}</span>
                <span class="truncate flex-1" title="${api.summary || path}">${api.summary || path}</span>
                ${api.deprecated ? '<i class="fas fa-ban text-red-400 text-xs" title="已废弃"></i>' : ''}
            </div>
        `;
    }).join('');
}

// Count total APIs in a node (including children)
function countApisInNode(node) {
    let count = node._apis.length;
    for (const child of Object.values(node._children)) {
        count += countApisInNode(child);
    }
    return count;
}

function toggleGroup(el) {
    const content = el.nextElementSibling;
    const tagName = el.dataset.tag || el.textContent?.trim()?.split('\n')[0]?.trim();
    const isHidden = content.style.display === 'none';
    
    content.style.display = isHidden ? 'block' : 'none';
    saveGroupState(tagName, isHidden);
}

// 保存分组折叠状态
function saveGroupState(tagName, isExpanded) {
    try {
        const states = JSON.parse(sessionStorage.getItem('qingfeng_group_states') || '{}');
        states[tagName] = isExpanded;
        sessionStorage.setItem('qingfeng_group_states', JSON.stringify(states));
    } catch (e) {}
}

// 获取分组折叠状态
function getGroupState(tagName) {
    try {
        const states = JSON.parse(sessionStorage.getItem('qingfeng_group_states') || '{}');
        return states[tagName] !== false; // 默认展开
    } catch (e) {
        return true;
    }
}

function setupSearch() {
    const input = document.getElementById('search-input');
    let timeout;
    input.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => renderApiList(e.target.value), 150);
    });
}

function selectApi(path, method) {
    document.querySelectorAll('.api-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.api-item[data-path="${path}"][data-method="${method}"]`)?.classList.add('active');
    
    const api = swaggerData.paths[path][method];
    currentApi = { path, method, api };
    
    document.getElementById('welcome-panel').classList.add('hidden');
    document.getElementById('api-detail-panel').classList.remove('hidden');
    
    document.getElementById('detail-method').textContent = method.toUpperCase();
    document.getElementById('detail-method').className = `method-${method} px-3 py-1 rounded text-white text-sm font-bold uppercase`;
    document.getElementById('detail-path').textContent = path;
    document.getElementById('detail-summary').textContent = api.summary || '未命名接口';
    document.getElementById('detail-description').textContent = api.description || '暂无描述';
    
    const deprecatedEl = document.getElementById('detail-deprecated');
    deprecatedEl.classList.toggle('hidden', !api.deprecated);
    
    document.getElementById('current-api-info').innerHTML = `
        <h2 class="text-lg font-semibold">${api.summary || path}</h2>
        <p class="text-sm" style="color: var(--text-secondary)">${method.toUpperCase()} ${path}</p>
    `;
    
    renderParameters(api);
    renderRequestBody(api);
    renderResponseSchema(api);
    renderDebugPanel(api, path);
    
    // 恢复保存的响应结果
    restoreResponse();
}

// 恢复保存的响应结果
function restoreResponse() {
    if (!currentApi) return;
    const savedData = getDebugData(currentApi.path, currentApi.method);
    
    if (savedData.response) {
        const { status, time, content, isError } = savedData.response;
        document.getElementById('response-info').classList.remove('hidden');
        document.getElementById('response-status').textContent = status;
        document.getElementById('response-status').className = `px-3 py-1 rounded text-white text-sm font-bold ${isError ? 'bg-red-500' : 'bg-green-500'}`;
        document.getElementById('response-time').textContent = time ? `${time}ms` : '';
        document.getElementById('response-content').innerHTML = content;
    } else {
        document.getElementById('response-content').textContent = '点击"发送请求"查看响应结果';
        document.getElementById('response-info').classList.add('hidden');
    }
}

// 保存响应结果
function saveResponse(status, time, content, isError) {
    if (!currentApi) return;
    const data = getDebugData(currentApi.path, currentApi.method);
    data.response = { status, time, content, isError };
    saveDebugData(currentApi.path, currentApi.method, data);
}

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

function renderRequestBody(api) {
    const section = document.getElementById('request-body-section');
    const content = document.getElementById('request-body-content');
    
    if (!api.requestBody && !api.parameters?.some(p => p.in === 'body')) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    
    let schema = null;
    if (api.requestBody?.content?.['application/json']?.schema) {
        schema = api.requestBody.content['application/json'].schema;
    } else {
        const bodyParam = api.parameters?.find(p => p.in === 'body');
        if (bodyParam?.schema) schema = bodyParam.schema;
    }
    
    if (schema) {
        const example = generateExample(schema);
        content.innerHTML = syntaxHighlight(JSON.stringify(example, null, 2));
    } else {
        content.textContent = '// 请求体结构';
    }
}

// ==================== 响应结构展示 ====================

function renderResponseSchema(api) {
    const section = document.getElementById('response-schema-section');
    const container = document.getElementById('response-schema-container');
    
    if (!api.responses) {
        section.classList.add('hidden');
        return;
    }
    
    let html = '';
    
    for (const [code, response] of Object.entries(api.responses)) {
        const schema = response.schema;
        const description = response.description || '';
        
        html += `
            <div class="mb-4 last:mb-0">
                <div class="flex items-center gap-2 mb-3">
                    <span class="px-2 py-1 rounded text-white text-xs font-bold ${code.startsWith('2') ? 'bg-green-500' : code.startsWith('4') ? 'bg-yellow-500' : 'bg-red-500'}">${code}</span>
                    <span class="text-sm" style="color: var(--text-secondary)">${escapeHtml(description)}</span>
                </div>
                <div class="flex gap-2 mb-3">
                    <button onclick="switchSchemaView(this, 'example', '${code}')" class="schema-tab schema-tab-${code} px-3 py-1 text-sm rounded-lg" style="background: var(--primary); color: white">Example Value</button>
                    <button onclick="switchSchemaView(this, 'model', '${code}')" class="schema-tab schema-tab-${code} px-3 py-1 text-sm rounded-lg border" style="border-color: var(--border)">Model</button>
                </div>
                <div id="schema-example-${code}" class="schema-content schema-content-${code}">
                    <pre class="response-panel rounded-lg p-4 overflow-x-auto text-sm"><code>${schema ? syntaxHighlight(JSON.stringify(generateExample(schema), null, 2)) : '// 无响应体'}</code></pre>
                </div>
                <div id="schema-model-${code}" class="schema-content schema-content-${code} hidden">
                    <div class="rounded-lg p-4 text-sm overflow-x-auto" style="background: var(--bg-tertiary)">
                        ${schema ? renderSchemaModel(schema) : '<span style="color: var(--text-secondary)">无响应体结构</span>'}
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    section.classList.remove('hidden');
}

function switchSchemaView(btn, view, code) {
    // 更新按钮样式
    document.querySelectorAll(`.schema-tab-${code}`).forEach(tab => {
        tab.style.background = '';
        tab.style.color = '';
        tab.style.borderColor = 'var(--border)';
    });
    btn.style.background = 'var(--primary)';
    btn.style.color = 'white';
    btn.style.borderColor = 'var(--primary)';
    
    // 切换内容
    document.querySelectorAll(`.schema-content-${code}`).forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`schema-${view}-${code}`).classList.remove('hidden');
}

function renderSchemaModel(schema, depth = 0, parentKey = '') {
    if (depth > 10) return '<span style="color: var(--text-secondary)">...</span>';
    
    // 处理 $ref
    if (schema.$ref) {
        const refPath = schema.$ref.replace('#/definitions/', '').replace('#/components/schemas/', '');
        const refSchema = swaggerData.definitions?.[refPath] || swaggerData.components?.schemas?.[refPath];
        if (refSchema) {
            return renderSchemaModel(refSchema, depth, parentKey);
        }
        return `<span class="text-purple-500">${escapeHtml(refPath)}</span>`;
    }
    
    // 处理 allOf
    if (schema.allOf) {
        let merged = { type: 'object', properties: {} };
        for (const subSchema of schema.allOf) {
            const resolved = resolveSchema(subSchema);
            if (resolved.properties) {
                merged.properties = { ...merged.properties, ...resolved.properties };
            }
        }
        return renderSchemaModel(merged, depth, parentKey);
    }
    
    // 处理数组
    if (schema.type === 'array' && schema.items) {
        return `<div class="flex items-start gap-2">
            <span class="text-orange-500">[</span>
            <div class="flex-1">${renderSchemaModel(schema.items, depth + 1, parentKey)}</div>
            <span class="text-orange-500">]</span>
        </div>`;
    }
    
    // 处理对象
    if (schema.type === 'object' || schema.properties) {
        const properties = schema.properties || {};
        const required = schema.required || [];
        
        if (Object.keys(properties).length === 0) {
            return '<span style="color: var(--text-secondary)">object</span>';
        }
        
        let html = '<div class="schema-tree">';
        const indent = depth > 0 ? 'ml-4 pl-4 border-l' : '';
        html += `<div class="${indent}" style="border-color: var(--border)">`;
        
        for (const [key, prop] of Object.entries(properties)) {
            const isRequired = required.includes(key);
            const propType = getSchemaType(prop);
            const description = prop.description || '';
            const example = prop.example !== undefined ? prop.example : '';
            
            html += `
                <div class="py-2 flex items-start gap-3" style="border-bottom: 1px solid var(--border)">
                    <div class="flex-shrink-0 min-w-[120px]">
                        <span class="text-blue-500 font-mono">${escapeHtml(key)}</span>
                        ${isRequired ? '<span class="text-red-500 ml-1">*</span>' : ''}
                    </div>
                    <div class="flex-shrink-0 min-w-[80px]">
                        <span class="text-purple-500 text-xs">${escapeHtml(propType)}</span>
                    </div>
                    <div class="flex-1" style="color: var(--text-secondary)">
                        ${description ? `<span>${escapeHtml(description)}</span>` : ''}
                        ${example !== '' ? `<span class="text-xs ml-2" style="color: var(--text-secondary)">示例: ${escapeHtml(String(example))}</span>` : ''}
                    </div>
                </div>
            `;
            
            // 递归渲染嵌套对象
            if (prop.type === 'object' || prop.properties || prop.$ref) {
                html += `<div class="ml-4">${renderSchemaModel(prop, depth + 1, key)}</div>`;
            } else if (prop.type === 'array' && prop.items && (prop.items.type === 'object' || prop.items.properties || prop.items.$ref)) {
                html += `<div class="ml-4 pl-2 border-l" style="border-color: var(--border)">
                    <div class="text-xs py-1" style="color: var(--text-secondary)">数组元素:</div>
                    ${renderSchemaModel(prop.items, depth + 1, key)}
                </div>`;
            }
        }
        
        html += '</div></div>';
        return html;
    }
    
    // 基本类型
    return `<span class="text-purple-500">${escapeHtml(schema.type || 'any')}</span>`;
}

function resolveSchema(schema) {
    if (schema.$ref) {
        const refPath = schema.$ref.replace('#/definitions/', '').replace('#/components/schemas/', '');
        return swaggerData.definitions?.[refPath] || swaggerData.components?.schemas?.[refPath] || {};
    }
    return schema;
}

function getSchemaType(schema) {
    if (schema.$ref) {
        const refPath = schema.$ref.replace('#/definitions/', '').replace('#/components/schemas/', '');
        return refPath.split('.').pop();
    }
    if (schema.type === 'array') {
        if (schema.items) {
            return `${getSchemaType(schema.items)}[]`;
        }
        return 'array';
    }
    if (schema.allOf) {
        return 'object';
    }
    return schema.type || 'object';
}

function generateExample(schema, depth = 0) {
    if (depth > 5) return {};
    
    if (schema.$ref) {
        const refPath = schema.$ref.replace('#/definitions/', '').replace('#/components/schemas/', '');
        const refSchema = swaggerData.definitions?.[refPath] || swaggerData.components?.schemas?.[refPath];
        if (refSchema) return generateExample(refSchema, depth + 1);
        return {};
    }
    
    // 处理 allOf - 合并所有子 schema
    if (schema.allOf) {
        let merged = {};
        for (const subSchema of schema.allOf) {
            const subExample = generateExample(subSchema, depth + 1);
            if (typeof subExample === 'object' && !Array.isArray(subExample)) {
                merged = { ...merged, ...subExample };
            }
        }
        return merged;
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

// JSON 语法高亮
function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'text-orange-500'; // number
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'text-blue-500'; // key
            } else {
                cls = 'text-green-500'; // string
            }
        } else if (/true|false/.test(match)) {
            cls = 'text-purple-500'; // boolean
        } else if (/null/.test(match)) {
            cls = 'text-gray-500'; // null
        }
        return `<span class="${cls}">${match}</span>`;
    });
}

function renderDebugPanel(api, path) {
    const params = api.parameters || [];
    const container = document.getElementById('debug-params-container');
    const bodyContainer = document.getElementById('debug-body-container');
    
    renderGlobalHeaders();
    
    // 获取保存的调试数据
    const savedData = getDebugData(currentApi.path, currentApi.method);
    
    const nonBodyParams = params.filter(p => p.in !== 'body');
    if (nonBodyParams.length > 0) {
        container.innerHTML = nonBodyParams.map(p => {
            const savedValue = savedData.params?.[p.name] || '';
            const isFileParam = p.in === 'formData' && p.type === 'file';
            const paramType = p.type || 'string';
            return `
            <div class="mb-3">
                <label class="block text-sm font-medium mb-1">
                    ${p.name} 
                    <span class="text-xs px-1.5 py-0.5 rounded" style="background: var(--bg-tertiary)">${p.in}</span>
                    <span class="text-xs px-1.5 py-0.5 rounded ml-1" style="background: var(--bg-tertiary)">${paramType}</span>
                    ${isFileParam ? '<span class="text-xs px-1.5 py-0.5 rounded ml-1" style="background: var(--primary); color: white">file</span>' : ''}
                    ${p.required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                ${isFileParam ? `
                <div class="file-input-wrapper">
                    <input type="file" class="input-field w-full rounded-lg px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:cursor-pointer" 
                           data-param="${p.name}" data-in="${p.in}" data-type="file"
                           ${p.description ? `title="${p.description}"` : ''}
                           multiple
                           onchange="updateFileList(this)">
                    <div class="file-list mt-2 text-sm" style="color: var(--text-secondary)"></div>
                </div>
                ` : p.enum ? `
                <select class="input-field w-full rounded-lg px-3 py-2" 
                       data-param="${p.name}" data-in="${p.in}" data-type="${paramType}"
                       onchange="saveDebugParam('${p.name}', this.value)">
                    <option value="">-- 请选择 --</option>
                    ${p.enum.map(v => `<option value="${escapeHtml(String(v))}" ${String(v) === String(savedValue) ? 'selected' : ''}>${escapeHtml(String(v))}</option>`).join('')}
                </select>
                ` : `
                <input type="text" class="input-field w-full rounded-lg px-3 py-2" 
                       data-param="${p.name}" data-in="${p.in}" data-type="${paramType}"
                       placeholder="${p.description || p.name}"
                       value="${escapeHtml(savedValue)}"
                       oninput="saveDebugParam('${p.name}', this.value)">
                `}
            </div>
        `}).join('');
    } else {
        container.innerHTML = '';
    }
    
    const hasBody = api.requestBody || params.some(p => p.in === 'body');
    if (hasBody) {
        bodyContainer.classList.remove('hidden');
        const bodyParam = params.find(p => p.in === 'body');
        const schema = api.requestBody?.content?.['application/json']?.schema || bodyParam?.schema;
        
        // 保存当前 schema 供后续使用
        currentBodySchema = schema ? resolveSchemaFull(schema) : null;
        
        // 渲染结构化表单
        renderBodyFields(currentBodySchema, savedData.bodyFields || {});
        
        // 同步到 JSON 文本框
        syncBodyToJson();
        
        // 监听 JSON 文本框变化
        document.getElementById('debug-body').oninput = function() {
            saveDebugBody(this.value);
        };
    } else {
        bodyContainer.classList.add('hidden');
        currentBodySchema = null;
    }
}

// 当前请求体的 schema
let currentBodySchema = null;
// 当前编辑模式: 'form' 或 'json'
let bodyEditMode = 'form';

// 完整解析 schema，包括 $ref 和 allOf
function resolveSchemaFull(schema) {
    if (!schema) return null;
    
    if (schema.$ref) {
        const refPath = schema.$ref.replace('#/definitions/', '').replace('#/components/schemas/', '');
        const refSchema = swaggerData.definitions?.[refPath] || swaggerData.components?.schemas?.[refPath];
        if (refSchema) return resolveSchemaFull(refSchema);
        return { type: 'object', properties: {} };
    }
    
    if (schema.allOf) {
        let merged = { type: 'object', properties: {}, required: [] };
        for (const subSchema of schema.allOf) {
            const resolved = resolveSchemaFull(subSchema);
            if (resolved.properties) {
                merged.properties = { ...merged.properties, ...resolved.properties };
            }
            if (resolved.required) {
                merged.required = [...merged.required, ...resolved.required];
            }
        }
        return merged;
    }
    
    // 递归解析 properties 中的 $ref
    if (schema.properties) {
        const resolvedProps = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
            resolvedProps[key] = resolveSchemaFull(prop);
        }
        return { ...schema, properties: resolvedProps };
    }
    
    // 解析数组的 items
    if (schema.type === 'array' && schema.items) {
        return { ...schema, items: resolveSchemaFull(schema.items) };
    }
    
    return schema;
}

// 渲染请求体字段表单
function renderBodyFields(schema, savedValues) {
    const container = document.getElementById('body-fields-container');
    if (!schema || !schema.properties) {
        container.innerHTML = '<p class="text-sm" style="color: var(--text-secondary)">无结构化字段</p>';
        return;
    }
    
    const properties = schema.properties;
    const required = schema.required || [];
    
    let html = '<div class="overflow-x-auto"><table class="w-full text-sm">';
    html += `<thead><tr style="border-bottom: 1px solid var(--border)">
        <th class="text-left py-2 px-2 font-medium">字段名</th>
        <th class="text-left py-2 px-2 font-medium">类型</th>
        <th class="text-left py-2 px-2 font-medium">必填</th>
        <th class="text-left py-2 px-2 font-medium" style="min-width: 200px">值</th>
        <th class="text-left py-2 px-2 font-medium">说明</th>
    </tr></thead><tbody>`;
    
    for (const [key, prop] of Object.entries(properties)) {
        const isRequired = required.includes(key);
        const propType = prop.type || 'string';
        const description = prop.description || '';
        const example = prop.example;
        const savedValue = savedValues[key] !== undefined ? savedValues[key] : (example !== undefined ? example : '');
        
        html += `<tr style="border-bottom: 1px solid var(--border)">
            <td class="py-2 px-2">
                <span class="font-mono text-blue-500">${escapeHtml(key)}</span>
            </td>
            <td class="py-2 px-2">
                <span class="text-xs px-1.5 py-0.5 rounded" style="background: var(--bg-tertiary)">${escapeHtml(propType)}</span>
            </td>
            <td class="py-2 px-2">
                ${isRequired ? '<span class="text-red-500 font-medium">*必填</span>' : '<span style="color: var(--text-secondary)">可选</span>'}
            </td>
            <td class="py-2 px-2">
                ${renderBodyFieldInput(key, prop, savedValue)}
            </td>
            <td class="py-2 px-2" style="color: var(--text-secondary)">
                ${escapeHtml(description)}
                ${example !== undefined ? `<br><span class="text-xs">示例: ${escapeHtml(String(example))}</span>` : ''}
            </td>
        </tr>`;
    }
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// 渲染单个字段的输入控件
function renderBodyFieldInput(key, prop, value) {
    const type = prop.type || 'string';
    const escapedValue = escapeHtml(typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''));
    
    if (prop.enum) {
        // 枚举类型用下拉框，保留 data-type 以便类型转换
        const options = prop.enum.map(v => 
            `<option value="${escapeHtml(String(v))}" ${String(v) === String(value) ? 'selected' : ''}>${escapeHtml(String(v))}</option>`
        ).join('');
        return `<select class="input-field w-full rounded px-2 py-1.5 text-sm" data-body-field="${escapeHtml(key)}" data-type="${type}" onchange="onBodyFieldChange()">
            <option value="">-- 请选择 --</option>${options}
        </select>`;
    }
    
    if (type === 'boolean') {
        return `<select class="input-field w-full rounded px-2 py-1.5 text-sm" data-body-field="${escapeHtml(key)}" onchange="onBodyFieldChange()">
            <option value="">-- 请选择 --</option>
            <option value="true" ${value === true || value === 'true' ? 'selected' : ''}>true</option>
            <option value="false" ${value === false || value === 'false' ? 'selected' : ''}>false</option>
        </select>`;
    }
    
    if (type === 'integer' || type === 'number') {
        return `<input type="number" class="input-field w-full rounded px-2 py-1.5 text-sm" 
            data-body-field="${escapeHtml(key)}" data-type="${type}"
            value="${escapedValue}" 
            placeholder="${prop.description || key}"
            oninput="onBodyFieldChange()">`;
    }
    
    if (type === 'array' || type === 'object') {
        return `<textarea class="input-field w-full rounded px-2 py-1.5 text-sm font-mono" rows="2"
            data-body-field="${escapeHtml(key)}" data-type="${type}"
            placeholder='${type === 'array' ? '["item1", "item2"]' : '{"key": "value"}'}'
            oninput="onBodyFieldChange()">${escapedValue}</textarea>`;
    }
    
    // 默认字符串输入
    return `<input type="text" class="input-field w-full rounded px-2 py-1.5 text-sm" 
        data-body-field="${escapeHtml(key)}" data-type="string"
        value="${escapedValue}" 
        placeholder="${prop.description || key}"
        oninput="onBodyFieldChange()">`;
}

// 字段值变化时同步到 JSON
function onBodyFieldChange() {
    syncBodyToJson();
    saveBodyFieldsData();
}

// 从表单同步到 JSON 文本框
function syncBodyToJson() {
    const bodyObj = getBodyFromFields();
    const jsonStr = JSON.stringify(bodyObj, null, 2);
    document.getElementById('debug-body').value = jsonStr;
    saveDebugBody(jsonStr);
}

// 从表单字段获取请求体对象
function getBodyFromFields() {
    const obj = {};
    document.querySelectorAll('[data-body-field]').forEach(el => {
        const key = el.dataset.bodyField;
        const type = el.dataset.type || 'string';
        let value = el.value;
        
        if (value === '') return; // 跳过空值
        
        // 类型转换
        if (type === 'integer') {
            value = parseInt(value, 10);
            if (isNaN(value)) return;
        } else if (type === 'number') {
            value = parseFloat(value);
            if (isNaN(value)) return;
        } else if (type === 'boolean') {
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
        } else if (type === 'array' || type === 'object') {
            try {
                value = JSON.parse(value);
            } catch (e) {
                return; // JSON 解析失败则跳过
            }
        }
        
        obj[key] = value;
    });
    return obj;
}

// 保存字段数据
function saveBodyFieldsData() {
    if (!currentApi) return;
    const data = getDebugData(currentApi.path, currentApi.method);
    data.bodyFields = {};
    document.querySelectorAll('[data-body-field]').forEach(el => {
        data.bodyFields[el.dataset.bodyField] = el.value;
    });
    saveDebugData(currentApi.path, currentApi.method, data);
}

// 切换编辑模式
function toggleBodyEditMode() {
    const formMode = document.getElementById('body-form-mode');
    const jsonMode = document.getElementById('body-json-mode');
    const btn = document.getElementById('body-mode-btn');
    
    if (bodyEditMode === 'form') {
        // 切换到 JSON 模式
        bodyEditMode = 'json';
        formMode.classList.add('hidden');
        jsonMode.classList.remove('hidden');
        btn.innerHTML = '<i class="fas fa-table mr-1"></i>表单模式';
        // 同步表单到 JSON
        syncBodyToJson();
    } else {
        // 切换到表单模式
        bodyEditMode = 'form';
        formMode.classList.remove('hidden');
        jsonMode.classList.add('hidden');
        btn.innerHTML = '<i class="fas fa-edit mr-1"></i>JSON模式';
        // 从 JSON 同步到表单
        syncJsonToFields();
    }
}

// 从 JSON 同步到表单字段
function syncJsonToFields() {
    try {
        const jsonStr = document.getElementById('debug-body').value;
        const obj = JSON.parse(jsonStr);
        document.querySelectorAll('[data-body-field]').forEach(el => {
            const key = el.dataset.bodyField;
            if (obj[key] !== undefined) {
                const value = obj[key];
                if (typeof value === 'object') {
                    el.value = JSON.stringify(value);
                } else {
                    el.value = String(value);
                }
            }
        });
    } catch (e) {
        // JSON 解析失败，忽略
    }
}

// ==================== 调试数据持久化 ====================

function getDebugStorageKey(path, method) {
    return `qingfeng_debug_${method}_${path}`;
}

function getDebugData(path, method) {
    try {
        const key = getDebugStorageKey(path, method);
        const saved = sessionStorage.getItem(key);
        return saved ? JSON.parse(saved) : { params: {}, body: '', response: null };
    } catch (e) {
        return { params: {}, body: '', response: null };
    }
}

function saveDebugData(path, method, data) {
    try {
        const key = getDebugStorageKey(path, method);
        sessionStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
}

function saveDebugParam(paramName, value) {
    if (!currentApi) return;
    const data = getDebugData(currentApi.path, currentApi.method);
    data.params[paramName] = value;
    saveDebugData(currentApi.path, currentApi.method, data);
}

function saveDebugBody(value) {
    if (!currentApi) return;
    const data = getDebugData(currentApi.path, currentApi.method);
    data.body = value;
    saveDebugData(currentApi.path, currentApi.method, data);
}

// ==================== 请求体模板 ====================

function loadBodyTemplates() {
    try {
        const saved = localStorage.getItem('qingfeng_body_templates');
        if (saved) bodyTemplates = JSON.parse(saved);
    } catch (e) {}
}

function saveBodyTemplates() {
    try {
        localStorage.setItem('qingfeng_body_templates', JSON.stringify(bodyTemplates));
    } catch (e) {}
}

function getTemplateKey(path, method) {
    return `${method}_${path}`;
}

function saveAsTemplate() {
    if (!currentApi) return;
    
    const bodyInput = document.getElementById('debug-body');
    if (!bodyInput || !bodyInput.value.trim()) {
        showToast('请求体为空', 'error');
        return;
    }
    
    const name = prompt('请输入模板名称:', `模板 ${new Date().toLocaleString()}`);
    if (!name) return;
    
    const key = getTemplateKey(currentApi.path, currentApi.method);
    if (!bodyTemplates[key]) bodyTemplates[key] = [];
    
    bodyTemplates[key].push({
        name: name,
        body: bodyInput.value,
        createdAt: Date.now()
    });
    
    saveBodyTemplates();
    showToast('模板已保存');
    renderTemplateList();
}

function loadTemplate(index) {
    if (!currentApi) return;
    
    const key = getTemplateKey(currentApi.path, currentApi.method);
    const templates = bodyTemplates[key] || [];
    
    if (templates[index]) {
        document.getElementById('debug-body').value = templates[index].body;
        saveDebugBody(templates[index].body);
        showToast(`已加载: ${templates[index].name}`);
    }
}

function deleteTemplate(index) {
    if (!currentApi) return;
    
    const key = getTemplateKey(currentApi.path, currentApi.method);
    if (bodyTemplates[key]) {
        bodyTemplates[key].splice(index, 1);
        saveBodyTemplates();
        renderTemplateList();
        showToast('模板已删除');
    }
}

function renderTemplateList() {
    const container = document.getElementById('template-list');
    if (!container || !currentApi) return;
    
    const key = getTemplateKey(currentApi.path, currentApi.method);
    const templates = bodyTemplates[key] || [];
    
    if (templates.length === 0) {
        container.innerHTML = '<div class="text-sm" style="color: var(--text-secondary)">暂无保存的模板</div>';
        return;
    }
    
    container.innerHTML = templates.map((t, i) => `
        <div class="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group" onclick="loadTemplate(${i})">
            <span class="text-sm truncate flex-1">${escapeHtml(t.name)}</span>
            <button onclick="event.stopPropagation(); deleteTemplate(${i})" class="text-red-500 opacity-0 group-hover:opacity-100 p-1">
                <i class="fas fa-trash-alt text-xs"></i>
            </button>
        </div>
    `).join('');
}

function toggleTemplateDropdown() {
    const dropdown = document.getElementById('template-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            renderTemplateList();
        }
    }
}

// 点击外部关闭下拉框
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('template-dropdown');
    if (dropdown && !e.target.closest('#template-dropdown') && !e.target.closest('[onclick*="toggleTemplateDropdown"]')) {
        dropdown.classList.add('hidden');
    }
});

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

function loadGlobalHeadersFromStorage() {
    try {
        const saved = localStorage.getItem('qingfeng_global_headers');
        if (saved) {
            globalHeaders = JSON.parse(saved);
        } else if (config.globalHeaders?.length > 0) {
            globalHeaders = [...config.globalHeaders];
        }
        updateHeadersCount();
    } catch (e) {
        console.log('Failed to load global headers');
    }
}

function saveGlobalHeadersToStorage() {
    try {
        localStorage.setItem('qingfeng_global_headers', JSON.stringify(globalHeaders));
    } catch (e) {}
}

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

function openGlobalHeadersModal() {
    document.getElementById('global-headers-modal').classList.remove('hidden');
    renderGlobalHeadersInputs();
}

function closeGlobalHeadersModal() {
    document.getElementById('global-headers-modal').classList.add('hidden');
}

function renderGlobalHeadersInputs() {
    const container = document.getElementById('global-headers-inputs');
    if (globalHeaders.length === 0) globalHeaders.push({ key: '', value: '' });
    
    container.innerHTML = globalHeaders.map((h, i) => `
        <div class="flex gap-2 items-center" data-index="${i}">
            <input type="text" class="input-field flex-1 rounded-lg px-3 py-2 text-sm" 
                   placeholder="Header Key" value="${escapeHtml(h.key)}"
                   onchange="updateGlobalHeader(${i}, 'key', this.value)">
            <input type="text" class="input-field flex-1 rounded-lg px-3 py-2 text-sm" 
                   placeholder="Header Value" value="${escapeHtml(h.value)}"
                   onchange="updateGlobalHeader(${i}, 'value', this.value)">
            <button onclick="removeGlobalHeader(${i})" class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('');
}

function addGlobalHeader() {
    globalHeaders.push({ key: '', value: '' });
    renderGlobalHeadersInputs();
}

function updateGlobalHeader(index, field, value) {
    globalHeaders[index][field] = value;
}

function removeGlobalHeader(index) {
    globalHeaders.splice(index, 1);
    renderGlobalHeadersInputs();
}

function saveGlobalHeaders() {
    globalHeaders = globalHeaders.filter(h => h.key || h.value);
    const invalidKeys = globalHeaders.filter(h => h.key && !isValidHeaderKey(h.key));
    if (invalidKeys.length > 0) {
        showToast('Header Key 只能包含英文字符', 'error');
        return;
    }
    saveGlobalHeadersToStorage();
    updateHeadersCount();
    closeGlobalHeadersModal();
    if (currentApi) renderGlobalHeaders();
    showToast('全局参数已保存');
}

function clearGlobalHeaders() {
    globalHeaders = [];
    saveGlobalHeadersToStorage();
    updateHeadersCount();
    renderGlobalHeadersInputs();
    if (currentApi) renderGlobalHeaders();
}

function maskValue(key, value) {
    const sensitiveKeys = ['authorization', 'token', 'api-key', 'apikey', 'secret', 'password'];
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        if (value.length > 10) return value.substring(0, 6) + '****' + value.substring(value.length - 4);
        return '****';
    }
    return value;
}

// 更新文件列表显示
function updateFileList(input) {
    const fileList = input.parentElement.querySelector('.file-list');
    if (!fileList) return;
    
    const files = input.files;
    if (!files || files.length === 0) {
        fileList.innerHTML = '';
        return;
    }
    
    if (files.length === 1) {
        fileList.innerHTML = `<div class="flex items-center gap-2"><i class="fas fa-file text-blue-500"></i>${escapeHtml(files[0].name)} <span class="text-xs">(${formatFileSize(files[0].size)})</span></div>`;
    } else {
        let html = `<div class="mb-1"><i class="fas fa-files text-blue-500 mr-1"></i>已选择 ${files.length} 个文件:</div><ul class="ml-4 space-y-1">`;
        for (let i = 0; i < files.length; i++) {
            html += `<li class="flex items-center gap-2"><i class="fas fa-file-alt text-gray-400"></i>${escapeHtml(files[i].name)} <span class="text-xs">(${formatFileSize(files[i].size)})</span></li>`;
        }
        html += '</ul>';
        fileList.innerHTML = html;
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function encodeHeaderValue(value) {
    if (!value) return value;
    if (/[^\x00-\x7F]/.test(value)) return encodeURIComponent(value);
    return value;
}

function isValidHeaderKey(key) {
    return key && /^[\x21-\x7E]+$/.test(key);
}

// ==================== Token 自动提取 ====================

function loadTokenExtractRulesFromStorage() {
    try {
        const saved = localStorage.getItem('qingfeng_token_rules');
        if (saved) tokenExtractRules = JSON.parse(saved);
        updateTokenRulesCount();
    } catch (e) {}
}

function saveTokenExtractRulesToStorage() {
    try {
        localStorage.setItem('qingfeng_token_rules', JSON.stringify(tokenExtractRules));
    } catch (e) {}
}

function updateTokenRulesCount() {
    const count = tokenExtractRules.filter(r => r.enabled && r.jsonPath && r.headerKey).length;
    const badge = document.getElementById('token-rules-count');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

function openTokenExtractModal() {
    document.getElementById('token-extract-modal').classList.remove('hidden');
    renderTokenExtractRules();
}

function closeTokenExtractModal() {
    document.getElementById('token-extract-modal').classList.add('hidden');
}

function renderTokenExtractRules() {
    const container = document.getElementById('token-rules-inputs');
    if (tokenExtractRules.length === 0) {
        tokenExtractRules.push({ enabled: true, pathPattern: '', jsonPath: '', headerKey: 'Authorization', prefix: 'Bearer ' });
    }
    
    container.innerHTML = tokenExtractRules.map((r, i) => `
        <div class="p-3 rounded-lg mb-2" style="background: var(--bg-tertiary)">
            <div class="flex items-center gap-2 mb-2">
                <input type="checkbox" ${r.enabled ? 'checked' : ''} onchange="updateTokenRule(${i}, 'enabled', this.checked)" class="w-4 h-4">
                <span class="text-sm font-medium">规则 ${i + 1}</span>
                <button onclick="removeTokenRule(${i})" class="ml-auto p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded">
                    <i class="fas fa-trash-alt text-xs"></i>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div class="col-span-2">
                    <label class="block text-xs mb-1" style="color: var(--text-secondary)">接口路径 (支持 * 通配符)</label>
                    <input type="text" class="input-field w-full rounded px-2 py-1 text-sm" placeholder="*/login" 
                           value="${escapeHtml(r.pathPattern || '')}" onchange="updateTokenRule(${i}, 'pathPattern', this.value)">
                </div>
                <div>
                    <label class="block text-xs mb-1" style="color: var(--text-secondary)">JSON 路径</label>
                    <input type="text" class="input-field w-full rounded px-2 py-1 text-sm" placeholder="data.token" 
                           value="${escapeHtml(r.jsonPath)}" onchange="updateTokenRule(${i}, 'jsonPath', this.value)">
                </div>
                <div>
                    <label class="block text-xs mb-1" style="color: var(--text-secondary)">Header Key</label>
                    <input type="text" class="input-field w-full rounded px-2 py-1 text-sm" placeholder="Authorization" 
                           value="${escapeHtml(r.headerKey)}" onchange="updateTokenRule(${i}, 'headerKey', this.value)">
                </div>
                <div class="col-span-2">
                    <label class="block text-xs mb-1" style="color: var(--text-secondary)">前缀</label>
                    <input type="text" class="input-field w-full rounded px-2 py-1 text-sm" placeholder="Bearer " 
                           value="${escapeHtml(r.prefix || '')}" onchange="updateTokenRule(${i}, 'prefix', this.value)">
                </div>
            </div>
        </div>
    `).join('');
}

function addTokenRule() {
    tokenExtractRules.push({ enabled: true, pathPattern: '', jsonPath: '', headerKey: 'Authorization', prefix: 'Bearer ' });
    renderTokenExtractRules();
}

function updateTokenRule(index, field, value) {
    tokenExtractRules[index][field] = value;
}

function removeTokenRule(index) {
    tokenExtractRules.splice(index, 1);
    renderTokenExtractRules();
}

function saveTokenRules() {
    tokenExtractRules = tokenExtractRules.filter(r => r.jsonPath || r.headerKey);
    const invalidKeys = tokenExtractRules.filter(r => r.headerKey && !isValidHeaderKey(r.headerKey));
    if (invalidKeys.length > 0) {
        showToast('Header Key 只能包含英文字符', 'error');
        return;
    }
    saveTokenExtractRulesToStorage();
    updateTokenRulesCount();
    closeTokenExtractModal();
    showToast('Token 规则已保存');
}

function clearTokenRules() {
    tokenExtractRules = [];
    saveTokenExtractRulesToStorage();
    updateTokenRulesCount();
    renderTokenExtractRules();
}

function extractTokenFromResponse(responseData) {
    if (!currentApi) return;
    
    const currentPath = currentApi.path;
    const enabledRules = tokenExtractRules.filter(r => r.enabled && r.jsonPath && r.headerKey);
    
    for (const rule of enabledRules) {
        if (!matchPath(currentPath, rule.pathPattern)) continue;
        
        try {
            const value = getValueByPath(responseData, rule.jsonPath);
            if (value && typeof value === 'string') {
                const headerValue = (rule.prefix || '') + value;
                const existingIndex = globalHeaders.findIndex(h => h.key === rule.headerKey);
                if (existingIndex >= 0) {
                    globalHeaders[existingIndex].value = headerValue;
                } else {
                    globalHeaders.push({ key: rule.headerKey, value: headerValue });
                }
                saveGlobalHeadersToStorage();
                updateHeadersCount();
                showToast(`已提取 ${rule.headerKey}`);
                if (currentApi) renderGlobalHeaders();
            }
        } catch (e) {
            console.log('Token extract failed:', e);
        }
    }
}

function getValueByPath(obj, path) {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
        if (value === null || value === undefined) return undefined;
        value = value[key];
    }
    return value;
}

function matchPath(apiPath, pattern) {
    if (!pattern || pattern.trim() === '') return true;
    pattern = pattern.trim();
    if (pattern === apiPath) return true;
    
    const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
    
    return new RegExp(`^${regexPattern}$`).test(apiPath);
}

// Toast 通知
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white text-sm z-50 flex items-center gap-2 animate-fade-in';
    toast.style.background = type === 'error' ? '#ef4444' : '#22c55e';
    toast.innerHTML = `<i class="fas fa-${type === 'error' ? 'times' : 'check'}-circle"></i>${escapeHtml(message)}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// 复制响应结果
function copyResponse() {
    const responseEl = document.getElementById('response-content');
    const text = responseEl.textContent || responseEl.innerText;
    
    if (!text || text === '点击"发送请求"查看响应结果') {
        showToast('暂无响应内容', 'error');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制到剪贴板');
    }).catch(() => {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('已复制到剪贴板');
    });
}

// 复制 cURL 命令
function copyCurl() {
    if (!currentApi) {
        showToast('请先选择接口', 'error');
        return;
    }
    
    const { path, method } = currentApi;
    // 使用环境配置的 baseUrl，如果是相对路径则加上当前域名
    let baseUrl = getCurrentBaseUrl();
    if (!baseUrl.startsWith('http')) {
        baseUrl = window.location.origin + baseUrl;
    }
    let url = baseUrl + path;
    
    const queryParams = new URLSearchParams();
    const headers = {};
    const formDataParams = [];
    let hasFileInput = false;
    
    // 收集全局 headers
    globalHeaders.forEach(h => {
        if (h.key && h.value) headers[h.key] = h.value;
    });
    
    // 收集参数
    document.querySelectorAll('#debug-params-container input').forEach(input => {
        const name = input.dataset.param;
        const location = input.dataset.in;
        const isFile = input.dataset.type === 'file';
        const value = isFile ? null : input.value;
        
        if (location === 'path') {
            if (value) url = url.replace(`{${name}}`, encodeURIComponent(value));
        } else if (location === 'query') {
            if (value) queryParams.append(name, value);
        } else if (location === 'header') {
            if (value) headers[name] = value;
        } else if (location === 'formData') {
            if (isFile && input.files && input.files.length > 0) {
                hasFileInput = true;
                formDataParams.push({ name, file: input.files[0].name });
            } else if (!isFile && value) {
                formDataParams.push({ name, value });
            }
        }
    });
    
    if (queryParams.toString()) url += '?' + queryParams.toString();
    
    // 构建 cURL 命令
    let curl = `curl -X ${method.toUpperCase()} '${url}'`;
    
    // 添加 headers
    for (const [key, value] of Object.entries(headers)) {
        curl += ` \\\n  -H '${key}: ${value}'`;
    }
    
    // 添加 formData 参数（包括文件）
    if (formDataParams.length > 0) {
        for (const param of formDataParams) {
            if (param.file) {
                curl += ` \\\n  -F '${param.name}=@${param.file}'`;
            } else {
                curl += ` \\\n  -F '${param.name}=${param.value}'`;
            }
        }
    } else {
        // 添加 body
        const bodyInput = document.getElementById('debug-body');
        if (!document.getElementById('debug-body-container').classList.contains('hidden') && bodyInput.value) {
            curl += ` \\\n  -H 'Content-Type: application/json'`;
            curl += ` \\\n  -d '${bodyInput.value.replace(/'/g, "\\'")}'`;
        }
    }
    
    navigator.clipboard.writeText(curl).then(() => {
        showToast('cURL 命令已复制');
    }).catch(() => {
        showToast('复制失败', 'error');
    });
}

// ==================== 发送请求 ====================

let isRequesting = false;
let lastResponseJson = null;
let lastResponseHeaders = null;
let isResponseFormatted = true;
let isResponseExpanded = false;

async function sendRequest() {
    if (!currentApi || isRequesting) return;
    
    const { path, method, api } = currentApi;
    
    // 必填参数校验
    const missingParams = [];
    document.querySelectorAll('#debug-params-container input, #debug-params-container select').forEach(input => {
        const name = input.dataset.param;
        const required = api.parameters?.find(p => p.name === name)?.required;
        if (required && !input.value.trim()) {
            missingParams.push(name);
            input.style.borderColor = '#ef4444';
        } else {
            input.style.borderColor = '';
        }
    });
    
    if (missingParams.length > 0) {
        showToast(`请填写必填参数: ${missingParams.join(', ')}`, 'error');
        return;
    }
    
    // 使用环境配置的 baseUrl
    let url = getCurrentBaseUrl() + path;
    
    const queryParams = new URLSearchParams();
    const headers = {};
    let hasFileInput = false;
    const formData = new FormData();
    
    // 检查是否有文件输入
    document.querySelectorAll('#debug-params-container input[data-type="file"]').forEach(input => {
        if (input.files && input.files.length > 0) {
            hasFileInput = true;
        }
    });
    
    // 如果没有文件，使用 JSON
    if (!hasFileInput) {
        headers['Content-Type'] = 'application/json';
    }
    
    globalHeaders.forEach(h => {
        if (h.key && h.value && isValidHeaderKey(h.key)) {
            headers[h.key] = encodeHeaderValue(h.value);
        }
    });
    
    document.querySelectorAll('#debug-params-container input, #debug-params-container select').forEach(input => {
        const name = input.dataset.param;
        const location = input.dataset.in;
        const isFile = input.dataset.type === 'file';
        const value = isFile ? null : input.value;
        
        if (location === 'path') {
            if (value) url = url.replace(`{${name}}`, encodeURIComponent(value));
        } else if (location === 'query') {
            if (value) queryParams.append(name, value);
        } else if (location === 'header' && isValidHeaderKey(name)) {
            if (value) headers[name] = encodeHeaderValue(value);
        } else if (location === 'formData') {
            if (isFile && input.files && input.files.length > 0) {
                // 文件参数
                for (let i = 0; i < input.files.length; i++) {
                    formData.append(name, input.files[i]);
                }
            } else if (!isFile && value) {
                // 普通 formData 参数
                formData.append(name, value);
            }
        }
    });
    
    if (queryParams.toString()) url += '?' + queryParams.toString();
    
    let body = null;
    const bodyInput = document.getElementById('debug-body');
    
    if (hasFileInput) {
        // 使用 FormData 发送（包含文件）
        body = formData;
    } else if (!document.getElementById('debug-body-container').classList.contains('hidden') && bodyInput.value) {
        body = bodyInput.value;
    }
    
    // 禁用按钮，显示加载状态
    setRequestLoading(true);
    
    const responseContent = document.getElementById('response-content');
    responseContent.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>请求中...';
    
    const startTime = Date.now();
    try {
        const res = await fetch(url, {
            method: method.toUpperCase(),
            headers,
            body: body
        });
        
        const duration = Date.now() - startTime;
        const data = await res.text();
        const size = new Blob([data]).size;
        
        // 保存响应头
        lastResponseHeaders = {};
        res.headers.forEach((value, key) => {
            lastResponseHeaders[key] = value;
        });
        
        document.getElementById('response-info').classList.remove('hidden');
        document.getElementById('response-status').textContent = res.status;
        document.getElementById('response-status').className = `px-3 py-1 rounded text-white text-sm font-bold ${res.ok ? 'bg-green-500' : 'bg-red-500'}`;
        document.getElementById('response-time').textContent = `${duration}ms`;
        document.getElementById('response-size').textContent = formatSize(size);
        
        try {
            lastResponseJson = JSON.parse(data);
            isResponseFormatted = true;
            const highlightedContent = syntaxHighlight(JSON.stringify(lastResponseJson, null, 2));
            displayResponse(highlightedContent, size);
            saveResponse(res.status, duration, highlightedContent, !res.ok);
            if (res.ok) extractTokenFromResponse(lastResponseJson);
        } catch {
            lastResponseJson = null;
            responseContent.textContent = data;
            saveResponse(res.status, duration, escapeHtml(data), !res.ok);
        }
    } catch (e) {
        document.getElementById('response-info').classList.remove('hidden');
        document.getElementById('response-status').textContent = 'Error';
        document.getElementById('response-status').className = 'px-3 py-1 rounded text-white text-sm font-bold bg-red-500';
        document.getElementById('response-time').textContent = '';
        document.getElementById('response-size').textContent = '';
        const errorContent = `<span class="text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>${escapeHtml(e.message)}</span>`;
        responseContent.innerHTML = errorContent;
        saveResponse('Error', null, errorContent, true);
        lastResponseJson = null;
        lastResponseHeaders = null;
    } finally {
        setRequestLoading(false);
    }
}

function setRequestLoading(loading) {
    isRequesting = loading;
    const btn = document.getElementById('send-btn');
    if (btn) {
        btn.disabled = loading;
        btn.innerHTML = loading 
            ? '<i class="fas fa-spinner fa-spin mr-2"></i>请求中...'
            : '<i class="fas fa-paper-plane mr-2"></i>发送请求';
        btn.style.opacity = loading ? '0.7' : '1';
        btn.style.cursor = loading ? 'not-allowed' : 'pointer';
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function displayResponse(content, size) {
    const responseContent = document.getElementById('response-content');
    const expandBtn = document.getElementById('expand-response-btn');
    const wrapper = document.getElementById('response-body-wrapper');
    
    // 大于 50KB 时折叠
    if (size > 50 * 1024 && !isResponseExpanded) {
        responseContent.innerHTML = content;
        responseContent.style.maxHeight = '300px';
        responseContent.style.overflow = 'hidden';
        expandBtn?.classList.remove('hidden');
    } else {
        responseContent.innerHTML = content;
        responseContent.style.maxHeight = '';
        responseContent.style.overflow = '';
        expandBtn?.classList.add('hidden');
    }
}

function toggleResponseExpand() {
    isResponseExpanded = !isResponseExpanded;
    const responseContent = document.getElementById('response-content');
    const expandBtn = document.getElementById('expand-response-btn');
    
    if (isResponseExpanded) {
        responseContent.style.maxHeight = '';
        responseContent.style.overflow = '';
        expandBtn.innerHTML = '<i class="fas fa-chevron-up mr-1"></i>收起';
    } else {
        responseContent.style.maxHeight = '300px';
        responseContent.style.overflow = 'hidden';
        expandBtn.innerHTML = '<i class="fas fa-chevron-down mr-1"></i>展开全部';
    }
}

function toggleResponseFormat() {
    if (!lastResponseJson) {
        showToast('无 JSON 响应可格式化', 'error');
        return;
    }
    
    isResponseFormatted = !isResponseFormatted;
    const responseContent = document.getElementById('response-content');
    const formatBtn = document.getElementById('format-btn');
    
    if (isResponseFormatted) {
        responseContent.innerHTML = syntaxHighlight(JSON.stringify(lastResponseJson, null, 2));
        formatBtn.innerHTML = '<i class="fas fa-compress-alt"></i>';
        formatBtn.title = '压缩';
    } else {
        responseContent.innerHTML = syntaxHighlight(JSON.stringify(lastResponseJson));
        formatBtn.innerHTML = '<i class="fas fa-expand-alt"></i>';
        formatBtn.title = '格式化';
    }
}

function toggleResponseHeaders() {
    const panel = document.getElementById('response-headers-panel');
    const content = document.getElementById('response-headers-content');
    
    if (!lastResponseHeaders) {
        showToast('暂无响应头', 'error');
        return;
    }
    
    if (panel.classList.contains('hidden')) {
        content.innerHTML = Object.entries(lastResponseHeaders)
            .map(([k, v]) => `<div><span class="text-blue-500">${escapeHtml(k)}:</span> ${escapeHtml(v)}</div>`)
            .join('');
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
    }
}

// ==================== 主题切换 ====================

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    applyTheme();
    saveThemeToStorage();
}

function toggleTheme() {
    toggleDarkMode();
}

function loadThemeFromStorage() {
    try {
        const savedDarkMode = localStorage.getItem('qingfeng_dark_mode');
        const savedThemeColor = localStorage.getItem('qingfeng_theme_color');
        
        if (savedDarkMode !== null) isDarkMode = savedDarkMode === 'true';
        if (savedThemeColor) currentThemeColor = savedThemeColor;
        applyTheme();
    } catch (e) {}
}

function saveThemeToStorage() {
    try {
        localStorage.setItem('qingfeng_dark_mode', isDarkMode);
        localStorage.setItem('qingfeng_theme_color', currentThemeColor);
    } catch (e) {}
}

function applyTheme() {
    const modeClass = isDarkMode ? 'dark' : 'light';
    const themeClass = `theme-${currentThemeColor}`;
    document.body.className = `${modeClass} ${themeClass}`;
    document.getElementById('theme-icon').className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    updateThemeButtonStates();
}

function updateThemeButtonStates() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        const theme = btn.dataset.theme;
        btn.style.borderColor = theme === currentThemeColor ? 'var(--primary)' : 'transparent';
    });
}

function openThemeModal() {
    document.getElementById('theme-modal').classList.remove('hidden');
    updateThemeButtonStates();
}

function closeThemeModal() {
    document.getElementById('theme-modal').classList.add('hidden');
}

function setThemeColor(color) {
    currentThemeColor = color;
    applyTheme();
    saveThemeToStorage();
    closeThemeModal();
}

// ==================== UI 风格切换 ====================

function loadUIThemeFromStorage() {
    try {
        const savedUITheme = localStorage.getItem('qingfeng_ui_theme');
        if (savedUITheme && savedUITheme !== getCurrentUITheme()) {
            // 如果保存的主题和当前不一致，跳转
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('theme', savedUITheme);
            window.location.href = currentUrl.toString();
        }
    } catch (e) {}
}

function openUIThemeModal() {
    document.getElementById('ui-theme-modal').classList.remove('hidden');
    updateUIThemeButtonStates();
}

function closeUIThemeModal() {
    document.getElementById('ui-theme-modal').classList.add('hidden');
}

function updateUIThemeButtonStates() {
    const currentUITheme = getCurrentUITheme();
    document.querySelectorAll('.ui-theme-btn').forEach(btn => {
        const theme = btn.dataset.uiTheme;
        btn.style.borderColor = theme === currentUITheme ? 'var(--primary)' : 'var(--border)';
    });
}

function getCurrentUITheme() {
    const params = new URLSearchParams(window.location.search);
    return params.get('theme') || 'default';
}

function switchUITheme(theme) {
    // 保存到 localStorage
    localStorage.setItem('qingfeng_ui_theme', theme);
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('theme', theme);
    window.location.href = currentUrl.toString();
}

function exportDoc() {
    if (!swaggerData) return;
    
    const blob = new Blob([JSON.stringify(swaggerData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'swagger.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('导出成功');
}


// ==================== 移动端侧边栏 ====================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isOpen = sidebar.classList.contains('open');
    
    if (isOpen) {
        sidebar.classList.remove('open');
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    } else {
        sidebar.classList.add('open');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// 更新移动端标题
function updateMobileTitle(title) {
    const mobileTitle = document.getElementById('mobile-title');
    if (mobileTitle) mobileTitle.textContent = title || 'API Docs';
}

// 同步移动端主题图标
function syncMobileThemeIcon() {
    const mobileIcon = document.getElementById('mobile-theme-icon');
    if (mobileIcon) mobileIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
}

// 重写 selectApi 以支持移动端
const originalSelectApi = selectApi;
selectApi = function(path, method) {
    originalSelectApi(path, method);
    // 移动端自动关闭侧边栏
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
    // 更新移动端标题
    const api = swaggerData.paths[path][method];
    updateMobileTitle(api.summary || path);
};

// 重写 applyTheme 以同步移动端图标
const originalApplyTheme = applyTheme;
applyTheme = function() {
    originalApplyTheme();
    syncMobileThemeIcon();
};

// 重写 updateHeadersCount 以同步移动端徽章
const originalUpdateHeadersCount = updateHeadersCount;
updateHeadersCount = function() {
    originalUpdateHeadersCount();
    const count = globalHeaders.filter(h => h.key && h.value).length;
    const mobileBadge = document.getElementById('mobile-headers-count');
    if (mobileBadge) {
        mobileBadge.textContent = count;
        mobileBadge.classList.toggle('hidden', count === 0);
    }
};
