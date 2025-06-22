// --- Application State & Mock Data ---
let currentUser = null;
let users = JSON.parse(localStorage.getItem('p2p_reform_users')) || [];
users = users.map(user => ({
    ...user,
    walletBalance: user.walletBalance || { USD: 0, ZAR: 0, BTC: 0 },
    hasMadeInitialSystemPurchase: user.hasMadeInitialSystemPurchase === undefined ? false : user.hasMadeInitialSystemPurchase,
    p2pMarketRequiresInitialPurchase: user.p2pMarketRequiresInitialPurchase === undefined ? true : user.p2pMarketRequiresInitialPurchase,
    coinBalance: user.coinBalance === undefined ? 0 : parseFloat(user.coinBalance)
}));

let transactions = JSON.parse(localStorage.getItem('p2p_reform_transactions')) || [];
let sellOffers = JSON.parse(localStorage.getItem('p2p_reform_sell_offers')) || [];
let userAssets = JSON.parse(localStorage.getItem('p2p_reform_user_assets')) || [];
let globalNotifications = JSON.parse(localStorage.getItem('p2p_reform_global_notifications')) || [];
let supportTickets = JSON.parse(localStorage.getItem('p2p_reform_support_tickets')) || [];
let withdrawalRequests = JSON.parse(localStorage.getItem('p2p_reform_withdrawal_requests')) || [];
let systemPurchaseRequests = JSON.parse(localStorage.getItem('p2p_reform_system_purchases')) || [];

let systemSaleConfig = JSON.parse(localStorage.getItem('p2p_reform_system_sale_config')) || {
    saleDurationSeconds: 300,
    cooldownDurationSeconds: 60,
    defaultSystemCurrency: "USD",
    p2pRequirementEnabled: true
};

let systemSalePlans = JSON.parse(localStorage.getItem('p2p_reform_system_sale_plans')) || [];
// Simple migration for old data structure with maturityDays
systemSalePlans = systemSalePlans.map(plan => {
    if (plan.maturityDays && !plan.maturityDurationSeconds) {
        plan.maturityDurationSeconds = plan.maturityDays * 86400; // Convert days to seconds
        delete plan.maturityDays; // Remove old property
    }
    // Ensure all plans have a duration, default to 7 days if somehow missing
    if (!plan.maturityDurationSeconds) {
        plan.maturityDurationSeconds = 7 * 86400;
    }
    return plan;
});


const ADMIN_EMAIL = "scothyjunior@gmail.com";
const ADMIN_PASSWORD = "Djsthy@2020";

let saleCycleInterval;
let coinSaleActive = false;
let currentPhaseTimeLeft = 0;
let saleNotificationShown = false;

let userCoinChartInstance = null;
let userAssetCountdownInterval = null;

let currentViewId = 'landing-page-view';
let currentDashboardSectionId = { user: 'ud-overview', admin: 'ad-overview' };
let currentOpenTicketId = null;
let currentEditingPlanId = null;

const countryList = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
    "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
    "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
    "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo, Democratic Republic of the",
    "Congo, Republic of the", "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti",
    "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini",
    "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala",
    "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
    "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
    "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia",
    "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
    "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
    "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine State",
    "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
    "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
    "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
    "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
    "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America",
    "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];


// --- Helper Functions ---
function saveState() {
    try {
        localStorage.setItem('p2p_reform_users', JSON.stringify(users));
        localStorage.setItem('p2p_reform_transactions', JSON.stringify(transactions));
        localStorage.setItem('p2p_reform_sell_offers', JSON.stringify(sellOffers));
        localStorage.setItem('p2p_reform_user_assets', JSON.stringify(userAssets));
        localStorage.setItem('p2p_reform_system_sale_config', JSON.stringify(systemSaleConfig));
        localStorage.setItem('p2p_reform_system_sale_plans', JSON.stringify(systemSalePlans));
        localStorage.setItem('p2p_reform_system_purchases', JSON.stringify(systemPurchaseRequests));
        localStorage.setItem('p2p_reform_global_notifications', JSON.stringify(globalNotifications));
        localStorage.setItem('p2p_reform_support_tickets', JSON.stringify(supportTickets));
        localStorage.setItem('p2p_reform_withdrawal_requests', JSON.stringify(withdrawalRequests)); 
    } catch (e) {
        console.error("Error saving state to localStorage:", e);
        displayNotification("Could not save data. LocalStorage might be full or disabled.", "error");
    }
}

function switchView(viewId, skipHistory = false) {
    document.querySelectorAll('.main-content, #landing-page-view, .form-view-container').forEach(el => {
        el.classList.add('hidden');
    });
    const viewElement = document.getElementById(viewId);
    if (viewElement) {
        viewElement.classList.remove('hidden');
        currentViewId = viewId;
        window.scrollTo(0, 0); // Scroll to top on view change
        if (!skipHistory) {
            sessionStorage.setItem('p2p_reform_currentView', viewId);
            if (viewId !== 'user-dashboard-view' && viewId !== 'admin-dashboard-view') {
                sessionStorage.removeItem('p2p_reform_userSection');
                sessionStorage.removeItem('p2p_reform_adminSection');
            }
        }
    } else {
        console.error(`SwitchView: View with ID '${viewId}' not found.`);
    }

    const isLoggedIn = currentUser !== null;
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navLogout = document.getElementById('nav-logout');
    const navDashboard = document.getElementById('nav-dashboard');
    const notificationBellItem = document.getElementById('notification-bell-item');

    if (navLogin) navLogin.parentElement.classList.toggle('hidden', isLoggedIn);
    if (navRegister) navRegister.parentElement.classList.toggle('hidden', isLoggedIn);
    if (navLogout) navLogout.parentElement.classList.toggle('hidden', !isLoggedIn);
    if (navDashboard) navDashboard.parentElement.classList.toggle('hidden', !isLoggedIn);
    if (notificationBellItem) notificationBellItem.classList.toggle('hidden', !isLoggedIn);
    if(isLoggedIn) updateNotificationBellCount();
}


function setActiveLink(activeElement) {
    document.querySelectorAll('#nav-links a, #nav-links button').forEach(link => link.classList.remove('active'));
    if(activeElement && activeElement.id !== 'notification-bell-button') activeElement.classList.add('active');
}

function displayNotification(message, type = 'info') {
    const modal = document.getElementById('popup-notification-modal');
    const titleEl = document.getElementById('popup-notification-title');
    const messageEl = document.getElementById('popup-notification-message');
    let iconHtml = '';

    titleEl.className = type;
    switch(type) {
        case 'success':
            titleEl.textContent = 'Success!';
            iconHtml = '<i class="fas fa-check-circle" style="color: var(--success-color); font-size: 1.5rem; margin-right: 10px;"></i>';
            break;
        case 'error':
            titleEl.textContent = 'Error!';
            iconHtml = '<i class="fas fa-times-circle" style="color: var(--danger-color); font-size: 1.5rem; margin-right: 10px;"></i>';
            break;
        case 'warning':
            titleEl.textContent = 'Warning';
            iconHtml = '<i class="fas fa-exclamation-triangle" style="color: var(--warning-color); font-size: 1.5rem; margin-right: 10px;"></i>';
            break;
        case 'info':
        default:
            titleEl.textContent = 'Information';
            iconHtml = '<i class="fas fa-info-circle" style="color: var(--accent-color); font-size: 1.5rem; margin-right: 10px;"></i>';
            break;
    }
    titleEl.innerHTML = iconHtml + titleEl.textContent;
    messageEl.innerHTML = message; // Use innerHTML for potential line breaks
    modal.style.display = 'block';
}
function closePopupNotificationModal() {
    document.getElementById('popup-notification-modal').style.display = 'none';
}

let confirmCallback = null;
let promptCallback = null;

function showCustomConfirm(message, onConfirm, title = "Confirmation", okButtonText = "OK", okButtonClass = "danger") {
    document.getElementById('custom-confirm-message').innerHTML = message; // Use innerHTML to support simple tags like <br>
    document.getElementById('custom-confirm-title').textContent = title;
    const okButton = document.getElementById('custom-confirm-ok-button');
    okButton.textContent = okButtonText;
    okButton.className = `button ${okButtonClass}`;

    confirmCallback = onConfirm;
    document.getElementById('custom-confirm-modal').style.display = 'block';
}

function closeCustomConfirmModal(isConfirmed) {
    document.getElementById('custom-confirm-modal').style.display = 'none';
    if (isConfirmed && typeof confirmCallback === 'function') {
        confirmCallback();
    }
    confirmCallback = null;
}

function showCustomPrompt(message, defaultValue = "", onPrompt, title = "Input Required") {
    document.getElementById('custom-prompt-message').textContent = message;
    document.getElementById('custom-prompt-title').textContent = title;
    const inputField = document.getElementById('custom-prompt-input');
    inputField.value = defaultValue;
    promptCallback = onPrompt;
    document.getElementById('custom-prompt-modal').style.display = 'block';
    inputField.focus();
}

function closeCustomPromptModal(isSubmitted) {
    const modal = document.getElementById('custom-prompt-modal');
    const inputField = document.getElementById('custom-prompt-input');
    modal.style.display = 'none';
    if (isSubmitted && typeof promptCallback === 'function') {
        promptCallback(inputField.value);
    } else if (typeof promptCallback === 'function') {
        promptCallback(null);
    }
    promptCallback = null;
    inputField.value = '';
}

function openProofViewerModal(dataUrl, caption = '') {
    const modal = document.getElementById('proof-viewer-modal');
    const img = document.getElementById('proof-viewer-image');
    const cap = document.getElementById('proof-viewer-caption');
    if (modal && img && dataUrl && dataUrl.startsWith('data:image')) {
        img.src = dataUrl;
        cap.textContent = caption;
        modal.style.display = 'block';
    } else if (dataUrl) {
        // Fallback for non-image data URLs or external links
        window.open(dataUrl, '_blank');
    }
}

function closeProofViewerModal() {
    const modal = document.getElementById('proof-viewer-modal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('proof-viewer-image').src = ''; // Clear image
    }
}


function addGlobalNotification(targetUserIdOrAdmin, title, message, link = '#', type = 'info') {
    const newNotification = {
        id: generateId(),
        target: targetUserIdOrAdmin,
        title: title,
        message: message,
        link: link,
        type: type,
        timestamp: new Date().toISOString(),
        read: false
    };
    globalNotifications.unshift(newNotification);
    if (globalNotifications.length > 50) {
        globalNotifications.pop();
    }
    saveState();
    updateNotificationBellCount();
}

function updateNotificationBellCount() {
    if (!currentUser) return;
    const target = currentUser.isAdmin ? 'admin' : currentUser.id;
    const unreadCount = globalNotifications.filter(n => n.target === target && !n.read).length;
    const countElement = document.getElementById('unread-notification-count');

    if (countElement) {
        if (unreadCount > 0) {
            countElement.textContent = unreadCount;
            countElement.classList.remove('hidden');
        } else {
            countElement.classList.add('hidden');
        }
    }
}

function toggleNotificationPanel() {
    const panel = document.getElementById('notification-panel');
    if (panel.classList.contains('hidden')) {
        renderNotificationPanel();
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
    }
}

function renderNotificationPanel() {
    const panelList = document.getElementById('notification-panel-list');
    if (!currentUser || !panelList) return;

    const target = currentUser.isAdmin ? 'admin' : currentUser.id;
    const userNotifications = globalNotifications.filter(n => n.target === target).slice(0, 10);

    panelList.innerHTML = '';
    if (userNotifications.length === 0) {
        panelList.innerHTML = '<p class="no-notifications">No notifications.</p>';
    } else {
        userNotifications.forEach(n => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'notification-item';
            itemDiv.innerHTML = `
                <strong>${n.title}</strong>
                <p>${n.message}</p>
                <small>${new Date(n.timestamp).toLocaleString()}</small>
            `;
            n.read = true;
            panelList.appendChild(itemDiv);
        });
        saveState();
        updateNotificationBellCount();
    }
}
function generateId() { return Math.random().toString(36).substr(2, 9) + Date.now().toString(36); }

function formatCurrency(value, currency = "USD") {
    const symbols = { USD: '$', ZAR: 'R' };
    if (currency === 'BTC') {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? '0.00000000 BTC' : numValue.toFixed(8) + ' BTC';
    }
    const numValue = parseFloat(value);
    return (symbols[currency] || currency + ' ') + (isNaN(numValue) ? '0.00' : numValue.toFixed(2));
}

function formatDuration(seconds) {
    if (seconds >= 86400 && seconds % 86400 === 0) {
        const days = seconds / 86400;
        return `${days} ${days > 1 ? 'Days' : 'Day'}`;
    }
    if (seconds >= 3600 && seconds % 3600 === 0) {
        const hours = seconds / 3600;
        return `${hours} ${hours > 1 ? 'Hours' : 'Hour'}`;
    }
    const minutes = Math.round(seconds / 60);
    return `${minutes} ${minutes > 1 ? 'Minutes' : 'Minute'}`;
}

function deconstructDuration(seconds) {
    if (seconds >= 86400 && seconds % 86400 === 0) {
        return { value: seconds / 86400, unit: 'Days' };
    }
    if (seconds >= 3600 && seconds % 3600 === 0) {
        return { value: seconds / 3600, unit: 'Hours' };
    }
    if (seconds >= 60 && seconds % 60 === 0) {
        return { value: seconds / 60, unit: 'Minutes' };
    }
    // Fallback for weird numbers (e.g. from old data or manual edit), just show in minutes.
    return { value: Math.round(seconds / 60), unit: 'Minutes' };
}


function togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
    } else {
        passwordInput.type = "password";
    }
}

