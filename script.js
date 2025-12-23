// 全局配置
const CONFIG = {
    audio: { // 音频播放器配置 
        backgroundMusic: "https://s3plus.meituan.net/opapisdk/op_ticket_1_5677168484_1766382495688_qdqqd_j5ucp7.mp3", // 背景音乐文件路径，将音频上传图床，后获得的链接 
        defaultVolume: 0.3, // 默认音量大小（0-1之间） 
        autoPlay: true, // 是否自动播放音乐 
        loop: true, // 是否循环播放音乐 
        playerColors: { // 音频播放器颜色配置 
            background: "rgba(0, 0, 0, 0.7)", // 播放器背景色，rgba最后一位数是透明度，前三位数是颜色数据，具体看gitee常用命令上方的基础颜色 
            backgroundHover: "rgba(0, 0, 0, 0.9)", // 播放器悬停背景色，rgba最后一位数是透明度，前三位数是颜色数据，具体看gitee常用命令上方的基础颜色 
            playButton: "linear-gradient(135deg, #ff6b6b, #ee5a52)", // 播放按钮背景渐变色，rgba最后一位数是透明度，前三位数是颜色数据，具体看gitee常用命令上方的基础颜色 
            pauseButton: "linear-gradient(135deg, #51cf66, #37b24d)" // 暂停按钮背景渐变色，rgba最后一位数是透明度，前三位数是颜色数据，具体看gitee常用命令上方的基础颜色 
        } 
    }
};

// 全局变量
let currentUser = null;
let chiefs = []; // 社主列表，最多2名
let admins = []; // 管理员列表
let loginModalMode = 'login'; // login, addChief, addAdmin
let users = []; // 注册用户列表

// DOM元素
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const roleModal = document.getElementById('role-modal');
const selectMemberModal = document.getElementById('select-member-modal');
const adminPanel = document.getElementById('admin-panel');
const loginBtnContainer = document.getElementById('login-btn-container');
const userInfo = document.getElementById('user-info');
const currentUserSpan = document.getElementById('current-user');

// 导航栏切换
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// 关闭导航栏当点击链接时
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// 编辑模态框
const editModal = document.getElementById('edit-modal');
const editTextarea = document.getElementById('edit-textarea');
const editClose = editModal.querySelector('.close');
let currentEditingSection = null;

// 成员模态框
const memberModal = document.getElementById('member-modal');
const memberForm = document.getElementById('member-form');
const memberModalTitle = document.getElementById('member-modal-title');
const memberClose = memberModal.querySelector('.close');
let currentEditingMember = null;

// 打开编辑模态框
function editSection(sectionId) {
    // 检查是否有编辑权限
    const isEditingFooter = sectionId === 'footer-content';
    const isEditingSettings = sectionId === 'about-content' || sectionId === 'activities-content';
    const isEditingSiteSettings = sectionId === 'site-title' || sectionId === 'banner-title' || sectionId === 'banner-text' || sectionId === 'background-url';
    
    if (!currentUser || 
        (isEditingFooter && !hasPermission('edit-all')) ||
        ((isEditingSettings || isEditingSiteSettings) && !hasPermission('edit-activities'))) {
        alert('您没有权限编辑该内容！');
        return;
    }
    
    currentEditingSection = document.getElementById(sectionId);
    editTextarea.value = currentEditingSection.innerHTML;
    editModal.style.display = 'block';
}

// 保存编辑内容
function saveEdit() {
    if (currentEditingSection) {
        currentEditingSection.innerHTML = editTextarea.value;
        editModal.style.display = 'none';
        saveToLocalStorage();
    }
}

// 取消编辑
function cancelEdit() {
    editModal.style.display = 'none';
    currentEditingSection = null;
}

// 打开成员模态框
function openMemberModal(member = null) {
    // 检查是否有编辑权限
    if (!currentUser || (currentUser.role !== 'chief' && currentUser.role !== 'admin')) {
        alert('您没有权限编辑成员信息！');
        return;
    }
    
    if (member) {
        // 编辑现有成员
        currentEditingMember = member;
        memberModalTitle.textContent = '编辑成员';
        document.getElementById('member-id').value = member.id;
        document.getElementById('member-name').value = member.name;
        document.getElementById('member-position').value = member.position;
        document.getElementById('member-job').value = member.job;
        document.getElementById('member-level').value = member.level || 1;
        document.getElementById('member-avatar').value = member.avatar || '';
        document.getElementById('member-bg').value = member.bg || '';
        document.getElementById('member-desc').value = member.desc || '';
    } else {
        // 添加新成员
        currentEditingMember = null;
        memberModalTitle.textContent = '添加成员';
        memberForm.reset();
        document.getElementById('member-id').value = '';
        document.getElementById('member-level').value = 1;
    }
    memberModal.style.display = 'block';
}

// 添加成员
function addMember() {
    openMemberModal();
}

// 编辑选中的成员
function editSelectedMember() {
    if (currentSelectedMember) {
        openMemberModal(currentSelectedMember);
    } else {
        alert('请先选择一个成员！');
    }
}

// 编辑成员
function editMember(memberId) {
    const member = members.find(m => m.id === memberId);
    if (member) {
        openMemberModal(member);
    }
}

// 删除成员
function deleteMember(memberId) {
    if (confirm('确定要删除这个成员吗？')) {
        members = members.filter(m => m.id !== memberId);
        renderMembers();
        saveToLocalStorage();
    }
}

// 保存成员
memberForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('member-id').value || Date.now().toString();
    const name = document.getElementById('member-name').value;
    const position = document.getElementById('member-position').value;
    const job = document.getElementById('member-job').value;
    const level = parseInt(document.getElementById('member-level').value);
    const avatar = document.getElementById('member-avatar').value;
    const bg = document.getElementById('member-bg').value;
    const desc = document.getElementById('member-desc').value;
    
    const member = {
        id,
        name,
        position,
        job,
        level,
        avatar,
        bg,
        desc
    };
    
    if (currentEditingMember) {
        // 更新现有成员
        const index = members.findIndex(m => m.id === id);
        members[index] = member;
    } else {
        // 添加新成员
        members.push(member);
    }
    
    memberModal.style.display = 'none';
    renderMembers();
    saveToLocalStorage();
});

// 取消成员编辑
function cancelMemberEdit() {
    memberModal.style.display = 'none';
    currentEditingMember = null;
}

// 更新网站标题
function updateSiteTitle() {
    // 检查权限
    if (!currentUser || (currentUser.role !== 'chief' && currentUser.role !== 'admin')) {
        alert('您没有权限编辑网站标题！');
        return;
    }
    
    const title = document.getElementById('site-title-input').value;
    if (title) {
        document.getElementById('site-title').textContent = title;
        document.title = title;
        document.getElementById('site-title-input').value = '';
        saveToLocalStorage();
    }
}

// 更新横幅标题
function updateBannerTitle() {
    // 检查权限
    if (!currentUser || (currentUser.role !== 'chief' && currentUser.role !== 'admin')) {
        alert('您没有权限编辑横幅标题！');
        return;
    }
    
    const title = document.getElementById('banner-title-input').value;
    if (title) {
        document.getElementById('banner-title').textContent = title;
        document.getElementById('banner-title-input').value = '';
        saveToLocalStorage();
    }
}

// 更新横幅副标题
function updateBannerText() {
    // 检查权限
    if (!currentUser || (currentUser.role !== 'chief' && currentUser.role !== 'admin')) {
        alert('您没有权限编辑横幅副标题！');
        return;
    }
    
    const text = document.getElementById('banner-text-input').value;
    if (text) {
        document.getElementById('banner-text').textContent = text;
        document.getElementById('banner-text-input').value = '';
        saveToLocalStorage();
    }
}

// 更新背景图片
function updateBackground() {
    // 检查权限
    if (!currentUser || (currentUser.role !== 'chief' && currentUser.role !== 'admin')) {
        alert('您没有权限更新背景图片！');
        return;
    }
    
    const url = document.getElementById('background-url').value;
    if (url) {
        const banner = document.querySelector('.banner');
        banner.style.backgroundImage = `url('${url}')`;
        document.getElementById('background-url').value = '';
        saveToLocalStorage();
    }
}

// 成员数据
let members = [];
let currentSelectedMember = null;

// 渲染角色列表
function renderMembers() {
    const container = document.getElementById('character-list');
    
    // 保留添加成员按钮
    const addBtn = document.getElementById('add-character-btn');
    container.innerHTML = '';
    
    members.forEach(member => {
        const characterItem = document.createElement('div');
        characterItem.className = 'character-item';
        characterItem.dataset.memberId = member.id;
        
        // 默认头像
        const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.name) + '&background=3498db&color=fff&size=250';
        
        characterItem.innerHTML = `
            <div class="character-avatar" style="background-image: url('${member.avatar || defaultAvatar}');"></div>
            <div class="character-overlay">
                <div class="character-name-tooltip">${member.name}</div>
            </div>
        `;
        
        // 点击角色项
        characterItem.addEventListener('click', () => {
            selectMember(member);
        });
        
        container.appendChild(characterItem);
    });
    
    // 添加成员按钮
    container.appendChild(addBtn);
    
    // 默认选择第一个成员
    if (members.length > 0 && !currentSelectedMember) {
        selectMember(members[0]);
    }
}

