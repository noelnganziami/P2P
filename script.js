// --- Application State & Mock Data ---
let currentUser = null;
let users = JSON.parse(localStorage.getItem('p2p_reform_users')) || [];
users = users.map(user => ({
    ...user,
    walletBalance: user.walletBalance || { USD: 0, ZAR: 0, BTC: 0 },
    hasMadeInitialSystemPurchase: user.hasMadeInitialSystemPurchase === undefined ? false : user.hasMadeInitialSystemPurchase,
    p2pMarketRequiresInitialPurchase: user.p2pMarketRequiresInitialPurchase === undefined ? true : user.p2pMarketRequiresInitialPurchase,
    coinBalance: user.coinBalance === undefined ? 0 : parseFloat(user.coinBalance),
    isAdmin: user.isAdmin === undefined ? false : user.isAdmin,
    kycData: user.kycData || { usdtWallet: '', btcWallet: '', telephone: '', country: '', documentUrl: null, documentFilename: null, rejectionReason: null, submittedAt: null },
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
    p2pRequirementEnabled: true,
    broadcastMessage: ''
};

let systemSalePlans = JSON.parse(localStorage.getItem('p2p_reform_system_sale_plans')) || [];
// Simple migration for old data structures
systemSalePlans = systemSalePlans.map(plan => {
    if (plan.maturityDays && !plan.maturityDurationSeconds) {
        plan.maturityDurationSeconds = plan.maturityDays * 86400; // Convert days to seconds
        delete plan.maturityDays; // Remove old property
    }
    if (!plan.maturityDurationSeconds) {
        plan.maturityDurationSeconds = 7 * 86400;
    }
    if (plan.planBtcWallet && !plan.planUsdtWallet) {
        plan.planUsdtWallet = plan.planBtcWallet;
        delete plan.planBtcWallet;
    }
    return plan;
});


const ADMIN_EMAIL = "scothyjunior@gmail.com";
const ADMIN_PASSWORD = "Djsthy@2020";

let saleCycleInterval = null;
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
        window.scrollTo(0, 0); 
        if (!skipHistory) {
            sessionStorage.setItem('p2p_reform_currentView', viewId);
            if (viewId !== 'user-dashboard-view' && viewId !== 'admin-dashboard-view') {
                sessionStorage.removeItem('p2p_reform_userSection');
                sessionStorage.removeItem('p2p_reform_adminSection');
            }
        }
    } else {
        console.error(`SwitchView: View with ID '${viewId}' not found.`);
        const landingPage = document.getElementById('landing-page-view');
        if (landingPage) {
            landingPage.classList.remove('hidden');
            currentViewId = 'landing-page-view';
        }
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
    if (!modal || !titleEl || !messageEl) return;
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
    messageEl.innerHTML = message;
    modal.style.display = 'block';
}

function closePopupNotificationModal() {
    const modal = document.getElementById('popup-notification-modal');
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
        }, 300); // Must match CSS animation duration
    }
}

let confirmCallback = null;
let promptCallback = null;

function showCustomConfirm(message, onConfirm, title = "Confirmation", okButtonText = "OK", okButtonClass = "danger") {
    document.getElementById('custom-confirm-message').innerHTML = message;
    document.getElementById('custom-confirm-title').textContent = title;
    const okButton = document.getElementById('custom-confirm-ok-button');
    okButton.textContent = okButtonText;
    okButton.className = `button ${okButtonClass}`;

    confirmCallback = onConfirm;
    document.getElementById('custom-confirm-modal').style.display = 'block';
}

function closeCustomConfirmModal(isConfirmed) {
    const modal = document.getElementById('custom-confirm-modal');
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
        }, 300);
    }
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
    
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
        }, 300);
    }

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
        window.open(dataUrl, '_blank');
    }
}

function closeProofViewerModal() {
    const modal = document.getElementById('proof-viewer-modal');
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
            document.getElementById('proof-viewer-image').src = '';
        }, 300);
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
            const originalNotification = globalNotifications.find(gn => gn.id === n.id);
            if (originalNotification) {
                originalNotification.read = true;
            }
            panelList.appendChild(itemDiv);
        });
        saveState();
        updateNotificationBellCount();
    }
}
function generateId() { return Math.random().toString(36).substr(2, 9) + Date.now().toString(36); }

function formatCurrency(value, currency = "USD") {
    const symbols = { USD: '$', ZAR: 'R' };
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return (symbols[currency] || currency + ' ') + '0.00';
    
    if (currency === 'BTC') {
        return numValue.toFixed(8) + ' BTC';
    }
    return (symbols[currency] || currency + ' ') + numValue.toFixed(2);
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
    return { value: Math.round(seconds / 60), unit: 'Minutes' };
}

function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getInputValue(id, defaultValue = '') {
    const element = document.getElementById(id);
    return element ? element.value : defaultValue;
}

function getCheckedValue(id, defaultValue = false) {
    const element = document.getElementById(id);
    return element ? element.checked : defaultValue;
}