function populateCountryDropdown(selectElementId, selectedCountry = null) {
    const selectElement = document.getElementById(selectElementId);
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Select Country --</option>';
    countryList.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        if (country === selectedCountry) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

function showUserDashboardSection(sectionId, buttonElement, skipHistory = false) {
    document.querySelectorAll('#user-dashboard-view .dashboard-main-content .dashboard-card').forEach(s => s.classList.add('hidden'));
    const sectionToShow = document.getElementById(sectionId);
    if(sectionToShow) sectionToShow.classList.remove('hidden');
    document.querySelectorAll('#user-dashboard-view .dashboard-sidebar ul li button').forEach(b => b.classList.remove('active'));
    if(buttonElement) buttonElement.classList.add('active');

    currentDashboardSectionId.user = sectionId;
    if (!skipHistory) sessionStorage.setItem('p2p_reform_userSection', sectionId);
    
    // Clear asset countdown interval when leaving the 'My Assets' page
    if (sectionId !== 'ud-my-assets' && userAssetCountdownInterval) {
        clearInterval(userAssetCountdownInterval);
        userAssetCountdownInterval = null;
    }
    
    const isP2PLocked = (currentUser.p2pMarketRequiresInitialPurchase && !currentUser.hasMadeInitialSystemPurchase);

    if (sectionId === 'ud-system-sale') {
        updateSystemSaleUserView();
        const initialSystemPurchaseMessage = document.getElementById('system-sale-initial-purchase-message');
         if (initialSystemPurchaseMessage) {
            const showMessage = currentUser.p2pMarketRequiresInitialPurchase && !currentUser.hasMadeInitialSystemPurchase;
            initialSystemPurchaseMessage.classList.toggle('hidden', !showMessage);
        }
    }
    if (sectionId === 'ud-kyc') {
        renderKycForm();
    }
    if (sectionId === 'ud-my-assets') {
        renderUserAssets();
    }
    if (sectionId === 'ud-p2p-market') {
        document.getElementById('p2p-market-disabled-message').classList.toggle('hidden', !isP2PLocked);
        renderMySellOffers();
    }
    if (sectionId === 'ud-withdraw-funds') {
        renderUserWithdrawalHistory();
        populateWithdrawalDestination(); // Initialize based on default currency
        const withdrawCurrencySelect = document.getElementById('withdraw-currency');
        if (withdrawCurrencySelect) {
            withdrawCurrencySelect.removeEventListener('change', populateWithdrawalDestination); // Remove old if any
            withdrawCurrencySelect.addEventListener('change', populateWithdrawalDestination);
        }
    }
    if (sectionId === 'ud-support-tickets') {
        renderUserSupportTickets();
    }
}
function showAdminDashboardSection(sectionId, buttonElement, skipHistory = false) {
    document.querySelectorAll('#admin-dashboard-view .dashboard-main-content .dashboard-card').forEach(s => s.classList.add('hidden'));
    const sectionToShow = document.getElementById(sectionId);
    if(sectionToShow) sectionToShow.classList.remove('hidden');
    document.querySelectorAll('#admin-dashboard-view .dashboard-sidebar ul li button').forEach(b => b.classList.remove('active'));
    if(buttonElement) buttonElement.classList.add('active');

    currentDashboardSectionId.admin = sectionId;
    if (!skipHistory) sessionStorage.setItem('p2p_reform_adminSection', sectionId);

    if (sectionId === 'ad-manage-p2p-offers') {
        renderAdminP2POffers();
    }
    if (sectionId === 'ad-user-assets') {
        renderAdminUserAssets();
    }
    if (sectionId === 'ad-support-tickets') {
        renderAdminSupportTickets();
    }
    if (sectionId === 'ad-system-sale-config'){
        loadSystemSaleGeneralSettingsForAdminForm();
    }
    if (sectionId === 'ad-withdrawal-requests') {
        renderAdminWithdrawalRequests();
    }
}

function handleLogoClick() {
    switchView('landing-page-view');
    const homeLinkForActiveState = document.querySelector('#nav-links li a[onclick*=\'landing-page-view\']');
    if (homeLinkForActiveState) {
        setActiveLink(homeLinkForActiveState);
    } else {
        setActiveLink(null);
    }
}

function handleDashboardNavClick() {
    if (currentUser) {
        if (currentUser.isAdmin) {
            switchView('admin-dashboard-view');
            const adminOverviewButton = document.querySelector('#admin-dashboard-view .dashboard-sidebar button[onclick*="ad-overview"]');
            const targetAdminSection = currentDashboardSectionId.admin || 'ad-overview';
            const targetAdminButton = document.querySelector(`#admin-dashboard-view .dashboard-sidebar button[onclick*="'${targetAdminSection}'"]`) || adminOverviewButton;
            showAdminDashboardSection(targetAdminSection, targetAdminButton);
        } else {
            switchView('user-dashboard-view');
            const userOverviewButton = document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-overview"]');
            const targetUserSection = currentDashboardSectionId.user || 'ud-overview';
            const targetUserButton = document.querySelector(`#user-dashboard-view .dashboard-sidebar button[onclick*="'${targetUserSection}'"]`) || userOverviewButton;
            showUserDashboardSection(targetUserSection, targetUserButton);
        }
        setActiveLink(document.getElementById('nav-dashboard'));
    } else {
        switchView('login-form-view');
        setActiveLink(document.getElementById('nav-login'));
    }
}

// --- Authentication ---
function handleRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;

    if (!name || !email || !password) { displayNotification('Name, email, and password are required.', 'error'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { displayNotification('Valid email required.', 'error'); return; }
    if (users.find(u => u.email === email)) { displayNotification('Email already exists.', 'error'); return; }

    const newUser = {
        id: generateId(), name, email, password,
        coinBalance: 0,
        walletBalance: { USD: 0, ZAR: 0, BTC: 0 },
        hasMadeInitialSystemPurchase: false,
        p2pMarketRequiresInitialPurchase: systemSaleConfig.p2pRequirementEnabled,
        status: 'active',
        kycStatus: 'none',
        kycData: { bankName: '', bankAccount: '', usdtWallet: '', telephone: '', country: '', documentUrl: null, documentFilename: null, rejectionReason: null },
    };
    users.push(newUser);
    currentUser = newUser;
    saveState();
    switchView('user-dashboard-view');
    renderUserDashboard();
    setActiveLink(document.getElementById('nav-dashboard'));
    addGlobalNotification(currentUser.id, "Welcome!", "Registration successful! Please complete your KYC.", "ud-kyc", "success");
    displayNotification("Registration successful! Please complete your KYC verification.", "success");
    showUserDashboardSection('ud-kyc', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-kyc"]'));
}

function handleLogin() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        currentUser = { isAdmin: true, name: "Administrator", id: "admin_user" };
        switchView('admin-dashboard-view');
        renderAdminDashboard();
        setActiveLink(document.getElementById('nav-dashboard'));
        return;
    }

    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        if (user.status === 'blocked') { displayNotification('Account blocked. Contact support.', 'error'); return; }
        currentUser = user;
        currentUser.kycData = currentUser.kycData || { bankName: '', bankAccount: '', usdtWallet: '', telephone: '', country: '', documentUrl: null, documentFilename: null, rejectionReason: null };
        currentUser.walletBalance = currentUser.walletBalance || { USD: 0, ZAR: 0, BTC: 0 };
        currentUser.hasMadeInitialSystemPurchase = currentUser.hasMadeInitialSystemPurchase === undefined ? false : currentUser.hasMadeInitialSystemPurchase;
        currentUser.p2pMarketRequiresInitialPurchase = currentUser.p2pMarketRequiresInitialPurchase === undefined ? true : currentUser.p2pMarketRequiresInitialPurchase;
        currentUser.coinBalance = currentUser.coinBalance === undefined ? 0 : parseFloat(currentUser.coinBalance);
        currentUser.kycStatus = currentUser.kycStatus || 'none';
        saveState();

        switchView('user-dashboard-view');
        renderUserDashboard();
        setActiveLink(document.getElementById('nav-dashboard'));
        if (currentUser.kycStatus === 'none') {
             displayNotification("Welcome! Please complete your KYC verification to access all features.", "warning");
             addGlobalNotification(currentUser.id, "KYC Needed", "Please complete your KYC to access all features.", "ud-kyc", "warning");
             showUserDashboardSection('ud-kyc', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-kyc"]'));
        } else if (currentUser.kycStatus === 'approved' && !currentUser.hasMadeInitialSystemPurchase && currentUser.p2pMarketRequiresInitialPurchase) {
            displayNotification("Welcome! Please purchase your first Asset Program to get started.", "info");
            showUserDashboardSection('ud-system-sale', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-system-sale"]'));
        }
    } else { displayNotification('Invalid email or password.', 'error'); }
}

function handleLogout() {
    sessionStorage.removeItem('p2p_reform_currentUser');
    sessionStorage.removeItem('p2p_reform_currentView');
    sessionStorage.removeItem('p2p_reform_userSection');
    sessionStorage.removeItem('p2p_reform_adminSection');
    currentUser = null;

    if (saleCycleInterval) clearInterval(saleCycleInterval);
    if (userAssetCountdownInterval) clearInterval(userAssetCountdownInterval);
    coinSaleActive = false;
    saleNotificationShown = false;
    const coinBalanceCard = document.getElementById('user-coin-balance-card');
    if(coinBalanceCard) coinBalanceCard.classList.remove('sale-active-balance');

    if(userCoinChartInstance) { userCoinChartInstance.destroy(); userCoinChartInstance = null;}
    document.getElementById('notification-panel').classList.add('hidden');
    switchView('landing-page-view');
    setActiveLink(document.querySelector('#nav-links li a[onclick*=\'landing-page-view\']'));
}

// --- User Dashboard Rendering ---
function renderUserDashboard() {
    if (!currentUser || currentUser.isAdmin) return;
    sessionStorage.setItem('p2p_reform_currentUser', JSON.stringify(currentUser));

    document.getElementById('user-welcome-message').innerHTML = `<i class="fas fa-user-circle"></i> Hello, ${currentUser.name}`;

    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-kyc-status').textContent = currentUser.kycStatus || 'None';
    document.getElementById('profile-bank-name').textContent = currentUser.kycData?.bankName || 'N/A';
    document.getElementById('profile-bank-account').textContent = currentUser.kycData?.bankAccount || 'N/A';
    document.getElementById('profile-usdt-wallet').textContent = currentUser.kycData?.usdtWallet || 'N/A';
    document.getElementById('profile-telephone').textContent = currentUser.kycData?.telephone || 'N/A';
    document.getElementById('profile-country').textContent = currentUser.kycData?.country || 'N/A';

    document.getElementById('coin-balance').textContent = currentUser.coinBalance.toFixed(2);
    renderWalletBalances();

    renderUserCoinChart();
    initializeSystemSaleCycle();
    renderUserPendingTransactions();
    renderMySellOffers();
    renderUserAssets();
    renderP2PTransactionHistory();
    renderUserWithdrawalHistory();
    renderUserSupportTickets();
    updateNotificationBellCount();

    const lastUserSection = sessionStorage.getItem('p2p_reform_userSection') || 'ud-overview';
    const buttonForSection = document.querySelector(`#user-dashboard-view .dashboard-sidebar button[onclick*="'${lastUserSection}'"]`);
    if (buttonForSection) {
            showUserDashboardSection(lastUserSection, buttonForSection, true);
    } else {
            showUserDashboardSection('ud-overview', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-overview"]'), true);
    }
}

function renderWalletBalances() {
    const walletGrid = document.getElementById('wallet-balances-grid');
    if (!walletGrid || !currentUser || !currentUser.walletBalance) return;
    walletGrid.innerHTML = '';

    const currenciesToShow = ['USD', 'ZAR', 'BTC'];
    let hasVisibleWalletBalance = false;

    currenciesToShow.forEach(currency => {
        if (currentUser.walletBalance[currency] !== undefined && currentUser.walletBalance[currency] > 0) {
            hasVisibleWalletBalance = true;
            const walletCard = document.createElement('div');
            walletCard.className = 'info-card wallet-balance-card';
            const approvedWithdrawal = withdrawalRequests.find(
                req => req.userId === currentUser.id && req.currency === currency && req.status === 'approved'
            );
            if (approvedWithdrawal) {
                walletCard.classList.add('withdrawal-approved');
            }
            let icon = 'fas fa-dollar-sign';
            if(currency === 'ZAR') icon = 'fas fa-coins'; 
            if(currency === 'BTC') icon = 'fab fa-bitcoin';

            walletCard.innerHTML = `
                <strong><i class="${icon}"></i> ${currency} Wallet Balance</strong>
                <span>${formatCurrency(currentUser.walletBalance[currency], currency)}</span>
                ${approvedWithdrawal ? '<span class="withdrawal-status-text">Withdrawal Approved</span>' : ''}
            `;
            walletGrid.appendChild(walletCard);
        }
    });
   
    walletGrid.style.display = hasVisibleWalletBalance ? 'grid' : 'none';
}


function toggleUserProfileDetails() {
    const detailsDiv = document.getElementById('user-profile-details-collapsible');
    const button = document.getElementById('toggle-profile-details-btn');
    detailsDiv.classList.toggle('hidden');
    if (detailsDiv.classList.contains('hidden')) {
        button.innerHTML = '<i class="fas fa-user-circle"></i> Show Full Profile Details';
    } else {
        button.innerHTML = '<i class="fas fa-user-circle"></i> Hide Full Profile Details';
    }
}

function renderUserCoinChart() {
    if (!currentUser || currentUser.isAdmin) return;
    const chartCanvas = document.getElementById('userCoinChart');
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');

    // Total coins that will eventually become liquid.
    const totalMaturing = userAssets
        .filter(asset => asset.userId === currentUser.id && (asset.status === 'maturing' || asset.status === 'repackaged_profit_maturing'))
        .reduce((sum, asset) => sum + asset.totalReturnCoins, 0);
    
    const liquidBalanceForChart = currentUser.coinBalance;

    if (userCoinChartInstance) userCoinChartInstance.destroy();

    userCoinChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Liquid Coins', 'Coins in Maturing Programs'],
            datasets: [{
                label: 'Coin Distribution', 
                data: [liquidBalanceForChart, totalMaturing],
                backgroundColor: [ 'rgba(82, 183, 136, 0.8)', 'rgba(247, 127, 0, 0.8)'],
                borderColor: [ 'rgba(82, 183, 136, 1)', 'rgba(247, 127, 0, 1)'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'Poppins' } } },
                title: { display: true, text: 'My COINs Distribution', font: {size: 16, family: 'Poppins', weight: '500'}, color: 'var(--primary-color)' }
            }
        }
    });
}

// --- KYC Management (User) ---
function renderKycForm() {
    if (!currentUser || currentUser.isAdmin) return;
    const kycStatusText = document.getElementById('kyc-current-status-text');
    const kycFormArea = document.getElementById('kyc-form-area');
    const kycPendingArea = document.getElementById('kyc-pending-approval-area');
    const kycApprovedArea = document.getElementById('kyc-approved-area');
    const kycRejectionReasonEl = document.getElementById('kyc-rejection-reason');
    const submitKycButton = document.getElementById('submit-kyc-button');
    const kycFormInstructions = document.getElementById('kyc-form-instructions');
    const kycApprovedUpdateInfo = document.getElementById('kyc-approved-update-info');

    const kycBankNameInput = document.getElementById('kyc-bank-name');
    const kycBankAccountInput = document.getElementById('kyc-bank-account');
    const kycUsdtWalletInput = document.getElementById('kyc-usdt-wallet');
    const kycTelephoneInput = document.getElementById('kyc-telephone');
    const kycCountrySelect = document.getElementById('kyc-country');
    const kycDocumentInput = document.getElementById('kyc-document');

    populateCountryDropdown('kyc-country', currentUser.kycData?.country);

    kycStatusText.textContent = currentUser.kycStatus || 'None';
    kycFormArea.classList.add('hidden');
    kycPendingArea.classList.add('hidden');
    kycApprovedArea.classList.add('hidden');
    kycRejectionReasonEl.classList.add('hidden');
    kycApprovedUpdateInfo.classList.add('hidden');
    submitKycButton.textContent = "Submit/Update KYC Information";
    submitKycButton.classList.remove('hidden');
    kycFormInstructions.classList.remove('hidden');

    [kycBankNameInput, kycBankAccountInput, kycUsdtWalletInput, kycTelephoneInput, kycCountrySelect, kycDocumentInput].forEach(el => el.disabled = false);

    if (currentUser.kycStatus === 'none' || currentUser.kycStatus === 'rejected') {
        kycFormArea.classList.remove('hidden');
        kycBankNameInput.value = currentUser.kycData?.bankName || '';
        kycBankAccountInput.value = currentUser.kycData?.bankAccount || '';
        kycUsdtWalletInput.value = currentUser.kycData?.usdtWallet || '';
        kycTelephoneInput.value = currentUser.kycData?.telephone || '';
        document.getElementById('kyc-uploaded-file-name').textContent = currentUser.kycData?.documentFilename ? `Current document: ${currentUser.kycData.documentFilename}` : 'No document uploaded yet.';

        if (currentUser.kycStatus === 'rejected' && currentUser.kycData?.rejectionReason) {
            kycRejectionReasonEl.textContent = `Rejection Reason: ${currentUser.kycData.rejectionReason}`;
            kycRejectionReasonEl.classList.remove('hidden');
        }
    } else if (currentUser.kycStatus === 'pending') {
        kycPendingArea.classList.remove('hidden');
    } else if (currentUser.kycStatus === 'approved') {
        kycApprovedArea.classList.remove('hidden');
        kycFormArea.classList.remove('hidden');
        kycFormInstructions.classList.add('hidden');
        kycApprovedUpdateInfo.classList.remove('hidden');

        kycBankNameInput.value = currentUser.kycData?.bankName || '';
        kycBankAccountInput.value = currentUser.kycData?.bankAccount || '';
        kycUsdtWalletInput.value = currentUser.kycData?.usdtWallet || '';
        kycTelephoneInput.value = currentUser.kycData?.telephone || '';

        [kycBankNameInput, kycBankAccountInput, kycUsdtWalletInput, kycTelephoneInput, kycCountrySelect, kycDocumentInput].forEach(el => el.disabled = true);
        submitKycButton.classList.add('hidden');
        document.getElementById('kyc-uploaded-file-name').textContent = currentUser.kycData?.documentFilename ? `Current document: ${currentUser.kycData.documentFilename}` : 'No document provided.';
    }
}

function submitKycForm() {
    if (!currentUser) {
        displayNotification('You must be logged in to submit KYC.', 'error');
        return;
    }
     if (currentUser.kycStatus === 'pending') {
        displayNotification('KYC is currently pending approval. Please wait.', 'info');
        return;
    }
    if (currentUser.kycStatus === 'approved') {
        displayNotification('Your KYC is already approved. Contact support for updates.', 'info');
        return;
    }

    const kycBankName = document.getElementById('kyc-bank-name').value.trim();
    const kycBankAccount = document.getElementById('kyc-bank-account').value.trim();
    const kycUsdtWallet = document.getElementById('kyc-usdt-wallet').value.trim();
    const kycTelephone = document.getElementById('kyc-telephone').value.trim();
    const kycCountry = document.getElementById('kyc-country').value;
    const kycDocumentFile = document.getElementById('kyc-document').files[0];

    if(!kycBankName && !kycUsdtWallet && !kycBankAccount){ displayNotification('Please provide at least Bank details or a USDT Wallet.', 'warning'); return;}
    if(!kycTelephone || !kycCountry){ displayNotification('Telephone and Country are required.', 'error'); return;}

    let needsDocUpload = true;
    if (currentUser.kycData?.documentUrl && !kycDocumentFile) {
        needsDocUpload = false;
    } else if (!kycDocumentFile && !currentUser.kycData?.documentUrl) {
         displayNotification('Please upload a verification document.', 'error'); return;
    }

    currentUser.kycData.bankName = kycBankName;
    currentUser.kycData.bankAccount = kycBankAccount;
    currentUser.kycData.usdtWallet = kycUsdtWallet;
    currentUser.kycData.telephone = kycTelephone;
    currentUser.kycData.country = kycCountry;
    currentUser.kycData.rejectionReason = null;

    const processKycSubmission = () => {
        currentUser.kycStatus = 'pending';
        currentUser.kycData.submittedAt = new Date().toISOString(); // Track submission time
        saveState();
        renderKycForm();
        if(currentUser.isAdmin) renderAdminDashboard();
        else renderUserDashboard();
        displayNotification('KYC information submitted for review.', 'success');
        addGlobalNotification('admin', 'KYC Submission', `${currentUser.name} submitted KYC for review.`, 'ad-kyc-requests', 'info');
    };

    if (needsDocUpload && kycDocumentFile) {
        if (kycDocumentFile.size > 2 * 1024 * 1024) {
            displayNotification("Document file too large (max 2MB).", "error");
            return;
        }
        currentUser.kycData.documentFilename = kycDocumentFile.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            currentUser.kycData.documentUrl = e.target.result;
            processKycSubmission();
        };
        reader.onerror = function(e) { console.error("File reading error for KYC:", e); displayNotification('Error reading document file.', 'error');};
        reader.readAsDataURL(kycDocumentFile);
    } else {
        processKycSubmission();
    }
}

// --- System Coin Sale Cycle (User - Plan Based) ---
function initializeSystemSaleCycle() {
    if (saleCycleInterval) clearInterval(saleCycleInterval);
    coinSaleActive = false;
    saleNotificationShown = false;
    currentPhaseTimeLeft = systemSaleConfig.cooldownDurationSeconds;
    updateSystemSaleUserView();

    saleCycleInterval = setInterval(() => {
        currentPhaseTimeLeft--;
        if (currentPhaseTimeLeft < 0) {
            coinSaleActive = !coinSaleActive;
            currentPhaseTimeLeft = coinSaleActive ? systemSaleConfig.saleDurationSeconds : systemSaleConfig.cooldownDurationSeconds;
            if (coinSaleActive) {
                saleNotificationShown = false;
            }
        }
        updateSystemSaleUserView();
    }, 1000);
}

