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
const categoryTable = document.getElementById("category-table");
const categoryTableFooter = document.getElementById("category-table-footer");
const categoryFilter = document.getElementById("category-filter");
const resetFiltersButton = document.getElementById("reset-filters");
const filterSummary = document.getElementById("filter-summary");

// ---------- 2. Load saved expenses ----------
// localStorage is a small storage area built into your browser.
// It keeps data on your computer, even after you close the tab.
const STORAGE_KEY = "expenses";
let expenses = loadExpenses();

// The id of the expense currently being edited (null means none)
let editingId = null;

// The category the expenses table is filtered to ("" means all categories).
// Not saved, so the app always opens showing everything.
let activeFilter = "";

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

  // Keep only the expenses in the chosen category (or all of them)
  const visible = sorted.filter(function (expense) {
    return activeFilter === "" || expense.category === activeFilter;
  });

  updateFilterControls(visible);

  visible.forEach(function (expense) {
    // The row being edited is drawn as input boxes instead of plain text
    if (expense.id === editingId) {
      expenseList.appendChild(makeEditRow(expense));
      return;
    }

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
    actionCell.className = "right actions";

    const editButton = document.createElement("button");
    editButton.className = "btn-edit";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function () {
      editingId = expense.id; // remember which row is being edited
      renderTable();
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn-delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      deleteExpense(expense.id);
    });
    actionCell.append(editButton, deleteButton);

    row.append(dateCell, nameCell, categoryCell, amountCell, actionCell);
    expenseList.appendChild(row);
  });

  // Show the "no expenses" message only when the list is empty
  // Explain an empty table: no expenses at all, or none in the chosen category
  if (expenses.length === 0) {
    emptyMessage.textContent = "No expenses yet. Add your first one above.";
  } else {
    emptyMessage.textContent = "No " + activeFilter + " expenses yet.";
  }
  emptyMessage.style.display = visible.length === 0 ? "block" : "none";
}

// Fill the filter dropdown, and show/hide the Reset button and summary line
function updateFilterControls(visible) {
  // Same categories as the form's dropdown, so new ones appear automatically
  const names = Array.from(categoryInput.options).map(function (option) {
    return option.value;
  });
  // Plus any old category still used by a saved expense
  expenses.forEach(function (expense) {
    if (!names.includes(expense.category)) {
      names.push(expense.category);
    }
  });
  // Keep the chosen category listed even if its last expense was just deleted
  if (activeFilter !== "" && !names.includes(activeFilter)) {
    names.push(activeFilter);
  }

  // Rebuild the options after the first one ("All categories")
  categoryFilter.length = 1;
  names.forEach(function (name) {
    categoryFilter.appendChild(new Option(name, name));
  });
  categoryFilter.value = activeFilter;

  const filtering = activeFilter !== "";
  resetFiltersButton.hidden = !filtering;
  filterSummary.hidden = !filtering;

  if (filtering) {
    const sum = visible.reduce(function (s, expense) {
      return s + expense.amount;
    }, 0);
    filterSummary.textContent =
      "Showing " + visible.length + " of " + expenses.length + " expenses · " + formatMoney(sum);
  }
}

// Change the filter and redraw the table (the summaries above are unaffected)
function setFilter(category) {
  activeFilter = category;
  editingId = null; // close any open edit, so a hidden row isn't left mid-edit
  renderTable();
}

categoryFilter.addEventListener("change", function () {
  setFilter(categoryFilter.value);
});

resetFiltersButton.addEventListener("click", function () {
  setFilter(""); // back to the default: all categories
});

// Build the editable version of a row: input boxes filled with the current values
function makeEditRow(expense) {
  const row = document.createElement("tr");
  row.className = "editing-row";

  const dateBox = document.createElement("input");
  dateBox.type = "date";
  dateBox.className = "edit-input";
  dateBox.value = expense.date || "";
  dateBox.setAttribute("aria-label", "Date");

  const nameBox = document.createElement("input");
  nameBox.type = "text";
  nameBox.className = "edit-input";
  nameBox.value = expense.name;
  nameBox.setAttribute("aria-label", "Name");

  // Copy the choices from the form's Category dropdown
  const categoryBox = document.createElement("select");
  categoryBox.className = "edit-input";
  categoryBox.setAttribute("aria-label", "Category");
  Array.from(categoryInput.options).forEach(function (option) {
    categoryBox.appendChild(new Option(option.value, option.value));
  });
  // Keep an old category even if it's no longer in the dropdown
  if (!Array.from(categoryBox.options).some(function (o) { return o.value === expense.category; })) {
    categoryBox.appendChild(new Option(expense.category, expense.category));
  }
  categoryBox.value = expense.category;

  const amountBox = document.createElement("input");
  amountBox.type = "number";
  amountBox.className = "edit-input amount-input";
  amountBox.min = "0.01";
  amountBox.step = "0.01";
  amountBox.value = expense.amount.toFixed(2); // show 42.5 as "42.50"
  amountBox.setAttribute("aria-label", "Amount");

  const saveButton = document.createElement("button");
  saveButton.className = "btn-save";
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", function () {
    saveEdit(expense.id, nameBox.value, amountBox.value, categoryBox.value, dateBox.value);
  });

  const cancelButton = document.createElement("button");
  cancelButton.className = "btn-delete";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", cancelEdit);

  // Keyboard shortcuts while editing: Return saves, Escape cancels
  row.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      saveButton.click();
    } else if (event.key === "Escape") {
      cancelEdit();
    }
  });

  // Put each box in its own cell, in the same order as the normal row
  [dateBox, nameBox, categoryBox].forEach(function (box) {
    const cell = document.createElement("td");
    cell.appendChild(box);
    row.appendChild(cell);
  });
  const amountCell = document.createElement("td");
  amountCell.className = "right";
  amountCell.appendChild(amountBox);
  const actionCell = document.createElement("td");
  actionCell.className = "right actions";
  actionCell.append(saveButton, cancelButton);
  row.append(amountCell, actionCell);

  // Put the cursor in the Name box, ready to type
  setTimeout(function () { nameBox.focus(); }, 0);
  return row;
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

