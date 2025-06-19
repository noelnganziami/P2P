// --- Application State & Mock Data ---
let currentUser = null;
let users = JSON.parse(localStorage.getItem('p2p_reform_users')) || [];
users = users.map(user => ({
    ...user,
    walletBalance: user.walletBalance || { USD: 0, ZAR: 0, BTC: 0 },
    hasMadeInitialSystemPurchase: user.hasMadeInitialSystemPurchase === undefined ? false : user.hasMadeInitialSystemPurchase,
    zarProfitWallet: user.zarProfitWallet === undefined ? 0 : user.zarProfitWallet,
    usdProfitWallet: user.usdProfitWallet === undefined ? 0 : user.usdProfitWallet
}));

let transactions = JSON.parse(localStorage.getItem('p2p_reform_transactions')) || [];
let sellOffers = JSON.parse(localStorage.getItem('p2p_reform_sell_offers')) || [];
let investments = JSON.parse(localStorage.getItem('p2p_reform_investments')) || [];
let globalNotifications = JSON.parse(localStorage.getItem('p2p_reform_global_notifications')) || [];
let supportTickets = JSON.parse(localStorage.getItem('p2p_reform_support_tickets')) || [];
let withdrawalRequests = JSON.parse(localStorage.getItem('p2p_reform_withdrawal_requests')) || []; // New State

let systemSaleConfig = JSON.parse(localStorage.getItem('p2p_reform_system_sale_config')) || {
    saleDurationSeconds: 300,
    cooldownDurationSeconds: 60,
    defaultSystemCurrency: "USD"
};
let systemSalePlans = JSON.parse(localStorage.getItem('p2p_reform_system_sale_plans')) || [];
let systemPurchaseRequests = JSON.parse(localStorage.getItem('p2p_reform_system_purchases')) || [];

const ADMIN_EMAIL = "scothyjunior@gmail.com";
const ADMIN_PASSWORD = "Djsthy@2020";

const COIN_SALE_BONUS_PERCENTAGE = 0.08;
const FIAT_PROFIT_PERCENTAGE = 0.25;
const PLACEHOLDER_USD_TO_ZAR_RATE = 18;
const DEFAULT_BTC_P2P_SELL_PRICE = 0.00002;
const DEFAULT_BASE_COIN_PRICE_USD = 0.50; // Fallback price for users without a purchase history

let saleCycleInterval;
let coinSaleActive = false;
let currentPhaseTimeLeft = 0;
let saleNotificationShown = false;

let userCoinChartInstance = null;

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
        localStorage.setItem('p2p_reform_investments', JSON.stringify(investments));
        localStorage.setItem('p2p_reform_system_sale_config', JSON.stringify(systemSaleConfig));
        localStorage.setItem('p2p_reform_system_sale_plans', JSON.stringify(systemSalePlans));
        localStorage.setItem('p2p_reform_system_purchases', JSON.stringify(systemPurchaseRequests));
        localStorage.setItem('p2p_reform_global_notifications', JSON.stringify(globalNotifications));
        localStorage.setItem('p2p_reform_support_tickets', JSON.stringify(supportTickets));
        localStorage.setItem('p2p_reform_withdrawal_requests', JSON.stringify(withdrawalRequests)); // Save new state
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
    messageEl.textContent = message;
    modal.style.display = 'block';
}
function closePopupNotificationModal() {
    document.getElementById('popup-notification-modal').style.display = 'none';
}

let confirmCallback = null;
let promptCallback = null;