function updateSystemSaleUserView() {
    const countdownDisplay = document.getElementById('countdown-timer');
    const plansArea = document.getElementById('system-sale-plans-area');
    const userPendingMessageArea = document.getElementById('system-sale-user-pending-message');
    
    if (!countdownDisplay || !plansArea || !userPendingMessageArea) return;

    const minutes = Math.floor(Math.max(0, currentPhaseTimeLeft) / 60);
    const seconds = Math.max(0, currentPhaseTimeLeft) % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (coinSaleActive) {
        countdownDisplay.innerHTML = `<i class="fas fa-fire"></i> SALE ACTIVE! Ends in: ${timeString}`;
        if (!saleNotificationShown && currentUser && currentUser.kycStatus === 'approved') {
            displayNotification("The Marketplace is open for purchases!", "info");
            saleNotificationShown = true;
        }

        if(currentUser && currentUser.kycStatus === 'approved'){
            plansArea.classList.remove('hidden');
            userPendingMessageArea.classList.add('hidden');
            renderMarketplaceItems();
        } else {
            plansArea.classList.add('hidden');
            userPendingMessageArea.innerHTML = '<p style="padding:1rem; background-color: #FFF3E0; border-left: 4px solid var(--warning-color); color: var(--text-dark);"><i class="fas fa-exclamation-triangle"></i> Please complete and get your KYC approved to purchase from the marketplace.</p>';
            userPendingMessageArea.classList.remove('hidden');
        }
    } else {
        countdownDisplay.innerHTML = `<i class="fas fa-history"></i> Next sale starts in: ${timeString}`;
        plansArea.classList.add('hidden');
        userPendingMessageArea.innerHTML = '<p style="padding:1rem; background-color: #E1F5FE; border-left: 4px solid var(--accent-color); color: var(--primary-color);"><i class="fas fa-hourglass-start"></i> The marketplace is currently in cooldown. Please wait for the next sale period.</p>';
        userPendingMessageArea.classList.remove('hidden');
        saleNotificationShown = false;
    }
}

function renderMarketplaceItems() {
    const marketplaceDiv = document.getElementById('user-system-sale-plans-list');
    if (!marketplaceDiv) return;
    marketplaceDiv.innerHTML = '';

    const activePlans = systemSalePlans.filter(p => p.status === 'active');
    const isP2PLocked = (currentUser.p2pMarketRequiresInitialPurchase && !currentUser.hasMadeInitialSystemPurchase);
    const activeP2POffers = sellOffers.filter(o => o.status === 'active' && o.sellerId !== currentUser?.id);

    if (activePlans.length === 0 && activeP2POffers.length === 0) {
        marketplaceDiv.innerHTML = '<p>No asset programs or P2P offers currently available. Check back later!</p>';
        return;
    }
    
    // Combine and sort if needed, for now just append
    const allItems = [...activePlans, ...activeP2POffers];

    allItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'system-sale-plan-item';
        let planName, cost, baseCoins, maturity, returnPercent, totalReturn, currency, onClickAction, itemTypeIcon;

        const buyButtonDisabled = isP2PLocked ? 'disabled' : '';

        // Check if it's a system plan or a P2P offer
        if (item.hasOwnProperty('coinsAwarded')) { // It's a system plan
            const plan = item;
            const returnAmount = plan.coinsAwarded * (plan.returnPercentage / 100);
            
            planName = plan.name;
            cost = plan.cost;
            currency = plan.currency || systemSaleConfig.defaultSystemCurrency;
            baseCoins = plan.coinsAwarded;
            maturity = formatDuration(plan.maturityDurationSeconds);
            returnPercent = plan.returnPercentage;
            totalReturn = plan.coinsAwarded + returnAmount;
            onClickAction = `handleSystemPlanPurchaseRequest('${plan.id}')`;
            itemTypeIcon = 'fa-box-open';

        } else { // It's a P2P offer (which is now always repackaged)
            const offer = item;
            onClickAction = `buyFromP2POffer('${offer.id}')`;
            itemTypeIcon = 'fa-user-tag';

            planName = offer.adminPlanName || `P2P Program from ${offer.sellerName}`;
            baseCoins = offer.amount; // The full amount being sold
            cost = offer.amount * offer.adminPrice; // This is the total cost for the buyer
            currency = offer.adminCurrency;
            maturity = formatDuration(offer.adminMaturityDurationSeconds);
            returnPercent = offer.adminReturnPercentage;
            // The total return for the *next* buyer is the base they buy + profit on that base
            totalReturn = baseCoins * (1 + returnPercent / 100);
        }

        itemDiv.innerHTML = `
            <h5><i class="fas ${itemTypeIcon}"></i> ${planName}</h5>
            <p><strong>Cost:</strong> ${formatCurrency(cost, currency)}</p>
            <p><strong>Base Coins:</strong> ${baseCoins.toFixed(2)} COIN</p>
            <p><strong>Maturity:</strong> ${maturity}</p>
            <p><strong>Return:</strong> ${returnPercent}%</p>
            <p style="font-weight:bold;"><strong>Total after maturity:</strong> ${totalReturn.toFixed(2)} COIN</p>
            <button class="accent" onclick="${onClickAction}" ${buyButtonDisabled && item.hasOwnProperty('adminPrice') ? buyButtonDisabled : ''}><i class="fas fa-shopping-cart"></i> Purchase</button>
        `;
        marketplaceDiv.appendChild(itemDiv);
    });
}

function handleSystemPlanPurchaseRequest(planId) {
    if (!coinSaleActive) { 
        displayNotification('Marketplace is not active. Purchase during active sale period.', 'error'); 
        return; 
    }
    if (currentUser.kycStatus !== 'approved') { 
        displayNotification('Your KYC must be approved to purchase asset programs. Please go to the KYC section.', 'warning'); 
        showUserDashboardSection('ud-kyc', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-kyc"]'));
        return; 
    }

    const plan = systemSalePlans.find(p => p.id === planId);
    if (!plan) { displayNotification('Selected plan not found.', 'error'); return; }

    const existingPendingRequestForThisPlan = systemPurchaseRequests.find(req =>
        req.userId === currentUser.id &&
        req.planDetails && req.planDetails.id === planId &&
        (req.status === 'awaiting_payment_to_seller' || req.status === 'payment_proof_submitted_to_seller')
    );
    if (existingPendingRequestForThisPlan) {
        displayNotification('You already have a pending purchase for this specific program. Please complete or wait for it.', 'warning');
        showUserDashboardSection('ud-pending-transactions', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-pending-transactions"]'));
        return;
    }
    
    const returnAmount = plan.coinsAwarded * (plan.returnPercentage / 100);
    const totalReturn = plan.coinsAwarded + returnAmount;

    const newRequest = {
        id: generateId(),
        userId: currentUser.id,
        userName: currentUser.name,
        type: 'system_plan_purchase',
        planDetails: {
            id: plan.id,
            name: plan.name,
            cost: plan.cost,
            currency: plan.currency || systemSaleConfig.defaultSystemCurrency,
            baseCoins: plan.coinsAwarded,
            returnPercentage: plan.returnPercentage,
            maturityDurationSeconds: plan.maturityDurationSeconds,
            totalReturnCoins: totalReturn,
            paymentInfo: { 
                bankName: plan.planBankName,
                bankAccount: plan.planBankAccount,
                btcWallet: plan.planBtcWallet
            }
        },
        status: 'awaiting_payment_to_seller',
        paymentProofFilename: null,
        paymentProofDataUrl: null,
        createdAt: new Date().toISOString()
    };
    systemPurchaseRequests.push(newRequest);
    saveState();

    displayNotification(`Purchase request for '${plan.name}' submitted. Make payment to Seller and upload proof via 'Pending Transactions'.`, 'info');
    addGlobalNotification('admin', 'Seller Sale Request', `${currentUser.name} requested to buy program '${plan.name}'.`, 'ad-system-sale-requests');
    showUserDashboardSection('ud-pending-transactions', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-pending-transactions"]'));
}

// --- P2P Market ---
function renderMySellOffers() {
    const myOffersListDiv = document.getElementById('my-sell-offers-list');
    if (!myOffersListDiv || !currentUser) return;

    const myOffers = sellOffers.filter(o => o.sellerId === currentUser.id && o.status === 'active').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    if(myOffers.length === 0) {
        myOffersListDiv.innerHTML = '<p>You have no active sell offers. List a matured asset from the "My Assets" page.</p>';
        return;
    }
    myOffersListDiv.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Date Listed</th><th>Amount (COIN)</th><th>Price per COIN</th><th>Total Value</th><th>Status</th><th>Action</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    myOffers.forEach(offer => {
        const tr = tbody.insertRow();
        const displayPrice = formatCurrency(offer.adminPrice, offer.adminCurrency);
        const displayTotal = formatCurrency(offer.amount * offer.adminPrice, offer.adminCurrency);
        const statusText = "Active on P2P Market";
        tr.innerHTML = `
            <td>${new Date(offer.createdAt || Date.now()).toLocaleDateString()}</td>
            <td>${offer.amount.toFixed(2)}</td>
            <td>${displayPrice}</td>
            <td>${displayTotal}</td>
            <td>${statusText}</td>
            <td><button onclick="cancelMySellOffer('${offer.id}')" class="danger small">Cancel</button></td>
        `;
    });
    myOffersListDiv.appendChild(table);
}

function cancelMySellOffer(offerId) {
    showCustomConfirm(
        "Are you sure you want to cancel this sell offer? The coins will be returned to your liquid balance.",
        () => {
            const offerIndex = sellOffers.findIndex(o => o.id === offerId && o.sellerId === currentUser.id && o.status === 'active');
            if (offerIndex > -1) {
                const offerToCancel = sellOffers[offerIndex];
                
                // Return coins to liquid balance
                currentUser.coinBalance += offerToCancel.amount;

                const asset = userAssets.find(a => a.id === offerToCancel.assetId);
                if (asset) {
                    asset.status = 'credited'; // Revert asset status
                }
                
                sellOffers.splice(offerIndex, 1);
                
                saveState();

                displayNotification('Sell offer cancelled and coins returned to liquid balance.', 'info');
                renderUserDashboard();
            } else {
                displayNotification('Offer not found or cannot be cancelled.', 'error');
            }
        },
        "Cancel Offer",
        "Yes, Cancel",
        "danger"
    );
}

function buyFromP2POffer(offerId) {
    if (!currentUser) { displayNotification('Please log in to buy offers.', 'warning'); return; }
    if (currentUser.kycStatus !== 'approved') { displayNotification('Your KYC must be approved to buy P2P offers.', 'warning'); return; }
    
    const isP2PLocked = (currentUser.p2pMarketRequiresInitialPurchase && !currentUser.hasMadeInitialSystemPurchase);
    if (isP2PLocked) {
        displayNotification('You must make an initial purchase from a seller to participate in the P2P market.', 'warning');
        return;
    }

    const offer = sellOffers.find(o => o.id === offerId);
    if (!offer || offer.status !== 'active') { displayNotification('Offer unavailable.', 'error'); renderMarketplaceItems(); return; }

    const price = offer.adminPrice;
    const currency = offer.adminCurrency;
    const totalPrice = offer.amount * price;

    const transaction = {
        id: generateId(), 
        type: 'p2p_purchase', 
        offerId: offer.id,
        buyerId: currentUser.id, 
        buyerName: currentUser.name,
        sellerId: offer.sellerId, 
        sellerName: offer.sellerName,
        amount: offer.amount, 
        totalPrice: totalPrice,
        currency: currency,
        status: 'awaiting_payment', 
        paymentProofFilename: null, 
        paymentProofDataUrl: null, 
        createdAt: new Date().toISOString()
    };
    transactions.push(transaction); 
    offer.status = 'pending_sale';
    saveState();
    renderUserDashboard();
    displayNotification(`Purchase initiated for offer ID ${offer.id.substring(0,8)}. Please proceed to 'Pending Transactions' to make payment and upload proof.`, 'info');
    addGlobalNotification(offer.sellerId, "P2P Offer Accepted", `${currentUser.name} wants to buy your listed asset. Awaiting their payment.`, 'ud-pending-transactions');
    showUserDashboardSection('ud-pending-transactions', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-pending-transactions"]'));
}

function renderUserPendingTransactions() {
    const pendingListDiv = document.getElementById('pending-transactions-list');
    if(!pendingListDiv || !currentUser) return;
    pendingListDiv.innerHTML = '';

    const myP2PTransactions = transactions.filter(t =>
        (t.buyerId === currentUser.id || t.sellerId === currentUser.id) &&
        (t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'resolved_by_admin' && t.status !== 'cancelled_by_admin')
    );

    const mySystemPurchases = systemPurchaseRequests.filter(req =>
        req.userId === currentUser.id &&
        (req.status !== 'completed' && req.status !== 'cancelled_by_admin')
    );

    const allPending = [...myP2PTransactions, ...mySystemPurchases].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (allPending.length === 0) { pendingListDiv.innerHTML = '<p>No pending transactions.</p>'; return; }

    allPending.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'transaction-item';
        let actionsHtml = '';
        let itemTitle = '';
        let itemDetailsHtml = '';

        if (item.type === 'p2p_purchase') {
            const tx = item;
            itemTitle = `<i class="fas fa-exchange-alt"></i> P2P Tx ID: ${tx.id.substring(0,8)}...`;
            const p2pSellerUser = users.find(u => u.id === tx.sellerId);
            let p2pSellerPaymentDetails = 'Seller details unavailable';
            if (p2pSellerUser && p2pSellerUser.kycData) {
                if (tx.currency === 'BTC') {
                    p2pSellerPaymentDetails = `<strong>BTC Wallet:</strong> ${p2pSellerUser.kycData.usdtWallet || 'Seller BTC Wallet Not Set!'}`;
                     if (!p2pSellerUser.kycData.usdtWallet && tx.buyerId === currentUser.id) actionsHtml += `<p style="padding:0.3rem; font-size:0.8rem; color:var(--danger-color);">Warning: Seller has not set a BTC wallet! Payment might be difficult.</p>`;
                } else {
                    p2pSellerPaymentDetails = `<strong>Bank:</strong> ${p2pSellerUser.kycData.bankName || 'N/A'} - <strong>Account:</strong> ${p2pSellerUser.kycData.bankAccount || 'N/A'}`;
                     if ((!p2pSellerUser.kycData.bankName || !p2pSellerUser.kycData.bankAccount) && tx.buyerId === currentUser.id) actionsHtml += `<p style="padding:0.3rem; font-size:0.8rem; color:var(--danger-color);">Warning: Seller has not set bank details! Payment might be difficult.</p>`;
                }
            }
            const displayTotalP2P = formatCurrency(tx.totalPrice, tx.currency);

            itemDetailsHtml = `
                <p>Type: P2P ${tx.buyerId === currentUser.id ? 'Purchase from' : 'Sale to'} <strong>${tx.buyerId === currentUser.id ? tx.sellerName : tx.buyerName}</strong></p>
                <p>Amount: ${tx.amount.toFixed(2)} COIN</p>
                <p>Total: ${displayTotalP2P}</p>
                <p>Status: <strong style="text-transform: capitalize;">${tx.status.replace(/_/g, ' ')}</strong></p>
            `;

            if (tx.buyerId === currentUser.id) { // Current user is BUYER
                if (tx.status === 'awaiting_payment') {
                    actionsHtml += `
                        <p><strong>Action:</strong> Pay ${displayTotalP2P} to ${tx.sellerName}.</p>
                        <div class="payment-details-highlight"><small>Payment to: ${p2pSellerPaymentDetails}</small></div>
                        <label for="proof-file-${tx.id}">Upload Payment Proof (P2P):</label>
                        <input type="file" id="proof-file-${tx.id}" accept="image/*,.pdf">
                        <button onclick="submitPaymentProof('${tx.id}')" class="accent">I Paid & Submit P2P Proof</button>
                        <button onclick="cancelP2PPurchaseAsBuyer('${tx.id}')" class="danger small" style="margin-left:10px;">Cancel Purchase</button>
                    `;
                } else if (tx.status === 'payment_proof_submitted') {
                    actionsHtml += `<p><strong>Status:</strong> Proof (${tx.paymentProofFilename || 'N/A'}) submitted. Waiting for ${tx.sellerName} to confirm.</p>`;
                    if (tx.paymentProofDataUrl && tx.paymentProofDataUrl.startsWith('data:image')) {
                         actionsHtml += `<p><img src="${tx.paymentProofDataUrl}" alt="Proof Preview" class="proof-image" style="cursor:pointer;" onclick="openProofViewerModal('${tx.paymentProofDataUrl}', 'Proof for P2P Tx: ${tx.id.substring(0,8)}')"></p>`;
                    }
                } else if (tx.status === 'disputed') {
                    actionsHtml += `<p style="color:var(--danger-color);"><strong>Status: Disputed.</strong> Awaiting admin review.</p>`;
                }
            } else if (tx.sellerId === currentUser.id) { // Current user is SELLER
                if (tx.status === 'payment_proof_submitted') {
                    actionsHtml += `
                        <p><strong>Action:</strong> ${tx.buyerName} submitted payment proof for ${displayTotalP2P}.</p>
                        <p><strong>Proof File: ${tx.paymentProofFilename || 'No file name.'}</strong></p>`;
                    if (tx.paymentProofDataUrl && tx.paymentProofDataUrl.startsWith('data:image')) {
                         actionsHtml += `<p><img src="${tx.paymentProofDataUrl}" alt="Payment Proof" class="proof-image" style="cursor:pointer;" onclick="openProofViewerModal('${tx.paymentProofDataUrl}', 'Proof for P2P Tx: ${tx.id.substring(0,8)}')"></p>`;
                    } else if (tx.paymentProofDataUrl) {
                        actionsHtml += `<p><small>Note: Proof is not an image or could not be previewed.</small></p>`;
                    } else {
                         actionsHtml += `<p><small>No proof image preview available.</small></p>`;
                    }
                    actionsHtml += `
                        <div style="padding: 0.5rem; margin-top: 0.5rem; background-color: #FFF9C4; border-left: 3px solid var(--warning-color);">Release coins ONLY if payment is verified in your account!</div>
                        <button onclick="confirmPaymentAndReleaseCoins('${tx.id}')" class="accent">Confirm Payment & Finalize</button>
                         <button onclick="disputeP2PTransaction('${tx.id}')" class="danger small" style="margin-left:10px;">Dispute (Admin Review)</button>
                    `;
                } else if (tx.status === 'awaiting_payment') {
                     actionsHtml += `<p><strong>Status:</strong> Waiting for ${tx.buyerName} to pay ${displayTotalP2P}.</p>
                                   <button onclick="cancelP2PSaleAsSeller('${tx.id}')" class="danger small">Cancel Sale (No Payment)</button>`;
                } else if (tx.status === 'disputed') {
                    actionsHtml += `<p style="color:var(--danger-color);"><strong>Status: Disputed.</strong> Awaiting admin review.</p>`;
                }
            }
        } else if (item.type === 'system_plan_purchase') {
            const req = item;
            itemTitle = `<i class="fas fa-store"></i> Seller Program Purchase ID: ${req.id.substring(0,8)}...`;
            const displayTotalSys = req.planDetails ? formatCurrency(req.planDetails.cost, req.planDetails.currency) : 'N/A';
            const planNameDisplay = req.planDetails ? `Program: <strong>${req.planDetails.name}</strong>` : ``;
            const coinsDisplay = req.planDetails ? `Total Return: ${req.planDetails.totalReturnCoins.toFixed(2)} COIN` : '';

            let sellerPaymentDetailsSys = "<strong>Seller payment details for this program:</strong><br>";
            if(req.planDetails && req.planDetails.paymentInfo) {
                if (req.planDetails.paymentInfo.bankName && req.planDetails.paymentInfo.bankAccount) {
                    sellerPaymentDetailsSys += `Bank: ${req.planDetails.paymentInfo.bankName}, Acc: ${req.planDetails.paymentInfo.bankAccount}<br>`;
                }
                if (req.planDetails.paymentInfo.btcWallet) {
                    sellerPaymentDetailsSys += `BTC Wallet: ${req.planDetails.paymentInfo.btcWallet}`;
                }
                 if (!req.planDetails.paymentInfo.bankName && !req.planDetails.paymentInfo.btcWallet && !(req.planDetails.paymentInfo.bankName && req.planDetails.paymentInfo.bankAccount)) {
                   sellerPaymentDetailsSys += "Not configured by Seller.";
                }
            } else {
                sellerPaymentDetailsSys += "Configuration Error."
            }

             itemDetailsHtml = `
                <p>${planNameDisplay}</p>
                ${coinsDisplay ? `<p>${coinsDisplay}</p>` : ''}
                <p>Total Price: ${displayTotalSys}</p>
                <p>Status: <strong style="text-transform: capitalize;">${req.status.replace(/_/g, ' ')}</strong></p>
            `;

            if (req.status === 'awaiting_payment_to_seller') {
                actionsHtml = `
                    <p><strong>Action:</strong> Pay ${displayTotalSys} to Seller.</p>
                    <div class="payment-details-highlight"><small>${sellerPaymentDetailsSys}</small></div>
                    <label for="proof-file-system-${req.id}">Upload Payment Proof (Seller Plan):</label>
                    <input type="file" id="proof-file-system-${req.id}" accept="image/*,.pdf">
                    <button onclick="submitSystemPaymentProof('${req.id}')" class="accent">I Paid Seller & Submit Proof</button>
                    <button onclick="cancelSystemPlanPurchase('${req.id}')" class="danger small" style="margin-left:10px;">Cancel Purchase</button>
                `;
            } else if (req.status === 'payment_proof_submitted_to_seller') {
                actionsHtml = `<p><strong>Status:</strong> Proof (${req.paymentProofFilename || 'N/A'}) submitted. Waiting for Seller to approve and start your asset program.</p>`;
                 if (req.paymentProofDataUrl && req.paymentProofDataUrl.startsWith('data:image')) {
                    actionsHtml += `<p><img src="${req.paymentProofDataUrl}" alt="Proof Preview" class="proof-image" style="cursor:pointer;" onclick="openProofViewerModal('${req.paymentProofDataUrl}', 'Proof for System Program Purchase: ${req.id.substring(0,8)}')"></p>`;
                }
            } else if (req.status === 'cancelled_by_admin') {
                 actionsHtml = `<p style="padding:0.5rem; color:var(--danger-color); border:1px solid var(--danger-color); border-radius:4px;">Your request was cancelled by the Seller.</p>`;
            }
        }

        itemDiv.innerHTML = `
            <h4>${itemTitle} <small>(${new Date(item.createdAt).toLocaleDateString()})</small></h4>
            ${itemDetailsHtml}
            ${actionsHtml}
        `;
        pendingListDiv.appendChild(itemDiv);
    });
}
function submitPaymentProof(transactionId) {
    const tx = transactions.find(t => t.id === transactionId);
    const fileInput = document.getElementById(`proof-file-${tx.id}`);
    if (!tx || !fileInput) { displayNotification('Transaction or file input not found.', 'error'); return; }
    if (tx.buyerId !== currentUser.id) { displayNotification('Only the buyer can submit proof.', 'error'); return;}

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 2 * 1024 * 1024) {
            displayNotification("File too large for preview (max 2MB). Filename stored.", "warning");
            tx.paymentProofFilename = file.name; tx.paymentProofDataUrl = null;
        } else {
            tx.paymentProofFilename = file.name;
            const reader = new FileReader();
            reader.onload = function(e) { tx.paymentProofDataUrl = e.target.result; saveState(); renderUserPendingTransactions(); };
            reader.onerror = function(e) { console.error("File reading error:", e); tx.paymentProofDataUrl = null; saveState(); renderUserPendingTransactions();};
            reader.readAsDataURL(file);
        }
        tx.status = 'payment_proof_submitted';
        saveState(); renderUserPendingTransactions();
        displayNotification(`Payment proof (${tx.paymentProofFilename}) submitted for Tx ID ${tx.id.substring(0,8)}. Waiting for seller confirmation.`, 'success');
        addGlobalNotification(tx.sellerId, "P2P Payment Proof Submitted", `${tx.buyerName} submitted payment proof for your offer. Please verify and finalize the transaction.`, 'ud-pending-transactions');
    } else { displayNotification('Please select a file to upload as proof of payment.', 'error'); return; }
}