// 选择成员
function selectMember(member) {
    currentSelectedMember = member;
    
    // 更新选中状态
    document.querySelectorAll('.character-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-member-id="${member.id}"]`).classList.add('active');
    
    // 显示成员信息
    updateCharacterInfo(member);
    
    // 更新背景
    updateCharacterBackground(member);
}

// 更新角色信息
function updateCharacterInfo(member) {
    const nameEl = document.getElementById('character-name');
    const positionEl = document.getElementById('character-position');
    const jobEl = document.getElementById('character-job');
    const descEl = document.getElementById('character-desc');
    
    nameEl.textContent = member.name;
    positionEl.textContent = member.position || member.martialArt || '未知武学';
    jobEl.textContent = `等级: ${member.level || 1}`;
    descEl.textContent = member.desc || `该成员擅长${member.martialArt || '未知武学'}`;
}

// 更新角色背景
function updateCharacterBackground(member) {
    const bgEl = document.getElementById('character-background');
    const defaultBg = 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1920&h=1080&fit=crop';
    
    // 直接更换背景
    bgEl.style.backgroundImage = `url('${member.bg || defaultBg}')`;
}

// 编辑角色背景
function editCharacterBackground() {
    if (!currentSelectedMember) {
        alert('请先选择一个成员！');
        return;
    }
    
    if (!hasPermission('edit-member-bg')) {
        alert('您没有权限编辑成员背景！');
        return;
    }
    
    const newBgUrl = prompt('请输入新的背景图片URL：');
    if (newBgUrl) {
        currentSelectedMember.bg = newBgUrl;
        saveToLocalStorage();
        updateCharacterBackground(currentSelectedMember);
    }
}

// 点击背景更换背景
document.addEventListener('DOMContentLoaded', () => {
    const bgEl = document.getElementById('character-background');
    if (bgEl) {
        bgEl.addEventListener('click', (e) => {
            // 避免点击编辑按钮时触发
            if (!e.target.classList.contains('bg-edit-btn')) {
                editCharacterBackground();
            }
        });
    }
    
    // 添加成员按钮事件
    const addBtn = document.getElementById('add-character-btn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddCharacterModal);
    }
});

// 导航栏自动隐藏功能 - 优化版
document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    let hideTimeout = null;
    
    // 确保导航栏样式正确
    navbar.style.position = 'fixed';
    navbar.style.top = '0';
    navbar.style.left = '0';
    navbar.style.width = '100%';
    navbar.style.zIndex = '1000';
    navbar.style.transition = 'transform 0.3s ease-in-out';
    navbar.style.transform = 'translateY(0)'; // 初始显示
    navbar.style.pointerEvents = 'auto';
    navbar.style.cursor = 'default';
    
    // 显示导航栏
    const showNavbar = () => {
        navbar.style.transform = 'translateY(0)';
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    };
    
    // 隐藏导航栏（带延迟）
    const hideNavbar = () => {
        hideTimeout = setTimeout(() => {
            navbar.style.transform = 'translateY(-100%)';
        }, 500); // 500ms延迟，避免误触
    };
    
    // 滚动事件：滚动时延迟隐藏
    window.addEventListener('scroll', () => {
        hideNavbar();
    });
    
    // 鼠标悬停显示导航栏
    navbar.addEventListener('mouseenter', () => {
        showNavbar();
    });
    
    // 鼠标离开隐藏导航栏
    navbar.addEventListener('mouseleave', () => {
        hideNavbar();
    });
    
    // 为导航栏内的所有元素添加鼠标事件监听
    const navElements = navbar.querySelectorAll('*');
    navElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            showNavbar();
        });
    });
    
    // 添加顶部区域的鼠标事件监听，确保鼠标靠近顶部时能显示导航栏
    const topArea = document.createElement('div');
    topArea.style.position = 'fixed';
    topArea.style.top = '0';
    topArea.style.left = '0';
    topArea.style.width = '100%';
    topArea.style.height = '50px';
    topArea.style.zIndex = '999';
    topArea.style.pointerEvents = 'auto';
    topArea.style.cursor = 'default';
    document.body.appendChild(topArea);
    
    topArea.addEventListener('mouseenter', () => {
        showNavbar();
    });
    
    topArea.addEventListener('mouseleave', () => {
        hideNavbar();
    });
});

// 添加成员模态框
function showAddCharacterModal() {
    // 检查是否有管理权限
    if (!currentUser || (currentUser.role !== 'chief' && currentUser.role !== 'admin')) {
        alert('您没有权限添加百业人员！');
        return;
    }
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close">&times;</span>
            <h3>添加新成员</h3>
            <form id="add-character-form">
                <div class="form-group">
                    <label for="new-name">名字：</label>
                    <input type="text" id="new-name" required>
                </div>
                <div class="form-group">
                    <label for="new-martial-art">武学：</label>
                    <input type="text" id="new-martial-art" required>
                </div>
                <div class="form-group">
                    <label for="new-level">等级：</label>
                    <input type="number" id="new-level" min="1" max="100" required>
                </div>
                <div class="form-group">
                    <label for="new-bg-url">背景图片URL：</label>
                    <input type="text" id="new-bg-url" placeholder="可选">
                </div>
                <div class="form-group">
                    <label for="new-avatar-url">头像URL：</label>
                    <input type="text" id="new-avatar-url" placeholder="可选">
                </div>
                <div class="modal-buttons">
                    <button type="submit">确定</button>
                    <button type="button" onclick="this.closest('.modal').remove()">取消</button>
                </div>
            </form>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(modal);
    
    // 关闭按钮事件
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // 表单提交事件
    const form = modal.querySelector('#add-character-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 获取表单数据
        const name = document.getElementById('new-name').value;
        const martialArt = document.getElementById('new-martial-art').value;
        const level = parseInt(document.getElementById('new-level').value);
        const bgUrl = document.getElementById('new-bg-url').value;
        const avatarUrl = document.getElementById('new-avatar-url').value;
        
        // 创建新成员
        const newMember = {
            id: Date.now().toString(),
            name,
            martialArt,
            level,
            bg: bgUrl || '',
            avatar: avatarUrl || '',
            position: martialArt,
            job: `等级: ${level}`
        };
        
        // 添加到成员列表
        members.push(newMember);
        saveToLocalStorage();
        renderMembers();
        
        // 选择新添加的成员
        selectMember(newMember);
        
        // 关闭模态框
        modal.remove();
    });
}

// 保存数据到本地存储
function saveToLocalStorage() {
    const data = {
        siteTitle: document.getElementById('site-title').textContent,
        bannerTitle: document.getElementById('banner-title').textContent,
        bannerText: document.getElementById('banner-text').textContent,
        backgroundImage: document.querySelector('.banner').style.backgroundImage,
        aboutContent: document.getElementById('about-content').innerHTML,
        activitiesContent: document.getElementById('activities-content').innerHTML,
        members: members
    };
    localStorage.setItem('communityWebsiteData', JSON.stringify(data));
}

// 从本地存储加载数据
function loadFromLocalStorage() {
    const data = localStorage.getItem('communityWebsiteData');
    if (data) {
        const parsedData = JSON.parse(data);
        
        // 恢复网站标题
        if (parsedData.siteTitle) {
            document.getElementById('site-title').textContent = parsedData.siteTitle;
            document.title = parsedData.siteTitle;
        }
        
        // 恢复横幅内容
        if (parsedData.bannerTitle) {
            document.getElementById('banner-title').textContent = parsedData.bannerTitle;
        }
        if (parsedData.bannerText) {
            document.getElementById('banner-text').textContent = parsedData.bannerText;
        }
        if (parsedData.backgroundImage) {
            document.querySelector('.banner').style.backgroundImage = parsedData.backgroundImage;
        }
        
        // 恢复内容
        if (parsedData.aboutContent) {
            document.getElementById('about-content').innerHTML = parsedData.aboutContent;
        }
        if (parsedData.activitiesContent) {
            document.getElementById('activities-content').innerHTML = parsedData.activitiesContent;
        }
        
        // 恢复成员
        if (parsedData.members) {
            members = parsedData.members;
            renderMembers();
        }
    }
}

// 初始化默认成员数据
function initDefaultMembers() {
    if (members.length === 0) {
        members = [
        ];
        renderMembers();
        saveToLocalStorage();
    }
}

// 关闭模态框事件监听
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        cancelEdit();
    }
    if (e.target === memberModal) {
        cancelMemberEdit();
    }
});

// 关闭按钮事件监听
editClose.addEventListener('click', cancelEdit);
memberClose.addEventListener('click', cancelMemberEdit);

// 登录功能
function showLoginModal() {
    loginModal.style.display = 'block';
    loginModalMode = 'login';
    showLoginForm();
}

function hideLoginModal() {
    loginModal.style.display = 'none';
}

