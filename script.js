// ---------- 1. Grab the HTML elements we need ----------
const form = document.getElementById("expense-form");
const nameInput = document.getElementById("name");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const expenseList = document.getElementById("expense-list");
const totalDisplay = document.getElementById("total");
const emptyMessage = document.getElementById("empty-message");

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

// ---------- 3. Helper: format a number as money ----------
function formatMoney(value) {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

// ---------- 4. Draw the table and total on the page ----------
function render() {
  expenseList.innerHTML = ""; // clear the old rows

  expenses.forEach(function (expense) {
    const row = document.createElement("tr");

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

    row.append(nameCell, categoryCell, amountCell, actionCell);
    expenseList.appendChild(row);
  });

  // Add up all the amounts
  const total = expenses.reduce(function (sum, expense) {
    return sum + expense.amount;
  }, 0);
  totalDisplay.textContent = formatMoney(total);

  // Show the "no expenses" message only when the list is empty
  emptyMessage.style.display = expenses.length === 0 ? "block" : "none";
}

// ---------- 5. Add a new expense when the form is submitted ----------
form.addEventListener("submit", function (event) {
  event.preventDefault(); // stop the page from reloading

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;

  if (name === "" || isNaN(amount) || amount <= 0) {
    alert("Please enter a name and an amount greater than 0.");
    return;
  }

  expenses.push({
    id: Date.now(), // a unique number so we can find this expense later
    name: name,
    amount: amount,
    category: category,
  });

  saveExpenses();
  render();

  form.reset();      // clear the inputs
  nameInput.focus(); // put the cursor back in the Name box
});

// ---------- 6. Delete an expense ----------
function deleteExpense(id) {
  expenses = expenses.filter(function (expense) {
    return expense.id !== id;
  });
  saveExpenses();
  render();
}

// ---------- 7. Draw the page once when it first loads ----------
render();