// ---------- 6. Draw the category totals table ----------
function renderCategoryTable(total) {
  categoryTable.innerHTML = "";
  categoryTableFooter.innerHTML = "";

  // Start with every category in the dropdown, so ones with no spending show $0.
  // Read straight from the <option> lines, so new categories appear automatically.
  const names = Array.from(categoryInput.options).map(function (option) {
    return option.value;
  });

  // Also include any category used by a saved expense but no longer in the dropdown
  expenses.forEach(function (expense) {
    if (!names.includes(expense.category)) {
      names.push(expense.category);
    }
  });

  // For each category, count its expenses and add up their amounts
  const rows = names.map(function (name) {
    const matching = expenses.filter(function (expense) {
      return expense.category === name;
    });
    const sum = matching.reduce(function (s, expense) {
      return s + expense.amount;
    }, 0);
    return { name: name, count: matching.length, sum: sum };
  });

  // Biggest total first. Categories at $0 keep their dropdown order at the bottom.
  rows.sort(function (a, b) {
    return b.sum - a.sum;
  });

  rows.forEach(function (row) {
    categoryTable.appendChild(makeRow(row.name, row.count, row.sum, row.count === 0));
  });

  // Footer row: the grand total across all categories
  categoryTableFooter.appendChild(makeRow("All categories", expenses.length, total, false));
}

// Build one table row: name | count | total
function makeRow(name, count, sum, isZero) {
  const tr = document.createElement("tr");
  if (isZero) {
    tr.className = "zero-row";
  }

  const nameCell = document.createElement("td");
  nameCell.textContent = name;

  const countCell = document.createElement("td");
  countCell.className = "right";
  countCell.textContent = count;

  const sumCell = document.createElement("td");
  sumCell.className = "right";
  sumCell.textContent = formatMoney(sum);

  tr.append(nameCell, countCell, sumCell);
  return tr;
}

// ---------- 7. Redraw everything ----------
function render() {
  const total = expenses.reduce(function (sum, expense) {
    return sum + expense.amount;
  }, 0);
  totalDisplay.textContent = formatMoney(total);

  renderTable();
  renderCategories(total);
  renderCategoryTable(total);
}

// ---------- 8. Add a new expense when the form is submitted ----------
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

// ---------- 9. Delete an expense ----------
function deleteExpense(id) {
  expenses = expenses.filter(function (expense) {
    return expense.id !== id;
  });
  saveExpenses();
  render();
}

// ---------- 10. Save or cancel an edit ----------
function saveEdit(id, name, amountText, category, date) {
  name = name.trim();
  const amount = parseFloat(amountText);

  if (name === "" || isNaN(amount) || amount <= 0) {
    alert("Please enter a name and an amount greater than 0.");
    return; // stay in edit mode so nothing typed is lost
  }

  // Find the expense with this id and update its values
  const expense = expenses.find(function (e) {
    return e.id === id;
  });
  expense.name = name;
  expense.amount = amount;
  expense.category = category;
  expense.date = date; // may be empty for old undated expenses

  editingId = null; // leave edit mode
  saveExpenses();
  render(); // redraws the total, the bars and the category totals too
}

function cancelEdit() {
  editingId = null; // leave edit mode without changing anything
  renderTable();
}

// ---------- 11. Light / dark mode ----------
// By default the page follows your computer's appearance setting.
// Clicking the button picks the opposite of what's showing and remembers it.
const themeToggle = document.getElementById("theme-toggle");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

// Is the page showing dark colors right now?
function isDark() {
  const chosen = document.documentElement.getAttribute("data-theme");
  if (chosen) {
    return chosen === "dark"; // the user picked one with the button
  }
  return systemDark.matches; // otherwise, follow the computer's setting
}

// The button offers the mode you're NOT in
function updateThemeButton() {
  themeToggle.textContent = isDark() ? "☀️ Light mode" : "🌙 Dark mode";
}

themeToggle.addEventListener("click", function () {
  const newTheme = isDark() ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  try {
    localStorage.setItem("theme", newTheme);
  } catch {
    // Can't remember the choice (e.g. private browsing); it still works for now.
  }
  updateThemeButton();
});

// If the computer switches between light and dark, update the button's label
systemDark.addEventListener("change", updateThemeButton);

// ---------- 12. When the page first loads ----------
updateThemeButton();
dateInput.value = todayString(); // start the date box on today
render();