// 切换到登录表单
function showLoginForm() {
    document.getElementById('modal-title').textContent = '百业内部管理系统 - 登录';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-tab').classList.add('active');
    document.getElementById('register-tab').classList.remove('active');
}

// 切换到注册表单
function showRegisterForm() {
    document.getElementById('modal-title').textContent = '百业内部管理系统 - 注册';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('login-tab').classList.remove('active');
    document.getElementById('register-tab').classList.add('active');
}

// 登录表单提交
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('login-name').value;
    const martialArt = document.getElementById('login-martial-art').value;
    const level = parseInt(document.getElementById('login-level').value);
    const password = document.getElementById('login-password').value;
    
    // 验证用户是否已注册
    const registeredUser = users.find(user => 
        user.name === name && 
        user.martialArt === martialArt && 
        user.level === level
    );
    
    if (registeredUser) {
        // 检查密码是否匹配
        if (registeredUser.password && registeredUser.password !== password) {
            alert('密码错误！');
            return;
        }
        
        // 登录成功
        currentUser = {
            name,
            martialArt,
            level,
            role: registeredUser.role || 'member'
        };
        hideLoginModal();
        loginForm.reset();
        
        // 显示角色选择模态框
        showRoleSelectModal();
        
        // 更新权限显示
        updatePermissionDisplay();
        
        // 更新导航栏和功能显示
        updateNavigationAndFeatures();
        
        // 保存当前用户到本地存储
        saveCurrentUser();
    } else {
        // 登录失败
        alert('未找到用户名，请先注册！');
    }
});

