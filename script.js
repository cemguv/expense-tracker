// ---------- 1. Grab the HTML elements we need ----------
const form = document.getElementById("expense-form");
const nameInput = document.getElementById("name");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const expenseList = document.getElementById("expense-list");
const totalDisplay = document.getElementById("total");
const emptyMessage = document.getElementById("empty-message");
const categorySummary = document.getElementById("category-summary");
const categoryEmpty = document.getElementById("category-empty");

// ---------- 2. Load saved expenses ----------
// localStorage is a small storage area built into your browser.
// It keeps data on your computer, even after you close the tab.
const STORAGE_KEY = "expenses";
let expenses = loadExpenses();

function loadExpenses() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return []; // if anything goes wrong, start with an empty list
  }
}

function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    // Saving can fail in private browsing; the app still works for this visit.
  }
}

// ---------- 3. Helpers ----------
// Format a number as money, e.g. 12.5 -> "$12.50"
function formatMoney(value) {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

// Today's date as "YYYY-MM-DD", the format the date box uses
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

// Turn "2026-11-19" into a friendly "Nov 19, 2026"
function formatDate(dateString) {
  if (!dateString) {
    return "—"; // expenses added before dates existed have no date
  }
  const parts = dateString.split("-"); // ["2026", "11", "19"]
  const date = new Date(parts[0], parts[1] - 1, parts[2]); // months start at 0
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ---------- 4. Draw the table ----------
function renderTable() {
  expenseList.innerHTML = ""; // clear the old rows

  // Newest first. Dates in "YYYY-MM-DD" form sort correctly as plain text.
  // slice() makes a copy, so the saved order isn't changed.
  const sorted = expenses.slice().sort(function (a, b) {
    return (b.date || "").localeCompare(a.date || "");
  });

  sorted.forEach(function (expense) {
    const row = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.className = "date-cell";
    dateCell.textContent = formatDate(expense.date);

    const nameCell = document.createElement("td");
    nameCell.textContent = expense.name; // textContent is safe against odd input

    const categoryCell = document.createElement("td");
    const tag = document.createElement("span");
    tag.className = "category-tag";
    tag.textContent = expense.category;
    categoryCell.appendChild(tag);

    const amountCell = document.createElement("td");
    amountCell.className = "right";
    amountCell.textContent = formatMoney(expense.amount);

    const actionCell = document.createElement("td");
    actionCell.className = "right";
    const deleteButton = document.createElement("button");
    deleteButton.className = "btn-delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      deleteExpense(expense.id);
    });
    actionCell.appendChild(deleteButton);

    row.append(dateCell, nameCell, categoryCell, amountCell, actionCell);
    expenseList.appendChild(row);
  });

  // Show the "no expenses" message only when the list is empty
  emptyMessage.style.display = expenses.length === 0 ? "block" : "none";
}

// ---------- 5. Draw the spending-by-category bars ----------
function renderCategories(total) {
  categorySummary.innerHTML = "";

  // Add up the spending in each category, e.g. { Food: 55.5, Transport: 30 }
  const totals = {};
  expenses.forEach(function (expense) {
    totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
  });

  // Turn that into a list and put the biggest category first
  const categories = Object.keys(totals).sort(function (a, b) {
    return totals[b] - totals[a];
  });

  categories.forEach(function (category) {
    const amount = totals[category];
    const percent = (amount / total) * 100;

    const row = document.createElement("div");
    row.className = "category-row";

    // Top line: category name on the left, amount and percentage on the right
    const info = document.createElement("div");
    info.className = "category-info";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = category;

    const amountSpan = document.createElement("span");
    amountSpan.className = "category-amount";
    amountSpan.textContent = formatMoney(amount);
    const percentSpan = document.createElement("span");
    percentSpan.className = "category-percent";
    percentSpan.textContent = Math.round(percent) + "%";
    amountSpan.appendChild(percentSpan);

    info.append(nameSpan, amountSpan);

    // The bar: a light "track" with a colored "fill" whose width is the percentage
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = percent + "%";
    track.appendChild(fill);

    row.append(info, track);
    categorySummary.appendChild(row);
  });

  categoryEmpty.style.display = expenses.length === 0 ? "block" : "none";
}

// ---------- 6. Redraw everything ----------
function render() {
  const total = expenses.reduce(function (sum, expense) {
    return sum + expense.amount;
  }, 0);
  totalDisplay.textContent = formatMoney(total);

  renderTable();
  renderCategories(total);
}

// ---------- 7. Add a new expense when the form is submitted ----------
form.addEventListener("submit", function (event) {
  event.preventDefault(); // stop the page from reloading

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value; // "YYYY-MM-DD"

  if (name === "" || isNaN(amount) || amount <= 0 || date === "") {
    alert("Please enter a name, a date and an amount greater than 0.");
    return;
  }

  expenses.push({
    id: Date.now(), // a unique number so we can find this expense later
    name: name,
    amount: amount,
    category: category,
    date: date,
  });

  saveExpenses();
  render();

  form.reset();                  // clear the inputs
  dateInput.value = todayString(); // ...but put today's date back
  nameInput.focus();             // put the cursor back in the Name box
});

// ---------- 8. Delete an expense ----------
function deleteExpense(id) {
  expenses = expenses.filter(function (expense) {
    return expense.id !== id;
  });
  saveExpenses();
  render();
}

// ---------- 9. When the page first loads ----------
dateInput.value = todayString(); // start the date box on today
render();