function confirmPaymentAndReleaseCoins(transactionId) {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx || tx.sellerId !== currentUser.id) { displayNotification('Transaction not found or you are not the seller.', 'error'); return;}

    const buyer = users.find(u => u.id === tx.buyerId);
    if (!buyer) { displayNotification('Buyer not found. Cannot complete transaction.', 'error'); return; }
    
    const seller = currentUser;
    const offer = sellOffers.find(o => o.id === tx.offerId);
    if (!offer) { displayNotification('Original P2P offer not found. Transaction cannot be completed.', 'error'); return; }

    // Seller's payment is external. We now process what the buyer receives.
    // Buyer gets base coins instantly and a new maturing asset for the profit
    buyer.coinBalance += offer.amount; // Base coins are liquid immediately

    const profitCoins = offer.amount * (offer.adminReturnPercentage / 100);
    const newAssetForBuyer = {
        id: generateId(),
        userId: buyer.id,
        userName: buyer.name,
        planId: offer.id, // Use offer ID as a reference
        planName: `${offer.adminPlanName || `P2P Program from ${seller.name}`} (Profit Portion)`,
        purchaseDate: new Date().toISOString(),
        maturityDate: new Date(Date.now() + offer.adminMaturityDurationSeconds * 1000).toISOString(),
        baseCoins: offer.amount, // The base they bought
        returnPercentage: offer.adminReturnPercentage,
        totalReturnCoins: profitCoins, // The asset itself only tracks the profit
        status: 'repackaged_profit_maturing', // Differentiated status for P2P profit
        origin: { 
            type: 'p2p_repackaged',
            cost: offer.amount * offer.adminPrice,
            currency: offer.adminCurrency,
            baseCoins: offer.amount,
            returnPercentage: offer.adminReturnPercentage,
            maturityDurationSeconds: offer.adminMaturityDurationSeconds
        }
    };
    userAssets.push(newAssetForBuyer);
    addGlobalNotification(buyer.id, "P2P Program Approved", `Your purchase from ${seller.name} is complete. Base coins are now liquid, and your profit portion is maturing.`, 'ud-my-assets', 'success');
    
    tx.status = 'completed';
    offer.status = 'sold';

    // Mark the original seller's asset as sold
    const originalAsset = userAssets.find(a => a.id === offer.assetId);
    if (originalAsset) {
        originalAsset.status = 'sold';
    }

    saveState();
    renderUserDashboard();
    displayNotification(`Payment confirmed. Transaction with ${buyer.name} is complete.`, 'success');
}

function cancelP2PPurchaseAsBuyer(transactionId) {
    const tx = transactions.find(t => t.id === transactionId && t.buyerId === currentUser.id);
    if (!tx) {
        displayNotification('Transaction not found or you are not the buyer.', 'error');
        return;
    }
    if (tx.status !== 'awaiting_payment') {
        displayNotification('This purchase can only be cancelled if payment is still awaited and no proof has been submitted.', 'warning');
        return;
    }

    showCustomConfirm(
        "Are you sure you want to cancel this P2P purchase? The seller's offer will become active again.",
        () => {
            tx.status = 'cancelled'; // Mark transaction as cancelled
            const originalOffer = sellOffers.find(o => o.id === tx.offerId);
            if (originalOffer && originalOffer.status === 'pending_sale') {
                originalOffer.status = 'active'; // Make the original offer active again
            }
            saveState();
            renderUserDashboard();
            displayNotification(`P2P Purchase ${tx.id.substring(0,8)} cancelled.`, 'info');
            addGlobalNotification(tx.sellerId, 'P2P Purchase Cancelled by Buyer', `Buyer ${currentUser.name} has cancelled their purchase attempt for your offer. Your offer is active again.`, 'ud-p2p-market', 'warning');
        }, "Cancel Purchase", "Yes, Cancel Purchase", "danger"
    );
}

function disputeP2PTransaction(transactionId) {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx || (tx.sellerId !== currentUser.id && tx.buyerId !== currentUser.id)) {
        displayNotification('Transaction not found or you are not part of it.', 'error');
        return;
    }
    if (tx.status !== 'payment_proof_submitted' && tx.status !== 'awaiting_payment') {
        displayNotification('This transaction cannot be disputed at its current stage.', 'warning');
        return;
    }

    showCustomConfirm(
        "Are you sure you want to dispute this transaction? An admin will review it. This action cannot be undone by you.",
        () => {
            tx.status = 'disputed';
            tx.disputedBy = currentUser.id;
            tx.disputedAt = new Date().toISOString();
            saveState();
            renderUserPendingTransactions();
            displayNotification(`Transaction ${tx.id.substring(0,8)} has been marked as disputed. Admin will review.`, 'info');
            addGlobalNotification('admin', 'P2P Transaction Disputed', `User ${currentUser.name} disputed P2P Tx ID ${tx.id.substring(0,8)}. Please review.`, 'ad-p2p-tx');
            const otherPartyId = tx.sellerId === currentUser.id ? tx.buyerId : tx.sellerId;
            addGlobalNotification(otherPartyId, 'P2P Transaction Disputed', `Transaction ${tx.id.substring(0,8)} has been disputed by the other party. Admin will review.`, 'ud-pending-transactions', 'warning');
        }, "Dispute Transaction", "Yes, Dispute", "danger"
    );
}

function cancelP2PSaleAsSeller(transactionId) {
    const tx = transactions.find(t => t.id === transactionId && t.sellerId === currentUser.id);
    if (!tx) {
        displayNotification('Transaction not found or you are not the seller.', 'error');
        return;
    }
    if (tx.status !== 'awaiting_payment') {
        displayNotification('This sale can only be cancelled if payment is still awaited.', 'warning');
        return;
    }

    showCustomConfirm(
        "Are you sure you want to cancel this sale? The buyer has not yet paid. Your P2P offer will be active again.",
        () => {
            tx.status = 'cancelled';
            const originalOffer = sellOffers.find(o => o.id === tx.offerId);
            if (originalOffer && originalOffer.status === 'pending_sale') { 
                originalOffer.status = 'active';
            }
            saveState();
            renderUserDashboard();
            displayNotification(`Sale ${tx.id.substring(0,8)} cancelled. Offer relisted.`, 'info');
            addGlobalNotification(tx.buyerId, 'P2P Sale Cancelled', `The seller has cancelled the P2P sale (Tx ID ${tx.id.substring(0,8)}) as payment was not received.`, 'ud-p2p-history', 'warning');
        }, "Cancel Sale", "Yes, Cancel Sale", "danger"
    );
}

function renderP2PTransactionHistory() {
    const historyListDiv = document.getElementById('p2p-history-list');
    if (!currentUser || !historyListDiv) return;
    const userTransactions = transactions.filter(tx => (tx.buyerId === currentUser.id || tx.sellerId === currentUser.id) && (tx.status === 'completed' || tx.status === 'cancelled' || tx.status === 'resolved_by_admin' || tx.status === 'cancelled_by_admin')).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (userTransactions.length === 0) { historyListDiv.innerHTML = '<p>No completed or cancelled P2P transactions.</p>'; return; }
    historyListDiv.innerHTML = '';
    const table = document.createElement('table'); table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Date</th><th>ID</th><th>Type</th><th>Counterparty</th><th>Amount (COIN)</th><th>Fiat/BTC Value</th><th>Status</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    userTransactions.forEach(tx => {
        const tr = tbody.insertRow();
        const type = tx.buyerId === currentUser.id ? 'Bought' : 'Sold';
        const counterparty = tx.buyerId === currentUser.id ? tx.sellerName : tx.buyerName;
        const displayFiat = formatCurrency(tx.totalPrice, tx.currency);
        tr.innerHTML = `<td>${new Date(tx.createdAt).toLocaleDateString()}</td>
                        <td>${tx.id.substring(0,8)}...</td>
                        <td>${type}</td>
                        <td>${counterparty}</td>
                        <td>${tx.amount.toFixed(2)}</td>
                        <td>${displayFiat}</td>
                        <td style="text-transform: capitalize;">${tx.status.replace(/_/g, ' ')}</td>`;
    });
    historyListDiv.appendChild(table);
}