// 注册表单提交
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const martialArt = document.getElementById('register-martial-art').value;
    const level = parseInt(document.getElementById('register-level').value);
    const description = document.getElementById('register-desc').value;
    
    // 检查用户是否已存在
    const existingUser = users.find(user => 
        user.name === name && 
        user.martialArt === martialArt
    );
    
    if (existingUser) {
        alert('该用户已存在，请使用其他信息注册！');
        return;
    }
    
    // 创建新用户
    const newUser = {
        name,
        martialArt,
        level,
        description,
        role: 'member' // 默认角色为成员
    };
    
    // 添加到用户列表
    users.push(newUser);
    
    // 同时添加到百业人员列表
    const newMember = {
        id: Date.now().toString(),
        name: newUser.name,
        position: newUser.martialArt,
        job: '成员',
        level: newUser.level,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name)}&background=3498db&color=fff&size=250`,
        bg: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&h=1080&fit=crop',
        desc: newUser.description
    };
    members.push(newMember);
    
    // 保存到本地存储
    saveToLocalStorage();
    
    // 更新百业人员列表显示
    renderMembers();
    
    // 注册成功，跳转到登录页面并填充表单
    showLoginForm();
    
    // 填充登录表单
    document.getElementById('login-name').value = name;
    document.getElementById('login-martial-art').value = martialArt;
    document.getElementById('login-level').value = level;
    
    alert('注册成功，请登录！');
});

// 更新登录后的UI
function updateUIAfterLogin() {
    loginBtnContainer.style.display = 'none';
    userInfo.style.display = 'flex';
    currentUserSpan.textContent = `${currentUser.name} (${currentUser.role === 'chief' ? '社主' : currentUser.role === 'admin' ? '管理员' : '成员'})`;
}

// 退出登录
function logout() {
    currentUser = null;
    loginBtnContainer.style.display = 'flex';
    userInfo.style.display = 'none';
    // 退出管理中心
    adminCenter.style.display = 'none';
    updatePermissionDisplay();
    updateNavigationAndFeatures();
    saveCurrentUser();
}

// 更新导航栏和功能显示
function updateNavigationAndFeatures() {
    const isLoggedIn = !!currentUser;
    const hasAdminPermission = currentUser && (currentUser.role === 'chief' || currentUser.role === 'admin');
    
    // 控制导航栏中的设置链接
    const settingsLink = document.getElementById('settings-btn-container');
    if (settingsLink) {
        settingsLink.style.display = hasAdminPermission ? 'flex' : 'none';
    }
    
    // 控制添加成员按钮
    const addBtn = document.getElementById('add-character-btn');
    if (addBtn) {
        addBtn.style.display = hasAdminPermission ? 'block' : 'none';
    }
    
    // 控制设置页面
    const settingsSection = document.getElementById('settings');
    if (settingsSection) {
        settingsSection.style.display = hasAdminPermission ? 'block' : 'none';
    }
}

// 显示管理员中心页面
function showAdminCenter() {
    // 阻止默认跳转
    event.preventDefault();
    
    // 检查是否已登录
    if (!currentUser) {
        // 未登录，显示登录模态框
        showLoginModal();
        return;
    }
    
    // 检查是否有管理权限
    if (currentUser.role !== 'chief' && currentUser.role !== 'admin') {
        alert('您没有权限访问管理中心！');
        return;
    }
    
    // 显示管理中心
    adminCenter.style.display = 'block';
    
    // 切换到管理员列表（管理中心首页）
    showAdminList();
    
    // 滚动到管理中心
    adminCenter.scrollIntoView({ behavior: 'smooth' });
}

// 页面加载时更新导航栏和功能显示
document.addEventListener('DOMContentLoaded', () => {
    updateNavigationAndFeatures();
});

// DOM元素
const roleSelectModal = document.getElementById('role-select-modal');
const passwordModal = document.getElementById('password-modal');
const passwordForm = document.getElementById('password-form');
const passwordModalTitle = document.getElementById('password-modal-title');
const passwordInput = document.getElementById('password-input');
const adminCenter = document.getElementById('admin-center');
const currentRoleSpan = document.getElementById('current-role');
let selectedRole = null;

// 角色密码 - 从localStorage加载或使用默认值
let chiefPassword = localStorage.getItem('chiefPassword') || '88888888';
let adminPassword = localStorage.getItem('adminPassword') || '99999999';

// 显示角色选择模态框
function showRoleSelectModal() {
    roleSelectModal.style.display = 'block';
}

// 隐藏角色选择模态框
function hideRoleSelectModal() {
    roleSelectModal.style.display = 'none';
}

// 显示密码验证模态框
function showPasswordModal(role) {
    selectedRole = role;
    if (role === 'chief') {
        passwordModalTitle.textContent = '社主密码验证';
    } else if (role === 'admin') {
        passwordModalTitle.textContent = '管理员密码验证';
    }
    passwordModal.style.display = 'block';
}

// 隐藏密码验证模态框
function hidePasswordModal() {
    passwordModal.style.display = 'none';
    passwordInput.value = '';
}

// 取消密码验证
function cancelPassword() {
    hidePasswordModal();
    hideRoleSelectModal();
}

// 处理角色选择
function selectRole(role) {
    if (role === 'chief') {
        // 社主需要密码验证
        showPasswordModal(role);
    } else if (role === 'member') {
        // 社众不需要密码，直接进入
        enterAdminCenter(role);
        hideRoleSelectModal();
    } else {
        // 管理员需要密码验证
        showPasswordModal(role);
    }
}

// 密码验证表单提交
passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const password = passwordInput.value;
    let isPasswordCorrect = false;
    
    if (selectedRole === 'chief' && password === chiefPassword) {
        isPasswordCorrect = true;
    } else if (selectedRole === 'admin' && password === adminPassword) {
        isPasswordCorrect = true;
    }
    
    if (isPasswordCorrect) {
        // 检查当前用户是否已存在于社主列表
        const isAlreadyChief = chiefs.some(chief => chief.name === currentUser.name);
        
        // 如果是社主角色且社主数量已满且当前用户不是社主，则拒绝登录
        if (selectedRole === 'chief' && !isAlreadyChief && chiefs.length >= 2) {
            alert('社主职位已满，最多只能有两名社主！登录失败！');
            hidePasswordModal();
            return;
        }
        
        enterAdminCenter(selectedRole);
        hidePasswordModal();
        hideRoleSelectModal();
    } else {
        alert('密码错误！');
    }
});

// 进入管理中心
function enterAdminCenter(role) {
    currentUser.role = role;
    
    // 所有角色登录时都同步信息到百业人员列表
    // 检查用户是否已存在于百业人员列表中
    const isUserExistInMembers = members.some(member => member.name === currentUser.name);
    if (!isUserExistInMembers) {
        // 创建新成员
        const newMember = {
            id: Date.now().toString(),
            name: currentUser.name,
            martialArt: currentUser.martialArt,
            level: currentUser.level,
            bg: '',
            avatar: '',
            position: currentUser.martialArt,
            job: `等级: ${currentUser.level}`
        };
        
        // 添加到成员列表
        members.push(newMember);
        saveToLocalStorage();
        renderMembers();
    }
    
    // 检查社主数量
    if (role === 'chief') {
        // 计算不包括当前用户的社主数量
        const currentChiefsCount = chiefs.filter(chief => chief.name !== currentUser.name).length;
        
        // 如果社主数量已满（不包括当前用户），则拒绝登录
        if (currentChiefsCount >= 2) {
            alert('社主职位已满，最多只能有两名社主！登录失败！');
            currentUser.role = 'member'; // 降级为社众
            updateUIAfterLogin();
            return; // 终止登录流程
        }
    }
    
    // 移除用户在其他角色数组中的身份，确保只有一个角色
    // 从社主列表中移除
    chiefs = chiefs.filter(chief => chief.name !== currentUser.name);
    // 从管理员列表中移除
    admins = admins.filter(admin => admin.name !== currentUser.name);
    
    // 根据选择的角色添加到对应的列表
        if (role === 'admin') {
            // 管理员信息同步到管理员列表
            admins.push({
                name: currentUser.name,
                martialArt: currentUser.martialArt,
                level: currentUser.level
            });
        } else if (role === 'chief') {
            // 社主信息同步到社主列表
            chiefs.push({
                name: currentUser.name,
                martialArt: currentUser.martialArt,
                level: currentUser.level
            });
        }
    // 保存修改到本地存储
    saveToLocalStorage();
    
    // 更新权限显示
    updatePermissionDisplay();
    
    // 更新导航栏和功能显示
    updateNavigationAndFeatures();
    
    // 更新登录后的UI，显示正确职位
    updateUIAfterLogin();
    
    if (role === 'member') {
        // 社众不进入管理中心
        return;
    }
    
    // 更新当前角色显示
    currentRoleSpan.textContent = `${currentUser.name} (${role === 'chief' ? '社主' : '管理员'})`;
    
    // 显示管理中心
    adminCenter.style.display = 'block';
    
    // 刷新所有管理列表
    refreshChiefList();
    refreshAdminList();
    refreshMemberList();
    
    // 滚动到管理中心
    adminCenter.scrollIntoView({ behavior: 'smooth' });
}

// 退出管理中心
function exitAdminCenter() {
    adminCenter.style.display = 'none';
    // 不修改用户角色，保持原有权限
    updateUIAfterLogin();
}

// 显示社主列表
function showChiefList() {
    // 隐藏其他部分
    document.getElementById('chief-list-section').style.display = 'block';
    document.getElementById('admin-list-section').style.display = 'none';
    document.getElementById('member-list-section').style.display = 'none';
    document.getElementById('settings-section').style.display = 'none';
    document.getElementById('account-settings-section').style.display = 'none';
    
    // 刷新列表
    refreshChiefList();
}

// 显示管理员列表
function showAdminList() {
    // 隐藏其他部分
    document.getElementById('chief-list-section').style.display = 'none';
    document.getElementById('admin-list-section').style.display = 'block';
    document.getElementById('member-list-section').style.display = 'none';
    document.getElementById('settings-section').style.display = 'none';
    document.getElementById('account-settings-section').style.display = 'none';
    
    // 刷新列表
    refreshAdminList();
}

// 显示成员列表
function showMemberList() {
    // 隐藏其他部分
    document.getElementById('chief-list-section').style.display = 'none';
    document.getElementById('admin-list-section').style.display = 'none';
    document.getElementById('member-list-section').style.display = 'block';
    document.getElementById('settings-section').style.display = 'none';
    document.getElementById('account-settings-section').style.display = 'none';
    
    // 刷新列表
    refreshMemberList();
}

// 显示设置页面
function showSettings() {
    // 隐藏其他部分
    document.getElementById('chief-list-section').style.display = 'none';
    document.getElementById('admin-list-section').style.display = 'none';
    document.getElementById('member-list-section').style.display = 'none';
    document.getElementById('settings-section').style.display = 'block';
    document.getElementById('account-settings-section').style.display = 'none';
}

// 跳转到指定section
function goToSection(sectionId) {
    // 隐藏管理中心
    adminCenter.style.display = 'none';
    
    // 平滑滚动到指定section
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// 照片轮播相关变量
let photos = [];
let currentPhotoIndex = 0;
let photoCarouselInterval;

// 初始化照片轮播
document.addEventListener('DOMContentLoaded', () => {
    // 从本地存储加载照片
    loadPhotosFromStorage();
    
    // 如果没有照片，添加一些默认照片
    if (photos.length === 0) {
        photos = [
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&h=1080&fit=crop',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1920&h=1080&fit=crop',
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop'
        ];
        savePhotosToStorage();
    }
    
    // 渲染照片
    renderPhotos();
    
    // 启动自动轮播
    startPhotoCarousel();

// 更新权限检查逻辑，确保社团宣传和社团活动只能由社主和管理员编辑
    // 确保社团宣传和社团活动只能由社主和管理员编辑
    const aboutEditBtn = document.querySelector('#about .edit-btn');
    const activitiesEditBtn = document.querySelector('#activities .edit-btn');
    
    if (aboutEditBtn) {
        aboutEditBtn.onclick = function() {
            if (hasPermission('edit-activities')) {
                editSection('about-content');
            } else {
                alert('您没有权限编辑社团宣传！');
            }
        };
    }
    
    if (activitiesEditBtn) {
        activitiesEditBtn.onclick = function() {
            if (hasPermission('edit-activities')) {
                editSection('activities-content');
            } else {
                alert('您没有权限编辑社团活动！');
            }
        };
    }
});

// 刷新社主列表
function refreshChiefList() {
    const chiefListContent = document.getElementById('chief-list-content');
    chiefListContent.innerHTML = '';
    
    // 过滤出社主
    const chiefMembers = members.filter(member => 
        chiefs.some(chief => chief.name === member.name)
    );
    
    if (chiefMembers.length === 0) {
        chiefListContent.innerHTML = '<p>暂无社主</p>';
        return;
    }
    
    chiefMembers.forEach(member => {
        const listItem = document.createElement('div');
        listItem.className = 'member-list-item';
        
        // 只有社主才能看到编辑按钮
        const isChief = currentUser && currentUser.role === 'chief';
        const actionsHTML = isChief ? `
            <div class="member-actions">
                <button class="demote-btn" onclick="demoteChiefToAdmin('${member.id}')">降为管理员</button>
                <button class="kick-btn" onclick="kickMember('${member.id}')">踢出</button>
            </div>
        ` : '';
        
        listItem.innerHTML = `
            <div class="member-info">
                <div class="member-name">${member.name}</div>
                <div class="member-details">职位: ${member.position} | 职业: ${member.job} | 武学: ${member.martialArt || '未知'} | 等级: ${member.level || 1}</div>
            </div>
            ${actionsHTML}
        `;
        
        chiefListContent.appendChild(listItem);
    });
}

// 刷新管理员列表
function refreshAdminList() {
    const adminListContent = document.getElementById('admin-list-content');
    adminListContent.innerHTML = '';
    
    // 过滤出管理员
    const adminMembers = members.filter(member => 
        admins.some(admin => admin.name === member.name)
    );
    
    if (adminMembers.length === 0) {
        adminListContent.innerHTML = '<p>暂无管理员</p>';
        return;
    }
    
    adminMembers.forEach(member => {
        const listItem = document.createElement('div');
        listItem.className = 'member-list-item';
        
        listItem.innerHTML = `
            <div class="member-info">
                <div class="member-name">${member.name}</div>
                <div class="member-details">职位: ${member.position} | 职业: ${member.job} | 武学: ${member.martialArt || '未知'} | 等级: ${member.level || 1}</div>
            </div>
            <div class="member-actions">
                <button class="demote-btn" onclick="demoteToMember('${member.id}')">降为社众</button>
                <button class="kick-btn" onclick="kickMember('${member.id}')">踢出</button>
            </div>
        `;
        
        adminListContent.appendChild(listItem);
    });
}

// 刷新成员列表
function refreshMemberList() {
    const memberListContent = document.getElementById('member-list-content');
    memberListContent.innerHTML = '';
    
    // 过滤出社众（非管理员）
    const regularMembers = members.filter(member => 
        !admins.some(admin => admin.name === member.name) &&
        !chiefs.some(chief => chief.name === member.name)
    );
    
    if (regularMembers.length === 0) {
        memberListContent.innerHTML = '<p>暂无社众</p>';
        return;
    }
    
    regularMembers.forEach(member => {
        const listItem = document.createElement('div');
        listItem.className = 'member-list-item';
        
        listItem.innerHTML = `
            <div class="member-info">
                <div class="member-name">${member.name}</div>
                <div class="member-details">职位: ${member.position} | 职业: ${member.job} | 武学: ${member.martialArt || '未知'} | 等级: ${member.level || 1}</div>
            </div>
            <div class="member-actions">
                ${currentUser.role === 'chief' ? `<button class="promote-btn" onclick="promoteToAdmin('${member.id}')">提升为管理员</button>` : ''}
                <button class="kick-btn" onclick="kickMember('${member.id}')">踢出</button>
            </div>
        `;
        
        memberListContent.appendChild(listItem);
    });
}

// 提升为管理员
function promoteToAdmin(memberId) {
    const member = members.find(m => m.id === memberId);
    if (member) {
        // 检查是否已经是管理员
        if (!admins.some(admin => admin.name === member.name)) {
            admins.push({
                name: member.name,
                martialArt: member.martialArt || '未知',
                level: member.level || 1
            });
            saveToLocalStorage();
            refreshAdminList();
            refreshMemberList();
            renderMembers();
            alert(`${member.name} 已提升为管理员！`);
        }
    }
}

// 将社主降为管理员
function demoteChiefToAdmin(memberId) {
    const member = members.find(m => m.id === memberId);
    if (member) {
        // 从社主列表中移除
        chiefs = chiefs.filter(chief => chief.name !== member.name);
        // 添加到管理员列表
        admins.push({
            name: member.name,
            martialArt: member.martialArt || '未知',
            level: member.level || 1
        });
        saveToLocalStorage();
        refreshChiefList();
        refreshAdminList();
        refreshMemberList();
        renderMembers();
        alert(`${member.name} 已降为管理员！`);
    }
}

// 降级为社众
function demoteToMember(memberId) {
    const member = members.find(m => m.id === memberId);
    if (member) {
        // 从管理员列表中移除
        admins = admins.filter(admin => admin.name !== member.name);
        saveToLocalStorage();
        refreshAdminList();
        refreshMemberList();
        renderMembers();
        alert(`${member.name} 已降为社众！`);
    }
}

// 踢出成员
function kickMember(memberId) {
    if (confirm('确定要踢出这个成员吗？')) {
        const member = members.find(m => m.id === memberId);
        if (member) {
            // 从成员列表中移除
            members = members.filter(m => m.id !== memberId);
            // 从管理员列表中移除
            admins = admins.filter(admin => admin.name !== member.name);
            // 从社主列表中移除
            chiefs = chiefs.filter(chief => chief.name !== member.name);
            
            saveToLocalStorage();
            refreshAdminList();
            refreshMemberList();
            renderMembers();
            alert(`${member.name} 已被踢出！`);
        }
    }
}

// 关闭模态框事件监听
const roleSelectClose = roleSelectModal.querySelector('.close');
const passwordCloseBtn = passwordModal.querySelector('.close');

if (roleSelectClose) {
    roleSelectClose.addEventListener('click', hideRoleSelectModal);
}

if (passwordCloseBtn) {
    passwordCloseBtn.addEventListener('click', hidePasswordModal);
}

// 点击模态框外部关闭
window.addEventListener('click', (e) => {
    if (e.target === roleSelectModal) {
        hideRoleSelectModal();
    }
    if (e.target === passwordModal) {
        hidePasswordModal();
    }
});

// 权限检查函数
function hasPermission(action) {
    if (!currentUser) return false;
    
    switch (action) {
        case 'edit-all': // 社主权限
            return currentUser.role === 'chief';
        case 'edit-activities': // 管理员和社主权限
            return currentUser.role === 'chief' || currentUser.role === 'admin';
        case 'edit-member-bg': // 管理员和社主权限
            return currentUser.role === 'chief' || currentUser.role === 'admin';
        default:
            return false;
    }
}

// 更新权限显示
function updatePermissionDisplay() {
    // 检查是否登录
    const isLoggedIn = !!currentUser;
    
    // 为所有编辑按钮添加权限控制
    const editButtons = document.querySelectorAll('.edit-btn, .add-btn, .action-btn');
    editButtons.forEach(btn => {
        const parent = btn.closest('section') || btn.closest('.container') || btn.closest('footer');
        if (parent) {
            if (!isLoggedIn || 
                (parent.id === 'settings' && !hasPermission('edit-activities')) ||
                (parent.id === 'about' && !hasPermission('edit-activities')) ||
                (parent.id === 'footer' && !hasPermission('edit-all')) ||
                (parent.id === 'members' && 
                 (!hasPermission('edit-all') && !hasPermission('edit-member-bg'))) ||
                (parent.id === 'activities' && !hasPermission('edit-activities'))) {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'block';
            }
        }
    });
}

// 角色管理功能
function showRoleManagement() {
    if (!hasPermission('edit-all')) {
        alert('只有社主可以管理角色！');
        return;
    }
    
    renderChiefsList();
    renderAdminsList();
    roleModal.style.display = 'block';
}

function closeRoleModal() {
    roleModal.style.display = 'none';
}

// 渲染社主列表
function renderChiefsList() {
    const chiefsList = document.getElementById('chiefs-list');
    chiefsList.innerHTML = '';
    
    chiefs.forEach(chief => {
        const chiefItem = document.createElement('div');
        chiefItem.className = 'role-item';
        chiefItem.innerHTML = `
            <div class="role-info">
                <strong>${chief.name}</strong> - ${chief.martialArt} (等级: ${chief.level})
            </div>
            <div class="role-actions">
                <button class="remove-role-btn" onclick="removeChief('${chief.name}')">移除社主</button>
            </div>
        `;
        chiefsList.appendChild(chiefItem);
    });
    
    if (chiefs.length === 0) {
        chiefsList.innerHTML = '<p>暂无社主</p>';
    }
}

// 渲染管理员列表
function renderAdminsList() {
    const adminsList = document.getElementById('admins-list');
    adminsList.innerHTML = '';
    
    admins.forEach(admin => {
        const adminItem = document.createElement('div');
        adminItem.className = 'role-item';
        adminItem.innerHTML = `
            <div class="role-info">
                <strong>${admin.name}</strong> - ${admin.martialArt} (等级: ${admin.level})
            </div>
            <div class="role-actions">
                <button class="remove-role-btn" onclick="removeAdmin('${admin.name}')">移除管理员</button>
            </div>
        `;
        adminsList.appendChild(adminItem);
    });
    
    if (admins.length === 0) {
        adminsList.innerHTML = '<p>暂无管理员</p>';
    }
}

// 添加社主
function addChief() {
    if (chiefs.length >= 2) {
        alert('社主职位已满，最多只能有两名社主！');
        return;
    }
    
    showSelectMemberModal('chief');
}

// 添加管理员
function addAdmin() {
    showSelectMemberModal('admin');
}

// 显示选择成员模态框
function showSelectMemberModal(mode) {
    loginModalMode = mode;
    document.getElementById('select-member-title').textContent = mode === 'chief' ? '选择成员作为社主' : '选择成员作为管理员';
    
    const availableMembers = document.getElementById('available-members');
    availableMembers.innerHTML = '';
    
    // 获取所有成员（排除已有的社主和管理员）
    const existingRoleNames = [...chiefs, ...admins].map(user => user.name);
    const selectableMembers = members.filter(member => !existingRoleNames.includes(member.name));
    
    selectableMembers.forEach(member => {
        const memberOption = document.createElement('div');
        memberOption.className = 'member-option';
        memberOption.innerHTML = `
            <h5>${member.name}</h5>
            <p>职位: ${member.position} | 职业: ${member.job}</p>
        `;
        memberOption.addEventListener('click', () => {
            // 为成员添加角色
            const user = {
                name: member.name,
                martialArt: '未知',
                level: 1
            };
            
            if (mode === 'chief') {
                // 检查社主数量
                if (chiefs.length >= 2) {
                    alert('社主职位已满，最多只能有两名社主！');
                    return;
                }
                chiefs.push(user);
            } else {
                admins.push(user);
            }
            
            saveToLocalStorage();
            renderChiefsList();
            renderAdminsList();
            closeSelectMemberModal();
        });
        availableMembers.appendChild(memberOption);
    });
    
    if (selectableMembers.length === 0) {
        availableMembers.innerHTML = '<p>没有可选择的成员</p>';
    }
    
    selectMemberModal.style.display = 'block';
}

function closeSelectMemberModal() {
    selectMemberModal.style.display = 'none';
}

// 移除社主
function removeChief(name) {
    chiefs = chiefs.filter(chief => chief.name !== name);
    saveToLocalStorage();
    renderChiefsList();
}

// 移除管理员
function removeAdmin(name) {
    admins = admins.filter(admin => admin.name !== name);
    saveToLocalStorage();
    renderAdminsList();
}

// 音频相关配置应用
function applyConfig() {
    if (typeof CONFIG !== 'undefined') {
        // 设置音频源
        const bgMusicSource = document.getElementById('backgroundAudioSource');
        const bgMusic = document.getElementById('backgroundAudio');
        if (bgMusicSource && bgMusic) {
            bgMusicSource.src = CONFIG.audio.backgroundMusic;
            backgroundMusic: "https://s3plus.meituan.net/opapisdk/op_ticket_885190757_1758424375681_qdqqd_t01hdm.mp3", // 默认音频URL，可以通过设置页面修改
            bgMusic.load(); // 重新加载音频
            console.log('音频源已设置:', CONFIG.audio.backgroundMusic);
        }

        // 音乐播放器样式配置
        const styleSheet = document.getElementById('dynamic-config-styles');
        if (styleSheet) {
            styleSheet.remove();
        }
        
        const newStyleSheet = document.createElement('style');
        newStyleSheet.id = 'dynamic-config-styles';
        const cssRules = `
            /* 音乐播放器样式 */
            .audio-player {
                background: ${CONFIG.audio.playerColors.background} !important;
            }
            
            .audio-player:hover {
                background: ${CONFIG.audio.playerColors.backgroundHover} !important;
            }
            
            .audio-player__toggle-btn {
                background: ${CONFIG.audio.playerColors.playButton} !important;
            }
            
            .audio-player__toggle-btn.playing {
                background: ${CONFIG.audio.playerColors.pauseButton} !important;
            }
        `;
        newStyleSheet.textContent = cssRules;
        document.head.appendChild(newStyleSheet);
    }
}

// 音乐播放器初始化
function initializeApp() {
    // 初始化音乐播放器
    new MusicPlayer();
    
    // 处理用户交互后的自动播放
    document.addEventListener('click', () => {
        const bgMusic = document.getElementById('backgroundAudio');
        if (bgMusic && bgMusic.paused) {
            bgMusic.play().catch(error => {
                console.log("用户交互后播放失败:", error);
            });
        }
    }, { once: true });
}

// 音乐播放器类
class MusicPlayer { 
    constructor() { 
        this.bgMusic = document.getElementById('backgroundAudio'); 
        this.musicIcon = document.getElementById('audioToggleBtn'); 
        this.volumeInput = document.getElementById('audioVolumeSlider'); 
        this.isPlaying = false; 
        this.volume = 0.3; 
        this.init(); 
    } 

    init() { 
        // 从配置文件获取设置 
        if (typeof CONFIG !== 'undefined') { 
            this.volume = CONFIG.audio.defaultVolume; 
            this.bgMusic.loop = CONFIG.audio.loop; 
            this.volumeInput.value = this.volume; 
        } 
        
        this.bgMusic.volume = this.volume; 
        this.bindEvents(); 
        
        // 根据配置决定是否自动播放 
        if (typeof CONFIG === 'undefined' || CONFIG.audio.autoPlay) { 
            this.tryAutoPlay(); 
        } 
        
        // 添加用户交互监听器，以应对浏览器自动播放限制 
        this.addUserInteractionListener(); 
    } 
    
    addUserInteractionListener() { 
        const startPlayOnInteraction = () => { 
            if (!this.isPlaying && (typeof CONFIG === 'undefined' || CONFIG.audio.autoPlay)) { 
                this.tryAutoPlay(); 
            } 
            // 移除监听器，只需要一次用户交互 
            document.removeEventListener('click', startPlayOnInteraction); 
            document.removeEventListener('keydown', startPlayOnInteraction); 
            document.removeEventListener('touchstart', startPlayOnInteraction); 
        }; 
        
        // 监听用户的第一次交互 
        document.addEventListener('click', startPlayOnInteraction); 
        document.addEventListener('keydown', startPlayOnInteraction); 
        document.addEventListener('touchstart', startPlayOnInteraction); 
    } 

    bindEvents() { 
        this.musicIcon.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            this.toggleMusic(); 
        }); 

        this.volumeInput.addEventListener('input', () => { 
            this.updateVolume(); 
        }); 

        this.volumeInput.addEventListener('click', (e) => { 
            e.stopPropagation(); 
        }); 

        this.bgMusic.addEventListener('play', () => { 
            this.isPlaying = true; 
            this.updateIcon(); 
        }); 

        this.bgMusic.addEventListener('pause', () => { 
            this.isPlaying = false; 
            this.updateIcon(); 
        }); 

        this.bgMusic.addEventListener('ended', () => { 
            this.isPlaying = false; 
            this.updateIcon(); 
        }); 

        this.bgMusic.addEventListener('canplaythrough', () => { 
            this.tryAutoPlay(); 
        }); 
    } 

    async tryAutoPlay() { 
        // 检查配置是否允许自动播放 
        if (typeof CONFIG !== 'undefined' && !CONFIG.audio.autoPlay) { 
            console.log('配置禁用了自动播放'); 
            return; 
        } 
        
        try { 
            // 确保音频已加载 
            if (this.bgMusic.readyState >= 2) { 
                await this.bgMusic.play(); 
                this.isPlaying = true; 
                this.updateIcon(); 
                console.log('自动播放成功，图标已更新'); 
            } else { 
                console.log('音频尚未加载完成，等待加载'); 
            } 
        } catch (error) { 
            console.error("自动播放失败:", error); 
            console.log("可能的原因：浏览器阻止了自动播放，需要用户交互"); 
            this.isPlaying = false; 
            this.updateIcon(); 
        } 
    } 

    async toggleMusic() { 
        if (!this.bgMusic) return; 
        
        try { 
            if (this.isPlaying) { 
                await this.bgMusic.pause(); 
            } else { 
                await this.bgMusic.play(); 
            } 
        } catch (error) { 
            console.error("播放控制失败:", error); 
        } 
    } 

    updateVolume() { 
        this.volume = parseFloat(this.volumeInput.value); 
        if (this.bgMusic) { 
            this.bgMusic.volume = this.volume; 
        } 
    } 

    updateIcon() { 
        // 获取图标元素（可能是play-icon或pause-icon） 
        let iconElement = this.musicIcon.querySelector('.audio-player__play-icon') || this.musicIcon.querySelector('.audio-player__pause-icon'); 
        
        if (!iconElement) { 
            // 如果没有找到图标元素，创建一个 
            iconElement = document.createElement('span'); 
            iconElement.className = 'audio-player__play-icon'; 
            this.musicIcon.appendChild(iconElement); 
        } 
        
        if (this.isPlaying) { 
            // 播放中：显示暂停图标 
            this.musicIcon.classList.add('playing'); 
            iconElement.textContent = '⏸'; 
            iconElement.className = 'audio-player__pause-icon'; 
            console.log('音乐播放器图标已更新为暂停状态'); 
        } else { 
            // 暂停中：显示播放图标 
            this.musicIcon.classList.remove('playing'); 
            iconElement.textContent = '▶'; 
            iconElement.className = 'audio-player__play-icon'; 
            console.log('音乐播放器图标已更新为播放状态'); 
        } 
    } 
} 

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    applyConfig();
});

// 更新保存到本地存储的函数
function saveToLocalStorage() {
    const data = {
        siteTitle: document.getElementById('site-title').textContent,
        siteLogo: document.getElementById('site-logo').src,
        bannerTitle: document.getElementById('banner-title').textContent,
        bannerText: document.getElementById('banner-text').textContent,
        backgroundImage: document.querySelector('.banner').style.backgroundImage,
        aboutContent: document.getElementById('about-content').innerHTML,
        activitiesContent: document.getElementById('activities-content').innerHTML,
        footerContent: document.getElementById('footer-content').innerHTML,
        previewContent: document.getElementById('preview-content').innerHTML,
        members: members,
        chiefs: chiefs,
        admins: admins,
        users: users,
        douyinVideoUrl: document.getElementById('video-url')?.value || ''
    };
    localStorage.setItem('communityWebsiteData', JSON.stringify(data));
}

// 更新从本地存储加载的函数
function loadFromLocalStorage() {
    const data = localStorage.getItem('communityWebsiteData');
    if (data) {
        const parsedData = JSON.parse(data);
        
        // 恢复网站标题
        if (parsedData.siteTitle) {
            document.getElementById('site-title').textContent = parsedData.siteTitle;
            document.title = parsedData.siteTitle;
        }
        
        // 恢复网站logo
        if (parsedData.siteLogo) {
            document.getElementById('site-logo').src = parsedData.siteLogo;
        }
        
        // 恢复横幅内容
        if (parsedData.bannerTitle) {
            document.getElementById('banner-title').textContent = parsedData.bannerTitle;
        }
        if (parsedData.bannerText) {
            document.getElementById('banner-text').textContent = parsedData.bannerText;
        }
        if (parsedData.backgroundImage) {
            document.querySelector('.banner').style.backgroundImage = parsedData.backgroundImage;
        }
        
        // 恢复内容
        if (parsedData.aboutContent) {
            document.getElementById('about-content').innerHTML = parsedData.aboutContent;
        }
        if (parsedData.activitiesContent) {
            document.getElementById('activities-content').innerHTML = parsedData.activitiesContent;
        }
        if (parsedData.footerContent) {
            document.getElementById('footer-content').innerHTML = parsedData.footerContent;
        }
        // 恢复版本前瞻内容
        if (parsedData.previewContent) {
            document.getElementById('preview-content').innerHTML = parsedData.previewContent;
            // 同步到网站设置中的文本框
            const previewTextarea = document.getElementById('preview-content-textarea');
            if (previewTextarea) {
                previewTextarea.value = parsedData.previewContent;
            }
        }
        
        // 恢复成员
        if (parsedData.members) {
            members = parsedData.members;
            renderMembers();
        }
        
        // 恢复社主和管理员
        if (parsedData.chiefs !== undefined) {
            chiefs = parsedData.chiefs;
        }
        if (parsedData.admins !== undefined) {
            admins = parsedData.admins;
        }
        
        // 恢复用户列表
        if (parsedData.users !== undefined) {
            users = parsedData.users;
        }
        
        // 恢复抖音视频URL
        if (parsedData.douyinVideoUrl) {
            const videoUrlInput = document.getElementById('video-url');
            if (videoUrlInput) {
                videoUrlInput.value = parsedData.douyinVideoUrl;
            }
            
            // 直接加载视频，不依赖loadDouyinVideo函数的权限检查
            const videoIframe = document.getElementById('douyin-video');
            if (videoIframe && parsedData.douyinVideoUrl) {
                try {
                    let videoId;
                    const videoUrl = parsedData.douyinVideoUrl;
                    
                    // 解析抖音视频链接，提取视频ID
                    if (videoUrl.includes('douyin.com/video/')) {
                        // https://www.douyin.com/video/xxxxxxxxxxxxx 格式
                        videoId = videoUrl.split('video/')[1].split('?')[0];
                    } else if (videoUrl.includes('v.douyin.com/')) {
                        // 短链接格式暂时不处理，需要服务器支持
                        videoId = null;
                    }
                    
                    if (videoId) {
                        // 生成抖音嵌入链接
                        const embedUrl = `https://open.douyin.com/player/video?vid=${videoId}&autoplay=0`;
                        videoIframe.src = embedUrl;
                    }
                } catch (error) {
                    console.error('加载抖音视频失败:', error);
                }
            }
        }
    }
}