function showCustomConfirm(message, onConfirm, title = "Confirmation", okButtonText = "OK", okButtonClass = "danger") {
    document.getElementById('custom-confirm-message').textContent = message;
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

    const p2pMarketDisabledMessage = document.getElementById('p2p-market-disabled-message');
    const createSellOfferButton = document.getElementById('create-sell-offer-button');
    const initialSystemPurchaseMessage = document.getElementById('system-sale-initial-purchase-message');


    if (sectionId === 'ud-system-sale') {
        updateSystemSaleUserView();
        renderAvailableOffers('system-sale-p2p-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase));
         if (initialSystemPurchaseMessage) {
            initialSystemPurchaseMessage.classList.toggle('hidden', (currentUser && currentUser.hasMadeInitialSystemPurchase));
        }
    }
    if (sectionId === 'ud-kyc') {
        renderKycForm();
    }
    if (sectionId === 'ud-p2p-market') {
        renderMySellOffers();
        renderAvailableOffers('available-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase));
        prefillSellOfferFields(); // MODIFIED to handle new logic

        if (p2pMarketDisabledMessage && createSellOfferButton) {
            const p2pDisabled = !(currentUser && currentUser.hasMadeInitialSystemPurchase);
            p2pMarketDisabledMessage.classList.toggle('hidden', !p2pDisabled);
            createSellOfferButton.disabled = p2pDisabled;

            const availableOfferButtons = document.querySelectorAll('#available-offers-list .offer-item button');
            availableOfferButtons.forEach(btn => btn.disabled = p2pDisabled);
            const systemSaleOfferButtons = document.querySelectorAll('#system-sale-p2p-offers-list .offer-item button');
            systemSaleOfferButtons.forEach(btn => btn.disabled = p2pDisabled);
        }
    }
    if (sectionId === 'ud-withdraw-funds') {
        renderUserWithdrawalHistory();
        populateWithdrawalDestination(); // Initialize based on default currency
        // Add event listener to update destination on currency change
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
        zarProfitWallet: 0,
        usdProfitWallet: 0,
        status: 'active',
        kycStatus: 'none',
        kycData: { bankName: '', bankAccount: '', usdtWallet: '', telephone: '', country: '', documentUrl: null, documentFilename: null, rejectionReason: null },
        lastSystemPurchaseBonusPercentage: 0,
        lastSystemPurchaseBaseCoinPrice: 0
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
        currentUser.zarProfitWallet = currentUser.zarProfitWallet === undefined ? 0 : currentUser.zarProfitWallet;
        currentUser.usdProfitWallet = currentUser.usdProfitWallet === undefined ? 0 : currentUser.usdProfitWallet;
        currentUser.kycStatus = currentUser.kycStatus || 'none';
        currentUser.lastSystemPurchaseBonusPercentage = currentUser.lastSystemPurchaseBonusPercentage === undefined ? 0 : currentUser.lastSystemPurchaseBonusPercentage;
        currentUser.lastSystemPurchaseBaseCoinPrice = currentUser.lastSystemPurchaseBaseCoinPrice === undefined ? 0 : currentUser.lastSystemPurchaseBaseCoinPrice;
        saveState();

        switchView('user-dashboard-view');
        renderUserDashboard();
        setActiveLink(document.getElementById('nav-dashboard'));
        if (currentUser.kycStatus === 'none') {
             displayNotification("Welcome! Please complete your KYC verification to access all features.", "warning");
             addGlobalNotification(currentUser.id, "KYC Needed", "Please complete your KYC to access all features.", "ud-kyc", "warning");
             showUserDashboardSection('ud-kyc', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-kyc"]'));
        } else if (currentUser.coinBalance === 0 && currentUser.kycStatus === 'approved' && !currentUser.hasMadeInitialSystemPurchase) {
            displayNotification("Welcome! Please make your first COIN purchase from a System Plan to unlock P2P trading.", "info");
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

    document.getElementById('coin-balance').textContent = currentUser.coinBalance;
    renderWalletBalances();

    renderUserCoinChart();
    initializeSystemSaleCycle();
    renderUserPendingTransactions();
    renderAvailableOffers('available-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase));
    renderMySellOffers();
    renderActiveInvestments();
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
            // Check for approved withdrawal for this currency
            const approvedWithdrawal = withdrawalRequests.find(
                req => req.userId === currentUser.id && req.currency === currency && req.status === 'approved'
            );
            if (approvedWithdrawal) {
                walletCard.classList.add('withdrawal-approved');
            }
            let icon = 'fas fa-dollar-sign';
            if(currency === 'ZAR') icon = 'fas fa-coins'; // Example, change as needed
            if(currency === 'BTC') icon = 'fab fa-bitcoin';

            walletCard.innerHTML = `
                <strong><i class="${icon}"></i> ${currency} Wallet Balance</strong>
                <span>${formatCurrency(currentUser.walletBalance[currency], currency)}</span>
                ${approvedWithdrawal ? '<span class="withdrawal-status-text">Withdrawal Approved</span>' : ''}
            `;
            walletGrid.appendChild(walletCard);
        }
    });
    if (currentUser.zarProfitWallet && currentUser.zarProfitWallet > 0) {
        hasVisibleWalletBalance = true;
        const zarProfitCard = document.createElement('div');
        zarProfitCard.className = 'info-card wallet-balance-card';
        zarProfitCard.style.borderLeftColor = 'var(--warning-color)';
        zarProfitCard.innerHTML = `
            <strong><i class="fas fa-lock"></i> ZAR Profit (Locked)</strong>
            <span>${formatCurrency(currentUser.zarProfitWallet, "ZAR")}</span>
        `;
        walletGrid.appendChild(zarProfitCard);
    }
    if (currentUser.usdProfitWallet && currentUser.usdProfitWallet > 0) {
        hasVisibleWalletBalance = true;
        const usdProfitCard = document.createElement('div');
        usdProfitCard.className = 'info-card wallet-balance-card';
        usdProfitCard.style.borderLeftColor = 'var(--warning-color)';
        usdProfitCard.innerHTML = `
            <strong><i class="fas fa-lock"></i> USD Profit (Locked)</strong>
            <span>${formatCurrency(currentUser.usdProfitWallet, "USD")}</span>
        `;
        walletGrid.appendChild(usdProfitCard);
    }

    walletGrid.style.display = hasVisibleWalletBalance ? 'grid' : 'none';
}


function toggleUserProfileDetails() {
    const detailsDiv = document.getElementById('user-profile-details-collapsible');
    const button = document.getElementById('toggle-profile-details-btn');
    const icon = button.querySelector('i');
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

    const totalInvested = investments
        .filter(inv => inv.userId === currentUser.id && inv.status === 'active')
        .reduce((sum, inv) => sum + inv.amountInvested, 0);

    if (userCoinChartInstance) userCoinChartInstance.destroy();

    userCoinChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Available Balance', 'Actively Invested'],
            datasets: [{
                label: 'Coin Distribution', data: [currentUser.coinBalance, totalInvested],
                backgroundColor: [ 'rgba(0, 168, 232, 0.8)', 'rgba(27, 38, 59, 0.8)' ],
                borderColor: [ 'rgba(0, 168, 232, 1)', 'rgba(27, 38, 59, 1)' ],
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
    const coinBalanceCard = document.getElementById('user-coin-balance-card');

    if (!countdownDisplay || !plansArea || !userPendingMessageArea || !coinBalanceCard) return;

    const minutes = Math.floor(Math.max(0, currentPhaseTimeLeft) / 60);
    const seconds = Math.max(0, currentPhaseTimeLeft) % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (coinSaleActive) {
        countdownDisplay.innerHTML = `<i class="fas fa-fire"></i> SALE ACTIVE! Ends in: ${timeString}`;
        coinBalanceCard.classList.add('sale-active-balance');
        if (!saleNotificationShown && currentUser && currentUser.kycStatus === 'approved') {
            displayNotification("System Coin Sale is Active! Your coins (if any) can be sold on the P2P market.", "info");
            saleNotificationShown = true;
        }

        if(currentUser && currentUser.kycStatus === 'approved'){
            plansArea.classList.remove('hidden');
            userPendingMessageArea.classList.add('hidden');
            renderUserSystemSalePlans();
            renderAvailableOffers('system-sale-p2p-offers-list');
        } else {
            plansArea.classList.add('hidden');
            userPendingMessageArea.innerHTML = '<p style="padding:1rem; background-color: #FFF3E0; border-left: 4px solid var(--warning-color); color: var(--text-dark);"><i class="fas fa-exclamation-triangle"></i> Please complete and get your KYC approved to participate in system coin sales.</p>';
            userPendingMessageArea.classList.remove('hidden');
        }
    } else {
        countdownDisplay.innerHTML = `<i class="fas fa-history"></i> Next sale starts in: ${timeString}`;
        coinBalanceCard.classList.remove('sale-active-balance');
        plansArea.classList.add('hidden');
        userPendingMessageArea.innerHTML = '<p style="padding:1rem; background-color: #E1F5FE; border-left: 4px solid var(--accent-color); color: var(--primary-color);"><i class="fas fa-hourglass-start"></i> System coin sale is currently in cooldown. Please wait for the next sale period.</p>';
        userPendingMessageArea.classList.remove('hidden');
        saleNotificationShown = false;
    }
}

function renderUserSystemSalePlans() {
    const plansListDiv = document.getElementById('user-system-sale-plans-list');
    if (!plansListDiv) return;
    plansListDiv.innerHTML = '';

    const activePlans = systemSalePlans.filter(p => p.status === 'active');

    if (activePlans.length === 0) {
        plansListDiv.innerHTML = '<p>No purchase plans currently available from the Seller. Check back later!</p>';
        return;
    }

    activePlans.forEach(plan => {
        const bonusCoins = Math.floor(plan.coinsAwarded * COIN_SALE_BONUS_PERCENTAGE);
        const totalCoins = plan.coinsAwarded + bonusCoins;

        // Seller payment details are NOT shown here anymore. They are in pending transactions.
        const planDiv = document.createElement('div');
        planDiv.className = 'system-sale-plan-item';
        planDiv.innerHTML = `
            <h5><i class="fas fa-box-open"></i> ${plan.name}</h5>
            <p><strong>Cost:</strong> ${formatCurrency(plan.cost, plan.currency || systemSaleConfig.defaultSystemCurrency)}</p>
            <p><strong>Get:</strong> ${plan.coinsAwarded} COIN <span class="bonus-text">+ ${bonusCoins} COIN Bonus!</span> (Total: ${totalCoins} COIN)</p>
            <button class="accent" onclick="handleSystemPlanPurchaseRequest('${plan.id}')"><i class="fas fa-shopping-cart"></i> Request Purchase</button>
        `;
        plansListDiv.appendChild(planDiv);
    });
}

function handleSystemPlanPurchaseRequest(planId) {
    if (!coinSaleActive) { displayNotification('System coin sale is not active. Purchase during active sale period.', 'error'); return; }
    if (currentUser.kycStatus !== 'approved') { displayNotification('Your KYC must be approved to purchase system coins.', 'warning'); return; }

    const plan = systemSalePlans.find(p => p.id === planId);
    if (!plan) { displayNotification('Selected plan not found.', 'error'); return; }

    const existingPendingRequestForThisPlan = systemPurchaseRequests.find(req =>
        req.userId === currentUser.id &&
        req.planDetails && req.planDetails.id === planId &&
        (req.status === 'awaiting_payment_to_system' || req.status === 'payment_proof_submitted_to_system')
    );
    if (existingPendingRequestForThisPlan) {
        displayNotification('You already have a pending request for this specific plan. Please complete or wait for it.', 'warning');
        showUserDashboardSection('ud-pending-transactions', document.querySelector('#user-dashboard-view .dashboard-sidebar button[onclick*="ud-pending-transactions"]'));
        return;
    }

    const bonusCoins = Math.floor(plan.coinsAwarded * COIN_SALE_BONUS_PERCENTAGE);
    const totalCoinsToReceive = plan.coinsAwarded + bonusCoins;

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
            coinsAwarded: plan.coinsAwarded,
            bonusCoins: bonusCoins,
            totalCoinsToReceive: totalCoinsToReceive,
            paymentInfo: { // Store payment info for the pending transaction display
                bankName: plan.planBankName,
                bankAccount: plan.planBankAccount,
                btcWallet: plan.planBtcWallet
            }
        },
        amount: totalCoinsToReceive,
        totalPrice: plan.cost,
        currency: plan.currency || systemSaleConfig.defaultSystemCurrency,
        status: 'awaiting_payment_to_system',
        paymentProofFilename: null,
        paymentProofDataUrl: null,
        createdAt: new Date().toISOString()
    };
    systemPurchaseRequests.push(newRequest);
    saveState();

    displayNotification(`Purchase request for '${plan.name}' submitted. Make payment to Seller and upload proof via 'Pending Transactions'.`, 'info');
    addGlobalNotification('admin', 'System Sale Request', `${currentUser.name} requested to buy plan '${plan.name}'.`, 'ad-system-sale-requests');
    renderUserPendingTransactions();
}

// --- P2P Market ---
function prefillSellOfferFields() {
    if (!currentUser) return;
    const amountInput = document.getElementById('sell-offer-amount');
    const p2pSellInfoText = document.getElementById('p2p-sell-offer-info-text');

    if (amountInput) {
        amountInput.value = ''; // Clear the input for manual entry
    }

    if (p2pSellInfoText) {
        // Use the user's purchase price if available, otherwise use the global default.
        const basePrice = currentUser.lastSystemPurchaseBaseCoinPrice > 0 ? currentUser.lastSystemPurchaseBaseCoinPrice : DEFAULT_BASE_COIN_PRICE_USD;
        const sellPrice = basePrice * 2;
        p2pSellInfoText.textContent = `Enter the amount of COIN to sell. Your price is fixed at 2x your last system purchase price (or a default if none exists), which is ${formatCurrency(sellPrice, "USD")} per COIN.`;
    }
}

// MODIFIED: This function now reads the user's input and calculates price based on the new 2x rule, with a fallback.
function createSellOffer() {
    if (!currentUser || currentUser.kycStatus !== 'approved') {
        displayNotification('Your KYC must be approved to create sell offers.', 'warning');
        return;
    }
    // This check is now optional, as we provide a fallback. But it's good practice to keep it.
    if (!currentUser.hasMadeInitialSystemPurchase && currentUser.coinBalance === 0) {
        displayNotification('You must have coins to create a sell offer. Please purchase from a System Plan first.', 'warning');
        return;
    }

    const amountInput = document.getElementById('sell-offer-amount');
    const amount = parseInt(amountInput.value);

    if (isNaN(amount) || amount <= 0) {
        displayNotification('Please enter a valid, positive amount of COINs to sell.', 'error');
        return;
    }
    if (amount > currentUser.coinBalance) {
        displayNotification('Cannot sell more coins than you have.', 'error');
        return;
    }

    // Determine the base price. Use the user's history if it exists, otherwise use the system default.
    const basePrice = currentUser.lastSystemPurchaseBaseCoinPrice > 0 ? currentUser.lastSystemPurchaseBaseCoinPrice : DEFAULT_BASE_COIN_PRICE_USD;
    
    // New Price Calculation: Price is 2x the base price, in USD.
    const price = basePrice * 2;
    const currency = 'USD'; // Profit calculation is based on USD, so sale is also in USD.

    const newOffer = {
        id: generateId(),
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        amount,
        price,
        currency,
        status: 'active',
        createdAt: new Date().toISOString()
    };
    sellOffers.push(newOffer);
    currentUser.coinBalance -= amount;
    
    saveState();
    
    // Refresh UI
    renderAvailableOffers('available-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase));
    renderAvailableOffers('system-sale-p2p-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase));
    renderMySellOffers();
    renderUserDashboard(); // To update coin balance card and chart
    
    // Clear the input field after successful offer creation
    amountInput.value = '';

    displayNotification(`Sell offer for ${amount} COIN at ${formatCurrency(price, currency)} per COIN created. Coins are now reserved.`, 'success');
}


function renderMySellOffers() {
    const myOffersListDiv = document.getElementById('my-sell-offers-list');
    if (!myOffersListDiv || !currentUser) return;

    const myOffers = sellOffers.filter(o => o.sellerId === currentUser.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    if(myOffers.length === 0) {
        myOffersListDiv.innerHTML = '<p>You have not created any sell offers yet, or all have been completed/cancelled.</p>';
        return;
    }
    myOffersListDiv.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Date</th><th>Amount (COIN)</th><th>Price</th><th>Total Value</th><th>Status</th><th>Action</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    myOffers.forEach(offer => {
        const tr = tbody.insertRow();
        const displayPrice = formatCurrency(offer.price, offer.currency);
        const displayTotal = formatCurrency(offer.amount * offer.price, offer.currency);
        let actionButton = '-';
        if (offer.status === 'active') {
            actionButton = `<button onclick="cancelMySellOffer('${offer.id}')" class="danger small">Cancel</button>`;
        }

        tr.innerHTML = `
            <td>${new Date(offer.createdAt || Date.now()).toLocaleDateString()}</td>
            <td>${offer.amount}</td>
            <td>${displayPrice}</td>
            <td>${displayTotal}</td>
            <td style="text-transform:capitalize;">${offer.status.replace(/_/g, ' ')}</td>
            <td>${actionButton}</td>
        `;
    });
    myOffersListDiv.appendChild(table);
}

function cancelMySellOffer(offerId) {
    showCustomConfirm(
        "Are you sure you want to cancel this active sell offer? Coins will be returned to your balance.",
        () => {
            const offerIndex = sellOffers.findIndex(o => o.id === offerId && o.sellerId === currentUser.id && o.status === 'active');
            if (offerIndex > -1) {
                const offerToCancel = sellOffers[offerIndex];
                currentUser.coinBalance += offerToCancel.amount;
                sellOffers.splice(offerIndex, 1);
                saveState();
                renderMySellOffers();
                renderAvailableOffers('available-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase));
                renderAvailableOffers('system-sale-p2p-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase));
                renderUserDashboard();
                displayNotification('Sell offer cancelled. Coins returned to balance.', 'info');
            } else {
                displayNotification('Offer not found or cannot be cancelled.', 'error');
            }
        },
        "Cancel Offer",
        "Yes, Cancel",
        "danger"
    );
}

function renderAvailableOffers(targetListId = 'available-offers-list', p2pMarketLocked = false) {
    const offersListDiv = document.getElementById(targetListId);
    if(!offersListDiv) return;
    offersListDiv.innerHTML = '';
    const activeOffers = sellOffers.filter(o => o.status === 'active' && o.sellerId !== currentUser?.id);

    if (activeOffers.length === 0) {
        offersListDiv.innerHTML = (targetListId === 'system-sale-p2p-offers-list') ? '<p>No P2P offers currently available.</p>' :'<p>No other P2P offers available from other users.</p>';
        return;
    }

    activeOffers.forEach(offer => {
        const offerDiv = document.createElement('div');
        offerDiv.className = 'offer-item';
        const displayPrice = formatCurrency(offer.price, offer.currency);
        const displayTotal = formatCurrency(offer.amount * offer.price, offer.currency);
        const buyButtonDisabled = p2pMarketLocked ? 'disabled' : '';
        offerDiv.innerHTML = `
            <p><strong><i class="fas fa-user-tag"></i> Seller:</strong> ${offer.sellerName}</p>
            <p><strong><i class="fas fa-coins"></i> Amount:</strong> ${offer.amount} COIN</p>
            <p><strong><i class="fas fa-tag"></i> Price:</strong> ${displayPrice} per COIN</p>
            <p><strong><i class="fas fa-file-invoice-dollar"></i> Total:</strong> ${displayTotal}</p>
            <button onclick="buyFromP2POffer('${offer.id}')" class="accent" ${buyButtonDisabled}><i class="fas fa-shopping-basket"></i> Buy Offer</button>
        `;
        offersListDiv.appendChild(offerDiv);
    });
}
function buyFromP2POffer(offerId) {
    if (!currentUser) { displayNotification('Please log in to buy offers.', 'warning'); return; }
    if (currentUser.kycStatus !== 'approved') { displayNotification('Your KYC must be approved to buy P2P offers.', 'warning'); return; }
    if (!currentUser.hasMadeInitialSystemPurchase) {
        displayNotification('You must make an initial system coin purchase to participate in P2P market.', 'warning');
        return;
    }

    const offer = sellOffers.find(o => o.id === offerId);
    if (!offer || offer.status !== 'active') { displayNotification('Offer unavailable.', 'error'); renderAvailableOffers('available-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase)); renderAvailableOffers('system-sale-p2p-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase)); return; }

    const transaction = {
        id: generateId(), type: 'p2p_purchase', offerId: offer.id,
        buyerId: currentUser.id, buyerName: currentUser.name,
        sellerId: offer.sellerId, sellerName: offer.sellerName,
        amount: offer.amount, totalPrice: offer.amount * offer.price, currency: offer.currency,
        status: 'awaiting_payment', paymentProofFilename: null, paymentProofDataUrl: null, createdAt: new Date().toISOString()
    };
    transactions.push(transaction); offer.status = 'pending_sale';
    saveState();
    renderUserPendingTransactions();
    renderAvailableOffers('available-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase));
    renderAvailableOffers('system-sale-p2p-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase));
    renderMySellOffers();
    displayNotification(`Purchase initiated for offer ID ${offer.id.substring(0,8)}. Please proceed to 'Pending Transactions' to make payment and upload proof.`, 'info');
    addGlobalNotification(offer.sellerId, "P2P Offer Accepted", `${currentUser.name} wants to buy your offer for ${transaction.amount} COIN. Awaiting their payment.`, 'ud-pending-transactions');
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
                <p>Amount: ${tx.amount} COIN</p>
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
                         actionsHtml += `<p><img src="${tx.paymentProofDataUrl}" alt="Proof Preview" class="proof-image"></p>`;
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
                         actionsHtml += `<p><img src="${tx.paymentProofDataUrl}" alt="Payment Proof" class="proof-image"></p>`;
                    } else if (tx.paymentProofDataUrl) {
                        actionsHtml += `<p><small>Note: Proof is not an image or could not be previewed.</small></p>`;
                    } else {
                         actionsHtml += `<p><small>No proof image preview available.</small></p>`;
                    }
                    actionsHtml += `
                        <div style="padding: 0.5rem; margin-top: 0.5rem; background-color: #FFF9C4; border-left: 3px solid var(--warning-color);">Release coins ONLY if payment is verified in your account!</div>
                        <button onclick="confirmPaymentAndReleaseCoins('${tx.id}')" class="accent">Confirm Payment & Release P2P Coins</button>
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
            itemTitle = `<i class="fas fa-store"></i> System Plan Purchase ID: ${req.id.substring(0,8)}...`;
            const displayTotalSys = req.planDetails ? formatCurrency(req.planDetails.cost, req.planDetails.currency) : 'N/A';
            const planNameDisplay = req.planDetails ? `Plan: <strong>${req.planDetails.name}</strong>` : `Amount Requested: ${req.amountRequested} COIN`;
            const coinsDisplay = req.planDetails ? `Coins (incl. bonus): ${req.planDetails.totalCoinsToReceive}` : '';

            let sellerPaymentDetailsSys = "<strong>Seller payment details for this plan:</strong><br>";
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

            if (req.status === 'awaiting_payment_to_system') {
                actionsHtml = `
                    <p><strong>Action:</strong> Pay ${displayTotalSys} to Seller.</p>
                    <div class="payment-details-highlight"><small>${sellerPaymentDetailsSys}</small></div>
                    <label for="proof-file-system-${req.id}">Upload Payment Proof (System Plan):</label>
                    <input type="file" id="proof-file-system-${req.id}" accept="image/*,.pdf">
                    <button onclick="submitSystemPaymentProof('${req.id}')" class="accent">I Paid Seller & Submit Proof</button>
                `;
            } else if (req.status === 'payment_proof_submitted_to_system') {
                actionsHtml = `<p><strong>Status:</strong> Proof (${req.paymentProofFilename || 'N/A'}) submitted. Waiting for Seller to confirm and release COINs.</p>`;
                 if (req.paymentProofDataUrl && req.paymentProofDataUrl.startsWith('data:image')) {
                    actionsHtml += `<p><img src="${req.paymentProofDataUrl}" alt="Proof Preview" class="proof-image"></p>`;
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
        addGlobalNotification(tx.sellerId, "P2P Payment Proof Submitted", `${tx.buyerName} submitted payment proof for your offer of ${tx.amount} COIN. Please verify and release coins.`, 'ud-pending-transactions');
    } else { displayNotification('Please select a file to upload as proof of payment.', 'error'); return; }
}
function confirmPaymentAndReleaseCoins(transactionId) {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx || tx.sellerId !== currentUser.id) { displayNotification('Transaction not found or you are not the seller.', 'error'); return;}

    const buyer = users.find(u => u.id === tx.buyerId);
    const seller = currentUser;

    if (!buyer) { displayNotification('Buyer not found. Cannot complete transaction.', 'error'); return; }

    buyer.coinBalance += tx.amount;

    if (!seller.walletBalance) seller.walletBalance = { USD: 0, ZAR: 0, BTC: 0 };
    if (seller.walletBalance[tx.currency] === undefined) seller.walletBalance[tx.currency] = 0;
    seller.walletBalance[tx.currency] = (seller.walletBalance[tx.currency] || 0) + tx.totalPrice;

    tx.status = 'completed';
    const originalOffer = sellOffers.find(o => o.id === tx.offerId);
    if(originalOffer) originalOffer.status = 'sold';

    saveState();
    renderUserDashboard();
    renderMySellOffers();
    renderUserPendingTransactions();
    displayNotification(`Payment confirmed for Tx ID ${tx.id.substring(0,8)}. ${tx.amount} COIN released to ${buyer.name}. ${formatCurrency(tx.totalPrice, tx.currency)} added to your ${tx.currency} wallet.`, 'success');
    addGlobalNotification(tx.buyerId, "P2P Coins Received", `${tx.sellerName} confirmed payment and released ${tx.amount} COIN to your account for Tx ID ${tx.id.substring(0,8)}.`, 'ud-p2p-history', 'success');
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
            renderUserPendingTransactions();
            renderAvailableOffers('available-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase));
            renderAvailableOffers('system-sale-p2p-offers-list', !(currentUser && currentUser.hasMadeInitialSystemPurchase));
            displayNotification(`P2P Purchase ${tx.id.substring(0,8)} cancelled.`, 'info');
            addGlobalNotification(tx.sellerId, 'P2P Purchase Cancelled by Buyer', `Buyer ${currentUser.name} has cancelled their purchase attempt for your offer (Tx ID ${tx.id.substring(0,8)}). Your offer is active again.`, 'ud-p2p-market', 'warning');
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
            addGlobalNotification('admin', 'P2P Transaction Disputed', `User ${currentUser.name} disputed P2P Tx ID ${tx.id.substring(0,8)}. Please review.`, 'ad-p2p-transactions');
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
        "Are you sure you want to cancel this sale? The buyer has not yet paid. Coins will be returned to your active sell offer or balance.",
        () => {
            tx.status = 'cancelled';
            const originalOffer = sellOffers.find(o => o.id === tx.offerId);
            if (originalOffer && originalOffer.status === 'pending_sale') { // Ensure it was pending
                originalOffer.status = 'active';
            } else {
                currentUser.coinBalance += tx.amount; // Fallback if offer was already active or missing
                console.warn(`P2P Sale Tx ${tx.id} cancelled by seller. Original offer ${originalOffer ? originalOffer.id : 'N/A'} status: ${originalOffer ? originalOffer.status : 'N/A'}. Returning coins to seller balance as fallback.`);
            }
            saveState();
            renderUserPendingTransactions();
            renderMySellOffers();
            renderUserDashboard();
            displayNotification(`Sale ${tx.id.substring(0,8)} cancelled. Offer relisted or coins returned.`, 'info');
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
                        <td>${tx.amount}</td>
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
        tableRows.push([ new Date(tx.createdAt).toLocaleDateString(), tx.id.substring(0,8), type, counterparty, tx.amount.toString(), displayFiat, tx.status.replace(/_/g, ' ') ]);
    });
    doc.autoTable(tableColumn, tableRows, { startY: 20 });
    doc.text(`P2P History for ${currentUser.name}`, 14, 15);
    doc.save(`p2p_history_${currentUser.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
    displayNotification('P2P history PDF exported.', 'success');
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
        req.status = 'payment_proof_submitted_to_system';
        saveState(); renderUserPendingTransactions();
        displayNotification(`Proof (${req.paymentProofFilename}) submitted to Seller for system plan purchase.`, 'success');
        addGlobalNotification('admin', 'System Sale Proof', `${req.userName} submitted proof for plan '${req.planDetails.name}'.`, 'ad-system-sale-requests');
    } else { displayNotification('Select a file for proof.', 'error'); return; }
}

// --- Investment Program (User) ---
function handleInvestment() {
     if (!currentUser || currentUser.kycStatus !== 'approved') { displayNotification('Your KYC must be approved to make investments.', 'warning'); return; }
    const investmentFixedAmount = 1000;
    if (currentUser.coinBalance < investmentFixedAmount) { displayNotification(`Need ${investmentFixedAmount} COIN to invest. Your balance: ${currentUser.coinBalance}`, 'error'); return; }

    currentUser.coinBalance -= investmentFixedAmount;
    const investment = {
        id: generateId(), userId: currentUser.id, userName: currentUser.name,
        amountInvested: investmentFixedAmount, expectedReturn: 3000,
        durationDays: 7, startDate: new Date().toISOString(),
        maturityDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: 'active'
    };
    investments.push(investment);
    saveState();
    renderUserDashboard();
    displayNotification(`${investmentFixedAmount} COIN invested successfully. Expected return: ${investment.expectedReturn} COIN.`, 'success');
    addGlobalNotification(currentUser.id, "Investment Started", `${investmentFixedAmount} COIN invested. Matures on ${new Date(investment.maturityDate).toLocaleDateString()}.`, 'ud-investments', 'success');
}
function renderActiveInvestments() {
    const investmentListDiv = document.getElementById('active-investments-list');
    if(!investmentListDiv || !currentUser) return;
    investmentListDiv.innerHTML = '';
    const myInvestments = investments.filter(inv => inv.userId === currentUser.id).sort((a,b) => new Date(b.startDate) - new Date(a.startDate));
    if (myInvestments.length === 0) { investmentListDiv.innerHTML = '<p>You have no active or past investments.</p>'; return; }

    let balanceUpdatedInLoop = false;
    const now = new Date();

    myInvestments.forEach(inv => {
        const invDiv = document.createElement('div'); invDiv.className = 'investment-item';
        const maturity = new Date(inv.maturityDate);

        if (now >= maturity && inv.status === 'active') {
            currentUser.coinBalance += inv.expectedReturn;
            inv.status = 'matured_paid';
            balanceUpdatedInLoop = true;
            displayNotification(`Investment ${inv.id.substring(0,6)} has matured! ${inv.expectedReturn} COIN added to your balance.`, 'success');
            addGlobalNotification(currentUser.id, "Investment Matured & Paid", `Investment ID ${inv.id.substring(0,6)} paid ${inv.expectedReturn} COIN.`, 'ud-investments', 'success');
        }
        invDiv.innerHTML = `
            <p><strong>ID:</strong> ${inv.id.substring(0,8)}...</p>
            <p><strong>Invested:</strong> ${inv.amountInvested} COIN on ${new Date(inv.startDate).toLocaleDateString()}</p>
            <p><strong>Expected Return:</strong> ${inv.expectedReturn} COIN</p>
            <p><strong>Matures On:</strong> ${maturity.toLocaleDateString()}</p>
            <p><strong>Status:</strong> <strong style="text-transform: capitalize;">${inv.status.replace(/_/g, ' ')}</strong> ${inv.status === 'active' && now >= maturity ? '(Matured - Processing Payout)' : (inv.status === 'active' ? `(Active - Matures in ${Math.ceil((maturity - now)/(1000*60*60*24))} days)` : '')}</p>`;
        investmentListDiv.appendChild(invDiv);
    });
    if(balanceUpdatedInLoop) {
        saveState();
        document.getElementById('coin-balance').textContent = currentUser.coinBalance;
        renderUserCoinChart();
    }
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
            if (currentUser.kycData.usdtWallet) { // Assuming USDT wallet for BTC withdrawal in this context
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

    // Check if destination is valid
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
        status: 'pending_admin_approval', // pending_admin_approval, approved, rejected, processed
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
    renderWalletBalances(); // Update wallet display
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
            statusDisplay = 'Approved (Awaiting Payment from Seller)';
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
        if (currentUser.isAdmin) {
            messageClass += (msg.senderId === 'admin_user' || msg.senderId === currentUser.id) ? 'admin-message' : 'user-message';
        } else {
            messageClass += msg.senderId === currentUser.id ? 'user-message' : 'admin-message';
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
    renderAdminWithdrawalRequests(); // New
    renderAdminSystemPurchaseRequests();
    renderAdminP2PTransactions();
    renderAdminInvestments();
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

    const elTotalUsers = document.getElementById('admin-stat-total-users');
    const elTotalCoins = document.getElementById('admin-stat-total-coins');
    const elActiveInvestmentsValue = document.getElementById('admin-stat-active-investments');
    const elPendingKyc = document.getElementById('admin-stat-pending-kyc');
    const elPendingP2P = document.getElementById('admin-stat-pending-p2p');
    const elPendingSystemPurchases = document.getElementById('admin-stat-pending-system-purchases');
    const elOpenSupportTickets = document.getElementById('admin-stat-open-support-tickets');
    const elPendingWithdrawals = document.getElementById('admin-stat-pending-withdrawals'); // New

    if(elTotalUsers) elTotalUsers.textContent = users.length;
    const totalCoinsInCirculation = users.reduce((sum, user) => sum + (user.coinBalance || 0), 0);
    if(elTotalCoins) elTotalCoins.textContent = totalCoinsInCirculation;
    const totalCoinsInActiveInvestments = investments.filter(inv => inv.status === 'active').reduce((sum, inv) => sum + inv.amountInvested, 0);
    if(elActiveInvestmentsValue) elActiveInvestmentsValue.textContent = totalCoinsInActiveInvestments;
    if(elPendingKyc) elPendingKyc.textContent = users.filter(u => u.kycStatus === 'pending').length;
    const pendingP2PTransactions = transactions.filter(tx => tx.status !== 'completed' && tx.status !== 'cancelled' && tx.status !== 'resolved_by_admin' && tx.status !== 'cancelled_by_admin').length;
    if(elPendingP2P) elPendingP2P.textContent = pendingP2PTransactions;
    const pendingSystemPurchases = systemPurchaseRequests.filter(req => req.status !== 'completed' && req.status !== 'cancelled_by_admin').length;
    if(elPendingSystemPurchases) elPendingSystemPurchases.textContent = pendingSystemPurchases;
    if(elOpenSupportTickets) elOpenSupportTickets.textContent = supportTickets.filter(t => t.status === 'open' || t.status === 'user_reply').length;
    if(elPendingWithdrawals) elPendingWithdrawals.textContent = withdrawalRequests.filter(req => req.status === 'pending_admin_approval').length; // New
}

function loadSystemSaleGeneralSettingsForAdminForm() {
    const saleDurationEl = document.getElementById('admin-sale-duration');
    const cooldownDurationEl = document.getElementById('admin-cooldown-duration');
    const defaultCurrencySelect = document.getElementById('admin-default-currency');
    const currentDefaultCurrencyDisplay = document.getElementById('current-default-system-currency-display');

    if(saleDurationEl) saleDurationEl.value = systemSaleConfig.saleDurationSeconds || 300;
    if(cooldownDurationEl) cooldownDurationEl.value = systemSaleConfig.cooldownDurationSeconds || 60;
    if(defaultCurrencySelect) defaultCurrencySelect.value = systemSaleConfig.defaultSystemCurrency || "USD";
    if(currentDefaultCurrencyDisplay) currentDefaultCurrencyDisplay.textContent = systemSaleConfig.defaultSystemCurrency || "USD";
}

function saveDefaultSystemCurrency() {
    const newDefaultCurrency = document.getElementById('admin-default-currency').value;
    if (newDefaultCurrency && (newDefaultCurrency === "USD" || newDefaultCurrency === "ZAR" || newDefaultCurrency === "BTC")) {
        systemSaleConfig.defaultSystemCurrency = newDefaultCurrency;
        saveState();
        displayNotification(`Default system currency for P2P and Plans set to ${newDefaultCurrency}.`, "success");
        loadSystemSaleGeneralSettingsForAdminForm();
        if (currentUser && !currentUser.isAdmin && currentViewId === 'user-dashboard-view' && currentDashboardSectionId.user === 'ud-p2p-market') {
            prefillSellOfferFields();
        }
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
    table.innerHTML = `<thead><tr><th>Name</th><th>Cost</th><th>Base Coins</th><th>Bank Name</th><th>Bank Acc.</th><th>BTC Wallet</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    systemSalePlans.forEach(plan => {
        const tr = tbody.insertRow();
        tr.innerHTML = `
            <td>${plan.name}</td>
            <td>${formatCurrency(plan.cost, plan.currency || systemSaleConfig.defaultSystemCurrency)}</td>
            <td>${plan.coinsAwarded}</td>
            <td>${plan.planBankName || 'N/A'}</td>
            <td>${plan.planBankAccount || 'N/A'}</td>
            <td>${plan.planBtcWallet ? plan.planBtcWallet.substring(0,10)+'...' : 'N/A'}</td>
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
    const planBankName = document.getElementById('plan-bank-name').value.trim();
    const planBankAccount = document.getElementById('plan-bank-account').value.trim();
    const planBtcWallet = document.getElementById('plan-btc-wallet').value.trim();

    if (!name || isNaN(cost) || cost <=0 || isNaN(coinsAwarded) || coinsAwarded <=0 || !currency) {
        displayNotification('Plan Name, valid Cost (>0), Currency, and valid Coins Awarded (>0) are required.', 'error');
        return;
    }
    if (!planBankName && !planBankAccount && !planBtcWallet) {
        displayNotification('Info: No payment details (Bank or BTC Wallet) provided for this plan. Ensure users know how to pay.', 'info');
    }

    if (currentEditingPlanId) {
        const planIndex = systemSalePlans.findIndex(p => p.id === currentEditingPlanId);
        if (planIndex > -1) {
            systemSalePlans[planIndex] = {
                ...systemSalePlans[planIndex],
                name, cost, currency, coinsAwarded,
                planBankName, planBankAccount, planBtcWallet
            };
            displayNotification(`Plan "${name}" updated successfully.`, 'success');
        } else {
            displayNotification("Error: Plan to update not found. Please refresh and try again.", "error");
            currentEditingPlanId = null;
        }
    } else {
        const newPlan = {
            id: generateId(), name, cost, currency,
            coinsAwarded,
            planBankName, planBankAccount, planBtcWallet,
            status: 'inactive'
        };
        systemSalePlans.push(newPlan);
        displayNotification(`Plan "${name}" added successfully. Remember to activate it to make it available to users.`, 'success');
    }

    saveState();
    renderAdminSystemSalePlansList();
    clearPlanEditForm();
}

function populatePlanEditForm(planId) {
    const plan = systemSalePlans.find(p => p.id === planId);
    if (!plan) {
        displayNotification("Could not find the selected plan to edit. It might have been deleted.", "error");
        clearPlanEditForm();
        return;
    }

    currentEditingPlanId = plan.id;
    document.getElementById('plan-name').value = plan.name;
    document.getElementById('plan-cost').value = plan.cost;
    document.getElementById('plan-currency').value = plan.currency || systemSaleConfig.defaultSystemCurrency;
    document.getElementById('plan-coins-awarded').value = plan.coinsAwarded;
    document.getElementById('plan-bank-name').value = plan.planBankName || '';
    document.getElementById('plan-bank-account').value = plan.planBankAccount || '';
    document.getElementById('plan-btc-wallet').value = plan.planBtcWallet || '';

    const addPlanButton = document.getElementById('add-plan-button');
    if (addPlanButton) addPlanButton.innerHTML = '<i class="fas fa-save"></i> Update Plan';

    const cancelEditButton = document.getElementById('cancel-edit-plan-button');
    if (cancelEditButton) cancelEditButton.classList.remove('hidden');

    const editingPlanIdElement = document.getElementById('editing-plan-id');
    const editingPlanIdSpan = document.querySelector('#editing-plan-id span');
    if (editingPlanIdElement && editingPlanIdSpan) {
        editingPlanIdSpan.textContent = planId.substring(0,8)+"...";
        editingPlanIdElement.classList.remove('hidden');
    }

    document.getElementById('plan-name').focus();
}

function clearPlanEditForm() {
    currentEditingPlanId = null;
    document.getElementById('plan-form').reset();
    document.getElementById('plan-currency').value = systemSaleConfig.defaultSystemCurrency || 'USD';

    const addPlanButton = document.getElementById('add-plan-button');
    if (addPlanButton) addPlanButton.innerHTML = '<i class="fas fa-plus"></i> Add Plan';

    const cancelEditButton = document.getElementById('cancel-edit-plan-button');
    if (cancelEditButton) cancelEditButton.classList.add('hidden');

    const editingPlanIdElement = document.getElementById('editing-plan-id');
    if (editingPlanIdElement) editingPlanIdElement.classList.add('hidden');
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
    if (!planToDelete) {
        displayNotification("Plan not found, cannot delete.", "error");
        return;
    }

    showCustomConfirm(
        `Are you sure you want to permanently delete the plan "${planToDelete.name}"? This action cannot be undone.`,
        () => {
            const planIndex = systemSalePlans.findIndex(p => p.id === planId);
            if (planIndex > -1) {
                systemSalePlans.splice(planIndex, 1);
                saveState();
                renderAdminSystemSalePlansList();
                if(currentEditingPlanId === planId) clearPlanEditForm();
                displayNotification(`Plan "${planToDelete.name}" deleted successfully.`, 'success');
            }
        },
        "Confirm Plan Deletion", "Yes, Delete Plan", "danger"
    );
}

function clearSystemSaleRequestsLogs() {
    showCustomConfirm(
        "Are you sure you want to clear ALL System Sale Request logs (completed, pending, cancelled)? This action cannot be undone and will remove all historical data for these requests.",
        () => {
            systemPurchaseRequests = [];
            saveState();
            renderAdminSystemPurchaseRequests();
            renderAdminOverviewStats();
            displayNotification("All System Sale Request logs have been cleared.", "success");
        }, "Clear All System Sale Logs", "Confirm Clear All", "danger"
    );
}
function clearP2PTransactionLogs() {
     showCustomConfirm(
        "Are you sure you want to clear ALL P2P Transaction logs (completed, pending, disputed, etc.)? This action cannot be undone and will remove all historical P2P data.",
        () => {
            transactions = [];
            sellOffers = sellOffers.map(offer => {
                if (offer.status === 'pending_sale' || offer.status === 'sold') {
                    return null;
                }
                return offer;
            }).filter(offer => offer !== null);

            saveState();
            renderAdminP2PTransactions();
            renderAdminOverviewStats();
            displayNotification("All P2P Transaction logs (and related offer statuses) have been cleared/reset.", "success");
        }, "Clear All P2P Logs", "Confirm Clear All", "danger"
    );
}

function renderAdminSystemPurchaseRequests() {
    const listDiv = document.getElementById('admin-system-purchase-requests-list');
    if (!listDiv) return;
    listDiv.innerHTML = '';

    const allRequests = [...systemPurchaseRequests].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (allRequests.length === 0) {
        listDiv.innerHTML = '<p>No system purchase requests from users have been made yet.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Date</th><th>User</th><th>Plan/Details</th><th>Cost</th><th>Coins (Base+Bonus)</th><th>Status</th><th>Proof</th><th>Action</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    allRequests.forEach(req => {
        const tr = tbody.insertRow();
        let planInfo = "Direct Purchase (Legacy)";
        let costInfo = formatCurrency(req.totalPrice, req.currency);
        let coinsInfo = `${req.amount || 'N/A'}`;

        if(req.planDetails){
            planInfo = `<strong>${req.planDetails.name}</strong> (Plan ID: ${req.planDetails.id.substring(0,6)})`;
            costInfo = formatCurrency(req.planDetails.cost, req.planDetails.currency);
            coinsInfo = `${req.planDetails.coinsAwarded} + ${req.planDetails.bonusCoins} = ${req.planDetails.totalCoinsToReceive}`;
        }

        let proofDisplay = req.paymentProofFilename || 'No Proof Submitted';
        if (req.paymentProofDataUrl && req.paymentProofDataUrl.startsWith('data:image')) {
            proofDisplay = `<a href="${req.paymentProofDataUrl}" target="_blank" title="View Proof Image">${req.paymentProofFilename || 'View Image'} <img src="${req.paymentProofDataUrl}" alt="Proof" style="max-height:30px; vertical-align:middle;"></a>`;
        } else if (req.paymentProofDataUrl && req.paymentProofDataUrl.startsWith('data:application/pdf')) {
             proofDisplay = `<a href="${req.paymentProofDataUrl}" target="_blank" title="View Proof PDF">${req.paymentProofFilename || 'View PDF'}</a>`;
        } else if (req.paymentProofDataUrl) {
             proofDisplay = `<a href="#" onclick="alert('Proof data available but not a direct image/PDF preview. Filename: ${req.paymentProofFilename}'); return false;" title="Proof Data available">${req.paymentProofFilename}</a>`;
        }

        let actionButtons = '';
        if (req.status === 'payment_proof_submitted_to_system') {
            actionButtons = `
                <button onclick="approveSystemCoinPurchase('${req.id}')" class="accent small" style="margin-bottom: 5px;">Approve Purchase</button>
                <button onclick="rejectSystemCoinPurchase('${req.id}')" class="danger small">Reject Purchase</button>
            `;
        } else if (req.status === 'awaiting_payment_to_system') {
             actionButtons = `
                <button onclick="approveSystemCoinPurchase('${req.id}')" class="secondary small" style="margin-bottom: 5px;" title="Manual approval (e.g., payment confirmed offline). Use with caution.">Approve (Manual)</button>
                <button onclick="rejectSystemCoinPurchase('${req.id}')" class="danger small">Reject/Cancel Request</button>
            `;
        } else if (req.status === 'completed' || req.status === 'cancelled_by_admin') {
            actionButtons = `Processed (${req.status.replace(/_/g, ' ')})`;
        } else {
            actionButtons = 'N/A (Unknown Status)';
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

    let coinsToCredit = 0;
    if (request.planDetails) {
        coinsToCredit = request.planDetails.totalCoinsToReceive;
        // This logic ensures the price is set even if the plan is not in USD
        if (request.planDetails.currency === "USD") {
            if (typeof request.planDetails.cost === 'number' && typeof request.planDetails.coinsAwarded === 'number' && request.planDetails.coinsAwarded > 0) {
                user.lastSystemPurchaseBaseCoinPrice = request.planDetails.cost / request.planDetails.coinsAwarded;
            }
        }
        user.lastSystemPurchaseBonusPercentage = COIN_SALE_BONUS_PERCENTAGE;
    } else {
        coinsToCredit = request.amount || 0;
    }

    user.coinBalance += coinsToCredit;
    request.status = 'completed';

    if (!user.hasMadeInitialSystemPurchase) {
        user.hasMadeInitialSystemPurchase = true;
    }

    saveState();
    renderAdminSystemPurchaseRequests();
    renderAdminOverviewStats();
    displayNotification(`Approved ${coinsToCredit} COINs for ${user.name}.`, "success");
    addGlobalNotification(user.id, "System Purchase Approved", `Your purchase of ${request.planDetails ? request.planDetails.name : 'coins'} for ${coinsToCredit} COINs was approved.`, 'ud-overview', 'success');

}

function rejectSystemCoinPurchase(requestId) {
    const request = systemPurchaseRequests.find(req => req.id === requestId);
    if (!request) {
        displayNotification("Request not found, cannot reject.", "error");
        return;
    }
    if (request.status === 'completed' || request.status === 'cancelled_by_admin') {
        displayNotification("This request has already been processed.", "info");
        return;
    }

    showCustomConfirm(
        `Are you sure you want to reject this system coin purchase request for ${request.userName} (Plan: ${request.planDetails ? request.planDetails.name : 'N/A'})? The user will be notified.`,
        () => {
            request.status = 'cancelled_by_admin';
            saveState();
            renderAdminSystemPurchaseRequests();
            renderAdminOverviewStats();
            displayNotification(`Purchase request ID ${request.id.substring(0,8)} for ${request.userName} has been rejected.`, 'info');
            addGlobalNotification(request.userId, "System Purchase Rejected", `Your purchase request for ${request.planDetails ? `plan '${request.planDetails.name}'` : 'coins'} was rejected by the administrator. Please contact support if you have questions.`, 'ud-system-sale', 'error');
        }, "Reject Purchase Request", "Confirm Rejection", "danger"
    );
}

function renderAdminUserList() {
    const userListArea = document.getElementById('admin-user-list-area');
    if(!userListArea) return;
    userListArea.innerHTML = '';
    const searchInput = document.getElementById('admin-user-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.id.toLowerCase().includes(searchTerm)
    );

    const table = document.createElement('table'); table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Name (ID)</th><th>Email</th><th>COIN Bal.</th><th>KYC</th><th>Initial Purchase</th><th>Status</th><th>Actions</th><th>Adjust Bal.</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    filteredUsers.forEach(user => {
        const tr = tbody.insertRow();
        tr.innerHTML = `
            <td>${user.name} <small>(${user.id.substring(0,6)})</small></td>
            <td>${user.email}</td>
            <td>${user.coinBalance}</td>
            <td style="text-transform:capitalize;">${user.kycStatus || 'None'}</td>
            <td>${user.hasMadeInitialSystemPurchase ? 'Yes' : 'No'}</td>
            <td><span style="color: ${user.status === 'active' ? 'var(--success-color)' : 'var(--danger-color)'}; text-transform: capitalize; font-weight: bold;">${user.status}</span></td>
            <td>
                <button onclick="openAdminEditKycModal('${user.id}')" class="secondary small" title="Edit User KYC Details and Status">Edit KYC</button>
                <button onclick="toggleBlockUser('${user.id}')" class="${user.status === 'active' ? 'secondary' : 'accent'} small">${user.status === 'active' ? 'Block' : 'Unblock'}</button>
                <button onclick="deleteUser('${user.id}')" class="danger small" title="Permanently Delete User">Delete User</button>
            </td>
            <td>
                <div style="display:flex; gap: 5px; align-items: center;">
                    <input type="number" id="adj-bal-${user.id}" style="width: 70px; padding: 0.3rem; margin-bottom:0;" placeholder="Set">
                    <button onclick="adminAdjustUserBalance('${user.id}')" class="accent small" style="padding: 0.3rem 0.5rem;" title="Set User Coin Balance">Set</button>
                </div>
            </td>`;
    });
    if (filteredUsers.length === 0) { userListArea.innerHTML = `<p>No users match your search criteria "${searchTerm}".</p>`; } else { userListArea.appendChild(table); }
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
    if (newBalanceStr === "") {
        return;
    }
    const newBalance = parseFloat(newBalanceStr);


    if (isNaN(newBalance) || newBalance < 0) {
        displayNotification('Invalid balance amount. Must be a non-negative number.', 'error');
        amountInput.value = user.coinBalance;
        return;
    }
    showCustomConfirm(
        `Are you sure you want to set ${user.name}'s COIN balance to ${newBalance}? Current balance: ${user.coinBalance}. This is a direct modification.`,
        () => {
            const oldBalance = user.coinBalance;
            user.coinBalance = newBalance;
            saveState();
            renderAdminUserList();
            renderAdminOverviewStats();
            displayNotification(`${user.name}'s balance changed from ${oldBalance} to ${newBalance} COIN.`, 'success');
            addGlobalNotification(user.id, "Balance Adjusted by Admin", `Your COIN balance was adjusted by an administrator to ${newBalance}. Old balance: ${oldBalance}.`, '#', 'warning');
            amountInput.value = '';
        }, "Confirm Balance Adjustment", "Set Balance", "accent"
    );
}

function toggleBlockUser(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        const newStatus = user.status === 'active' ? 'blocked' : 'active';
        const actionText = newStatus === 'blocked' ? 'block' : 'unblock';
        showCustomConfirm(
            `Are you sure you want to ${actionText} user ${user.name} (${user.email})?`,
            () => {
                user.status = newStatus;
                saveState();
                renderAdminUserList();
                displayNotification(`User ${user.name} is now ${newStatus}.`, 'info');
                addGlobalNotification(user.id, "Account Status Changed", `Your account status has been changed to: ${newStatus} by an administrator.`, '#', newStatus === 'blocked' ? 'error' : 'success');
            },
            `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} User`,
            `Yes, ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
            newStatus === 'blocked' ? "danger" : "accent"
        );
    }
}
function deleteUser(userId) {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) {
        displayNotification("User not found.", "error");
        return;
    }
    showCustomConfirm(
        `PERMANENTLY DELETE user ${userToDelete.name} (${userToDelete.email})? This is irreversible and will remove all their data (transactions, offers, tickets, investments, withdrawal requests).`,
        () => {
            const userIndex = users.findIndex(u => u.id === userId);
            if (userIndex > -1) {
                const userName = users[userIndex].name;
                users.splice(userIndex, 1);
                transactions = transactions.filter(tx => tx.buyerId !== userId && tx.sellerId !== userId);
                sellOffers = sellOffers.filter(offer => offer.sellerId !== userId);
                investments = investments.filter(inv => inv.userId !== userId);
                supportTickets = supportTickets.filter(ticket => ticket.userId !== userId);
                systemPurchaseRequests = systemPurchaseRequests.filter(req => req.userId !== userId);
                withdrawalRequests = withdrawalRequests.filter(req => req.userId !== userId); // New
                globalNotifications = globalNotifications.filter(n => n.target !== userId);

                saveState();
                renderAdminUserList();
                renderAdminP2PTransactions();
                renderAdminInvestments();
                renderAdminSystemPurchaseRequests();
                renderAdminWithdrawalRequests(); // New
                renderAdminSupportTickets();
                renderAdminOverviewStats();
                displayNotification(`User ${userName} and all associated data permanently deleted.`, 'success');
            }
        }, "Confirm User Deletion", "DELETE USER (IRREVERSIBLE)", "danger"
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
        const buyerUser = users.find(u => u.id === tx.buyerId);
        const sellerUser = users.find(u => u.id === tx.sellerId);
        const displayFiatPrice = formatCurrency(tx.totalPrice, tx.currency);

        let proofDisplay = 'N/A';
        if (tx.paymentProofFilename) {
            proofDisplay = tx.paymentProofFilename;
            if (tx.paymentProofDataUrl && tx.paymentProofDataUrl.startsWith('data:image')) {
                proofDisplay = `<a href="${tx.paymentProofDataUrl}" target="_blank" title="View Proof Image">${tx.paymentProofFilename || 'View Image'} <img src="${tx.paymentProofDataUrl}" alt="Proof" style="max-height:30px; vertical-align:middle;"></a>`;
            } else if (tx.paymentProofDataUrl && tx.paymentProofDataUrl.startsWith('data:application/pdf')) {
                 proofDisplay = `<a href="${tx.paymentProofDataUrl}" target="_blank" title="View Proof PDF">${tx.paymentProofFilename || 'View PDF'}</a>`;
            } else if (tx.paymentProofDataUrl) {
                 proofDisplay = `<a href="#" onclick="alert('Proof data available but not a direct image/PDF preview. Filename: ${tx.paymentProofFilename}'); return false;" title="Proof Data available">${tx.paymentProofFilename}</a>`;
            }
        }

        let actionButtons = '-';
        if (tx.status === 'disputed') {
            actionButtons = `<button onclick="adminResolveP2PDispute('${tx.id}')" class="accent small">Resolve Dispute</button>`;
        } else if (tx.status === 'payment_proof_submitted' || tx.status === 'awaiting_payment') {
            actionButtons = `<button onclick="adminForceCancelP2P('${tx.id}')" class="danger small" title="Force cancel and refund seller's coins (if applicable)">Force Cancel</button>`;
        }


        const tr = tbody.insertRow();
        tr.innerHTML = `
            <td>${tx.id.substring(0,8)}</td>
            <td>${buyerUser ? buyerUser.name : (tx.buyerName || 'User Deleted')} <small>(${tx.buyerId.substring(0,4)})</small></td>
            <td>${sellerUser ? sellerUser.name : (tx.sellerName || 'User Deleted')} <small>(${tx.sellerId.substring(0,4)})</small></td>
            <td>${tx.amount} COIN</td>
            <td>${displayFiatPrice}</td>
            <td style="text-transform: capitalize; ${tx.status === 'disputed' ? 'color:var(--danger-color); font-weight:bold;' : ''}">${tx.status.replace(/_/g, ' ')}</td>
            <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
            <td>${proofDisplay}</td>
            <td>${actionButtons}</td>`;
    });
    if (filteredTransactions.length === 0) { p2pArea.innerHTML = `<p>No P2P transactions match the filter: '${filterStatus}'.</p>`; } else { p2pArea.appendChild(table); }
}

function adminResolveP2PDispute(transactionId) {
    const tx = transactions.find(t => t.id === transactionId && t.status === 'disputed');
    if (!tx) {
        displayNotification('Disputed transaction not found or already resolved.', 'error');
        return;
    }
    const buyer = users.find(u => u.id === tx.buyerId);
    const seller = users.find(u => u.id === tx.sellerId);

    if (!buyer || !seller) {
        displayNotification('Buyer or Seller not found for this transaction. Cannot resolve.', 'error');
        return;
    }

    showCustomPrompt("Enter resolution notes (e.g., 'Buyer paid, coins awarded', 'Seller keeps coins, no payment received'). Then manually adjust balances if needed.",
        "", (notes) => {
            if (notes !== null) {
                tx.status = 'resolved_by_admin';
                tx.adminNotes = notes;
                saveState();
                renderAdminP2PTransactions();
                displayNotification(`Dispute for Tx ${tx.id.substring(0,8)} marked as resolved. Notes: ${notes}. Please adjust balances manually if required.`, 'info');
                addGlobalNotification(buyer.id, "P2P Dispute Resolved", `Admin has reviewed and resolved the dispute for Tx ${tx.id.substring(0,8)}. Check your P2P history.`, 'ud-p2p-history', 'info');
                addGlobalNotification(seller.id, "P2P Dispute Resolved", `Admin has reviewed and resolved the dispute for Tx ${tx.id.substring(0,8)}. Check your P2P history.`, 'ud-p2p-history', 'info');
            }
        }, "Resolve P2P Dispute Manually"
    );
}

function adminForceCancelP2P(transactionId) {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) {
        displayNotification('Transaction not found.', 'error');
        return;
    }
    if (tx.status === 'completed' || tx.status === 'cancelled' || tx.status === 'resolved_by_admin' || tx.status === 'cancelled_by_admin') {
        displayNotification('This transaction is already finalized or cancelled.', 'warning');
        return;
    }
    const seller = users.find(u => u.id === tx.sellerId);

    showCustomConfirm(
        `Force cancel P2P Tx ID ${tx.id.substring(0,8)}? Seller: ${seller ? seller.name : 'N/A'}. Buyer: ${tx.buyerName}. If coins were reserved from seller's offer, they will be returned.`,
        () => {
            tx.status = 'cancelled_by_admin';
            const originalOffer = sellOffers.find(o => o.id === tx.offerId);
            if (originalOffer && originalOffer.status === 'pending_sale') {
                originalOffer.status = 'active';
            } else if (seller && originalOffer && originalOffer.status !== 'active') {
                 console.warn(`Force cancelling Tx ${tx.id}. Offer ${originalOffer.id} status was ${originalOffer.status}. Check seller balance.`);
            }

            saveState();
            renderAdminP2PTransactions();
            displayNotification(`P2P Transaction ${tx.id.substring(0,8)} has been forcibly cancelled by admin.`, 'success');
            addGlobalNotification(tx.buyerId, "P2P Transaction Cancelled", `P2P Transaction ${tx.id.substring(0,8)} was cancelled by an administrator.`, 'ud-p2p-history', 'warning');
            if (seller) {
                addGlobalNotification(tx.sellerId, "P2P Transaction Cancelled", `P2P Transaction ${tx.id.substring(0,8)} (your sale) was cancelled by an administrator. Your offer may be relisted.`, 'ud-p2p-history', 'warning');
            }
        }, "Force Cancel P2P Transaction", "Yes, Force Cancel", "danger"
    );
}


function renderAdminInvestments() {
    const invArea = document.getElementById('admin-investments-area');
    if(!invArea) return;
    invArea.innerHTML = '';
    const table = document.createElement('table'); table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>ID</th><th>User</th><th>Invested</th><th>Return</th><th>Start Date</th><th>Maturity Date</th><th>Status</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    [...investments].sort((a,b) => new Date(b.startDate) - new Date(a.startDate)).forEach(inv => {
        const userInv = users.find(u=>u.id === inv.userId);
        const tr = tbody.insertRow();
        tr.innerHTML = `
            <td>${inv.id.substring(0,8)}</td>
            <td>${userInv ? userInv.name : (inv.userName || 'User Deleted')} <small>(${inv.userId.substring(0,4)})</small></td>
            <td>${inv.amountInvested} COIN</td>
            <td>${inv.expectedReturn} COIN</td>
            <td>${new Date(inv.startDate).toLocaleDateString()}</td>
            <td>${new Date(inv.maturityDate).toLocaleDateString()}</td>
            <td style="text-transform: capitalize;">${inv.status.replace(/_/g, ' ')}</td>`;
    });
    if (investments.length === 0) { invArea.innerHTML = '<p>No investments recorded in the system.</p>'; } else { invArea.appendChild(table); }
}

function renderAdminKycRequests() {
    const kycListDiv = document.getElementById('admin-kyc-requests-list');
    if (!kycListDiv) return;
    kycListDiv.innerHTML = '';
    const pendingKycUsers = users.filter(u => u.kycStatus === 'pending').sort((a,b) => new Date(a.kycData?.submittedAt || 0) - new Date(b.kycData?.submittedAt || 0));

    if (pendingKycUsers.length === 0) {
        kycListDiv.innerHTML = '<p>No KYC requests currently pending approval. You can manage all users\' KYC via the User Management list.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>User Name</th><th>Email</th><th>Bank</th><th>USDT Wallet</th><th>Tel.</th><th>Country</th><th>Document</th><th>Actions</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    pendingKycUsers.forEach(user => {
        const kyc = user.kycData || {};
        let docDisplay = 'No Document';
        if (kyc.documentFilename) {
            docDisplay = kyc.documentFilename;
            if (kyc.documentUrl && (kyc.documentUrl.startsWith('data:image') || kyc.documentUrl.startsWith('data:application/pdf'))) {
                docDisplay = `<a href="${kyc.documentUrl}" target="_blank" title="View KYC Document">${kyc.documentFilename}</a>`;
            }
        }
        const tr = tbody.insertRow();
        tr.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${kyc.bankName || 'N/A'} (${kyc.bankAccount || 'N/A'})</td>
            <td>${kyc.usdtWallet || 'N/A'}</td>
            <td>${kyc.telephone || 'N/A'}</td>
            <td>${kyc.country || 'N/A'}</td>
            <td>${docDisplay}</td>
            <td>
                <button onclick="approveKyc('${user.id}')" class="accent small">Approve</button>
                <button onclick="rejectKyc('${user.id}')" class="danger small">Reject</button>
                 <button onclick="openAdminEditKycModal('${user.id}')" class="secondary small" title="View/Edit Full Details">More/Edit</button>
            </td>
        `;
    });
    kycListDiv.appendChild(table);
}

function approveKyc(userId) {
    const user = users.find(u => u.id === userId);
    if (user && (user.kycStatus === 'pending' || user.kycStatus === 'rejected')) {
        showCustomConfirm(
            `Are you sure you want to approve KYC for ${user.name}?`,
            () => {
                user.kycStatus = 'approved';
                if(user.kycData) user.kycData.rejectionReason = null;
                saveState();
                renderAdminKycRequests();
                renderAdminUserList();
                renderAdminOverviewStats();
                if (currentUser && !currentUser.isAdmin && currentUser.id === userId) renderKycForm();
                displayNotification(`KYC for ${user.name} has been approved.`, 'success');
                addGlobalNotification(userId, "KYC Approved", "Congratulations! Your KYC verification has been approved by the administrator.", 'ud-kyc', 'success');
            }, "Approve KYC", "Yes, Approve", "accent"
        );
    } else if (user && user.kycStatus === 'approved') {
        displayNotification(`${user.name}'s KYC is already approved.`, 'info');
    } else {
        displayNotification("User not found or KYC not in a state to be approved.", "error");
    }
}

function rejectKyc(userId) {
    const user = users.find(u => u.id === userId);
    if (user && (user.kycStatus === 'pending' || user.kycStatus === 'approved')) {
        showCustomPrompt(
            `Provide a clear reason for rejecting KYC for ${user.name} (${user.email}):`,
            user.kycData?.rejectionReason || "Document unclear or information mismatch.",
            (reason) => {
                if (reason !== null && reason.trim() !== "") {
                    user.kycStatus = 'rejected';
                    if(!user.kycData) user.kycData = {};
                    user.kycData.rejectionReason = reason.trim();
                    saveState();
                    renderAdminKycRequests();
                    renderAdminUserList();
                    renderAdminOverviewStats();
                    if (currentUser && !currentUser.isAdmin && currentUser.id === userId) renderKycForm();
                    displayNotification(`KYC for ${user.name} rejected. Reason: ${reason}`, 'info');
                    addGlobalNotification(userId, "KYC Rejected", `Your KYC verification was rejected. Reason: ${reason}. Please review and resubmit if necessary.`, 'ud-kyc', 'error');
                } else if (reason !== null && reason.trim() === "") {
                    displayNotification("Rejection reason cannot be empty. Please provide a clear explanation.", "warning");
                }
            }, "KYC Rejection Reason"
        );
    } else if (user && user.kycStatus === 'rejected') {
        displayNotification(`${user.name}'s KYC is already rejected. You can edit details via User Management.`, 'info');
    } else {
         displayNotification("User not found or KYC not in a state to be rejected.", "error");
    }
}

function openAdminEditKycModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) {
        displayNotification("User not found for KYC edit.", "error");
        return;
    }

    document.getElementById('admin-edit-kyc-userId').value = userId;
    document.getElementById('admin-edit-kyc-modal-title').textContent = `Edit KYC: ${user.name} (${user.email})`;

    const kyc = user.kycData || { bankName: '', bankAccount: '', usdtWallet: '', telephone: '', country: '', documentUrl: null, documentFilename: null, rejectionReason: null };

    document.getElementById('admin-kyc-bank-name').value = kyc.bankName || '';
    document.getElementById('admin-kyc-bank-account').value = kyc.bankAccount || '';
    document.getElementById('admin-kyc-usdt-wallet').value = kyc.usdtWallet || '';
    document.getElementById('admin-kyc-telephone').value = kyc.telephone || '';

    populateCountryDropdown('admin-kyc-country', kyc.country);
    document.getElementById('admin-kyc-status').value = user.kycStatus || 'none';

    const rejectionGroup = document.getElementById('admin-kyc-rejection-reason-group');
    const rejectionTextarea = document.getElementById('admin-kyc-rejection-reason');
    if (document.getElementById('admin-kyc-status').value === 'rejected') {
        rejectionTextarea.value = kyc.rejectionReason || '';
        rejectionGroup.classList.remove('hidden');
    } else {
        rejectionTextarea.value = '';
        rejectionGroup.classList.add('hidden');
    }

    let docDisplay = 'No Document Provided';
    if (kyc.documentFilename) {
        docDisplay = `Current: ${kyc.documentFilename}`;
        if (kyc.documentUrl && (kyc.documentUrl.startsWith('data:image') || kyc.documentUrl.startsWith('data:application/pdf'))) {
            docDisplay += ` <a href="${kyc.documentUrl}" target="_blank" title="View Current Document">(View)</a>`;
        }
    }
    document.getElementById('admin-kyc-doc-display').innerHTML = docDisplay;
    document.getElementById('admin-kyc-new-document').value = '';

    document.getElementById('admin-edit-kyc-modal').style.display = 'block';
}

function closeAdminEditKycModal() {
    document.getElementById('admin-edit-kyc-modal').style.display = 'none';
    document.getElementById('admin-kyc-new-document').value = '';
}

function saveAdminKycChanges() {
    const userId = document.getElementById('admin-edit-kyc-userId').value;
    const user = users.find(u => u.id === userId);
    if (!user) {
        displayNotification('User not found for KYC update.', 'error');
        closeAdminEditKycModal();
        return;
    }
    const oldKycStatus = user.kycStatus;
    const newKycStatus = document.getElementById('admin-kyc-status').value;

    if (!user.kycData) user.kycData = {};

    user.kycData.bankName = document.getElementById('admin-kyc-bank-name').value.trim();
    user.kycData.bankAccount = document.getElementById('admin-kyc-bank-account').value.trim();
    user.kycData.usdtWallet = document.getElementById('admin-kyc-usdt-wallet').value.trim();
    user.kycData.telephone = document.getElementById('admin-kyc-telephone').value.trim();
    user.kycData.country = document.getElementById('admin-kyc-country').value;
    user.kycStatus = newKycStatus;

    let kycStatusChanged = oldKycStatus !== user.kycStatus;

    if (user.kycStatus === 'rejected') {
        user.kycData.rejectionReason = document.getElementById('admin-kyc-rejection-reason').value.trim();
        if (!user.kycData.rejectionReason) {
            displayNotification('Rejection reason is required if KYC status is set to "rejected". Changes not saved for reason.', 'error');
            user.kycStatus = oldKycStatus;
            document.getElementById('admin-kyc-status').value = oldKycStatus;
            return;
        }
    } else {
        user.kycData.rejectionReason = null;
    }

    const newDocumentFile = document.getElementById('admin-kyc-new-document').files[0];

    const processSave = () => {
        saveState();
        renderAdminUserList();
        renderAdminKycRequests();
        renderAdminOverviewStats();
        closeAdminEditKycModal();
        displayNotification(`KYC details for ${user.name} updated successfully.`, 'success');

        if(kycStatusChanged){
             if(user.kycStatus === 'approved' && oldKycStatus !== 'approved'){
                 addGlobalNotification(userId, "KYC Approved", "Your KYC has been approved by the administrator.", 'ud-kyc', 'success');
             } else if (user.kycStatus === 'rejected' && oldKycStatus !== 'rejected'){
                 addGlobalNotification(userId, "KYC Rejected", `Your KYC status was changed to rejected. Reason: ${user.kycData.rejectionReason}`, 'ud-kyc', 'error');
             } else if (user.kycStatus === 'pending' && oldKycStatus === 'approved') {
                 addGlobalNotification(userId, "KYC Re-evaluation Pending", `Your KYC status was changed to pending re-evaluation by an admin.`, 'ud-kyc', 'warning');
             }
             if (currentUser && !currentUser.isAdmin && currentUser.id === userId) {
                 renderKycForm();
             }
        }
    };

    if (newDocumentFile) {
        if (newDocumentFile.size > 2 * 1024 * 1024) {
            displayNotification("New document file too large (max 2MB). Document not updated.", "error");
            processSave();
            return;
        }
        user.kycData.documentFilename = newDocumentFile.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            user.kycData.documentUrl = e.target.result;
            processSave();
        };
        reader.onerror = function(e) {
            console.error("File reading error for admin KYC update:", e);
            displayNotification('Error reading new document file. Document not updated.', 'error');
            processSave();
        };
        reader.readAsDataURL(newDocumentFile);
    } else {
        processSave();
    }
}

// --- Withdrawal Management (Admin) ---
function renderAdminWithdrawalRequests() {
    const listDiv = document.getElementById('admin-withdrawal-requests-list');
    if (!listDiv) return;
    listDiv.innerHTML = '';

    const pendingRequests = withdrawalRequests.filter(req => req.status === 'pending_admin_approval')
        .sort((a, b) => new Date(a.requestedAt) - new Date(b.requestedAt));
    const processedRequests = withdrawalRequests.filter(req => req.status !== 'pending_admin_approval')
        .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)); // Show newest processed first

    if (withdrawalRequests.length === 0) {
        listDiv.innerHTML = '<p>No withdrawal requests found.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Date</th><th>User</th><th>Amount</th><th>Currency</th><th>Destination</th><th>Status</th><th>Action/Notes</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    const renderRow = (req) => {
        const tr = tbody.insertRow();
        let actions = '';
        if (req.status === 'pending_admin_approval') {
            actions = `
                <button onclick="approveWithdrawalRequest('${req.id}')" class="accent small">Approve</button>
                <button onclick="rejectWithdrawalRequest('${req.id}')" class="danger small">Reject</button>
            `;
        } else {
            actions = req.adminNotes || (req.status === 'approved' ? 'Awaiting Offline Payment' : 'N/A');
        }
        tr.innerHTML = `
            <td>${new Date(req.requestedAt).toLocaleDateString()}</td>
            <td>${req.userName} <small>(${req.userId.substring(0,4)})</small></td>
            <td>${formatCurrency(req.amount, req.currency)}</td>
            <td>${req.currency}</td>
            <td>${req.destination}</td>
            <td style="text-transform: capitalize;">${req.status.replace(/_/g, ' ')}</td>
            <td>${actions}</td>
        `;
    };

    pendingRequests.forEach(renderRow);
    if (pendingRequests.length > 0 && processedRequests.length > 0) {
        const separatorRow = tbody.insertRow();
        separatorRow.innerHTML = `<td colspan="7" style="background-color: #f0f0f0; text-align:center; font-weight:bold;">Processed Requests</td>`;
    }
    processedRequests.forEach(renderRow);

    listDiv.appendChild(table);
}

function approveWithdrawalRequest(requestId) {
    const request = withdrawalRequests.find(req => req.id === requestId);
    if (!request || request.status !== 'pending_admin_approval') {
        displayNotification('Request not found or not pending approval.', 'error');
        return;
    }

    showCustomConfirm(
        `Approve withdrawal of ${formatCurrency(request.amount, request.currency)} for ${request.userName}? This signifies you will process the payment offline.`,
        () => {
            request.status = 'approved'; // Admin has approved, payment is now due offline
            request.processedAt = new Date().toISOString();
            request.adminNotes = "Approved by admin. Payment pending.";
            saveState();
            renderAdminWithdrawalRequests();
            renderAdminOverviewStats();
            renderWalletBalances(); // To update potential green highlight for user
            displayNotification(`Withdrawal for ${request.userName} approved. Remember to process the payment.`, 'success');
            addGlobalNotification(request.userId, "Withdrawal Approved", `Your withdrawal request for ${formatCurrency(request.amount, request.currency)} has been approved by admin. Payment will be processed to your registered account.`, 'ud-withdraw-funds', 'success');
        }, "Approve Withdrawal", "Approve", "accent"
    );
}

function rejectWithdrawalRequest(requestId) {
    const request = withdrawalRequests.find(req => req.id === requestId);
    if (!request || request.status !== 'pending_admin_approval') {
        displayNotification('Request not found or not pending approval.', 'error');
        return;
    }

    showCustomPrompt(
        `Enter reason for rejecting withdrawal of ${formatCurrency(request.amount, request.currency)} for ${request.userName}:`,
        "",
        (reason) => {
            if (reason === null) return; // User cancelled prompt

            const user = users.find(u => u.id === request.userId);
            if (user) {
                // Return funds to user's walletBalance
                if (!user.walletBalance) user.walletBalance = { USD: 0, ZAR: 0, BTC: 0 };
                user.walletBalance[request.currency] = (user.walletBalance[request.currency] || 0) + request.amount;
            } else {
                console.error(`User ${request.userId} not found for withdrawal rejection refund.`);
                 displayNotification('User not found, cannot refund automatically. Please check manually.', 'error');
            }

            request.status = 'rejected';
            request.processedAt = new Date().toISOString();
            request.adminNotes = `Rejected: ${reason || 'No reason provided.'}`;
            saveState();
            renderAdminWithdrawalRequests();
            renderAdminOverviewStats();
            renderWalletBalances(); // Update user's wallet display if they are viewing
            displayNotification(`Withdrawal for ${request.userName} rejected. Funds returned to user. Reason: ${reason}`, 'info');
            addGlobalNotification(request.userId, "Withdrawal Rejected", `Your withdrawal request for ${formatCurrency(request.amount, request.currency)} was rejected. Reason: ${reason}. Funds have been returned to your wallet.`, 'ud-withdraw-funds', 'error');
        },
        "Reject Withdrawal Reason"
    );
}


// --- Initial Load ---
window.onload = () => {
    const currentYearEl = document.getElementById('currentYear');
    if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();

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
                currentUser.walletBalance = currentUser.walletBalance || { USD: 0, ZAR: 0, BTC: 0 };
                currentUser.hasMadeInitialSystemPurchase = currentUser.hasMadeInitialSystemPurchase === undefined ? false : currentUser.hasMadeInitialSystemPurchase;
                currentUser.zarProfitWallet = currentUser.zarProfitWallet === undefined ? 0 : currentUser.zarProfitWallet;
                currentUser.usdProfitWallet = currentUser.usdProfitWallet === undefined ? 0 : currentUser.usdProfitWallet;
                currentUser.kycStatus = currentUser.kycStatus || 'none';
                currentUser.kycData = currentUser.kycData || { bankName: '', bankAccount: '', usdtWallet: '', telephone: '', country: '', documentUrl: null, documentFilename: null, rejectionReason: null, submittedAt: null };
                currentUser.lastSystemPurchaseBonusPercentage = currentUser.lastSystemPurchaseBonusPercentage === undefined ? 0 : currentUser.lastSystemPurchaseBonusPercentage;
                currentUser.lastSystemPurchaseBaseCoinPrice = currentUser.lastSystemPurchaseBaseCoinPrice === undefined ? 0 : currentUser.lastSystemPurchaseBaseCoinPrice;
            } else {
                console.warn("Persisted user ID not found in current users list. Logging out.");
                handleLogout();
                return;
            }
        }

        if (currentUser.isAdmin) {
            switchView('admin-dashboard-view', true);
            renderAdminDashboard();
            setActiveLink(document.getElementById('nav-dashboard'));
        } else {
            switchView('user-dashboard-view', true);
            renderUserDashboard();
            setActiveLink(document.getElementById('nav-dashboard'));
        }
    } else {
        switchView(lastView, true);
         if (lastView === 'landing-page-view') {
            setActiveLink(document.querySelector('#nav-links li a[onclick*=\'landing-page-view\']'));
        } else {
            const linkForLastView = document.querySelector(`#nav-links a[onclick*="'${lastView}'"]`);
            if(linkForLastView) setActiveLink(linkForLastView);
        }
    }

    document.addEventListener('click', function(event) {
        const panel = document.getElementById('notification-panel');
        const bellButton = document.getElementById('notification-bell-button');
        if (panel && bellButton && !panel.classList.contains('hidden')) {
            if (!panel.contains(event.target) && !bellButton.contains(event.target) && event.target !== bellButton && !bellButton.contains(event.target.parentNode)) {
                panel.classList.add('hidden');
            }
        }
    });

    const adminKycStatusSelect = document.getElementById('admin-kyc-status');
    if (adminKycStatusSelect) {
        adminKycStatusSelect.addEventListener('change', function() {
            const rejectionGroup = document.getElementById('admin-kyc-rejection-reason-group');
            if (this.value === 'rejected') {
                rejectionGroup.classList.remove('hidden');
            } else {
                rejectionGroup.classList.add('hidden');
            }
        });
    }

    // --- On-Scroll Animation Logic ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });

    if (document.getElementById('unread-notification-count')) {
         updateNotificationBellCount();
    }
};