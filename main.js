/**
 * ========================================================
 * Expense Tracker App — main.js
 * ========================================================
 */

// =========================================================
// DATA & STATE
// =========================================================
let transactions = [];
let editingId = null;
let searchKeyword = '';

const STORAGE_KEY = 'expense_tracker_transactions';

function generateId() {
  return +new Date();
}

// =========================================================
// LOCAL STORAGE
// =========================================================
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function loadFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  transactions = data ? JSON.parse(data) : [];
}

// =========================================================
// CUSTOM EVENT
// =========================================================
function dispatchTransactionUpdated() {
  document.dispatchEvent(new Event('transaction:updated'));
}

document.addEventListener('transaction:updated', () => {
  renderTransactions();
  updateDashboard();
});

// =========================================================
// DOM REFERENCES
// =========================================================
const incomeList    = document.getElementById('incomeList');
const expenseList   = document.getElementById('expenseList');
const form          = document.getElementById('transactionForm');
const titleInput    = document.getElementById('transactionFormTitleInput');
const amountInput   = document.getElementById('transactionFormAmountInput');
const dateInput     = document.getElementById('transactionFormDateInput');
const typeSelect    = document.getElementById('transactionFormTypeSelect');
const submitBtn     = form.querySelector('[data-testid="transactionFormSubmitButton"]');
const formHeading   = document.getElementById('form-heading');
const searchForm    = document.getElementById('searchTransactionForm');
const searchInput   = document.getElementById('searchTransactionFormTitleInput');

const balanceEl     = document.querySelector('.tracker-summary__balance-amount');
const incomeStatEl  = document.querySelector('.tracker-summary__stat-amount--income');
const expenseStatEl = document.querySelector('.tracker-summary__stat-amount--expense');
const greetingEl    = document.querySelector('.tracker-header__greeting');

// =========================================================
// GREETING
// =========================================================
greetingEl.innerHTML = 'Hello, <strong>Ricky Yohanes</strong>';

// =========================================================
// DARK MODE TOGGLE
// =========================================================
const DARK_KEY = 'expense_tracker_dark_mode';

const darkToggleBtn = document.createElement('button');
darkToggleBtn.classList.add('dark-mode-toggle');
darkToggleBtn.setAttribute('aria-label', 'Toggle Dark Mode');
darkToggleBtn.title = 'Toggle Theme';

function applyDarkMode(isDark) {
  if (isDark) {
    document.body.classList.add('dark-mode');
    darkToggleBtn.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    darkToggleBtn.textContent = '🌙';
  }
}

// Load preferences from localStorage
const savedDark = localStorage.getItem(DARK_KEY) === 'true';
applyDarkMode(savedDark);

darkToggleBtn.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-mode');
  applyDarkMode(!isDark);
  localStorage.setItem(DARK_KEY, String(!isDark));
});

const headerUser = document.querySelector('.tracker-header__user');
headerUser.insertBefore(darkToggleBtn, headerUser.firstChild);