// 初始化默认社主和管理员
function initDefaultRoles() {
    // 重置社主列表为指定状态
    chiefs = [
        {
            name: '测试1',
            martialArt: '钧钧',
            level: 100
        }
    ];
    
    if (admins.length === 0) {
        // 默认管理员
        admins = [
            {
                name: '测试2',
                martialArt: '钧钧',
                level: 100
            }
        ];
    }
    
    saveToLocalStorage();
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    initDefaultMembers();
    initDefaultRoles();
    
    // 如果已经登录（刷新页面后），恢复登录状态
    if (localStorage.getItem('currentUser')) {
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
        updateUIAfterLogin();
    }
    
    // 更新权限显示（在恢复登录状态后调用）
    updatePermissionDisplay();
    
    // 更新导航栏和功能显示
    updateNavigationAndFeatures();
});

// 保存当前用户到本地存储
function saveCurrentUser() {
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('currentUser');
    }
}

// 监听窗口关闭事件，保存当前用户
window.addEventListener('beforeunload', saveCurrentUser);

// 视频轮播数据
let currentVideoIndex = 0;
let videos = []; // 视频列表

// 初始化视频列表
function initVideos() {
    // 从本地存储加载视频列表
    const savedVideos = localStorage.getItem('videos');
    if (savedVideos) {
        videos = JSON.parse(savedVideos);
    } else {
        // 默认视频列表（可根据需要修改）
        videos = [
            // 可以添加默认视频链接
        ];
    }
}