function exportP2PTransactionHistoryPDF() {
    if (!currentUser) return;
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    const userTransactions = transactions.filter(tx => (tx.buyerId === currentUser.id || tx.sellerId === currentUser.id) && (tx.status === 'completed' || tx.status === 'cancelled' || tx.status === 'resolved_by_admin' || tx.status === 'cancelled_by_admin')).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (userTransactions.length === 0) { displayNotification('No history to export.', 'info'); return; }
    const tableColumn = ["Date", "ID", "Type", "Counterparty", "Amount (COIN)", "Value", "Status"]; const tableRows = [];
    userTransactions.forEach(tx => {
        const type = tx.buyerId === currentUser.id ? 'Bought' : 'Sold';
        const counterparty = tx.buyerId === currentUser.id ? tx.sellerName : tx.buyerName;
        const displayFiat = formatCurrency(tx.totalPrice, tx.currency);
        tableRows.push([ new Date(tx.createdAt).toLocaleDateString(), tx.id.substring(0,8), type, counterparty, tx.amount.toFixed(2).toString(), displayFiat, tx.status.replace(/_/g, ' ') ]);
    });
    doc.autoTable(tableColumn, tableRows, { startY: 20 });
    doc.text(`P2P History for ${currentUser.name}`, 14, 15);
    doc.save(`p2p_history_${currentUser.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
    displayNotification('P2P history PDF exported.', 'success');
}

function cancelSystemPlanPurchase(requestId) {
    const requestIndex = systemPurchaseRequests.findIndex(req => req.id === requestId && req.userId === currentUser.id);
    if (requestIndex === -1) {
        displayNotification("Purchase request not found or does not belong to you.", "error");
        return;
    }
    const request = systemPurchaseRequests[requestIndex];
    if (request.status !== 'awaiting_payment_to_seller') {
        displayNotification("This purchase can only be cancelled while awaiting payment.", "warning");
        return;
    }

    showCustomConfirm(
        `Are you sure you want to cancel your purchase request for the program "${request.planDetails.name}"?`,
        () => {
            systemPurchaseRequests.splice(requestIndex, 1);
            saveState();
            renderUserPendingTransactions();
            displayNotification("Purchase request cancelled successfully.", "info");
            addGlobalNotification('admin', 'Seller Sale Cancelled', `${currentUser.name} cancelled their purchase request for program '${request.planDetails.name}'.`, 'ad-system-sale-requests', 'warning');
        },
        "Cancel Purchase Request", "Yes, Cancel", "danger"
    );
}

function submitSystemPaymentProof(requestId) {
    const req = systemPurchaseRequests.find(r => r.id === requestId);
    const fileInput = document.getElementById(`proof-file-system-${req.id}`);
    if (!req || !fileInput) { displayNotification('Request or file input not found.', 'error'); return; }

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
         if (file.size > 2 * 1024 * 1024) {
            displayNotification("File too large for preview (max 2MB). Filename stored.", "warning");
            req.paymentProofFilename = file.name; req.paymentProofDataUrl = null;
        } else {
            req.paymentProofFilename = file.name;
            const reader = new FileReader();
            reader.onload = function(e) { req.paymentProofDataUrl = e.target.result; saveState(); renderUserPendingTransactions(); };
            reader.onerror = function(e) { console.error("File reading error:", e); req.paymentProofDataUrl = null; saveState(); renderUserPendingTransactions();};
            reader.readAsDataURL(file);
        }
        req.status = 'payment_proof_submitted_to_seller';
        saveState(); renderUserPendingTransactions();
        displayNotification(`Proof (${req.paymentProofFilename}) submitted to Seller for program purchase.`, 'success');
        addGlobalNotification('admin', 'Seller Sale Proof', `${req.userName} submitted proof for program '${req.planDetails.name}'.`, 'ad-system-sale-requests');
    } else { displayNotification('Select a file for proof.', 'error'); return; }
}

// --- Asset Program (User) ---
function renderUserAssets() {
    const assetsListDiv = document.getElementById('user-assets-list');
    if (!assetsListDiv || !currentUser) return;

    const myAssets = userAssets.filter(asset => asset.userId === currentUser.id)
        .sort((a,b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));

    if (myAssets.length === 0) {
        assetsListDiv.innerHTML = '<p>You have not purchased any asset programs yet. Visit the "Marketplace" page to start.</p>';
        return;
    }
    
    assetsListDiv.innerHTML = ''; // Clear previous render

    myAssets.forEach(asset => {
        const assetDiv = document.createElement('div');
        assetDiv.className = 'asset-item';
        assetDiv.id = `asset-${asset.id}`;

        let statusHtml = '';
        const isRepackagedProfit = asset.status === 'repackaged_profit_maturing';
        
        if (asset.status === 'maturing' || isRepackagedProfit) {
            statusHtml = `
                <p><strong>Status:</strong> ${isRepackagedProfit ? 'Maturing (P2P Profit)' : 'Maturing'}</p>
                <div class="asset-item-countdown" id="countdown-${asset.id}">Calculating...</div>`;
        } else if (asset.status === 'credited') {
            assetDiv.classList.add('matured');
            statusHtml = `
                <p style="color: var(--success-color);"><strong>Status: Matured & Credited</strong></p>
                <button onclick="listAssetOnP2P('${asset.id}')" class="accent"><i class="fas fa-bullhorn"></i> List on P2P Market</button>
            `;
        } else if (asset.status === 'listed_on_market') {
            statusHtml = `<p><strong>Status:</strong> <span style="color: var(--accent-color);">Active on P2P Market</span></p>`;
        } else if (asset.status === 'sold') {
            statusHtml = `<p><strong>Status:</strong> <span style="color: var(--success-color);">Sold on P2P Market</span></p>`;
        }

        const baseCoinInfo = isRepackagedProfit ? 
            `<p><small><strong>Original Base:</strong> ${asset.baseCoins.toFixed(2)} COIN (instantly liquid)</small></p>` :
            `<p><strong>Base Coins:</strong> ${asset.baseCoins.toFixed(2)} COIN</p>`;
        
        const profitInfo = isRepackagedProfit ?
            `<p><strong>Maturing Profit:</strong> ${asset.totalReturnCoins.toFixed(2)} COIN</p>` :
            `<p><strong>Total Return:</strong> ${asset.totalReturnCoins.toFixed(2)} COIN</p>`;

        assetDiv.innerHTML = `
            <h5><i class="fas fa-project-diagram"></i> ${asset.planName}</h5>
            <p><strong>Purchased:</strong> ${new Date(asset.purchaseDate).toLocaleDateString()}</p>
            ${baseCoinInfo}
            ${profitInfo}
            ${statusHtml}
        `;
        assetsListDiv.appendChild(assetDiv);
    });
    
    startAssetCountdowns();
}

/**
 * [FIXED] This function was missing. It creates and manages the countdown timers for maturing assets.
 * When an asset matures, it updates the user's balance and the asset's status.
 */
function startAssetCountdowns() {
    if (userAssetCountdownInterval) clearInterval(userAssetCountdownInterval);
    if (!currentUser || currentUser.isAdmin) return;

    const maturingAssets = userAssets.filter(asset => 
        asset.userId === currentUser.id && 
        (asset.status === 'maturing' || asset.status === 'repackaged_profit_maturing')
    );

    if (maturingAssets.length === 0) return;

    userAssetCountdownInterval = setInterval(() => {
        let needsDashboardUpdate = false;
        
        // Use a static list for the loop iteration to avoid issues if the main array is modified
        const assetsToCheck = userAssets.filter(asset => 
            asset.userId === currentUser.id && 
            (asset.status === 'maturing' || asset.status === 'repackaged_profit_maturing')
        );

        if (assetsToCheck.length === 0) {
             clearInterval(userAssetCountdownInterval);
             userAssetCountdownInterval = null;
             return;
        }

        assetsToCheck.forEach(asset => {
            const countdownEl = document.getElementById(`countdown-${asset.id}`);
            if (!countdownEl) return;

            const maturityDate = new Date(asset.maturityDate);
            const now = new Date();
            const timeLeftSeconds = Math.max(0, (maturityDate.getTime() - now.getTime()) / 1000);

            if (timeLeftSeconds > 0) {
                const days = Math.floor(timeLeftSeconds / 86400);
                const hours = Math.floor((timeLeftSeconds % 86400) / 3600);
                const minutes = Math.floor((timeLeftSeconds % 3600) / 60);
                const seconds = Math.floor(timeLeftSeconds % 60);
                countdownEl.textContent = `Matures in: ${days}d ${hours}h ${minutes}m ${seconds}s`;
            } else {
                // Asset has matured, check status to prevent multiple credits
                if (asset.status === 'maturing' || asset.status === 'repackaged_profit_maturing') {
                    currentUser.coinBalance += asset.totalReturnCoins;
                    asset.status = 'credited';
                    
                    const notificationTitle = "Asset Matured!";
                    const notificationMessage = `Your asset "${asset.planName}" has matured. ${asset.totalReturnCoins.toFixed(2)} COINs have been added to your liquid balance. You can now list it on the P2P market.`;
                    
                    addGlobalNotification(currentUser.id, notificationTitle, notificationMessage, 'ud-my-assets', 'success');
                    displayNotification(notificationMessage, 'success');
                    
                    needsDashboardUpdate = true;
                }
            }
        });

        if (needsDashboardUpdate) {
            saveState();
            // Re-render the relevant parts of the dashboard to reflect changes
            renderUserAssets(); // This will update the list and restart the countdowns for any remaining assets
            renderUserCoinChart();
            document.getElementById('coin-balance').textContent = currentUser.coinBalance.toFixed(2);
        }
    }, 1000);
}


function listAssetOnP2P(assetId) {
    // 1. Find the TRIGGERING asset. We still need its origin for pricing.
    const triggeringAsset = userAssets.find(a => a.id === assetId && a.userId === currentUser.id && a.status === 'credited');
    if (!triggeringAsset) {
        displayNotification("Could not find a valid credited asset to trigger the sale.", "error");
        return;
    }

    // 2. The amount to list is the USER'S ENTIRE LIQUID BALANCE.
    const amountToList = currentUser.coinBalance;

    // 3. Check if there's anything to list.
    if (amountToList <= 0) {
        displayNotification(`You have no liquid COINs to list. Your balance is 0.`, "error");
        return;
    }

    // 4. Get the pricing info from the TRIGGERING asset's origin.
    let originData;
    if (triggeringAsset.origin && (triggeringAsset.origin.type === 'system' || triggeringAsset.origin.type === 'p2p_repackaged')) {
        originData = triggeringAsset.origin;
    }

    if (!originData || originData.cost === undefined || originData.baseCoins === undefined || originData.baseCoins <= 0) {
        displayNotification("Error: The triggering asset's origin is unclear, cannot determine price. Please contact support.", "error");
        console.error("Triggering asset missing or invalid origin data:", triggeringAsset);
        return;
    }
    
    // 5. Calculate pricing for the new offer based on the ENTIRE liquid balance.
    const costPerBaseCoin = originData.cost / originData.baseCoins;
    const newOfferTotalValue = amountToList * costPerBaseCoin;
    const newOfferPricePerCoin = (amountToList > 0) ? newOfferTotalValue / amountToList : 0; // This will be the same as costPerBaseCoin
    const newOfferCurrency = originData.currency || systemSaleConfig.defaultSystemCurrency;
    const newOfferReturnPercentage = originData.returnPercentage;
    const newOfferMaturityDuration = originData.maturityDurationSeconds;

    // 6. Update the confirmation message to be clear and match the new logic.
    const confirmationMessage = `This will list your <strong>entire liquid balance (${amountToList.toFixed(2)} COINs)</strong> on the P2P market. Your liquid balance will be set to 0 and these coins will be held for the sale.<br><br>Do you want to proceed?`;

    // 7. Show the confirmation modal.
    showCustomConfirm(
        confirmationMessage,
        () => {
            const result = createP2PListingFromLiquidBalance(currentUser, originData);
            if (result.success) {
                saveState();
                renderUserDashboard();
                displayNotification("Your entire liquid balance has been successfully listed on the P2P market.", "success");
                addGlobalNotification('admin', 'New P2P Offer', `${currentUser.name} listed their entire liquid balance (${result.offer.amount.toFixed(2)} COINs) for sale.`, 'ad-manage-p2p-offers');
            } else {
                displayNotification(result.message, "error");
            }
        }, "Confirm P2P Sale", "Yes, List Asset", "accent"
    );
}

function createP2PListingFromLiquidBalance(userToList, originData) {
    const amountToList = userToList.coinBalance;
    if (amountToList <= 0) {
        return { success: false, message: "No liquid COINs to list." };
    }

    if (!originData || originData.cost === undefined || originData.baseCoins === undefined || originData.baseCoins <= 0) {
        console.error("P2P Listing Error: Invalid origin data provided.", originData);
        return { success: false, message: "Cannot create P2P offer due to missing or invalid pricing origin data." };
    }
    
    const costPerBaseCoin = originData.cost / originData.baseCoins;
    const newOfferTotalValue = amountToList * costPerBaseCoin;
    const newOfferPricePerCoin = (amountToList > 0) ? newOfferTotalValue / amountToList : 0;
    const newOfferCurrency = originData.currency || systemSaleConfig.defaultSystemCurrency;
    const newOfferReturnPercentage = originData.returnPercentage;
    const newOfferMaturityDuration = originData.maturityDurationSeconds;

    const newOffer = {
        id: generateId(),
        assetId: originData.id || `admin_credit_${generateId()}`,
        sellerId: userToList.id,
        sellerName: userToList.name,
        amount: amountToList,
        adminModified: true, 
        adminPlanName: `P2P Program from ${userToList.name}`,
        adminPrice: newOfferPricePerCoin,
        adminCurrency: newOfferCurrency,
        adminReturnPercentage: newOfferReturnPercentage,
        adminMaturityDurationSeconds: newOfferMaturityDuration,
        status: 'active',
        createdAt: new Date().toISOString()
    };
    sellOffers.push(newOffer);
    userToList.coinBalance = 0; 
    
    userAssets.forEach(asset => {
        if (asset.userId === userToList.id && asset.status === 'credited') {
            asset.status = 'listed_on_market';
        }
    });
    
    return { success: true, offer: newOffer };
}

// --- Withdrawal Feature (User) ---
function populateWithdrawalDestination() {
    if (!currentUser) return;
    const currencySelect = document.getElementById('withdraw-currency');
    const destinationInfoEl = document.getElementById('withdraw-destination-info');
    if (!currencySelect || !destinationInfoEl) return;

    const selectedCurrency = currencySelect.value;
    let destinationText = "KYC details not found or not approved.";

    if (currentUser.kycStatus === 'approved' && currentUser.kycData) {
        if (selectedCurrency === 'USD' || selectedCurrency === 'ZAR') {
            if (currentUser.kycData.bankName && currentUser.kycData.bankAccount) {
                destinationText = `Bank: ${currentUser.kycData.bankName}, Account: ${currentUser.kycData.bankAccount}`;
            } else {
                destinationText = `Your ${selectedCurrency} bank details are not set in KYC.`;
            }
        } else if (selectedCurrency === 'BTC') {
            if (currentUser.kycData.usdtWallet) { 
                destinationText = `BTC (via USDT Wallet): ${currentUser.kycData.usdtWallet}`;
            } else {
                destinationText = `Your BTC/USDT wallet is not set in KYC.`;
            }
        }
    }
    destinationInfoEl.textContent = destinationText;
}


function handleWithdrawalRequest() {
    if (!currentUser || currentUser.kycStatus !== 'approved') {
        displayNotification('Your KYC must be approved to request withdrawals.', 'warning');
        return;
    }

    const currency = document.getElementById('withdraw-currency').value;
    const amount = parseFloat(document.getElementById('withdraw-amount').value);

    if (isNaN(amount) || amount <= 0) {
        displayNotification('Please enter a valid positive amount to withdraw.', 'error');
        return;
    }

    if (!currentUser.walletBalance || currentUser.walletBalance[currency] === undefined || currentUser.walletBalance[currency] < amount) {
        displayNotification(`Insufficient ${currency} balance. You have ${formatCurrency(currentUser.walletBalance[currency] || 0, currency)}.`, 'error');
        return;
    }

    let destinationValid = false;
    if (currency === 'USD' || currency === 'ZAR') {
        destinationValid = currentUser.kycData.bankName && currentUser.kycData.bankAccount;
    } else if (currency === 'BTC') {
        destinationValid = currentUser.kycData.usdtWallet;
    }

    if (!destinationValid) {
        displayNotification(`Your destination ${currency === 'BTC' ? 'BTC/USDT wallet' : 'bank details'} are not set in your KYC. Please update them.`, 'error');
        showUserDashboardSection('ud-kyc', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-kyc"]'));
        return;
    }

    const newRequest = {
        id: generateId(),
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        amount: amount,
        currency: currency,
        destination: currency === 'BTC' ? `BTC Wallet: ${currentUser.kycData.usdtWallet}` : `Bank: ${currentUser.kycData.bankName} - Acc: ${currentUser.kycData.bankAccount}`,
        status: 'pending_admin_approval',
        requestedAt: new Date().toISOString(),
        processedAt: null,
        adminNotes: null
    };

    currentUser.walletBalance[currency] -= amount; // Deduct from balance immediately (held)
    withdrawalRequests.unshift(newRequest);
    saveState();

    displayNotification(`Withdrawal request for ${formatCurrency(amount, currency)} submitted. Admin will review within 48 hours.`, 'success');
    addGlobalNotification('admin', 'New Withdrawal Request', `${currentUser.name} requested to withdraw ${formatCurrency(amount, currency)}.`, 'ad-withdrawal-requests', 'info');

    document.getElementById('withdraw-amount').value = '';
    renderUserWithdrawalHistory();
    renderWalletBalances(); 
}

function renderUserWithdrawalHistory() {
    const listDiv = document.getElementById('user-withdrawal-history-list');
    if (!listDiv || !currentUser) return;

    const myRequests = withdrawalRequests.filter(req => req.userId === currentUser.id)
        .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    listDiv.innerHTML = '';

    if (myRequests.length === 0) {
        listDiv.innerHTML = '<p>You have not made any withdrawal requests.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Date</th><th>Amount</th><th>Currency</th><th>Destination</th><th>Status</th><th>Admin Notes</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    myRequests.forEach(req => {
        const tr = tbody.insertRow();
        let statusDisplay = req.status.replace(/_/g, ' ');
        if (req.status === 'approved') {
            statusDisplay = 'Approved (Awaiting Offline Payment)';
        }
        tr.innerHTML = `
            <td>${new Date(req.requestedAt).toLocaleDateString()}</td>
            <td>${formatCurrency(req.amount, req.currency)}</td>
            <td>${req.currency}</td>
            <td>${req.destination}</td>
            <td style="text-transform: capitalize;">${statusDisplay}</td>
            <td>${req.adminNotes || 'N/A'}</td>
        `;
    });
    listDiv.appendChild(table);
}


// --- Support Tickets (User & Admin) ---
function createNewSupportTicket() {
    if (!currentUser) { displayNotification('Please log in to create a support ticket.', 'error'); return; }
    const subject = document.getElementById('ticket-subject').value.trim();
    const message = document.getElementById('ticket-message').value.trim();

    if (!subject || !message) {
        displayNotification("Subject and message are required for a support ticket.", "error");
        return;
    }

    const newTicket = {
        id: generateId(),
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        subject: subject,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
            {
                senderId: currentUser.id,
                senderName: currentUser.name,
                text: message,
                timestamp: new Date().toISOString()
            }
        ]
    };
    supportTickets.unshift(newTicket);
    saveState();
    displayNotification("Support ticket created successfully. We will get back to you soon.", "success");
    addGlobalNotification('admin', "New Support Ticket", `User ${currentUser.name} created a ticket: "${subject}"`, 'ad-support-tickets', 'info');

    document.getElementById('ticket-subject').value = '';
    document.getElementById('ticket-message').value = '';
    renderUserSupportTickets();
}

function renderUserSupportTickets() {
    const listDiv = document.getElementById('user-tickets-list');
    if (!listDiv || !currentUser) return;

    const myTickets = supportTickets.filter(t => t.userId === currentUser.id).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    listDiv.innerHTML = '';

    if (myTickets.length === 0) {
        listDiv.innerHTML = '<p>You have not created any support tickets yet.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Subject</th><th>Status</th><th>Last Updated</th><th>Action</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    myTickets.forEach(ticket => {
        const tr = tbody.insertRow();
        let statusClass = '';
        if (ticket.status === 'open' || ticket.status === 'admin_reply') statusClass = 'status-pending';
        else if (ticket.status === 'resolved_by_user' || ticket.status === 'closed_by_admin') statusClass = 'status-resolved';

        tr.innerHTML = `
            <td>${ticket.subject}</td>
            <td class="${statusClass}" style="text-transform: capitalize;">${ticket.status.replace(/_/g, ' ')}</td>
            <td>${new Date(ticket.updatedAt).toLocaleString()}</td>
            <td>
                <button onclick="openTicketDetailsModal('${ticket.id}')" class="button secondary small">View/Reply</button>
                ${(ticket.status !== 'resolved_by_user' && ticket.status !== 'closed_by_admin') ? `<button onclick="updateTicketStatus('${ticket.id}', 'resolved_by_user')" class="button accent small">Mark My Issue Resolved</button>` : ''}
            </td>
        `;
    });
    listDiv.appendChild(table);
}

function renderAdminSupportTickets() {
    const listDiv = document.getElementById('admin-tickets-list');
    if (!listDiv || !currentUser || !currentUser.isAdmin) return;

    const allTickets = [...supportTickets].sort((a, b) => {
        const statusPriority = (s) => {
            if (s === 'open' || s === 'user_reply') return 1;
            if (s === 'admin_reply') return 2;
            return 3;
        };
        if (statusPriority(a.status) !== statusPriority(b.status)) {
            return statusPriority(a.status) - statusPriority(b.status);
        }
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    listDiv.innerHTML = '';

    if (allTickets.length === 0) {
        listDiv.innerHTML = '<p>No support tickets found.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>User</th><th>Email</th><th>Subject</th><th>Status</th><th>Last Updated</th><th>Action</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    allTickets.forEach(ticket => {
        const tr = tbody.insertRow();
         let statusClass = '';
        if (ticket.status === 'open' || ticket.status === 'user_reply') statusClass = 'status-pending-admin';
        else if (ticket.status === 'resolved_by_user' || ticket.status === 'closed_by_admin') statusClass = 'status-resolved';

        tr.innerHTML = `
            <td>${ticket.userName} <small>(${ticket.userId.substring(0,4)})</small></td>
            <td>${ticket.userEmail || 'N/A'}</td>
            <td>${ticket.subject}</td>
            <td class="${statusClass}" style="text-transform: capitalize;">${ticket.status.replace(/_/g, ' ')}</td>
            <td>${new Date(ticket.updatedAt).toLocaleString()}</td>
            <td>
                <button onclick="openTicketDetailsModal('${ticket.id}')" class="button secondary small">View/Reply</button>
                 ${(ticket.status !== 'closed_by_admin') ? `<button onclick="updateTicketStatus('${ticket.id}', 'closed_by_admin')" class="button danger small">Close Ticket</button>` : ''}
            </td>
        `;
    });
    listDiv.appendChild(table);
}

function openTicketDetailsModal(ticketId) {
    currentOpenTicketId = ticketId;
    const ticket = supportTickets.find(t => t.id === ticketId);
    if (!ticket) {
        displayNotification("Ticket not found.", "error");
        return;
    }

    document.getElementById('ticket-details-subject').textContent = ticket.subject;
    document.getElementById('ticket-details-id').textContent = ticket.id.substring(0, 8) + "...";
    document.getElementById('ticket-details-status').textContent = ticket.status.replace(/_/g, ' ');

    const messagesContainer = document.getElementById('ticket-messages-container');
    messagesContainer.innerHTML = '';
    ticket.messages.forEach(msg => {
        const msgDiv = document.createElement('div');
        let messageClass = 'ticket-message ';
        
        // [FIXED] Corrected logic for assigning message class
        if (msg.senderId === 'admin_user') {
            messageClass += 'admin-message';
        } else {
            messageClass += 'user-message';
        }

        msgDiv.className = messageClass;

        msgDiv.innerHTML = `
            <strong>${msg.senderName}</strong>
            <p>${msg.text.replace(/\n/g, '<br>')}</p>
            <small>${new Date(msg.timestamp).toLocaleString()}</small>
        `;
        messagesContainer.appendChild(msgDiv);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    const replyArea = document.getElementById('ticket-reply-area');
    const statusButton = document.getElementById('ticket-modal-status-button');

    document.getElementById('ticket-reply-message').value = '';
    if (ticket.status === 'resolved_by_user' || ticket.status === 'closed_by_admin') {
        replyArea.classList.add('hidden');
        statusButton.classList.add('hidden');
    } else {
        replyArea.classList.remove('hidden');
        statusButton.classList.remove('hidden');
        if (currentUser.isAdmin) {
            statusButton.textContent = "Mark as Closed by Admin";
            statusButton.onclick = () => updateTicketStatus(ticket.id, 'closed_by_admin', true);
        } else {
            statusButton.textContent = "Mark My Issue Resolved";
            statusButton.onclick = () => updateTicketStatus(ticket.id, 'resolved_by_user', true);
        }
    }

    document.getElementById('ticket-details-modal').style.display = 'block';
}

function closeTicketDetailsModal() {
    document.getElementById('ticket-details-modal').style.display = 'none';
    currentOpenTicketId = null;
}

function submitTicketReply() {
    if (!currentOpenTicketId || !currentUser) { displayNotification('No ticket selected or not logged in.', 'error'); return;}
    const ticket = supportTickets.find(t => t.id === currentOpenTicketId);
    if (!ticket) {
        displayNotification("Error finding ticket to reply.", "error");
        return;
    }
     if (ticket.status === 'resolved_by_user' || ticket.status === 'closed_by_admin') {
        displayNotification("Cannot reply to a resolved or closed ticket.", "warning");
        return;
    }

    const replyMessage = document.getElementById('ticket-reply-message').value.trim();
    if (!replyMessage) {
        displayNotification("Reply message cannot be empty.", "error");
        return;
    }

    ticket.messages.push({
        senderId: currentUser.isAdmin ? 'admin_user' : currentUser.id,
        senderName: currentUser.name,
        text: replyMessage,
        timestamp: new Date().toISOString()
    });
    ticket.updatedAt = new Date().toISOString();

    if (currentUser.isAdmin) {
        ticket.status = 'admin_reply';
        addGlobalNotification(ticket.userId, "Admin Replied to Ticket", `Admin has replied to your support ticket: "${ticket.subject.substring(0,30)}..."`, 'ud-support-tickets', 'info');
    } else {
        ticket.status = 'user_reply';
        addGlobalNotification('admin', "User Replied to Ticket", `${currentUser.name} replied to ticket: "${ticket.subject.substring(0,30)}..."`, 'ad-support-tickets', 'info');
    }

    saveState();
    displayNotification("Reply sent successfully.", "success");

    openTicketDetailsModal(currentOpenTicketId);
    if (currentUser.isAdmin) {
        renderAdminSupportTickets();
    } else {
        renderUserSupportTickets();
    }
    document.getElementById('ticket-reply-message').value = '';
}

function updateTicketStatus(ticketId, newStatus, fromModal = false) {
    const ticket = supportTickets.find(t => t.id === ticketId);
    if (!ticket) {
        displayNotification("Ticket not found for status update.", "error");
        return;
    }
    const oldStatus = ticket.status;
    ticket.status = newStatus;
    ticket.updatedAt = new Date().toISOString();
    saveState();
    displayNotification(`Ticket status updated to: ${newStatus.replace(/_/g, ' ')}.`, "success");

    if(newStatus === 'resolved_by_user' && !currentUser.isAdmin){
        addGlobalNotification('admin', "Ticket Resolved by User", `User ${ticket.userName} marked ticket "${ticket.subject.substring(0,30)}..." as resolved.`, 'ad-support-tickets', 'info');
    } else if (newStatus === 'closed_by_admin' && currentUser.isAdmin){
         addGlobalNotification(ticket.userId, "Support Ticket Closed", `Admin has closed your support ticket: "${ticket.subject.substring(0,30)}..."`, 'ud-support-tickets', 'info');
    }

    if (currentUser.isAdmin) {
        renderAdminSupportTickets();
    } else {
        renderUserSupportTickets();
    }

     if (fromModal && currentOpenTicketId === ticketId) {
        openTicketDetailsModal(ticketId);
     } else if (fromModal && currentOpenTicketId !== ticketId) {
        closeTicketDetailsModal();
     }
}


// --- Admin Dashboard ---
function renderAdminDashboard() {
    if (!currentUser || !currentUser.isAdmin) return;
    sessionStorage.setItem('p2p_reform_currentUser', JSON.stringify(currentUser));

    renderAdminOverviewStats();
    loadSystemSaleGeneralSettingsForAdminForm();
    renderAdminSystemSalePlansList();
    renderAdminUserList();
    renderAdminKycRequests();
    renderAdminWithdrawalRequests();
    renderAdminSystemPurchaseRequests();
    renderAdminP2POffers();
    renderAdminP2PTransactions();
    renderAdminUserAssets();
    renderAdminSupportTickets();
    updateNotificationBellCount();

    const lastAdminSection = sessionStorage.getItem('p2p_reform_adminSection') || 'ad-overview';
    const buttonForAdminSection = document.querySelector(`#admin-dashboard-view .dashboard-sidebar button[onclick*="'${lastAdminSection}'"]`);
    if (buttonForAdminSection) {
        showAdminDashboardSection(lastAdminSection, buttonForAdminSection, true);
    } else {
        showAdminDashboardSection('ad-overview', document.querySelector('#admin-dashboard-view .dashboard-sidebar button[onclick*="ad-overview"]'), true);
    }
}

function renderAdminOverviewStats() {
    if (!currentUser || !currentUser.isAdmin) return;

    document.getElementById('admin-stat-total-users').textContent = users.length;
    const totalCoinsInMaturingAssets = userAssets.filter(a => a.status === 'maturing' || a.status === 'repackaged_profit_maturing').reduce((sum, a) => sum + a.totalReturnCoins, 0);
    document.getElementById('admin-stat-total-coins').textContent = totalCoinsInMaturingAssets.toFixed(2);
    document.getElementById('admin-stat-active-p2p-offers').textContent = sellOffers.filter(o => o.status === 'active').length;
    document.getElementById('admin-stat-pending-kyc').textContent = users.filter(u => u.kycStatus === 'pending').length;
    document.getElementById('admin-stat-pending-p2p').textContent = transactions.filter(tx => tx.status !== 'completed' && tx.status !== 'cancelled' && tx.status !== 'resolved_by_admin' && tx.status !== 'cancelled_by_admin').length;
    document.getElementById('admin-stat-pending-system-purchases').textContent = systemPurchaseRequests.filter(req => req.status !== 'completed' && req.status !== 'cancelled_by_admin').length;
    document.getElementById('admin-stat-pending-withdrawals').textContent = withdrawalRequests.filter(req => req.status === 'pending_admin_approval').length;
    document.getElementById('admin-stat-open-support-tickets').textContent = supportTickets.filter(t => t.status === 'open' || t.status === 'user_reply').length;
}

function loadSystemSaleGeneralSettingsForAdminForm() {
    document.getElementById('admin-sale-duration').value = systemSaleConfig.saleDurationSeconds || 300;
    document.getElementById('admin-cooldown-duration').value = systemSaleConfig.cooldownDurationSeconds || 60;
    document.getElementById('admin-default-currency').value = systemSaleConfig.defaultSystemCurrency || "USD";
    document.getElementById('current-default-system-currency-display').textContent = systemSaleConfig.defaultSystemCurrency || "USD";

    // P2P Requirement Toggle
    const p2pToggle = document.getElementById('admin-p2p-access-toggle');
    const p2pStatus = document.getElementById('admin-p2p-access-status');
    p2pToggle.checked = systemSaleConfig.p2pRequirementEnabled;
    p2pStatus.textContent = systemSaleConfig.p2pRequirementEnabled ? 'Enabled (Purchase Required)' : 'Disabled (Open Access)';
    p2pStatus.style.color = systemSaleConfig.p2pRequirementEnabled ? 'var(--danger-color)' : 'var(--success-color)';
}

function toggleP2PRequirementDefault() {
    const p2pToggle = document.getElementById('admin-p2p-access-toggle');
    systemSaleConfig.p2pRequirementEnabled = p2pToggle.checked;
    saveState();
    loadSystemSaleGeneralSettingsForAdminForm(); // Refresh the display
    displayNotification(`Default P2P access requirement is now ${systemSaleConfig.p2pRequirementEnabled ? 'ENABLED' : 'DISABLED'}.`, 'info');
}

function saveDefaultSystemCurrency() {
    const newDefaultCurrency = document.getElementById('admin-default-currency').value;
    if (newDefaultCurrency && (newDefaultCurrency === "USD" || newDefaultCurrency === "ZAR" || newDefaultCurrency === "BTC")) {
        systemSaleConfig.defaultSystemCurrency = newDefaultCurrency;
        saveState();
        displayNotification(`Default system currency for P2P and Plans set to ${newDefaultCurrency}.`, "success");
        loadSystemSaleGeneralSettingsForAdminForm();
    } else {
        displayNotification("Invalid currency selected. Must be USD, ZAR, or BTC.", "error");
    }
}

function saveSystemSaleTimers() {
    const saleDuration = parseInt(document.getElementById('admin-sale-duration').value);
    const cooldownDuration = parseInt(document.getElementById('admin-cooldown-duration').value);

    if (isNaN(saleDuration) || saleDuration <=0 || isNaN(cooldownDuration) || cooldownDuration <=0) {
        displayNotification("Sale and Cooldown durations must be positive numbers.", "error");
        return;
    }
    systemSaleConfig.saleDurationSeconds = saleDuration;
    systemSaleConfig.cooldownDurationSeconds = cooldownDuration;
    saveState();
    if (currentUser && !currentUser.isAdmin && document.getElementById('user-dashboard-view').classList.contains('hidden') === false && currentDashboardSectionId.user === 'ud-system-sale') {
         initializeSystemSaleCycle();
    }
    displayNotification("System sale timers saved successfully.", "success");
}

function renderAdminSystemSalePlansList() {
    const plansListDiv = document.getElementById('admin-system-sale-plans-list');
    if (!plansListDiv) return;

    plansListDiv.innerHTML = '';

    if (systemSalePlans.length === 0) {
        plansListDiv.innerHTML = '<p>No sale plans defined yet. Add one using the form above.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Name</th><th>Cost</th><th>Base Coins</th><th>Return</th><th>Maturity</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    systemSalePlans.forEach(plan => {
        const tr = tbody.insertRow();
        tr.innerHTML = `
            <td>${plan.name}</td>
            <td>${formatCurrency(plan.cost, plan.currency || systemSaleConfig.defaultSystemCurrency)}</td>
            <td>${plan.coinsAwarded}</td>
            <td>${plan.returnPercentage}%</td>
            <td>${formatDuration(plan.maturityDurationSeconds)}</td>
            <td><span style="color: ${plan.status === 'active' ? 'var(--success-color)' : 'var(--text-medium)'}; text-transform: capitalize; font-weight: bold;">${plan.status}</span></td>
            <td>
                <button onclick="populatePlanEditForm('${plan.id}')" class="secondary small">Edit</button>
                <button onclick="toggleSystemSalePlanStatus('${plan.id}')" class="${plan.status === 'active' ? 'secondary' : 'accent'} small">${plan.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                <button onclick="deleteSystemSalePlan('${plan.id}')" class="danger small">Delete</button>
            </td>
        `;
    });
    plansListDiv.appendChild(table);
}
function handleAddOrUpdateSystemSalePlan() {
    const name = document.getElementById('plan-name').value.trim();
    const cost = parseFloat(document.getElementById('plan-cost').value);
    const currency = document.getElementById('plan-currency').value;
    const coinsAwarded = parseInt(document.getElementById('plan-coins-awarded').value);
    const returnPercentage = parseFloat(document.getElementById('plan-return-percentage').value);
    const maturityValue = parseInt(document.getElementById('plan-maturity-value').value);
    const maturityUnit = document.getElementById('plan-maturity-unit').value;
    const planBankName = document.getElementById('plan-bank-name').value.trim();
    const planBankAccount = document.getElementById('plan-bank-account').value.trim();
    const planBtcWallet = document.getElementById('plan-btc-wallet').value.trim();

    if (!name || isNaN(cost) || cost <=0 || !currency || isNaN(coinsAwarded) || coinsAwarded <=0 || isNaN(returnPercentage) || returnPercentage < 0 || isNaN(maturityValue) || maturityValue <= 0) {
        displayNotification('All fields (Name, Cost, Currency, Base Coins, Return %, Maturity) must be valid positive numbers.', 'error');
        return;
    }

    let maturityDurationSeconds = 0;
    switch (maturityUnit) {
        case 'Minutes':
            maturityDurationSeconds = maturityValue * 60;
            break;
        case 'Hours':
            maturityDurationSeconds = maturityValue * 3600;
            break;
        case 'Days':
        default:
            maturityDurationSeconds = maturityValue * 86400;
            break;
    }

    const planData = {
        name, cost, currency, coinsAwarded, returnPercentage, maturityDurationSeconds,
        planBankName, planBankAccount, planBtcWallet
    };

    if (currentEditingPlanId) {
        const planIndex = systemSalePlans.findIndex(p => p.id === currentEditingPlanId);
        if (planIndex > -1) {
            systemSalePlans[planIndex] = { ...systemSalePlans[planIndex], ...planData };
            displayNotification(`Plan "${name}" updated successfully.`, 'success');
        } else {
            displayNotification("Error: Plan to update not found.", "error");
        }
    } else {
        const newPlan = { id: generateId(), ...planData, status: 'inactive' };
        systemSalePlans.push(newPlan);
        displayNotification(`Plan "${name}" added. Remember to activate it.`, 'success');
    }

    saveState();
    renderAdminSystemSalePlansList();
    clearPlanEditForm();
}