// =========================================================
// DASHBOARD
// =========================================================
function formatRupiah(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

function updateDashboard() {
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  balanceEl.textContent     = formatRupiah(balance);
  incomeStatEl.textContent  = formatRupiah(totalIncome);
  expenseStatEl.textContent = formatRupiah(totalExpense);
}

// =========================================================
// RENDERING TRANSACTIONS
// =========================================================
function createTransactionCard(transaction) {
  const isIncome = transaction.type === 'income';

  // Main Wrapper
  const item = document.createElement('div');
  item.setAttribute('data-testid', 'transactionItem');
  item.classList.add('tracker-transaction-item');

  // Icon
  const icon = document.createElement('div');
  icon.classList.add('tracker-transaction-item__icon',
    isIncome ? 'tracker-transaction-item__icon--income' : 'tracker-transaction-item__icon--expense');
  icon.textContent = isIncome ? '↑' : '↓';

  // Left Detail
  const detail = document.createElement('div');
  detail.classList.add('tracker-transaction-item__detail');

  const titleEl = document.createElement('h3');
  titleEl.setAttribute('data-testid', 'transactionItemTitle');
  titleEl.classList.add('tracker-transaction-item__title');
  titleEl.textContent = transaction.title;

  const dateEl = document.createElement('p');
  dateEl.setAttribute('data-testid', 'transactionItemDate');
  dateEl.classList.add('tracker-transaction-item__date');
  dateEl.textContent = `Date: ${transaction.date}`;

  detail.appendChild(titleEl);
  detail.appendChild(dateEl);

  const right = document.createElement('div');
  right.classList.add('tracker-transaction-item__right');

  const amountEl = document.createElement('p');
  amountEl.setAttribute('data-testid', 'transactionItemAmount');
  amountEl.classList.add('tracker-transaction-item__amount',
    isIncome ? 'tracker-transaction-item__amount--income' : 'tracker-transaction-item__amount--expense');
  amountEl.textContent = `Nominal: Rp${transaction.amount.toLocaleString('id-ID')}`;

  const typeEl = document.createElement('p');
  typeEl.setAttribute('data-testid', 'transactionItemType');
  typeEl.classList.add('tracker-transaction-item__type');
  typeEl.textContent = `Type: ${isIncome ? 'Income' : 'Expense'}`;

  // Button
  const actions = document.createElement('div');
  actions.classList.add('tracker-transaction-item__actions');

  const editBtn = document.createElement('button');
  editBtn.setAttribute('data-testid', 'transactionItemEditTypeButton');
  editBtn.classList.add('tracker-transaction-item__btn');
  editBtn.textContent = 'Change Type';
  editBtn.addEventListener('click', () => handleToggleType(transaction.id));

  const deleteBtn = document.createElement('button');
  deleteBtn.setAttribute('data-testid', 'transactionItemDeleteButton');
  deleteBtn.classList.add('tracker-transaction-item__btn');
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => handleDelete(transaction.id));

  // Edit Button for editing the transaction
  const editFormBtn = document.createElement('button');
  editFormBtn.classList.add('tracker-transaction-item__btn');
  editFormBtn.textContent = 'Edit';
  editFormBtn.addEventListener('click', () => handleEditForm(transaction.id));

  actions.appendChild(editBtn);
  actions.appendChild(editFormBtn);
  actions.appendChild(deleteBtn);

  right.appendChild(amountEl);
  right.appendChild(typeEl);
  right.appendChild(actions);

  item.appendChild(icon);
  item.appendChild(detail);
  item.appendChild(right);

  return item;
}

function renderTransactions() {
  incomeList.innerHTML  = '';
  expenseList.innerHTML = '';

  const keyword = searchKeyword.trim().toLowerCase();
  const filtered = keyword
    ? transactions.filter(t => t.title.toLowerCase().includes(keyword))
    : transactions;

  filtered.forEach(transaction => {
    const card = createTransactionCard(transaction);
    if (transaction.type === 'income') {
      incomeList.appendChild(card);
    } else {
      expenseList.appendChild(card);
    }
  });
}

// =========================================================
// FORM SUBMIT
// =========================================================
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const title  = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const date   = dateInput.value;
  const type   = typeSelect.value;


  if (!title) {
    alert('Transaction description cannot be empty!');
    return;
  }
  if (amount < 1) {
    alert('Amount must be at least Rp 1!');
    return;
  }

  if (editingId !== null) {
  
    const idx = transactions.findIndex(t => t.id === editingId);
    if (idx !== -1) {
      transactions[idx] = { id: editingId, title, amount, date, type };
    }
    editingId = null;
    submitBtn.textContent = 'Save Changes';
    formHeading.textContent = 'Add New Transaction';
  } else {

    const newTransaction = {
      id: generateId(),
      title,
      amount,
      date,
      type
    };
    transactions.push(newTransaction);
  }

  saveToStorage();
  form.reset();
  dispatchTransactionUpdated();
});

// =========================================================
// DELETE TRANSACTION
// =========================================================
function handleDelete(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveToStorage();
  dispatchTransactionUpdated();
}

// =========================================================
// CHANGE TYPE
// =========================================================
function handleToggleType(id) {
  const idx = transactions.findIndex(t => t.id === id);
  if (idx !== -1) {
    transactions[idx].type = transactions[idx].type === 'income' ? 'expense' : 'income';
    saveToStorage();
    dispatchTransactionUpdated();
  }
}

// =========================================================
// EDIT FORM 
// =========================================================
function handleEditForm(id) {
  const transaction = transactions.find(t => t.id === id);
  if (!transaction) return;

  editingId = transaction.id;
  titleInput.value      = transaction.title;
  amountInput.value     = transaction.amount;
  dateInput.value       = transaction.date;
  typeSelect.value      = transaction.type;
  submitBtn.textContent = 'Simpan Changes';
  formHeading.textContent = 'Edit Transaction';

  form.scrollIntoView({ behavior: 'smooth' });
}

// =========================================================
// SEARCH
// =========================================================
searchInput.addEventListener('input', () => {
  searchKeyword = searchInput.value;
  renderTransactions();
});

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  searchKeyword = searchInput.value;
  renderTransactions();
});

// =========================================================
// INITIALIZATION
// =========================================================
loadFromStorage();
dispatchTransactionUpdated();