// 保存视频列表到本地存储
function saveVideos() {
    localStorage.setItem('videos', JSON.stringify(videos));
}

// 抖音视频加载函数
function loadDouyinVideo() {
    // 检查权限，只有社主和管理员才能编辑
    const isEditing = !!document.getElementById('video-url')?.value;
    if (isEditing && (!currentUser || (currentUser.role !== 'chief' && currentUser.role !== 'admin'))) {
        alert('您没有权限编辑视频链接！');
        return;
    }
    
    // 从输入框或localStorage获取视频URL
    let videoUrl = document.getElementById('video-url')?.value || '';
    if (!videoUrl) {
        const savedData = localStorage.getItem('communityWebsiteData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            videoUrl = parsedData.douyinVideoUrl || '';
        }
    }
    
    const videoIframe = document.getElementById('douyin-video');
    
    if (!videoUrl) {
        // 没有视频URL时不显示警报，只返回
        return;
    }
    
    try {
        // 解析抖音视频链接，提取视频ID
        let videoId;
        
        // 处理不同格式的抖音链接
        if (videoUrl.includes('douyin.com/video/')) {
            // https://www.douyin.com/video/xxxxxxxxxxxxx 格式
            videoId = videoUrl.split('video/')[1].split('?')[0];
        } else if (videoUrl.includes('v.douyin.com/')) {
            // https://v.douyin.com/xxxxxx/ 短链接格式
            // 这种格式需要先获取真实链接，但由于浏览器限制，我们只能提示用户使用完整链接
            alert('请使用完整的抖音视频链接，如：https://www.douyin.com/video/xxxxxxxxxxxxx');
            return;
        } else {
            alert('请输入有效的抖音视频链接！');
            return;
        }
        
        // 生成抖音嵌入链接，使用正确的open.douyin.com格式
        const embedUrl = `https://open.douyin.com/player/video?vid=${videoId}&autoplay=0`;
        
        // 设置iframe src
        videoIframe.src = embedUrl;
        
        // 保存视频链接到本地存储
        saveToLocalStorage();
        
        // 如果是新视频，添加到视频列表
        if (!videos.includes(videoUrl)) {
            videos.push(videoUrl);
            currentVideoIndex = videos.length - 1;
            saveVideos(); // 保存视频列表
        }
        
        console.log('抖音视频加载成功：', embedUrl);
    } catch (error) {
        console.error('抖音视频加载失败：', error);
        alert('视频加载失败，请检查链接是否正确！');
    }
}