function populatePlanEditForm(planId) {
    const plan = systemSalePlans.find(p => p.id === planId);
    if (!plan) { displayNotification("Could not find plan to edit.", "error"); return; }

    currentEditingPlanId = plan.id;
    document.getElementById('plan-name').value = plan.name;
    document.getElementById('plan-cost').value = plan.cost;
    document.getElementById('plan-currency').value = plan.currency || systemSaleConfig.defaultSystemCurrency;
    document.getElementById('plan-coins-awarded').value = plan.coinsAwarded;
    document.getElementById('plan-return-percentage').value = plan.returnPercentage;
    
    const duration = deconstructDuration(plan.maturityDurationSeconds);
    document.getElementById('plan-maturity-value').value = duration.value;
    document.getElementById('plan-maturity-unit').value = duration.unit;

    document.getElementById('plan-bank-name').value = plan.planBankName || '';
    document.getElementById('plan-bank-account').value = plan.planBankAccount || '';
    document.getElementById('plan-btc-wallet').value = plan.planBtcWallet || '';

    document.getElementById('add-plan-button').innerHTML = '<i class="fas fa-save"></i> Update Plan';
    document.getElementById('cancel-edit-plan-button').classList.remove('hidden');
    
    const editingIdEl = document.querySelector('#editing-plan-id span');
    if(editingIdEl) {
        editingIdEl.textContent = planId.substring(0,8)+"...";
        editingIdEl.parentElement.classList.remove('hidden');
    }
    document.getElementById('plan-name').focus();
}

function clearPlanEditForm() {
    currentEditingPlanId = null;
    document.getElementById('plan-form').reset();
    document.getElementById('plan-currency').value = systemSaleConfig.defaultSystemCurrency || 'USD';
    document.getElementById('add-plan-button').innerHTML = '<i class="fas fa-plus"></i> Add Plan';
    document.getElementById('cancel-edit-plan-button').classList.add('hidden');
    document.getElementById('editing-plan-id').classList.add('hidden');
}

function toggleSystemSalePlanStatus(planId) {
    const plan = systemSalePlans.find(p => p.id === planId);
    if (plan) {
        plan.status = plan.status === 'active' ? 'inactive' : 'active';
        saveState();
        renderAdminSystemSalePlansList();
        displayNotification(`Plan "${plan.name}" status changed to ${plan.status}.`, 'info');
    } else {
        displayNotification("Could not find plan to toggle status.", "error");
    }
}

function deleteSystemSalePlan(planId) {
    const planToDelete = systemSalePlans.find(p=>p.id===planId);
    if (!planToDelete) { displayNotification("Plan not found.", "error"); return; }

    showCustomConfirm(
        `Are you sure you want to permanently delete the plan "${planToDelete.name}"?`,
        () => {
            systemSalePlans = systemSalePlans.filter(p => p.id !== planId);
            saveState();
            renderAdminSystemSalePlansList();
            if(currentEditingPlanId === planId) clearPlanEditForm();
            displayNotification(`Plan "${planToDelete.name}" deleted successfully.`, 'success');
        }, "Confirm Plan Deletion", "Yes, Delete Plan", "danger"
    );
}