function getFileInput(id) {
    const element = document.getElementById(id);
    return element ? element.files[0] : null;
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
    if (saleCycleInterval) {
        clearInterval(saleCycleInterval);
        saleCycleInterval = null;
    }

    document.querySelectorAll('#user-dashboard-view .dashboard-main-content .dashboard-card').forEach(s => s.classList.add('hidden'));
    const sectionToShow = document.getElementById(sectionId);
    if(sectionToShow) sectionToShow.classList.remove('hidden');
    document.querySelectorAll('#user-dashboard-view .dashboard-sidebar ul li button').forEach(b => b.classList.remove('active'));
    if(buttonElement) buttonElement.classList.add('active');

    currentDashboardSectionId.user = sectionId;
    if (!skipHistory) sessionStorage.setItem('p2p_reform_userSection', sectionId);
    
    if (sectionId !== 'ud-my-assets' && userAssetCountdownInterval) {
        clearInterval(userAssetCountdownInterval);
        userAssetCountdownInterval = null;
    }
    
    if (sectionId === 'ud-system-sale') {
        const tick = () => {
            let cycleState = JSON.parse(localStorage.getItem('p2p_reform_sale_cycle_state')) || {};
            const now = Date.now();

            if (!cycleState.phaseEndTime || now >= cycleState.phaseEndTime) {
                const wasSale = cycleState.phase === 'sale';
                const nextPhase = wasSale ? 'cooldown' : 'sale';
                const nextDuration = wasSale ? systemSaleConfig.cooldownDurationSeconds : systemSaleConfig.saleDurationSeconds;
                cycleState = {
                    phase: nextPhase,
                    phaseEndTime: now + (nextDuration * 1000)
                };
                localStorage.setItem('p2p_reform_sale_cycle_state', JSON.stringify(cycleState));
            }
            
            const timeLeftSeconds = Math.max(0, Math.floor((cycleState.phaseEndTime - now) / 1000));
            const isSaleActive = cycleState.phase === 'sale';
            updateSystemSaleUserView(isSaleActive, timeLeftSeconds);
        };

        saleCycleInterval = setInterval(tick, 1000);
        tick();
    }
    if (sectionId === 'ud-kyc') {
        renderKycForm();
    }
    if (sectionId === 'ud-my-assets') {
        renderUserAssets();
    }
    if (sectionId === 'ud-p2p-market') {
        renderMySellOffers();
    }
    if (sectionId === 'ud-pending-transactions') {
        renderUserPendingTransactions();
    }
    if (sectionId === 'ud-withdraw-funds') {
        renderUserWithdrawalHistory();
        populateWithdrawalDestination(); 
        const withdrawCurrencySelect = document.getElementById('withdraw-currency');
        if (withdrawCurrencySelect) {
            withdrawCurrencySelect.removeEventListener('change', populateWithdrawalDestination);
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
    if (sectionId === 'ad-p2p-tx') { // Changed from ad-p2p-transactions to match HTML
        renderAdminP2PTransactions();
    }
     if (sectionId === 'ad-system-sale-requests') {
        renderAdminSystemPurchaseRequests();
    }
    if (sectionId === 'ad-users') { // Changed from ad-manage-users
        renderAdminUserList();
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
            const targetAdminSection = sessionStorage.getItem('p2p_reform_adminSection') || 'ad-overview';
            const targetAdminButton = document.querySelector(`#admin-dashboard-view .dashboard-sidebar button[onclick*="'${targetAdminSection}'"]`) || document.querySelector('#admin-dashboard-view .dashboard-sidebar button[onclick*="ad-overview"]');
            showAdminDashboardSection(targetAdminSection, targetAdminButton, true);
        } else {
            switchView('user-dashboard-view');
            const targetUserSection = sessionStorage.getItem('p2p_reform_userSection') || 'ud-overview';
            const targetUserButton = document.querySelector(`#user-dashboard-view .dashboard-sidebar button[onclick*="'${targetUserSection}'"]`) || document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-overview"]');
            showUserDashboardSection(targetUserSection, targetUserButton, true);
        }
        setActiveLink(document.getElementById('nav-dashboard'));
    } else {
        switchView('login-form-view');
        setActiveLink(document.getElementById('nav-login'));
    }
}

// --- Robust Asset Maturation ---
/**
 * Checks for and processes any matured assets for a given user.
 * This function MUTATES the user and asset objects but does NOT save state.
 * The calling function is responsible for calling saveState().
 * @param {object} user - The user object to check assets for.
 * @returns {boolean} - True if any assets were matured, false otherwise.
 */
function checkAndProcessMaturedAssets(user) {
    if (!user) return false;
    let hasMatured = false;
    userAssets.filter(asset => asset.userId === user.id && (asset.status === 'maturing' || asset.status === 'repackaged_profit_maturing'))
        .forEach(asset => {
            const maturityDate = new Date(asset.maturityDate);
            if (new Date() >= maturityDate) {
                // Found a matured asset
                user.coinBalance = parseFloat(user.coinBalance || 0) + parseFloat(asset.totalReturnCoins);
                asset.status = 'credited';
                hasMatured = true;
                
                addGlobalNotification(user.id, "Asset Matured!", `Your asset "${asset.planName}" has matured. ${asset.totalReturnCoins.toFixed(2)} COINs credited to your balance.`, 'ud-my-assets', 'success');
            }
        });
    return hasMatured;
}


// --- Authentication ---
function handleRegister() {
    const name = getInputValue('reg-name').trim();
    const email = getInputValue('reg-email').trim().toLowerCase();
    const password = getInputValue('reg-password');

    if (!name || !email || !password) { displayNotification('Name, email, and password are required.', 'error'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { displayNotification('Valid email required.', 'error'); return; }
    if (users.find(u => u.email === email)) { displayNotification('Email already exists.', 'error'); return; }

    const newUser = {
        id: generateId(), name, email, password,
        isAdmin: false, 
        coinBalance: 0,
        walletBalance: { USD: 0, ZAR: 0, BTC: 0 },
        hasMadeInitialSystemPurchase: false,
        p2pMarketRequiresInitialPurchase: systemSaleConfig.p2pRequirementEnabled,
        status: 'active',
        kycStatus: 'none',
        kycData: { usdtWallet: '', btcWallet: '', telephone: '', country: '', documentUrl: null, documentFilename: null, rejectionReason: null, submittedAt: null },
    };
    users.push(newUser);
    currentUser = newUser;
    sessionStorage.setItem('p2p_reform_currentUser', JSON.stringify(currentUser));
    saveState();
    switchView('user-dashboard-view');
    renderUserDashboard();
    setActiveLink(document.getElementById('nav-dashboard'));
    addGlobalNotification(currentUser.id, "Welcome!", "Registration successful! Please complete your KYC.", "ud-kyc", "success");
    displayNotification("Registration successful! Please complete your KYC verification.", "success");
    showUserDashboardSection('ud-kyc', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-kyc"]'));
}

function handleLogin() {
    const email = getInputValue('login-email').trim().toLowerCase();
    const password = getInputValue('login-password');

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        currentUser = { isAdmin: true, name: "Administrator", id: "admin_user" };
        sessionStorage.setItem('p2p_reform_currentUser', JSON.stringify(currentUser));
        switchView('admin-dashboard-view');
        renderAdminDashboard();
        setActiveLink(document.getElementById('nav-dashboard'));
        return;
    }

    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        if (user.status === 'blocked') { displayNotification('Account blocked. Contact support.', 'error'); return; }
        currentUser = user;

        // Check for any assets that matured while user was away and save state if they did
        if (checkAndProcessMaturedAssets(currentUser)) {
            saveState();
        }
        
        // Ensure user object has all modern properties to prevent errors
        currentUser.kycData = currentUser.kycData || { usdtWallet: '', btcWallet: '', telephone: '', country: '', documentUrl: null, documentFilename: null, rejectionReason: null, submittedAt: null };
        currentUser.walletBalance = currentUser.walletBalance || { USD: 0, ZAR: 0, BTC: 0 };
        currentUser.hasMadeInitialSystemPurchase = currentUser.hasMadeInitialSystemPurchase === undefined ? false : currentUser.hasMadeInitialSystemPurchase;
        currentUser.p2pMarketRequiresInitialPurchase = currentUser.p2pMarketRequiresInitialPurchase === undefined ? true : currentUser.p2pMarketRequiresInitialPurchase;
        currentUser.coinBalance = currentUser.coinBalance === undefined ? 0 : parseFloat(currentUser.coinBalance);
        currentUser.kycStatus = currentUser.kycStatus || 'none';
        
        sessionStorage.setItem('p2p_reform_currentUser', JSON.stringify(currentUser));
        saveState();

        switchView('user-dashboard-view');
        renderUserDashboard();
        setActiveLink(document.getElementById('nav-dashboard'));
        checkBroadcastMessage();

        if (currentUser.kycStatus === 'none') {
             displayNotification("Welcome! Please complete your KYC verification to access all features.", "warning");
             addGlobalNotification(currentUser.id, "KYC Needed", "Please complete your KYC to access all features.", "ud-kyc", "warning");
             showUserDashboardSection('ud-kyc', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-kyc"]'));
        }
    } else { displayNotification('Invalid email or password.', 'error'); }
}

function handleLogout() {
    sessionStorage.removeItem('p2p_reform_currentUser');
    sessionStorage.removeItem('p2p_reform_currentView');
    sessionStorage.removeItem('p2p_reform_userSection');
    sessionStorage.removeItem('p2p_reform_adminSection');
    currentUser = null;

    if (saleCycleInterval) {
        clearInterval(saleCycleInterval);
        saleCycleInterval = null;
    }
    if (userAssetCountdownInterval) {
        clearInterval(userAssetCountdownInterval);
        userAssetCountdownInterval = null;
    }

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
    document.getElementById('profile-usdt-wallet').textContent = currentUser.kycData?.usdtWallet || 'N/A';
    document.getElementById('profile-telephone').textContent = currentUser.kycData?.telephone || 'N/A';
    document.getElementById('profile-country').textContent = currentUser.kycData?.country || 'N/A';

    document.getElementById('coin-balance').textContent = currentUser.coinBalance.toFixed(2);
    renderWalletBalances();

    renderUserCoinChart();
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

    [kycUsdtWalletInput, kycTelephoneInput, kycCountrySelect, kycDocumentInput].forEach(el => {
        if (el) el.disabled = false;
    });

    if (currentUser.kycStatus === 'none' || currentUser.kycStatus === 'rejected') {
        kycFormArea.classList.remove('hidden');
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

        kycUsdtWalletInput.value = currentUser.kycData?.usdtWallet || '';
        kycTelephoneInput.value = currentUser.kycData?.telephone || '';

        [kycUsdtWalletInput, kycTelephoneInput, kycCountrySelect, kycDocumentInput].forEach(el => {
            if (el) el.disabled = true;
        });
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
    
    const kycUsdtWallet = getInputValue('kyc-usdt-wallet').trim();
    // FIX: Removed reference to non-existent 'kyc-btc-wallet' in the user form. Admin can still edit it.
    const kycTelephone = getInputValue('kyc-telephone').trim();
    const kycCountry = getInputValue('kyc-country');
    const kycDocumentFile = getFileInput('kyc-document');

    if (!kycUsdtWallet) { displayNotification('Please provide a USDT Wallet address.', 'warning'); return; }
    if (!kycTelephone || !kycCountry) { displayNotification('Telephone and Country are required.', 'error'); return; }

    const processKycSubmission = () => {
        currentUser.kycData.usdtWallet = kycUsdtWallet;
        currentUser.kycData.telephone = kycTelephone;
        currentUser.kycData.country = kycCountry;
        currentUser.kycData.rejectionReason = null;
        currentUser.kycStatus = 'pending';
        currentUser.kycData.submittedAt = new Date().toISOString();
        
        saveState();
        renderKycForm();
        
        displayNotification('KYC information submitted for review.', 'success');
        addGlobalNotification('admin', 'KYC Submission', `${currentUser.name} submitted KYC for review.`, 'ad-kyc-requests', 'info');
    };

    if (kycDocumentFile) { 
        if (kycDocumentFile.size > 2 * 1024 * 1024) {
            displayNotification("Document file too large (max 2MB).", "error");
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            currentUser.kycData.documentUrl = e.target.result;
            currentUser.kycData.documentFilename = kycDocumentFile.name;
            processKycSubmission();
        };
        reader.onerror = function(e) { 
            console.error("File reading error for KYC:", e); 
            displayNotification('Error reading document file.', 'error');
        };
        reader.readAsDataURL(kycDocumentFile);
    } else if (currentUser.kycData && currentUser.kycData.documentUrl) {
        // Allow re-submission of form without a new file if one already exists
        processKycSubmission();
    } else {
        displayNotification('Please upload a verification document.', 'error');
    }
}

// --- System Coin Sale Cycle (User - Plan Based) ---
function updateSystemSaleUserView(isSaleActive, timeLeftSeconds) {
    const countdownDisplay = document.getElementById('countdown-timer');
    const plansArea = document.getElementById('system-sale-plans-area');
    const userPendingMessageArea = document.getElementById('system-sale-user-pending-message');
    
    if (!countdownDisplay || !plansArea || !userPendingMessageArea) return;

    const minutes = Math.floor(timeLeftSeconds / 60);
    const seconds = timeLeftSeconds % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (isSaleActive) {
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
    const activeP2POffers = sellOffers.filter(o => o.status === 'active' && o.sellerId !== currentUser?.id);

    // Conditionally show message if P2P access is restricted
    const p2pMarketDisabledMessage = document.getElementById('p2p-market-disabled-message');
    const initialPurchaseMessage = document.getElementById('system-sale-initial-purchase-message');
    if (p2pMarketDisabledMessage) {
        const needsInitialPurchase = currentUser.p2pMarketRequiresInitialPurchase && !currentUser.hasMadeInitialSystemPurchase;
        p2pMarketDisabledMessage.classList.toggle('hidden', !needsInitialPurchase);
        if (initialPurchaseMessage) initialPurchaseMessage.classList.toggle('hidden', !needsInitialPurchase || activePlans.length === 0);
    }
    
    if (activePlans.length === 0 && activeP2POffers.length === 0) {
        marketplaceDiv.innerHTML = '<p>No asset programs or P2P offers currently available. Check back later!</p>';
        return;
    }
    
    const allItems = [...activePlans, ...activeP2POffers];

    allItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'system-sale-plan-item';
        let planName, cost, baseCoins, maturity, returnPercent, totalReturn, currency, onClickAction, itemTypeIcon;

        // This is a "Seller" (system) plan
        if (item.hasOwnProperty('coinsAwarded')) { 
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
        
        // This is a P2P offer from another user
        } else {
            // If P2P requires an initial purchase, and the user hasn't made one, don't show the P2P offer.
            if (currentUser && currentUser.p2pMarketRequiresInitialPurchase && !currentUser.hasMadeInitialSystemPurchase) {
                return;
            }

            const offer = item;
            onClickAction = `buyFromP2POffer('${offer.id}')`;
            itemTypeIcon = 'fa-user-tag';

            planName = offer.adminPlanName || `P2P Program from ${offer.sellerName}`;
            baseCoins = offer.amount; 
            cost = offer.amount * offer.adminPrice;
            currency = offer.adminCurrency;
            maturity = formatDuration(offer.adminMaturityDurationSeconds);
            returnPercent = offer.adminReturnPercentage;
            totalReturn = baseCoins * (1 + returnPercent / 100);
        }

        itemDiv.innerHTML = `
            <h5><i class="fas ${itemTypeIcon}"></i> ${planName}</h5>
            <p><strong>Cost:</strong> ${formatCurrency(cost, currency)}</p>
            <p><strong>Base Coins:</strong> ${baseCoins.toFixed(2)} COIN</p>
            <p><strong>Maturity:</strong> ${maturity}</p>
            <p><strong>Return:</strong> ${returnPercent}%</p>
            <p style="font-weight:bold;"><strong>Total after maturity:</strong> ${totalReturn.toFixed(2)} COIN</p>
            <button class="accent" onclick="${onClickAction}"><i class="fas fa-shopping-cart"></i> Purchase</button>
        `;
        marketplaceDiv.appendChild(itemDiv);
    });
}

function handleSystemPlanPurchaseRequest(planId) {
    const cycleState = JSON.parse(localStorage.getItem('p2p_reform_sale_cycle_state')) || {};
    const isSaleActive = cycleState.phase === 'sale' && Date.now() < cycleState.phaseEndTime;

    if (!isSaleActive) {
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
                usdtWallet: plan.planUsdtWallet
            }
        },
        status: 'awaiting_payment_to_seller',
        paymentProofFilename: null,
        paymentProofDataUrl: null,
        createdAt: new Date().toISOString()
    };
    systemPurchaseRequests.push(newRequest);
    saveState();

    displayNotification(`Purchase request for '${plan.name}' submitted. Make payment and upload proof via 'Pending Transactions'.`, 'info');
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
                
                currentUser.coinBalance += offerToCancel.amount;

                // Set all assets that were part of the listing back to 'credited'
                userAssets.forEach(asset => {
                    if (asset.userId === currentUser.id && asset.status === 'listed_on_market') {
                        asset.status = 'credited';
                    }
                });
                
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

            let p2pSellerPaymentDetails = 'Seller payment details unavailable';
            if (p2pSellerUser?.kycData) {
                if (tx.currency === 'BTC' && p2pSellerUser.kycData.btcWallet) {
                    p2pSellerPaymentDetails = `<strong>BTC Wallet:</strong> ${p2pSellerUser.kycData.btcWallet}`;
                } else if (p2pSellerUser.kycData.usdtWallet) {
                     p2pSellerPaymentDetails = `<strong>USDT Wallet (TRC20):</strong> ${p2pSellerUser.kycData.usdtWallet}`;
                } else {
                     p2pSellerPaymentDetails = 'Seller has not set a valid wallet address for this currency!';
                     if (tx.buyerId === currentUser.id) {
                        actionsHtml += `<p style="padding:0.3rem; font-size:0.8rem; color:var(--danger-color);">Warning: Seller has not set a wallet address! Contact support.</p>`;
                     }
                }
            }
            
            const displayTotalP2P = formatCurrency(tx.totalPrice, tx.currency);

            itemDetailsHtml = `
                <p>Type: P2P ${tx.buyerId === currentUser.id ? 'Purchase from' : 'Sale to'} <strong>${tx.buyerId === currentUser.id ? tx.sellerName : tx.buyerName}</strong></p>
                <p>Amount: ${tx.amount.toFixed(2)} COIN</p>
                <p>Total: ${displayTotalP2P}</p>
                <p>Status: <strong style="text-transform: capitalize;">${tx.status.replace(/_/g, ' ')}</strong></p>
            `;

            if (tx.buyerId === currentUser.id) { 
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
            } else if (tx.sellerId === currentUser.id) { 
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

            let sellerPaymentDetailsHtml = `<div class="seller-payment-details-box">
                <strong>Seller payment details for this program:</strong>`;
            if (req.planDetails?.paymentInfo) {
                const info = req.planDetails.paymentInfo;
                if (info.usdtWallet) {
                    sellerPaymentDetailsHtml += `<p>USDT Wallet (TRC20): ${info.usdtWallet}</p>`;
                } else {
                   sellerPaymentDetailsHtml += "<p>Not configured by Seller.</p>";
                }
            } else {
                sellerPaymentDetailsHtml += "<p>Configuration Error.</p>";
            }
            sellerPaymentDetailsHtml += `</div>`;


             itemDetailsHtml = `
                <p>${planNameDisplay}</p>
                ${coinsDisplay ? `<p>${coinsDisplay}</p>` : ''}
                <p>Total Price: ${displayTotalSys}</p>
                <p>Status: <strong style="text-transform: capitalize;">${req.status.replace(/_/g, ' ')}</strong></p>
            `;

            if (req.status === 'awaiting_payment_to_seller') {
                actionsHtml = `
                    <p><strong>Action:</strong> Pay ${displayTotalSys} to Seller.</p>
                    ${sellerPaymentDetailsHtml}
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
        const processProof = () => {
            tx.status = 'payment_proof_submitted';
            saveState(); 
            renderUserPendingTransactions();
            displayNotification(`Payment proof (${tx.paymentProofFilename}) submitted for Tx ID ${tx.id.substring(0,8)}. Waiting for seller confirmation.`, 'success');
            addGlobalNotification(tx.sellerId, "P2P Payment Proof Submitted", `${tx.buyerName} submitted payment proof for your offer. Please verify and finalize the transaction.`, 'ud-pending-transactions');
        };

        if (file.size > 2 * 1024 * 1024) {
            displayNotification("File too large for preview (max 2MB). Filename stored.", "warning");
            tx.paymentProofFilename = file.name; 
            tx.paymentProofDataUrl = null;
            processProof();
        } else {
            tx.paymentProofFilename = file.name;
            const reader = new FileReader();
            reader.onload = function(e) { 
                tx.paymentProofDataUrl = e.target.result; 
                processProof();
            };
            reader.onerror = function(e) { 
                console.error("File reading error:", e); 
                tx.paymentProofDataUrl = null;
                processProof();
            };
            reader.readAsDataURL(file);
        }
    } else { displayNotification('Please select a file to upload as proof of payment.', 'error'); return; }
}

/**
 * Finalizes a P2P transaction. This is a critical state-mutating function.
 * 1. Creates a new maturing asset for the buyer.
 * 2. Updates the seller's assets that were part of the P2P listing to 'sold'.
 * 3. Updates the transaction and original P2P offer to their final statuses.
 * 4. Notifies the buyer of their new asset.
 * 5. Saves the state and re-renders the UI.
 * @param {string} transactionId - The ID of the transaction to finalize.
 */
function confirmPaymentAndReleaseCoins(transactionId) {
    showCustomConfirm(
        "Are you sure you have received the payment? This action is irreversible and will transfer the asset program to the buyer.",
        () => {
            // Step 1: Find all related data objects
            const tx = transactions.find(t => t.id === transactionId && t.sellerId === currentUser.id);
            if (!tx) {
                displayNotification('Transaction not found or you are not the seller.', 'error');
                return;
            }

            const buyer = users.find(u => u.id === tx.buyerId);
            if (!buyer) {
                displayNotification('Critical Error: Buyer could not be found. Cannot complete transaction.', 'error');
                return;
            }

            const offer = sellOffers.find(o => o.id === tx.offerId);
            if (!offer) {
                displayNotification('Critical Error: The original P2P offer could not be found. Cannot complete transaction.', 'error');
                return;
            }
            
            // Step 2: Create the new maturing asset for the buyer based on the offer's terms
            const returnPercentage = offer.adminReturnPercentage || 0;
            const maturityDurationSeconds = offer.adminMaturityDurationSeconds || (7 * 86400); // Default 7 days
            const totalReturnForBuyer = offer.amount * (1 + returnPercentage / 100);

            const newAssetForBuyer = {
                id: generateId(),
                userId: buyer.id,
                userName: buyer.name,
                planId: offer.id, // Use offer ID as the plan reference
                planName: offer.adminPlanName || `P2P Program from ${tx.sellerName}`,
                purchaseDate: new Date().toISOString(),
                maturityDate: new Date(Date.now() + maturityDurationSeconds * 1000).toISOString(),
                baseCoins: offer.amount,
                returnPercentage: returnPercentage,
                totalReturnCoins: totalReturnForBuyer,
                status: 'maturing',
                origin: { 
                    type: 'p2p_repackaged',
                    cost: offer.amount * (offer.adminPrice || 0),
                    currency: offer.adminCurrency || 'USD',
                    baseCoins: offer.amount,
                    returnPercentage: returnPercentage,
                    maturityDurationSeconds: maturityDurationSeconds
                }
            };
            userAssets.push(newAssetForBuyer);

            // Step 3: Update the seller's assets that were part of this sale
            // This marks all assets that were "backing" the P2P offer as now being sold
            userAssets.forEach(asset => {
                if (asset.userId === tx.sellerId && asset.status === 'listed_on_market') {
                    asset.status = 'sold';
                }
            });

            // Step 4: Update transaction and offer statuses to their final state
            tx.status = 'completed';
            offer.status = 'sold';

            // Step 5: Notify the buyer
            addGlobalNotification(
                buyer.id, 
                "P2P Purchase Complete", 
                `Your purchase from ${tx.sellerName} is complete. The program is now maturing in "My Assets".`, 
                'ud-my-assets', 
                'success'
            );

            // Step 6: Save state and re-render the seller's dashboard
            saveState();
            renderUserDashboard();
            displayNotification(`Payment confirmed. Transaction with ${buyer.name} is complete.`, 'success');
        }, 
        "Confirm Payment", "Yes, I Received It", "accent"
    );
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
            tx.status = 'cancelled';
            const originalOffer = sellOffers.find(o => o.id === tx.offerId);
            if (originalOffer && originalOffer.status === 'pending_sale') {
                originalOffer.status = 'active';
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
    if (!currentUser || !window.jspdf) return;
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
        const processProof = () => {
            req.status = 'payment_proof_submitted_to_seller';
            saveState(); 
            renderUserPendingTransactions();
            displayNotification(`Proof (${req.paymentProofFilename}) submitted to Seller for program purchase.`, 'success');
            addGlobalNotification('admin', 'Seller Sale Proof', `${req.userName} submitted proof for program '${req.planDetails.name}'.`, 'ad-system-sale-requests');
        };

         if (file.size > 2 * 1024 * 1024) {
            displayNotification("File too large for preview (max 2MB). Filename stored.", "warning");
            req.paymentProofFilename = file.name; 
            req.paymentProofDataUrl = null;
            processProof();
        } else {
            req.paymentProofFilename = file.name;
            const reader = new FileReader();
            reader.onload = function(e) { 
                req.paymentProofDataUrl = e.target.result; 
                processProof();
            };
            reader.onerror = function(e) { 
                console.error("File reading error:", e); 
                req.paymentProofDataUrl = null; 
                processProof();
            };
            reader.readAsDataURL(file);
        }
    } else { displayNotification('Select a file for proof.', 'error'); return; }
}

// --- Asset Program (User) ---
function renderUserAssets() {
    const assetsListDiv = document.getElementById('user-assets-list');
    if (!assetsListDiv || !currentUser) return;

    const myAssets = userAssets.filter(asset => asset.userId === currentUser.id);

    // Separate assets based on their status for clearer rendering.
    const listedOnMarketAssets = myAssets.filter(asset => asset.status === 'listed_on_market');
    const otherAssets = myAssets.filter(asset => asset.status !== 'listed_on_market')
        .sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));

    assetsListDiv.innerHTML = '';

    if (otherAssets.length === 0 && listedOnMarketAssets.length === 0) {
        assetsListDiv.innerHTML = '<p>You have not purchased any asset programs yet. Visit the "Marketplace" page to start.</p>';
        return;
    }

    // Render a single, clear summary card for all assets currently on the P2P market.
    if (listedOnMarketAssets.length > 0) {
        const activeSellOffer = sellOffers.find(o => o.sellerId === currentUser.id && o.status === 'active');
        if (activeSellOffer) {
            const summaryAssetDiv = document.createElement('div');
            summaryAssetDiv.className = 'asset-item';
            summaryAssetDiv.style.backgroundColor = '#e7f7ff';
            summaryAssetDiv.style.borderLeftColor = 'var(--accent-color)';
            summaryAssetDiv.innerHTML = `
                <h5><i class="fas fa-bullhorn"></i> P2P Market Listing</h5>
                <p><strong>Total Coins Listed:</strong> ${activeSellOffer.amount.toFixed(2)} COIN</p>
                <p><strong>Est. Total Value:</strong> ${formatCurrency(activeSellOffer.amount * activeSellOffer.adminPrice, activeSellOffer.adminCurrency)}</p>
                <p><strong>Status:</strong> <span style="color: var(--accent-color); font-weight: 600;">Active on P2P Market</span></p>
                <p><small>This represents your coins for sale. Manage this from the "My P2P Offers" page.</small></p>
            `;
            assetsListDiv.appendChild(summaryAssetDiv);
        }
    }

    // Render individual cards for all other assets (maturing, credited, sold, etc.).
    otherAssets.forEach(asset => {
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
                <p style="color: var(--success-color); font-weight: 600;">Status: Matured & Credited</p>
                <button onclick="listAssetOnP2P('${asset.id}')" class="accent"><i class="fas fa-bullhorn"></i> List on P2P Market</button>
            `;
        } else if (asset.status === 'sold') {
            statusHtml = `<p><strong>Status:</strong> <span style="color: var(--success-color); font-weight: 600;">Sold on P2P Market</span></p>`;
        } else {
             statusHtml = `<p><strong>Status:</strong><span style="text-transform: capitalize;"> ${asset.status.replace(/_/g, ' ')}</span></p>`;
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


function startAssetCountdowns() {
    if (userAssetCountdownInterval) clearInterval(userAssetCountdownInterval);
    if (!currentUser || currentUser.isAdmin) return;
    
    // This function runs every second to update countdowns for assets currently displayed on the page.
    userAssetCountdownInterval = setInterval(() => {
        let needsDashboardUpdate = false;
        
        // Find all assets that are currently maturing for the logged-in user.
        const assetsToCheck = userAssets.filter(asset => 
            asset.userId === currentUser.id && 
            (asset.status === 'maturing' || asset.status === 'repackaged_profit_maturing')
        );

        // If no assets are maturing, we can stop the interval.
        if (assetsToCheck.length === 0) {
             clearInterval(userAssetCountdownInterval);
             userAssetCountdownInterval = null;
             return;
        }

        assetsToCheck.forEach(asset => {
            const countdownEl = document.getElementById(`countdown-${asset.id}`);
            if (!countdownEl) return; // Skip if the element isn't on the page

            const maturityDate = new Date(asset.maturityDate);
            const now = new Date();
            const timeLeftSeconds = Math.max(0, (maturityDate.getTime() - now.getTime()) / 1000);

            if (timeLeftSeconds > 0) {
                // Update the visual countdown timer.
                const days = Math.floor(timeLeftSeconds / 86400);
                const hours = Math.floor((timeLeftSeconds % 86400) / 3600);
                const minutes = Math.floor((timeLeftSeconds % 3600) / 60);
                const seconds = Math.floor(timeLeftSeconds % 60);
                countdownEl.textContent = `Matures in: ${days}d ${hours}h ${minutes}m ${seconds}s`;
            } else {
                // The countdown has finished. Time to mature the asset.
                // We run the robust checkAndProcessMaturedAssets function which handles the actual data change.
                if(checkAndProcessMaturedAssets(currentUser)){
                    // If the function returns true, it means an asset was changed.
                    // We flag that the dashboard needs a full visual update.
                    needsDashboardUpdate = true;
                }
            }
        });

        if (needsDashboardUpdate) {
            // If any asset matured, save the new state and re-render the relevant dashboard components.
            saveState();
            renderUserAssets(); // Re-render the asset list to show the new 'credited' status.
            renderUserCoinChart(); // Update the pie chart.
            document.getElementById('coin-balance').textContent = currentUser.coinBalance.toFixed(2); // Update the main balance display.
        }
    }, 1000);
}


function listAssetOnP2P(assetId) {
    if (currentUser.p2pMarketRequiresInitialPurchase && !currentUser.hasMadeInitialSystemPurchase) {
        displayNotification('You must purchase a program from the seller first to access the P2P market.', 'warning');
        showUserDashboardSection('ud-system-sale', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-system-sale"]'));
        return;
    }

    const triggeringAsset = userAssets.find(a => a.id === assetId && a.userId === currentUser.id && a.status === 'credited');
    if (!triggeringAsset) {
        displayNotification("Could not find a valid credited asset to trigger the sale.", "error");
        return;
    }

    const amountToList = currentUser.coinBalance;

    if (amountToList <= 0) {
        displayNotification(`You have no liquid COINs to list. Your balance is 0.`, "error");
        return;
    }
    
    // Find a valid pricing origin, starting with the triggering asset.
    let originData = null;
    if (triggeringAsset.origin && (triggeringAsset.origin.type === 'system' || triggeringAsset.origin.type === 'p2p_repackaged')) {
        originData = triggeringAsset.origin;
    } else {
        // Fallback: find the most recent asset with valid origin data.
        const userAssetsSorted = userAssets
                .filter(a => a.userId === currentUser.id && a.origin)
                .sort((a,b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
        if (userAssetsSorted.length > 0) {
            originData = userAssetsSorted[0].origin;
        }
    }

    if (!originData || originData.cost === undefined || originData.baseCoins === undefined || originData.baseCoins <= 0) {
        displayNotification("Error: The pricing origin for your assets is unclear. Cannot create P2P offer. Please contact support.", "error");
        return;
    }

    const confirmationMessage = `This will list your <strong>entire liquid balance (${amountToList.toFixed(2)} COINs)</strong> on the P2P market. Your liquid balance will be set to 0 and these coins will be held for the sale.<br><br>The selling price will be automatically calculated based on your asset history. Do you want to proceed?`;

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
        }, "Confirm P2P Sale", "Yes, List My Coins", "accent"
    );
}

function createP2PListingFromLiquidBalance(userToList, originData) {
    const amountToList = userToList.coinBalance;
    if (amountToList <= 0) {
        return { success: false, message: "No liquid COINs to list." };
    }

    if (!originData || originData.cost === undefined || originData.baseCoins === undefined || originData.baseCoins <= 0) {
        return { success: false, message: "Cannot create P2P offer due to missing or invalid pricing origin data." };
    }
    
    // Calculate the price per coin based on the origin asset data
    const costPerBaseCoin = originData.cost / originData.baseCoins;
    const newOfferPricePerCoin = costPerBaseCoin; // Price per coin is based on what the user originally paid
    
    // Get other terms from the origin
    const newOfferCurrency = originData.currency || systemSaleConfig.defaultSystemCurrency;
    const newOfferReturnPercentage = originData.returnPercentage;
    const newOfferMaturityDuration = originData.maturityDurationSeconds;

    const newOffer = {
        id: generateId(),
        sellerId: userToList.id,
        sellerName: userToList.name,
        amount: amountToList,
        adminModified: true, // This flag indicates the terms are set by the system
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
    
    // Mark all credited assets as being part of the new P2P listing
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
        if (selectedCurrency === 'BTC') {
            destinationText = currentUser.kycData.btcWallet 
                ? `BTC Wallet: ${currentUser.kycData.btcWallet}`
                : `Your BTC wallet is not set in KYC.`;
        } else { 
            destinationText = currentUser.kycData.usdtWallet
                ? `USDT Wallet (TRC20): ${currentUser.kycData.usdtWallet}`
                : `Your USDT wallet is not set in KYC.`;
        }
    }
    destinationInfoEl.textContent = destinationText;
}


function handleWithdrawalRequest() {
    if (!currentUser || currentUser.kycStatus !== 'approved') {
        displayNotification('Your KYC must be approved to request withdrawals.', 'warning');
        return;
    }

    const currency = getInputValue('withdraw-currency');
    const amount = parseFloat(getInputValue('withdraw-amount'));

    if (isNaN(amount) || amount <= 0) {
        displayNotification('Please enter a valid positive amount to withdraw.', 'error');
        return;
    }

    if (!currentUser.walletBalance || currentUser.walletBalance[currency] === undefined || currentUser.walletBalance[currency] < amount) {
        displayNotification(`Insufficient ${currency} balance. You have ${formatCurrency(currentUser.walletBalance[currency] || 0, currency)}.`, 'error');
        return;
    }

    let destinationValid = false;
    let destinationString = '';
    if (currency === 'BTC') {
        if (currentUser.kycData.btcWallet) {
            destinationValid = true;
            destinationString = `BTC Wallet: ${currentUser.kycData.btcWallet}`;
        }
    } else { 
        if (currentUser.kycData.usdtWallet) {
            destinationValid = true;
            destinationString = `USDT Wallet (TRC20): ${currentUser.kycData.usdtWallet}`;
        }
    }

    if (!destinationValid) {
        const walletType = currency === 'BTC' ? 'BTC' : 'USDT';
        displayNotification(`Your destination ${walletType} wallet is not set in your KYC. Please contact support to add it.`, 'error');
        showUserDashboardSection('ud-support-tickets', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-support-tickets"]'));
        return;
    }

    const newRequest = {
        id: generateId(),
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        amount: amount,
        currency: currency,
        destination: destinationString,
        status: 'pending_admin_approval',
        requestedAt: new Date().toISOString(),
        processedAt: null,
        adminNotes: null
    };

    currentUser.walletBalance[currency] -= amount;
    withdrawalRequests.unshift(newRequest);
    saveState();

    displayNotification(`Withdrawal request for ${formatCurrency(amount, currency)} submitted. Admin will review within 48 hours.`, 'success');
    addGlobalNotification('admin', 'New Withdrawal Request', `${currentUser.name} requested to withdraw ${formatCurrency(amount, currency)}.`, 'ad-withdrawal-requests', 'info');
    
    const withdrawAmountInput = document.getElementById('withdraw-amount');
    if (withdrawAmountInput) withdrawAmountInput.value = '';
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


// --- Support Tickets (Live Chat) ---
function createNewSupportTicket() {
    if (!currentUser) { displayNotification('Please log in to create a support ticket.', 'error'); return; }
    const subject = getInputValue('ticket-subject').trim();
    const message = getInputValue('ticket-message').trim();

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

    const subjectInput = document.getElementById('ticket-subject');
    const messageInput = document.getElementById('ticket-message');
    if (subjectInput) subjectInput.value = '';
    if (messageInput) messageInput.value = '';
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
                <button onclick="openTicketDetailsModal('${ticket.id}')" class="button secondary small">View Chat</button>
                ${(ticket.status !== 'resolved_by_user' && ticket.status !== 'closed_by_admin') ? `<button onclick="updateTicketStatus('${ticket.id}', 'resolved_by_user')" class="button accent small">Mark Resolved</button>` : ''}
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
        
        if (msg.senderId === 'admin_user') {
            messageClass += 'admin-message';
        } else {
            messageClass += 'user-message';
        }
        msgDiv.className = messageClass;

        msgDiv.innerHTML = `
            <strong>${escapeHTML(msg.senderName)}</strong>
            <p>${escapeHTML(msg.text).replace(/\n/g, '<br>')}</p>
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
    const modal = document.getElementById('ticket-details-modal');
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
            currentOpenTicketId = null;
        }, 300);
    }
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

    const replyMessage = getInputValue('ticket-reply-message').trim();
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
    const replyMessageInput = document.getElementById('ticket-reply-message');
    if (replyMessageInput) replyMessageInput.value = '';
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
    document.getElementById('admin-broadcast-message').value = systemSaleConfig.broadcastMessage || '';

    const p2pToggle = document.getElementById('admin-p2p-access-toggle');
    const p2pStatus = document.getElementById('admin-p2p-access-status');
    p2pToggle.checked = systemSaleConfig.p2pRequirementEnabled;
    p2pStatus.textContent = systemSaleConfig.p2pRequirementEnabled ? 'Enabled (Purchase Required)' : 'Disabled (Open Access)';
    p2pStatus.style.color = systemSaleConfig.p2pRequirementEnabled ? 'var(--danger-color)' : 'var(--success-color)';
}

function setBroadcastMessage() {
    const message = getInputValue('admin-broadcast-message').trim();
    if (message) {
        systemSaleConfig.broadcastMessage = message;
        saveState();
        displayNotification('Broadcast message has been set and will be shown to users upon login.', 'success');
    } else {
        displayNotification('Broadcast message cannot be empty.', 'error');
    }
}

function clearBroadcastMessage() {
    systemSaleConfig.broadcastMessage = '';
    saveState();
    const broadcastInput = document.getElementById('admin-broadcast-message');
    if (broadcastInput) broadcastInput.value = '';
    displayNotification('Broadcast message has been cleared.', 'info');
}

function checkBroadcastMessage() {
    if (systemSaleConfig.broadcastMessage && systemSaleConfig.broadcastMessage.trim() !== '') {
        setTimeout(() => {
            displayNotification(systemSaleConfig.broadcastMessage, 'info');
        }, 500);
    }
}


function toggleP2PRequirementDefault() {
    const p2pToggle = document.getElementById('admin-p2p-access-toggle');
    systemSaleConfig.p2pRequirementEnabled = p2pToggle.checked;
    saveState();
    loadSystemSaleGeneralSettingsForAdminForm(); 
    displayNotification(`Default P2P access requirement is now ${systemSaleConfig.p2pRequirementEnabled ? 'ENABLED' : 'DISABLED'}.`, 'info');
}

function saveDefaultSystemCurrency() {
    const newDefaultCurrency = getInputValue('admin-default-currency');
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
    const saleDuration = parseInt(getInputValue('admin-sale-duration'));
    const cooldownDuration = parseInt(getInputValue('admin-cooldown-duration'));

    if (isNaN(saleDuration) || saleDuration <=0 || isNaN(cooldownDuration) || cooldownDuration <=0) {
        displayNotification("Sale and Cooldown durations must be be positive numbers.", "error");
        return;
    }
    systemSaleConfig.saleDurationSeconds = saleDuration;
    systemSaleConfig.cooldownDurationSeconds = cooldownDuration;
    saveState();
    
    localStorage.removeItem('p2p_reform_sale_cycle_state');
    
    displayNotification("System sale timers saved. The timer will use the new durations on its next cycle.", "success");
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
    const name = getInputValue('plan-name').trim();
    const cost = parseFloat(getInputValue('plan-cost'));
    const currency = getInputValue('plan-currency');
    const coinsAwarded = parseInt(getInputValue('plan-coins-awarded'));
    const returnPercentage = parseFloat(getInputValue('plan-return-percentage'));
    const maturityValue = parseInt(getInputValue('plan-maturity-value'));
    const maturityUnit = getInputValue('plan-maturity-unit');
    const planUsdtWallet = getInputValue('plan-btc-wallet').trim(); // HTML ID is plan-btc-wallet

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
        planUsdtWallet
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
    document.getElementById('plan-btc-wallet').value = plan.planUsdtWallet || '';

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
        } else if (req.paymentProofDataUrl) {
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
    
    const searchTerm = getInputValue('admin-user-search').toLowerCase().trim();

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
    const newBalanceStr = getInputValue(`adj-bal-${userId}`);
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
            user.coinBalance = newBalance;
            
            if (newBalance <= 0) {
                saveState();
                renderAdminUserList();
                displayNotification(`${user.name}'s balance set to ${newBalance.toFixed(2)}. No P2P offer created as balance is zero.`, 'info');
                return;
            }

            // Find a valid pricing origin for the new P2P offer.
            // Priority: Most recent user asset. Fallback: First available system plan.
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
                    displayNotification(`${user.name}'s balance was set to ${newBalance.toFixed(2)} and automatically listed on P2P market.`, 'success');
                    addGlobalNotification(user.id, "Balance Credited & Listed", `Admin credited your account, and your balance of ${result.offer.amount.toFixed(2)} COINs has been placed on the P2P market.`, 'ud-my-assets', 'success');
                } else {
                    saveState(); 
                    renderAdminUserList();
                    displayNotification(`Balance for ${user.name} was set to ${newBalance.toFixed(2)}, but P2P listing failed: ${result.message}`, 'error');
                }
            } else {
                saveState(); 
                renderAdminUserList();
                displayNotification(`Balance for ${user.name} was set to ${newBalance.toFixed(2)}, but could not list on P2P: No suitable pricing origin (user asset or system plan) found.`, 'error');
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
            renderAdminDashboard(); 
            displayNotification(`User ${userToDelete.name} and all associated data permanently deleted.`, 'success');
        }, "Confirm User Deletion", "DELETE USER", "danger"
    );
}
function renderAdminP2PTransactions() {
    const p2pArea = document.getElementById('admin-p2p-transactions-area');
    if(!p2pArea) return;
    p2pArea.innerHTML = '';
    const filterStatus = getInputValue('admin-p2p-filter-status', 'all');

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
    
    const modal = document.getElementById('admin-edit-kyc-modal');
    if (!modal) {
        console.error("Admin Edit KYC modal element not found in HTML.");
        return;
    }

    const setInputValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };
    const setTextContent = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    const setChecked = (id, checked) => {
        const el = document.getElementById(id);
        if (el) el.checked = checked;
    };
    
    setInputValue('admin-edit-kyc-userId', userId);
    setTextContent('admin-edit-kyc-modal-title', `Edit KYC: ${user.name}`);

    const kyc = user.kycData || {};
    setInputValue('admin-kyc-usdt-wallet', kyc.usdtWallet);
    // Note: The HTML doesn't contain `admin-kyc-btc-wallet`, but the logic to save it is present
    // which is fine as it won't crash. Admin can add it via this modal if needed.
    setInputValue('admin-kyc-telephone', kyc.telephone);
    setInputValue('admin-kyc-status', user.kycStatus || 'none');
    
    populateCountryDropdown('admin-kyc-country', kyc.country);
    
    setChecked('admin-kyc-p2p-bypass', !user.p2pMarketRequiresInitialPurchase);
    
    const rejectionGroup = document.getElementById('admin-kyc-rejection-reason-group');
    const statusSelect = document.getElementById('admin-kyc-status');
    if (rejectionGroup && statusSelect) {
        rejectionGroup.classList.toggle('hidden', statusSelect.value !== 'rejected');
    }
    setInputValue('admin-kyc-rejection-reason', kyc.rejectionReason);
    
    const docDisplay = document.getElementById('admin-kyc-doc-display');
    if (docDisplay) {
         docDisplay.innerHTML = kyc.documentUrl ? `<a href="${kyc.documentUrl}" target="_blank">View Current Document</a>` : 'No Document Provided';
    }

    setInputValue('admin-kyc-new-document', '');

    modal.style.display = 'block';
}

function closeAdminEditKycModal() {
    const modal = document.getElementById('admin-edit-kyc-modal');
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
        }, 300);
    }
}