// 上一个视频
function prevVideo() {
    if (videos.length === 0) {
        alert('暂无视频列表，请先添加视频！');
        return;
    }
    
    currentVideoIndex = (currentVideoIndex - 1 + videos.length) % videos.length;
    const videoUrl = videos[currentVideoIndex];
    
    // 直接加载视频，不通过输入框
    try {
        // 解析抖音视频链接，提取视频ID
        let videoId;
        
        // 处理不同格式的抖音链接
        if (videoUrl.includes('douyin.com/video/')) {
            // https://www.douyin.com/video/xxxxxxxxxxxxx 格式
            videoId = videoUrl.split('video/')[1].split('?')[0];
        } else {
            alert('无效的视频链接格式！');
            return;
        }
        
        // 生成抖音嵌入链接，使用正确的open.douyin.com格式
        const embedUrl = `https://open.douyin.com/player/video?vid=${videoId}&autoplay=0`;
        
        // 设置iframe src
        document.getElementById('douyin-video').src = embedUrl;
        
        console.log('切换到上一个视频：', embedUrl);
    } catch (error) {
        console.error('视频切换失败：', error);
        alert('视频切换失败，请检查链接是否正确！');
    }
}

// 下一个视频
function nextVideo() {
    if (videos.length === 0) {
        alert('暂无视频列表，请先添加视频！');
        return;
    }
    
    currentVideoIndex = (currentVideoIndex + 1) % videos.length;
    const videoUrl = videos[currentVideoIndex];
    
    // 直接加载视频，不通过输入框
    try {
        // 解析抖音视频链接，提取视频ID
        let videoId;
        
        // 处理不同格式的抖音链接
        if (videoUrl.includes('douyin.com/video/')) {
            // https://www.douyin.com/video/xxxxxxxxxxxxx 格式
            videoId = videoUrl.split('video/')[1].split('?')[0];
        } else {
            alert('无效的视频链接格式！');
            return;
        }
        
        // 生成抖音嵌入链接，使用正确的open.douyin.com格式
        const embedUrl = `https://open.douyin.com/player/video?vid=${videoId}&autoplay=0`;
        
        // 设置iframe src
        document.getElementById('douyin-video').src = embedUrl;
        
        console.log('切换到下一个视频：', embedUrl);
    } catch (error) {
        console.error('视频切换失败：', error);
        alert('视频切换失败，请检查链接是否正确！');
    }
}

// 初始化视频列表
initVideos();

// 更新logo
function updateLogo() {
    // 检查权限
    if (!currentUser || (currentUser.role !== 'chief' && currentUser.role !== 'admin')) {
        alert('您没有权限编辑网站logo！');
        return;
    }
    
    const url = document.getElementById('site-logo-url').value;
    if (url) {
        const logo = document.getElementById('site-logo');
        logo.src = url;
        document.getElementById('site-logo-url').value = '';
        saveToLocalStorage();
    }
}

// 更新版本前瞻内容
function updatePreviewContent() {
    // 检查权限
    if (!currentUser || (currentUser.role !== 'chief' && currentUser.role !== 'admin')) {
        alert('您没有权限编辑版本前瞻内容！');
        return;
    }
    
    const previewContent = document.getElementById('preview-content-textarea').value;
    if (previewContent) {
        const previewContentElement = document.getElementById('preview-content');
        previewContentElement.innerHTML = previewContent;
        saveToLocalStorage();
        alert('版本前瞻内容已更新！');
    }
}

// 平滑滚动
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = target.offsetTop - navbarHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// 导航栏滚动效果
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
    } else {
        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }
});

// 关闭模态框事件监听（扩展现有代码）
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        cancelEdit();
    }
    if (e.target === memberModal) {
        cancelMemberEdit();
    }
    if (e.target === loginModal) {
        hideLoginModal();
    }
    if (e.target === roleModal) {
        closeRoleModal();
    }
    if (e.target === selectMemberModal) {
        closeSelectMemberModal();
    }
});

// 关闭按钮事件监听（扩展现有代码）
const roleClose = roleModal.querySelector('.close');
const selectMemberClose = selectMemberModal.querySelector('.close');

if (roleClose) {
    roleClose.addEventListener('click', closeRoleModal);
}