function clearSystemSaleRequestsLogs() {
    showCustomConfirm(
        "Are you sure you want to clear ALL Seller Sale Request logs?",
        () => {
            systemPurchaseRequests = [];
            saveState();
            renderAdminSystemPurchaseRequests();
            renderAdminOverviewStats();
            displayNotification("All Seller Sale Request logs have been cleared.", "success");
        }, "Clear All Seller Sale Logs", "Confirm Clear All", "danger"
    );
}
function clearP2PTransactionLogs() {
     showCustomConfirm(
        "Are you sure you want to clear ALL P2P Transaction logs?",
        () => {
            transactions = [];
            // Reset any offers that were pending sale
            sellOffers.forEach(offer => {
                if (offer.status === 'pending_sale') offer.status = 'active';
            });
            saveState();
            renderAdminP2PTransactions();
            renderAdminOverviewStats();
            displayNotification("All P2P Transaction logs have been cleared.", "success");
        }, "Clear All P2P Logs", "Confirm Clear All", "danger"
    );
}

function renderAdminSystemPurchaseRequests() {
    const listDiv = document.getElementById('admin-system-purchase-requests-list');
    if (!listDiv) return;
    listDiv.innerHTML = '';

    const allRequests = [...systemPurchaseRequests].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (allRequests.length === 0) {
        listDiv.innerHTML = '<p>No seller purchase requests from users have been made yet.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Date</th><th>User</th><th>Program</th><th>Cost</th><th>Total Return</th><th>Status</th><th>Proof</th><th>Action</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    allRequests.forEach(req => {
        const tr = tbody.insertRow();
        let planInfo = `<strong>${req.planDetails.name}</strong>`;
        let costInfo = formatCurrency(req.planDetails.cost, req.planDetails.currency);
        let coinsInfo = `${req.planDetails.totalReturnCoins.toFixed(2)}`;

        let proofDisplay = 'No Proof';
        if (req.paymentProofDataUrl && req.paymentProofDataUrl.startsWith('data:image')) {
            proofDisplay = `<button class="secondary small" onclick="openProofViewerModal('${req.paymentProofDataUrl}', 'Proof for ${req.userName} - ${req.planDetails.name}')">View Proof</button>`;
        } else if (req.paymentProofDataUrl) { // Handle other file types or links
             proofDisplay = `<a href="${req.paymentProofDataUrl}" target="_blank" title="View Proof">${req.paymentProofFilename || 'View File'}</a>`;
        } else if (req.paymentProofFilename) {
            proofDisplay = req.paymentProofFilename;
        }

        let actionButtons = '';
        if (req.status === 'payment_proof_submitted_to_seller') {
            actionButtons = `<button onclick="approveSystemCoinPurchase('${req.id}')" class="accent small">Approve</button> <button onclick="rejectSystemCoinPurchase('${req.id}')" class="danger small">Reject</button>`;
        } else if (req.status === 'awaiting_payment_to_seller') {
             actionButtons = `<button onclick="approveSystemCoinPurchase('${req.id}')" class="secondary small" title="Manual approval">Manual Approve</button> <button onclick="rejectSystemCoinPurchase('${req.id}')" class="danger small">Reject</button>`;
        } else {
            actionButtons = `Processed (${req.status.replace(/_/g, ' ')})`;
        }

        tr.innerHTML = `
            <td>${new Date(req.createdAt).toLocaleDateString()}</td>
            <td>${req.userName} <small>(${req.userId.substring(0,4)})</small></td>
            <td>${planInfo}</td>
            <td>${costInfo}</td>
            <td>${coinsInfo}</td>
            <td style="text-transform: capitalize;">${req.status.replace(/_/g, ' ')}</td>
            <td>${proofDisplay}</td>
            <td>${actionButtons}</td>
        `;
    });
    listDiv.appendChild(table);
}

function approveSystemCoinPurchase(requestId) {
    const request = systemPurchaseRequests.find(req => req.id === requestId);
    if (!request) { displayNotification("Request not found", "error"); return; }
    const user = users.find(u => u.id === request.userId);
    if (!user) { displayNotification("User not found for this request", "error"); return; }

    const plan = systemSalePlans.find(p => p.id === request.planDetails.id);
    if (!plan) { displayNotification("Original plan not found, cannot create asset.", "error"); return; }
    
    const newAsset = {
        id: generateId(),
        userId: user.id,
        userName: user.name,
        planId: plan.id,
        planName: plan.name,
        purchaseDate: new Date().toISOString(),
        maturityDate: new Date(Date.now() + plan.maturityDurationSeconds * 1000).toISOString(),
        baseCoins: plan.coinsAwarded,
        returnPercentage: plan.returnPercentage,
        totalReturnCoins: request.planDetails.totalReturnCoins,
        status: 'maturing',
        origin: {
            type: 'system',
            planId: plan.id,
            cost: plan.cost,
            currency: plan.currency,
            baseCoins: plan.coinsAwarded,
            returnPercentage: plan.returnPercentage,
            maturityDurationSeconds: plan.maturityDurationSeconds
        }
    };
    userAssets.push(newAsset);

    request.status = 'completed';

    if (!user.hasMadeInitialSystemPurchase) {
        user.hasMadeInitialSystemPurchase = true;
    }

    saveState();
    renderAdminSystemPurchaseRequests();
    renderAdminOverviewStats();
    displayNotification(`Approved asset program for ${user.name}. Asset is now maturing.`, "success");
    addGlobalNotification(user.id, "Asset Program Approved", `Your purchase of "${plan.name}" was approved. It is now maturing in "My Assets".`, 'ud-my-assets', 'success');
}

function rejectSystemCoinPurchase(requestId) {
    const request = systemPurchaseRequests.find(req => req.id === requestId);
    if (!request) { displayNotification("Request not found.", "error"); return; }

    showCustomConfirm(
        `Are you sure you want to reject this purchase request for ${request.userName}?`,
        () => {
            request.status = 'cancelled_by_admin';
            saveState();
            renderAdminSystemPurchaseRequests();
            renderAdminOverviewStats();
            displayNotification(`Purchase request for ${request.userName} has been rejected.`, 'info');
            addGlobalNotification(request.userId, "Purchase Rejected", `Your purchase request for "${request.planDetails.name}" was rejected by the administrator.`, 'ud-system-sale', 'error');
        }, "Reject Purchase Request", "Confirm Rejection", "danger"
    );
}

function renderAdminUserList() {
    const userListArea = document.getElementById('admin-user-list-area');
    if (!userListArea) return;
    
    userListArea.innerHTML = '';
    
    const searchInput = document.getElementById('admin-user-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filteredUsers = searchTerm ? users.filter(user =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.id.toLowerCase().includes(searchTerm)
    ) : users;

    if (filteredUsers.length === 0) {
        userListArea.innerHTML = `<p>No users match your search criteria "${searchTerm}".</p>`;
        if (users.length === 0) {
             userListArea.innerHTML = '<p>No users have registered on the platform yet.</p>';
        }
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Name (ID)</th><th>Email</th><th>Liquid COINs</th><th>KYC</th><th>Status</th><th>Actions</th><th>Adjust Bal.</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    filteredUsers.forEach(user => {
        const tr = tbody.insertRow();
        tr.innerHTML = `
            <td>${user.name} <small>(${user.id.substring(0,6)})</small></td>
            <td>${user.email}</td>
            <td>${user.coinBalance.toFixed(2)}</td>
            <td style="text-transform:capitalize;">${user.kycStatus || 'None'}</td>
            <td><span style="color: ${user.status === 'active' ? 'var(--success-color)' : 'var(--danger-color)'}; text-transform: capitalize; font-weight: bold;">${user.status}</span></td>
            <td>
                <button onclick="openAdminEditKycModal('${user.id}')" class="secondary small">Edit KYC</button>
                <button onclick="toggleBlockUser('${user.id}')" class="${user.status === 'active' ? 'secondary' : 'accent'} small">${user.status === 'active' ? 'Block' : 'Unblock'}</button>
                <button onclick="deleteUser('${user.id}')" class="danger small">Delete</button>
            </td>
            <td>
                <div style="display:flex; gap: 5px; align-items: center;">
                    <input type="number" id="adj-bal-${user.id}" style="width: 70px; padding: 0.3rem; margin-bottom:0;" placeholder="Set">
                    <button onclick="adminAdjustUserBalance('${user.id}')" class="accent small" style="padding: 0.3rem 0.5rem;" title="Set Liquid Coin Balance">Set</button>
                </div>
            </td>`;
    });
    userListArea.appendChild(table);
}

function adminAdjustUserBalance(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) {
        displayNotification('User not found.', 'error');
        return;
    }
    const amountInput = document.getElementById(`adj-bal-${userId}`);
    if (!amountInput) return;

    const newBalanceStr = amountInput.value;
    if (newBalanceStr.trim() === '') {
        displayNotification('Please enter a balance amount.', 'error');
        return;
    }

    const newBalance = parseFloat(newBalanceStr);

    if (isNaN(newBalance) || newBalance < 0) {
        displayNotification('Invalid balance amount. Must be a non-negative number.', 'error');
        return;
    }
    
    showCustomConfirm(
        `This will set <strong>${user.name}'s</strong> liquid COIN balance to <strong>${newBalance.toFixed(2)}</strong>. This will then be AUTOMATICALLY listed on the P2P market. Proceed?`,
        () => {
            // Set balance first
            user.coinBalance = newBalance;
            
            if (newBalance <= 0) {
                saveState();
                renderAdminUserList();
                displayNotification(`${user.name}'s balance set to ${newBalance.toFixed(2)}. No P2P offer created as balance is zero.`, 'info');
                return;
            }

            // Find origin data for pricing the P2P offer
            const userAssetsSorted = userAssets
                .filter(a => a.userId === user.id && a.origin)
                .sort((a,b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
            let originData = userAssetsSorted.length > 0 ? userAssetsSorted[0].origin : null;

            if (!originData) {
                const firstSystemPlan = systemSalePlans.find(p => p.status === 'active') || (systemSalePlans.length > 0 ? systemSalePlans[0] : null);
                if (firstSystemPlan) {
                    originData = {
                        id: firstSystemPlan.id,
                        planId: firstSystemPlan.id,
                        type: 'system',
                        cost: firstSystemPlan.cost,
                        currency: firstSystemPlan.currency,
                        baseCoins: firstSystemPlan.coinsAwarded,
                        returnPercentage: firstSystemPlan.returnPercentage,
                        maturityDurationSeconds: firstSystemPlan.maturityDurationSeconds
                    };
                }
            }

            if (originData) {
                const result = createP2PListingFromLiquidBalance(user, originData);
                if (result.success) {
                    saveState();
                    renderAdminUserList();
                    displayNotification(`${user.name}'s balance was set and automatically listed on P2P market.`, 'success');
                    addGlobalNotification(user.id, "Balance Credited & Listed", `Admin credited your account, and your balance of ${result.offer.amount.toFixed(2)} COINs has been placed on the P2P market.`, 'ud-my-assets', 'success');
                } else {
                    saveState(); // Still save the balance change
                    renderAdminUserList();
                    displayNotification(`Balance set, but P2P listing failed: ${result.message}`, 'error');
                }
            } else {
                saveState(); // Still save the balance change
                renderAdminUserList();
                displayNotification('Balance set, but could not list on P2P: No suitable pricing origin (user asset or system plan) found.', 'error');
            }
        }, "Confirm Balance Adjustment & P2P Listing", "Confirm & List", "accent"
    );
}

function toggleBlockUser(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        const newStatus = user.status === 'active' ? 'blocked' : 'active';
        const actionText = newStatus === 'blocked' ? 'block' : 'unblock';
        showCustomConfirm(
            `Are you sure you want to ${actionText} user ${user.name}?`,
            () => {
                user.status = newStatus;
                saveState();
                renderAdminUserList();
                displayNotification(`User ${user.name} is now ${newStatus}.`, 'info');
                addGlobalNotification(user.id, "Account Status Changed", `Your account status changed to: ${newStatus}.`, '#', newStatus === 'blocked' ? 'error' : 'success');
            },
            `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} User`,
            `Yes, ${actionText}`,
            newStatus === 'blocked' ? "danger" : "accent"
        );
    }
}
function deleteUser(userId) {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) { displayNotification("User not found.", "error"); return; }
    showCustomConfirm(
        `PERMANENTLY DELETE user ${userToDelete.name}? This is irreversible and will remove all their data (transactions, offers, assets, tickets, etc.).`,
        () => {
            users = users.filter(u => u.id !== userId);
            transactions = transactions.filter(tx => tx.buyerId !== userId && tx.sellerId !== userId);
            sellOffers = sellOffers.filter(offer => offer.sellerId !== userId);
            userAssets = userAssets.filter(inv => inv.userId !== userId);
            supportTickets = supportTickets.filter(ticket => ticket.userId !== userId);
            systemPurchaseRequests = systemPurchaseRequests.filter(req => req.userId !== userId);
            withdrawalRequests = withdrawalRequests.filter(req => req.userId !== userId);
            globalNotifications = globalNotifications.filter(n => n.target !== userId);

            saveState();
            renderAdminDashboard(); // Full refresh
            displayNotification(`User ${userToDelete.name} and all associated data permanently deleted.`, 'success');
        }, "Confirm User Deletion", "DELETE USER", "danger"
    );
}
function renderAdminP2PTransactions() {
    const p2pArea = document.getElementById('admin-p2p-transactions-area');
    if(!p2pArea) return;
    p2pArea.innerHTML = '';
    const filterSelect = document.getElementById('admin-p2p-filter-status');
    const filterStatus = filterSelect ? filterSelect.value : 'all';

    let filteredTransactions = [...transactions];
    if (filterStatus !== 'all') {
        filteredTransactions = transactions.filter(tx => tx.status === filterStatus);
    }

    const table = document.createElement('table'); table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>ID</th><th>Buyer</th><th>Seller</th><th>Amount</th><th>Value</th><th>Status</th><th>Date</th><th>Proof</th><th>Actions</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    filteredTransactions.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(tx => {
        const displayFiatPrice = formatCurrency(tx.totalPrice, tx.currency);

        let proofDisplay = 'N/A';
        if (tx.paymentProofDataUrl && tx.paymentProofDataUrl.startsWith('data:image')) {
            proofDisplay = `<button class="secondary small" onclick="openProofViewerModal('${tx.paymentProofDataUrl}', 'Proof for P2P Tx: ${tx.id.substring(0,8)}')">View Proof</button>`;
        } else if (tx.paymentProofDataUrl) {
            proofDisplay = `<a href="${tx.paymentProofDataUrl}" target="_blank">${tx.paymentProofFilename || 'View File'}</a>`;
        } else if (tx.paymentProofFilename) {
            proofDisplay = tx.paymentProofFilename;
        }

        let actionButtons = '-';
        if (tx.status === 'disputed') {
            actionButtons = `<button onclick="adminResolveP2PDispute('${tx.id}')" class="accent small">Resolve</button>`;
        } else if (tx.status === 'payment_proof_submitted' || tx.status === 'awaiting_payment') {
            actionButtons = `<button onclick="adminForceCancelP2P('${tx.id}')" class="danger small">Force Cancel</button>`;
        }

        const tr = tbody.insertRow();
        tr.innerHTML = `
            <td>${tx.id.substring(0,8)}</td>
            <td>${tx.buyerName}</td>
            <td>${tx.sellerName}</td>
            <td>${tx.amount.toFixed(2)} COIN</td>
            <td>${displayFiatPrice}</td>
            <td style="text-transform: capitalize; ${tx.status === 'disputed' ? 'color:var(--danger-color); font-weight:bold;' : ''}">${tx.status.replace(/_/g, ' ')}</td>
            <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
            <td>${proofDisplay}</td>
            <td>${actionButtons}</td>`;
    });
        if (filteredTransactions.length === 0) {
        p2pArea.innerHTML = `<p>No P2P transactions match the filter: '${filterStatus}'.</p>`;
    } else {
        p2pArea.appendChild(table);
    }
}

function adminResolveP2PDispute(transactionId) {
    const tx = transactions.find(t => t.id === transactionId && t.status === 'disputed');
    if (!tx) { displayNotification('Disputed transaction not found.', 'error'); return; }
    
    showCustomPrompt(
        "Enter resolution notes (e.g., 'Buyer paid, coins awarded to buyer'). You MUST manually adjust balances if required, this only updates the status.",
        "", (notes) => {
            if (notes !== null) {
                tx.status = 'resolved_by_admin';
                tx.adminNotes = notes;
                saveState();
                renderAdminP2PTransactions();
                displayNotification(`Dispute for Tx ${tx.id.substring(0,8)} marked as resolved.`, 'info');
                addGlobalNotification(tx.buyerId, "P2P Dispute Resolved", `Admin resolved the dispute for Tx ${tx.id.substring(0,8)}.`, 'ud-p2p-history', 'info');
                addGlobalNotification(tx.sellerId, "P2P Dispute Resolved", `Admin resolved the dispute for Tx ${tx.id.substring(0,8)}.`, 'ud-p2p-history', 'info');
            }
        }, "Resolve P2P Dispute Manually"
    );
}

function adminForceCancelP2P(transactionId) {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx || tx.status === 'completed' || tx.status === 'cancelled_by_admin') { displayNotification('Tx not found or already finalized.', 'error'); return; }

    showCustomConfirm(
        `Force cancel P2P Tx ID ${tx.id.substring(0,8)}? The P2P offer will be made active again.`,
        () => {
            tx.status = 'cancelled_by_admin';
            const originalOffer = sellOffers.find(o => o.id === tx.offerId);
            if (originalOffer && originalOffer.status === 'pending_sale') {
                originalOffer.status = 'active';
            }
            saveState();
            renderAdminP2PTransactions();
            displayNotification(`P2P Transaction ${tx.id.substring(0,8)} has been forcibly cancelled.`, 'success');
            addGlobalNotification(tx.buyerId, "P2P Tx Cancelled", `Tx ${tx.id.substring(0,8)} was cancelled by an admin.`, 'ud-p2p-history', 'warning');
            addGlobalNotification(tx.sellerId, "P2P Tx Cancelled", `Tx ${tx.id.substring(0,8)} was cancelled by an admin.`, 'ud-p2p-history', 'warning');
        }, "Force Cancel P2P Transaction", "Yes, Force Cancel", "danger"
    );
}