function saveAdminKycChanges() {
    const userId = getInputValue('admin-edit-kyc-userId');
    const user = users.find(u => u.id === userId);
    if (!user) { displayNotification('User not found.', 'error'); return; }

    if (!user.kycData) user.kycData = {};
    const oldKycStatus = user.kycStatus;

    user.kycData.usdtWallet = getInputValue('admin-kyc-usdt-wallet', user.kycData.usdtWallet).trim();
    user.kycData.telephone = getInputValue('admin-kyc-telephone', user.kycData.telephone).trim();
    user.kycData.country = getInputValue('admin-kyc-country', user.kycData.country);
    user.kycStatus = getInputValue('admin-kyc-status', user.kycStatus);
    user.p2pMarketRequiresInitialPurchase = !getCheckedValue('admin-kyc-p2p-bypass', !user.p2pMarketRequiresInitialPurchase);
    user.kycData.rejectionReason = user.kycStatus === 'rejected' ? getInputValue('admin-kyc-rejection-reason').trim() : null;
    
    const newDocumentFile = getFileInput('admin-kyc-new-document');

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
                <button class="secondary small" onclick="openAdminRepackageP2POfferModal('${offer.id}')">Edit Offer</button>
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
                seller.coinBalance += offer.amount;
                userAssets.forEach(asset => {
                    if (asset.userId === seller.id && asset.status === 'listed_on_market') {
                        asset.status = 'credited';
                    }
                });
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
    modal.querySelector('h3').textContent = 'Edit P2P Offer';
    modal.querySelector('p').textContent = 'All financial terms are set automatically. You can edit the display name for this P2P offer.';

    const originalDetailsDiv = document.getElementById('admin-repackage-p2p-original-details');
    originalDetailsDiv.innerHTML = `
        <p><strong>Seller:</strong> ${offer.sellerName}</p>
        <p><strong>Coins for Sale:</strong> ${offer.amount.toFixed(2)}</p>
        <p><strong>Automated Price:</strong> ${formatCurrency(offer.adminPrice, offer.adminCurrency)}</p>
        <p><strong>Automated Return:</strong> ${offer.adminReturnPercentage}%</p>
        <p><strong>Automated Maturity:</strong> ${formatDuration(offer.adminMaturityDurationSeconds)}</p>
    `;
    
    document.getElementById('admin-repackage-plan-name').value = offer.adminPlanName || `P2P Program from ${offer.sellerName}`;

    modal.querySelectorAll('.form-inline-group').forEach(el => el.classList.add('hidden'));
    
    modal.style.display = 'block';
}

function closeAdminRepackageP2POfferModal() {
    const modal = document.getElementById('admin-repackage-p2p-offer-modal');
    if(modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
            modal.querySelectorAll('.form-inline-group').forEach(el => el.classList.remove('hidden'));
        }, 300);
    }
}

function saveAdminRepackageP2POffer() {
    const offerId = getInputValue('admin-repackage-p2p-offer-id');
    const offer = sellOffers.find(o => o.id === offerId);
    if (!offer) { displayNotification("Offer not found.", "error"); return; }

    const newPlanName = getInputValue('admin-repackage-plan-name').trim();

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
        try {
            const persistedUserData = JSON.parse(persistedUserJSON);
            if (persistedUserData.isAdmin) {
                currentUser = persistedUserData;
            } else {
                const freshUser = users.find(u => u.id === persistedUserData.id);
                if (freshUser) {
                    currentUser = freshUser;
                    // Robustly check for matured assets on every page load for the logged-in user.
                    if (checkAndProcessMaturedAssets(currentUser)) {
                        saveState(); // Save changes if any assets matured.
                    }
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
        } catch (e) {
            console.error("Error parsing persisted user data", e);
            handleLogout();
        }
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