if (selectMemberClose) {
    selectMemberClose.addEventListener('click', closeSelectMemberModal);
}

// 照片轮播功能函数

// 从本地存储加载照片
function loadPhotosFromStorage() {
    const storedPhotos = localStorage.getItem('photoAlbum');
    if (storedPhotos) {
        photos = JSON.parse(storedPhotos);
    }
}

// 保存照片到本地存储
function savePhotosToStorage() {
    localStorage.setItem('photoAlbum', JSON.stringify(photos));
}

// 渲染照片
function renderPhotos() {
    const photoWrapper = document.getElementById('photo-wrapper');
    if (!photoWrapper) return;
    
    // 清空现有照片
    photoWrapper.innerHTML = '';
    
    // 生成照片HTML
    photos.forEach((photo, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `<img src="${photo}" alt="留影石照片${index + 1}">`;
        photoWrapper.appendChild(photoItem);
    });
    
    // 更新轮播位置
    updateCarouselPosition();
}

// 更新轮播位置
function updateCarouselPosition() {
    const photoWrapper = document.getElementById('photo-wrapper');
    if (!photoWrapper) return;
    
    const photoWidth = 100; // 每个照片占据100%宽度
    photoWrapper.style.transform = `translateX(-${currentPhotoIndex * photoWidth}%)`;
}

// 切换照片
function changePhoto(direction) {
    // 停止自动轮播
    stopPhotoCarousel();
    
    // 更新索引
    currentPhotoIndex += direction;
    
    // 处理边界情况
    if (currentPhotoIndex < 0) {
        currentPhotoIndex = photos.length - 1;
    } else if (currentPhotoIndex >= photos.length) {
        currentPhotoIndex = 0;
    }
    
    // 更新轮播位置
    updateCarouselPosition();
    
    // 重新启动自动轮播
    startPhotoCarousel();
}

// 启动自动轮播
function startPhotoCarousel() {
    // 清除现有定时器
    stopPhotoCarousel();
    
    // 设置新定时器，每3秒切换一次照片
    photoCarouselInterval = setInterval(() => {
        changePhoto(1);
    }, 3000);
}

// 停止自动轮播
function stopPhotoCarousel() {
    if (photoCarouselInterval) {
        clearInterval(photoCarouselInterval);
        photoCarouselInterval = null;
    }
}

// 打开照片编辑模态框
function openPhotoEditModal() {
    // 检查权限，只有社主和管理员才能编辑
    if (!currentUser || (currentUser.role !== 'chief' && currentUser.role !== 'admin')) {
        alert('您没有权限编辑留影石照片！');
        return;
    }
    
    // 渲染照片列表
    renderPhotoList();
    
    // 显示模态框
    const modal = document.getElementById('photo-edit-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// 关闭照片编辑模态框
function closePhotoEditModal() {
    const modal = document.getElementById('photo-edit-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 渲染照片列表
function renderPhotoList() {
    const photoList = document.getElementById('photo-list');
    if (!photoList) return;
    
    // 清空现有列表
    photoList.innerHTML = '';
    
    // 生成照片列表HTML
    photos.forEach((photo, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-edit-item';
        photoItem.innerHTML = `
            <img src="${photo}" alt="照片${index + 1}" class="photo-preview-small">
            <span>照片 ${index + 1}</span>
            <div class="photo-edit-controls">
                <button class="remove-photo-btn" onclick="removePhoto(${index})">删除</button>
            </div>
        `;
        photoList.appendChild(photoItem);
    });
}

// 添加照片
function addPhoto() {
    const photoUrlInput = document.getElementById('photo-url-input');
    if (!photoUrlInput) return;
    
    const photoUrl = photoUrlInput.value.trim();
    if (!photoUrl) {
        alert('请输入照片URL');
        return;
    }
    
    // 添加照片到数组
    photos.push(photoUrl);
    
    // 清空输入框
    photoUrlInput.value = '';
    
    // 重新渲染照片列表
    renderPhotoList();
}

// 删除照片
function removePhoto(index) {
    if (photos.length <= 1) {
        alert('至少需要保留一张照片');
        return;
    }
    
    // 从数组中删除照片
    photos.splice(index, 1);
    
    // 更新当前索引，防止越界
    if (currentPhotoIndex >= photos.length) {
        currentPhotoIndex = Math.max(0, photos.length - 1);
    }
    
    // 重新渲染照片列表
    renderPhotoList();
}

// 保存照片更改
function savePhotoChanges() {
    // 保存照片到本地存储
    savePhotosToStorage();
    
    // 更新轮播显示
    renderPhotos();
    
    // 关闭模态框
    closePhotoEditModal();
    
    alert('照片更改已保存');
}

// 关闭模态框事件监听（添加照片编辑模态框）
window.addEventListener('click', (e) => {
    const photoEditModal = document.getElementById('photo-edit-modal');
    if (e.target === photoEditModal) {
        closePhotoEditModal();
    }
});

// 账号设置功能

// 显示账号设置面板
function showAccountSettings() {
    // 隐藏所有其他管理中心区域
    const adminSections = document.querySelectorAll('.admin-section');
    adminSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // 显示账号设置区域
    const accountSettingsSection = document.getElementById('account-settings-section');
    if (accountSettingsSection) {
        accountSettingsSection.style.display = 'block';
        
        // 根据用户角色动态显示密码字段
        const chiefPasswordField = document.getElementById('chief-password').closest('.form-group');
        if (chiefPasswordField) {
            if (currentUser.role === 'chief') {
                chiefPasswordField.style.display = 'block';
            } else {
                chiefPasswordField.style.display = 'none';
            }
        }
    }
}

// 初始化密码更改表单
function initPasswordChangeForm() {
    const passwordForm = document.getElementById('password-change-form');
    if (!passwordForm) return;
    
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 获取表单值
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // 表单验证
        if (newPassword !== confirmPassword) {
            alert('新密码和确认密码不匹配');
            return;
        }
        
        if (newPassword && newPassword.length < 6) {
            alert('新密码长度不能少于6位');
            return;
        }
        
        // 查找当前用户
        const userIndex = users.findIndex(user => 
            user.name === currentUser.name && 
            user.martialArt === currentUser.martialArt && 
            user.level === currentUser.level
        );
        
        if (userIndex === -1) {
            alert('找不到当前用户信息');
            return;
        }
        
        // 更新密码
        users[userIndex].password = newPassword;
        
        // 保存到本地存储
        saveToLocalStorage();
        
        // 清空表单
        passwordForm.reset();
        
        // 显示成功消息
        alert('密码更改成功！');
    });
}

// 初始化角色密码表单
function initRolePasswordForm() {
    const rolePasswordForm = document.getElementById('role-password-form');
    if (!rolePasswordForm) return;
    
    rolePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 获取表单值
        const newChiefPassword = document.getElementById('chief-password').value;
        const newAdminPassword = document.getElementById('admin-password').value;
        
        // 检查权限和密码修改逻辑
        if (currentUser.role === 'chief') {
            // 社主可以修改两种密码
            let hasChanged = false;
            
            // 修改社主密码
            if (newChiefPassword) {
                if (newChiefPassword.length < 6) {
                    alert('社主密码长度不能少于6位');
                    return;
                }
                chiefPassword = newChiefPassword;
                localStorage.setItem('chiefPassword', newChiefPassword);
                hasChanged = true;
            }
            
            // 修改管理员密码
            if (newAdminPassword) {
                if (newAdminPassword.length < 6) {
                    alert('管理员密码长度不能少于6位');
                    return;
                }
                adminPassword = newAdminPassword;
                localStorage.setItem('adminPassword', newAdminPassword);
                hasChanged = true;
            }
            
            if (hasChanged) {
                alert('角色密码修改成功！');
            }
        } else if (currentUser.role === 'admin') {
            // 管理员只能修改管理员密码
            if (newChiefPassword) {
                alert('管理员无权修改社主权限密码！');
                return;
            }
            
            if (newAdminPassword) {
                if (newAdminPassword.length < 6) {
                    alert('管理员密码长度不能少于6位');
                    return;
                }
                adminPassword = newAdminPassword;
                localStorage.setItem('adminPassword', newAdminPassword);
                alert('管理员密码修改成功！');
            }
        } else {
            alert('您没有权限修改角色权限密码！');
            return;
        }
        
        // 清空表单
        rolePasswordForm.reset();
    });
}

// 初始化账号设置功能
document.addEventListener('DOMContentLoaded', () => {
    initPasswordChangeForm();
    initRolePasswordForm();
});

// 回到顶部功能

// 滚动到顶部函数
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 显示/隐藏回到顶部按钮
function toggleBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    if (!backToTopBtn) return;
    
    // 当滚动超过300px时显示按钮，否则隐藏
    if (window.scrollY > 300) {
        backToTopBtn.classList.add('show');
    } else {
        backToTopBtn.classList.remove('show');
    }
}

// 初始化回到顶部功能
document.addEventListener('DOMContentLoaded', () => {
    // 监听滚动事件
    window.addEventListener('scroll', toggleBackToTop);
    
    // 初始状态检查
    toggleBackToTop();
});