function renderAdminUserAssets() {
    const assetsArea = document.getElementById('admin-user-assets-area');
    if(!assetsArea) return;
    assetsArea.innerHTML = '';
    const table = document.createElement('table'); table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>User</th><th>Program Name</th><th>Base Coins</th><th>Total Return</th><th>Maturity Date</th><th>Status</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    [...userAssets].sort((a,b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)).forEach(asset => {
        const tr = tbody.insertRow();
        const baseCoinsDisplay = (asset.origin && asset.origin.type === 'p2p_repackaged') ? asset.baseCoins.toFixed(2) + ' (Profit Only)' : asset.baseCoins.toFixed(2);
        tr.innerHTML = `
            <td>${asset.userName} <small>(${asset.userId.substring(0,4)})</small></td>
            <td>${asset.planName}</td>
            <td>${baseCoinsDisplay}</td>
            <td>${asset.totalReturnCoins.toFixed(2)} COIN</td>
            <td>${new Date(asset.maturityDate).toLocaleDateString()}</td>
            <td style="text-transform: capitalize;">${asset.status.replace(/_/g, ' ')}</td>`;
    });
    if (userAssets.length === 0) { assetsArea.innerHTML = '<p>No user assets recorded in the system.</p>'; } else { assetsArea.appendChild(table); }
}

function renderAdminKycRequests() {
    const kycListDiv = document.getElementById('admin-kyc-requests-list');
    if (!kycListDiv) return;
    kycListDiv.innerHTML = '';
    const pendingKycUsers = users.filter(u => u.kycStatus === 'pending').sort((a,b) => new Date(a.kycData?.submittedAt || 0) - new Date(b.kycData?.submittedAt || 0));

    if (pendingKycUsers.length === 0) {
        kycListDiv.innerHTML = '<p>No KYC requests currently pending approval.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>User</th><th>Email</th><th>Document</th><th>Actions</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    pendingKycUsers.forEach(user => {
        const kyc = user.kycData || {};
        let docDisplay = 'No Document';
        if (kyc.documentUrl) {
            docDisplay = `<a href="${kyc.documentUrl}" target="_blank">${kyc.documentFilename || 'View Document'}</a>`;
        }
        const tr = tbody.insertRow();
        tr.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${docDisplay}</td>
            <td>
                <button onclick="approveKyc('${user.id}')" class="accent small">Approve</button>
                <button onclick="rejectKyc('${user.id}')" class="danger small">Reject</button>
                 <button onclick="openAdminEditKycModal('${user.id}')" class="secondary small">More/Edit</button>
            </td>
        `;
    });
    kycListDiv.appendChild(table);
}

function approveKyc(userId) {
    const user = users.find(u => u.id === userId);
    if (user && (user.kycStatus === 'pending' || user.kycStatus === 'rejected')) {
        showCustomConfirm(
            `Approve KYC for ${user.name}?`,
            () => {
                user.kycStatus = 'approved';
                if(user.kycData) user.kycData.rejectionReason = null;
                saveState();
                renderAdminKycRequests();
                renderAdminUserList();
                renderAdminOverviewStats();
                displayNotification(`KYC for ${user.name} has been approved.`, 'success');
                addGlobalNotification(userId, "KYC Approved", "Your KYC has been approved.", 'ud-kyc', 'success');
            }, "Approve KYC", "Yes, Approve", "accent"
        );
    }
}

function rejectKyc(userId) {
    const user = users.find(u => u.id === userId);
    if (user && (user.kycStatus === 'pending' || user.kycStatus === 'approved')) {
        showCustomPrompt(
            `Provide a reason for rejecting KYC for ${user.name}:`, "",
            (reason) => {
                if (reason !== null && reason.trim() !== "") {
                    user.kycStatus = 'rejected';
                    if(!user.kycData) user.kycData = {};
                    user.kycData.rejectionReason = reason.trim();
                    saveState();
                    renderAdminKycRequests();
                    renderAdminUserList();
                    addGlobalNotification(userId, "KYC Rejected", `Your KYC was rejected. Reason: ${reason}.`, 'ud-kyc', 'error');
                }
            }, "KYC Rejection Reason"
        );
    }
}

function openAdminEditKycModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) { displayNotification("User not found.", "error"); return; }
    document.getElementById('admin-edit-kyc-userId').value = userId;
    document.getElementById('admin-edit-kyc-modal-title').textContent = `Edit KYC: ${user.name}`;
    const kyc = user.kycData || {};
    document.getElementById('admin-kyc-bank-name').value = kyc.bankName || '';
    document.getElementById('admin-kyc-bank-account').value = kyc.bankAccount || '';
    document.getElementById('admin-kyc-usdt-wallet').value = kyc.usdtWallet || '';
    document.getElementById('admin-kyc-telephone').value = kyc.telephone || '';
    populateCountryDropdown('admin-kyc-country', kyc.country);
    document.getElementById('admin-kyc-status').value = user.kycStatus || 'none';

    // P2P Bypass checkbox
    document.getElementById('admin-kyc-p2p-bypass').checked = !user.p2pMarketRequiresInitialPurchase;

    const rejectionGroup = document.getElementById('admin-kyc-rejection-reason-group');
    const rejectionTextarea = document.getElementById('admin-kyc-rejection-reason');
    rejectionGroup.classList.toggle('hidden', document.getElementById('admin-kyc-status').value !== 'rejected');
    rejectionTextarea.value = kyc.rejectionReason || '';
    document.getElementById('admin-kyc-doc-display').innerHTML = kyc.documentUrl ? `<a href="${kyc.documentUrl}" target="_blank">View Current Document</a>` : 'No Document Provided';
    document.getElementById('admin-kyc-new-document').value = '';
    document.getElementById('admin-edit-kyc-modal').style.display = 'block';
}

function closeAdminEditKycModal() {
    document.getElementById('admin-edit-kyc-modal').style.display = 'none';
}

function saveAdminKycChanges() {
    const userId = document.getElementById('admin-edit-kyc-userId').value;
    const user = users.find(u => u.id === userId);
    if (!user) { displayNotification('User not found.', 'error'); return; }

    if (!user.kycData) user.kycData = {};
    const oldKycStatus = user.kycStatus;
    user.kycData.bankName = document.getElementById('admin-kyc-bank-name').value.trim();
    user.kycData.bankAccount = document.getElementById('admin-kyc-bank-account').value.trim();
    user.kycData.usdtWallet = document.getElementById('admin-kyc-usdt-wallet').value.trim();
    user.kycData.telephone = document.getElementById('admin-kyc-telephone').value.trim();
    user.kycData.country = document.getElementById('admin-kyc-country').value;
    user.kycStatus = document.getElementById('admin-kyc-status').value;
    user.p2pMarketRequiresInitialPurchase = !document.getElementById('admin-kyc-p2p-bypass').checked;
    user.kycData.rejectionReason = user.kycStatus === 'rejected' ? document.getElementById('admin-kyc-rejection-reason').value.trim() : null;

    const newDocumentFile = document.getElementById('admin-kyc-new-document').files[0];
    const processSave = () => {
        saveState();
        renderAdminUserList();
        renderAdminKycRequests();
        closeAdminEditKycModal();
        displayNotification(`KYC details for ${user.name} updated.`, 'success');
        if (oldKycStatus !== user.kycStatus) {
            addGlobalNotification(userId, "KYC Status Updated", `Admin updated your KYC status to: ${user.kycStatus}.`, 'ud-kyc', 'info');
        }
    };

    if (newDocumentFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            user.kycData.documentUrl = e.target.result;
            user.kycData.documentFilename = newDocumentFile.name;
            processSave();
        };
        reader.readAsDataURL(newDocumentFile);
    } else {
        processSave();
    }
}

// --- P2P Offer Management (Admin) ---
function renderAdminP2POffers() {
    const listDiv = document.getElementById('admin-p2p-offers-list');
    if (!listDiv) return;

    const activeOffers = sellOffers.filter(a => a.status === 'active')
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    listDiv.innerHTML = '';
    if (activeOffers.length === 0) {
        listDiv.innerHTML = '<p>No active P2P sell offers from users at the moment.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>User</th><th>Amount (COIN)</th><th>Price</th><th>Total Value</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    activeOffers.forEach(offer => {
        const tr = tbody.insertRow();
        const price = offer.adminPrice;
        const currency = offer.adminCurrency;
        const statusText = "Repackaged";

        tr.innerHTML = `
            <td>${offer.sellerName}</td>
            <td>${offer.amount.toFixed(2)}</td>
            <td>${formatCurrency(price, currency)}</td>
            <td>${formatCurrency(offer.amount * price, currency)}</td>
            <td><span class="status-repackaged">${statusText}</span></td>
            <td>
                <button class="secondary small" onclick="openAdminRepackageP2POfferModal('${offer.id}')">Edit Name</button>
                <button class="danger small" onclick="handleAdminDeleteP2POffer('${offer.id}')">Delete</button>
            </td>
        `;
    });
    listDiv.appendChild(table);
}

function handleAdminDeleteP2POffer(offerId) {
    const offerIndex = sellOffers.findIndex(o => o.id === offerId);
    if (offerIndex === -1) {
        displayNotification("Offer not found.", "error");
        return;
    }
    const offer = sellOffers[offerIndex];
    const seller = users.find(u => u.id === offer.sellerId);

    showCustomConfirm(
        `Are you sure you want to delete this offer from ${offer.sellerName}? The coins will be returned to the user's liquid balance.`,
        () => {
            if (seller) {
                seller.coinBalance += offer.amount; // Return coins to liquid balance
            }

            const asset = userAssets.find(a => a.id === offer.assetId);
            if (asset) {
                asset.status = 'credited'; // Revert asset status
            }
            
            sellOffers.splice(offerIndex, 1);
            saveState();
            renderAdminP2POffers();
            renderAdminOverviewStats();
            displayNotification(`Offer from ${offer.sellerName} has been deleted and coins returned to user.`, "success");
            if (seller) {
                addGlobalNotification(seller.id, 'P2P Offer Cancelled by Admin', `Your P2P offer was cancelled by an administrator. The coins have been returned to your liquid balance.`, 'ud-p2p-market', 'warning');
            }
        }, "Confirm Offer Deletion", "Delete Offer", "danger"
    );
}

function openAdminRepackageP2POfferModal(offerId) {
    const offer = sellOffers.find(o => o.id === offerId);
    if (!offer) { displayNotification("Offer not found.", "error"); return; }
    
    document.getElementById('admin-repackage-p2p-offer-id').value = offerId;
    const modal = document.getElementById('admin-repackage-p2p-offer-modal');
    modal.querySelector('h3').textContent = 'Edit P2P Offer Name';
    modal.querySelector('p').textContent = 'All financial terms are set automatically. You can only edit the display name for this P2P offer.';

    const originalDetailsDiv = document.getElementById('admin-repackage-p2p-original-details');
    originalDetailsDiv.innerHTML = `
        <p><strong>Seller:</strong> ${offer.sellerName}</p>
        <p><strong>Coins for Sale:</strong> ${offer.amount.toFixed(2)}</p>
        <p><strong>Automated Price:</strong> ${formatCurrency(offer.adminPrice, offer.adminCurrency)}</p>
        <p><strong>Automated Return:</strong> ${offer.adminReturnPercentage}%</p>
        <p><strong>Automated Maturity:</strong> ${formatDuration(offer.adminMaturityDurationSeconds)}</p>
    `;
    
    document.getElementById('admin-repackage-plan-name').value = offer.adminPlanName || `P2P Program from ${offer.sellerName}`;

    // [FIXED] More robustly hide the non-functional fields
    document.getElementById('admin-repackage-price').parentElement.parentElement.style.display = 'none';
    document.getElementById('admin-repackage-return').parentElement.parentElement.style.display = 'none';
    
    modal.style.display = 'block';
}

function closeAdminRepackageP2POfferModal() {
    const modal = document.getElementById('admin-repackage-p2p-offer-modal');
    modal.style.display = 'none';
    
    // [FIXED] Restore visibility for next time
    modal.querySelector('#admin-repackage-price').parentElement.parentElement.style.display = 'flex';
    modal.querySelector('#admin-repackage-return').parentElement.parentElement.style.display = 'flex';
}

function saveAdminRepackageP2POffer() {
    const offerId = document.getElementById('admin-repackage-p2p-offer-id').value;
    const offer = sellOffers.find(o => o.id === offerId);
    if (!offer) { displayNotification("Offer not found.", "error"); return; }

    const newPlanName = document.getElementById('admin-repackage-plan-name').value.trim();

    if (!newPlanName) {
        displayNotification("Please enter a valid plan name.", "error");
        return;
    }
    
    offer.adminPlanName = newPlanName;

    saveState();
    closeAdminRepackageP2POfferModal();
    renderAdminP2POffers();
    displayNotification("P2P offer name has been successfully updated.", "success");
    addGlobalNotification(offer.sellerId, 'P2P Offer Name Updated', `An admin has updated the name of your P2P offer.`, 'ud-p2p-market', 'info');
}


// --- Withdrawal Management (Admin) ---
function renderAdminWithdrawalRequests() {
    const listDiv = document.getElementById('admin-withdrawal-requests-list');
    if (!listDiv) return;
    listDiv.innerHTML = '';

    const pendingRequests = withdrawalRequests.filter(req => req.status === 'pending_admin_approval');
    const processedRequests = withdrawalRequests.filter(req => req.status !== 'pending_admin_approval').sort((a,b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    if (withdrawalRequests.length === 0) { listDiv.innerHTML = '<p>No withdrawal requests found.</p>'; return; }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Date</th><th>User</th><th>Amount</th><th>Destination</th><th>Status</th><th>Action/Notes</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    const renderRow = (req) => {
        const tr = tbody.insertRow();
        let actions = req.adminNotes || 'N/A';
        if (req.status === 'pending_admin_approval') {
            actions = `<button onclick="approveWithdrawalRequest('${req.id}')" class="accent small">Approve</button> <button onclick="rejectWithdrawalRequest('${req.id}')" class="danger small">Reject</button>`;
        }
        tr.innerHTML = `
            <td>${new Date(req.requestedAt).toLocaleDateString()}</td>
            <td>${req.userName}</td>
            <td>${formatCurrency(req.amount, req.currency)}</td>
            <td>${req.destination}</td>
            <td style="text-transform: capitalize;">${req.status.replace(/_/g, ' ')}</td>
            <td>${actions}</td>
        `;
    };
    pendingRequests.forEach(renderRow);
    if(pendingRequests.length > 0 && processedRequests.length > 0) {
        tbody.insertRow().innerHTML = `<td colspan="6" style="background-color: #f0f0f0; text-align:center; font-weight:bold;">Processed Requests</td>`;
    }
    processedRequests.forEach(renderRow);
    listDiv.appendChild(table);
}

function approveWithdrawalRequest(requestId) {
    const request = withdrawalRequests.find(req => req.id === requestId);
    if (!request || request.status !== 'pending_admin_approval') return;
    showCustomConfirm(`Approve withdrawal of ${formatCurrency(request.amount, request.currency)} for ${request.userName}?`, () => {
        request.status = 'approved';
        request.adminNotes = "Approved by admin. Payment pending.";
        saveState();
        renderAdminWithdrawalRequests();
        addGlobalNotification(request.userId, "Withdrawal Approved", `Your withdrawal for ${formatCurrency(request.amount, request.currency)} was approved.`, 'ud-withdraw-funds', 'success');
    }, "Approve Withdrawal", "Approve", "accent");
}

function rejectWithdrawalRequest(requestId) {
    const request = withdrawalRequests.find(req => req.id === requestId);
    if (!request || request.status !== 'pending_admin_approval') return;
    showCustomPrompt(`Enter reason for rejecting withdrawal:`, "", (reason) => {
        if (reason === null) return;
        const user = users.find(u => u.id === request.userId);
        if (user) {
            user.walletBalance[request.currency] = (user.walletBalance[request.currency] || 0) + request.amount;
        }
        request.status = 'rejected';
        request.adminNotes = `Rejected: ${reason || 'No reason.'}`;
        saveState();
        renderAdminWithdrawalRequests();
        addGlobalNotification(request.userId, "Withdrawal Rejected", `Your withdrawal for ${formatCurrency(request.amount, request.currency)} was rejected. Funds returned.`, 'ud-withdraw-funds', 'error');
    }, "Reject Withdrawal Reason");
}


// --- Initial Load ---
window.onload = () => {
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    populateCountryDropdown('kyc-country');
    populateCountryDropdown('admin-kyc-country');

    const persistedUserJSON = sessionStorage.getItem('p2p_reform_currentUser');
    const lastView = sessionStorage.getItem('p2p_reform_currentView') || 'landing-page-view';

    if (persistedUserJSON) {
        const persistedUserData = JSON.parse(persistedUserJSON);
        if (persistedUserData.isAdmin) {
            currentUser = persistedUserData;
        } else {
            const freshUser = users.find(u => u.id === persistedUserData.id);
            if (freshUser) {
                currentUser = freshUser;
            } else {
                handleLogout();
                return;
            }
        }
        if (currentUser.isAdmin) {
            switchView('admin-dashboard-view', true);
            renderAdminDashboard();
        } else {
            switchView('user-dashboard-view', true);
            renderUserDashboard();
        }
        setActiveLink(document.getElementById('nav-dashboard'));
    } else {
        switchView(lastView, true);
        const linkForLastView = document.querySelector(`#nav-links a[onclick*="'${lastView}'"]`) || document.querySelector('#nav-links li a[onclick*=\'landing-page-view\']');
        if(linkForLastView) setActiveLink(linkForLastView);
    }

    document.addEventListener('click', (event) => {
        const panel = document.getElementById('notification-panel');
        const bellButton = document.getElementById('notification-bell-button');
        if (panel && bellButton && !panel.classList.contains('hidden') && !panel.contains(event.target) && !bellButton.contains(event.target)) {
            panel.classList.add('hidden');
        }
    });

    document.getElementById('admin-kyc-status')?.addEventListener('change', function() {
        document.getElementById('admin-kyc-rejection-reason-group').classList.toggle('hidden', this.value !== 'rejected');
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

    updateNotificationBellCount();
};
