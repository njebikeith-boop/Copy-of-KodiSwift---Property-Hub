<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Property Management System</title>
<style>
body {
  font-family: Arial, sans-serif;
  background:#f4f6f8;
  margin:0;
}
header {
  background:#1f2937;
  color:#fff;
  padding:15px;
}
.container {
  display:flex;
}
nav {
  width:220px;
  background:#111827;
  color:#fff;
  min-height:100vh;
}
nav a {
  display:block;
  padding:12px;
  color:#cbd5e1;
  text-decoration:none;
}
nav a:hover {
  background:#1f2937;
  color:#fff;
}
main {
  padding:20px;
  flex:1;
}
.card {
  background:#fff;
  padding:15px;
  margin-bottom:20px;
  border-radius:6px;
}
input, select, textarea {
  width:100%;
  padding:8px;
  margin:6px 0;
}
button {
  background:#2563eb;
  color:#fff;
  border:none;
  padding:10px;
  cursor:pointer;
}
button:hover {
  background:#1d4ed8;
}
table {
  width:100%;
  border-collapse:collapse;
}
th, td {
  border:1px solid #ddd;
  padding:8px;
}
th {
  background:#f1f5f9;
}
.hidden {
  display:none;
}
</style>
</head>

<body>

<header>
  <h2>Property Management System</h2>
</header>

<div class="container">
<nav>
  <a href="#" onclick="showSection('dashboard')">Dashboard</a>
  <a href="#" onclick="showSection('properties')">Properties</a>
  <a href="#" onclick="showSection('units')">Units</a>
  <a href="#" onclick="showSection('tenants')">Tenants</a>
  <a href="#" onclick="showSection('invoices')">Invoices</a>
</nav>

<main>

<!-- DASHBOARD -->
<div id="dashboard" class="card">
<h3>Onboarding Checklist</h3>
<ul>
  <li>Add Property</li>
  <li>Add Units</li>
  <li>Add Tenants</li>
</ul>
</div>

<!-- PROPERTIES -->
<div id="properties" class="card hidden">
<h3>Add Property</h3>
<input id="pName" placeholder="Property Name">
<input id="pCity" placeholder="City">
<input id="pStreet" placeholder="Street Name">

<h4>Optional Details</h4>
<input id="waterRate" placeholder="Water Rate (KES)">
<input id="electricityRate" placeholder="Electricity Rate">
<input id="paybill" placeholder="M-Pesa Paybill">
<input id="till" placeholder="M-Pesa Till">

<select id="penaltyType">
  <option value="">Penalty Type</option>
  <option value="fixed">Fixed Amount</option>
  <option value="percent_rent">% of Rent</option>
  <option value="percent_balance">% of Balance</option>
</select>
<input id="penaltyValue" placeholder="Penalty Value">

<input id="taxRate" placeholder="Tax Rate (%)" value="7.5">
<input id="managementFee" placeholder="Management Fee">

<textarea id="paymentInstructions" placeholder="Payment Instructions"></textarea>

<button onclick="addProperty()">Add Property</button>

<h4>Properties</h4>
<ul id="propertyList"></ul>
</div>

<!-- UNITS -->
<div id="units" class="card hidden">
<h3>Add Unit</h3>
<input id="uName" placeholder="Unit Name">
<input id="uRent" placeholder="Monthly Rent">
<textarea id="uNotes" placeholder="Notes"></textarea>
<button onclick="addUnit()">Add Unit</button>

<h4>Units</h4>
<ul id="unitList"></ul>
</div>

<!-- TENANTS -->
<div id="tenants" class="card hidden">
<h3>Add Tenant</h3>
<input id="tName" placeholder="Tenant Name">
<input id="tPhone" placeholder="Phone Number">
<input id="tDeposit" placeholder="Deposit Amount">
<input id="tLeaseStart" type="date">
<input id="tLeaseEnd" type="date">
<textarea id="tNotes" placeholder="Notes"></textarea>
<button onclick="addTenant()">Add Tenant</button>

<h4>Tenants</h4>
<ul id="tenantList"></ul>
</div>

<!-- INVOICES -->
<div id="invoices" class="card hidden">
<h3>Generated Monthly Invoice (Preview)</h3>
<table>
<thead>
<tr>
<th>Description</th>
<th>Amount (KES)</th>
</tr>
</thead>
<tbody id="invoiceItems"></tbody>
</table>
<p><strong>Total:</strong> <span id="invoiceTotal">0</span> KES</p>
</div>

</main>
</div>

<script>
let properties = [];
let units = [];
let tenants = [];

function showSection(id) {
  document.querySelectorAll('main > div').forEach(div => div.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function addProperty() {
  const property = {
    name: pName.value,
    city: pCity.value,
    street: pStreet.value,
    waterRate: waterRate.value,
    tax: taxRate.value
  };
  properties.push(property);
  renderList(propertyList, properties, p => p.name);
}

function addUnit() {
  const unit = { name: uName.value, rent: Number(uRent.value) };
  units.push(unit);
  renderList(unitList, units, u => `${u.name} - ${u.rent} KES`);
  generateInvoice();
}

function addTenant() {
  const tenant = { name: tName.value, phone: tPhone.value };
  tenants.push(tenant);
  renderList(tenantList, tenants, t => t.name);
}

function renderList(el, data, format) {
  el.innerHTML = "";
  data.forEach(item => {
    const li = document.createElement("li");
    li.textContent = format(item);
    el.appendChild(li);
  });
}

function generateInvoice() {
  invoiceItems.innerHTML = "";
  let total = 0;
  units.forEach(u => {
    addInvoiceRow("Rent", u.rent);
    total += u.rent;
  });
  invoiceTotal.textContent = total;
}

function addInvoiceRow(desc, amt) {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${desc}</td><td>${amt}</td>`;
  invoiceItems.appendChild(tr);
}
</script>

</body>
</html>
