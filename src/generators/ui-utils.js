import fs from "fs";
import path from "path";

import nlp from "compromise";

const DEFAULT_SELECTOR_FALLBACKS = {
  userNameField: ["#username", "input[name='username']", "input[type='email']"],
  passwordField: ["#password", "input[type='password']"],
  loginButton: ["button[type='submit']", "button:has-text('Login')", "#login"],
  submitButton: ["button[type='submit']", "input[type='submit']"],
  searchField: ["#search", "input[type='search']", "input[name='search']"],
  emailField: ["#email", "input[type='email']", "input[name='email']"],
  phoneField: ["#phone", "input[type='tel']", "input[name='phone']"],
  otpField: ["#otp", "input[name='otp']", "input[autocomplete='one-time-code']"],
  addressField: ["#address", "textarea[name='address']", "input[name='address']"],
  cityField: ["#city", "input[name='city']"],
  stateField: ["#state", "input[name='state']", "select[name='state']"],
  zipCodeField: ["#zip", "#postal-code", "input[name='zip']", "input[name='postalCode']"],
  countryDropdown: ["#country", "select[name='country']", "[role='combobox']"],
  dateField: ["input[type='date']", "#date", "input[name='date']"],
  timeField: ["input[type='time']", "#time", "input[name='time']"],
  numberField: ["input[type='number']", "#number", "input[name='number']"],
  checkboxField: ["input[type='checkbox']", "[role='checkbox']"],
  radioOption: ["input[type='radio']", "[role='radio']"],
  saveButton: ["button:has-text('Save')", "#save", "[data-testid='saveButton']"],
  cancelButton: ["button:has-text('Cancel')", "#cancel", "[data-testid='cancelButton']"],
  continueButton: ["button:has-text('Continue')", "button:has-text('Next')", "[data-testid='continueButton']"],
  backButton: ["button:has-text('Back')", "[data-testid='backButton']"],
  editButton: ["button:has-text('Edit')", "[data-testid='editButton']"],
  deleteButton: ["button:has-text('Delete')", "[data-testid='deleteButton']"],
  addButton: ["button:has-text('Add')", "[data-testid='addButton']"],
  uploadField: ["input[type='file']", "[data-testid='uploadField']"],
  menuToggle: ["button[aria-label='Menu']", ".hamburger", "[data-testid='menuToggle']"],
  pageContainer: ["main", "[role='main']", "[data-testid='pageContainer']"],
  formContainer: ["form", "[data-testid='formContainer']"],
  dashboardPage: ["main.dashboard", "[data-testid='dashboardPage']"],
  checkoutPage: ["main.checkout", "[data-testid='checkoutPage']"],
  modalDialog: ["[role='dialog']", ".modal", "[data-testid='modalDialog']"],
  successMessage: [".success", ".alert-success", "[data-testid='successMessage']"],
  errorMessage: [".error", ".alert-danger", "[data-testid='errorMessage']"],
  warningMessage: [".warning", ".alert-warning", "[data-testid='warningMessage']"],
  toastMessage: [".toast", "[role='alert']", "[data-testid='toastMessage']"],
  tableGrid: ["table", "[role='grid']", "[data-testid='tableGrid']"],
  paginationNext: [".pagination-next", "button[aria-label='Next']", "[data-testid='paginationNext']"],
  cartButton: ["button:has-text('Add to cart')", "[data-testid='cartButton']"],
  checkoutButton: ["button:has-text('Checkout')", "[data-testid='checkoutButton']"],
  paymentMethodDropdown: ["#payment-method", "select[name='paymentMethod']"],
  cardNumberField: ["#card-number", "input[name='cardNumber']"],
  expiryDateField: ["#expiry-date", "input[name='expiryDate']"],
  cvvField: ["#cvv", "input[name='cvv']"],
  patientNameField: ["#patient-name", "input[name='patientName']"],
  medicalRecordField: ["#mrn", "input[name='medicalRecordNumber']"],
  appointmentDateField: ["#appointment-date", "input[name='appointmentDate']", "input[type='date']"],
  transferDateField: ["#transfer-date", "input[name='transferDate']", "input[type='date']"],
  amountField: ["#amount", "input[name='amount']", "input[type='number']"],
  sourceAccountField: ["#source-account", "select[name='sourceAccount']"],
  targetAccountField: ["#target-account", "select[name='targetAccount']"],
  scheduleTransferButton: ["#schedule-transfer", "button:has-text('Schedule')", "button:has-text('Transfer')"],
  confirmationMessage: ["#confirmation", ".confirmation", "[data-testid='confirmationMessage']"],
  validationMessage: ["#validation-error", ".error", "[data-testid='validationMessage']"],
  pageTitle: ["h1", "title"],
  currentUrl: ["body"]
};

export function loadSelectorAliases(rootDir) {
  return loadJsonMap(rootDir, "selector-aliases.json");
}

export function loadRouteAliases(rootDir) {
  return loadJsonMap(rootDir, "route-aliases.json");
}

export function getSelectorFallbacks() {
  return DEFAULT_SELECTOR_FALLBACKS;
}

export function generateShortName(text = "") {
  const quoted = String(text).match(/"(.*?)"/)?.[1];
  if (quoted) {
    return camelize(quoted);
  }

  const doc = nlp(String(text)).not("should|be|is|are|the|and|a|to|i|for|have|has|with|of|in|on|user|system");
  const terms = [...doc.nouns().out("array"), ...doc.verbs().out("array")].slice(0, 4);
  const base = terms.join(" ") || text;
  return camelize(base);
}

function camelize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("") || "step";
}

function slugPath(value = "") {
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized ? `/${normalized}` : "/";
}

export function extractQuotedText(text = "") {
  const match = String(text).match(/"(.*?)"/);
  return match ? match[1] : "";
}

export function toClassName(value = "") {
  return String(value)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") || "GeneratedPage";
}

export function inferSelectorName(stepText = "") {
  const patterns = [
    { regex: /dashboard/i, name: "dashboardPage" },
    { regex: /checkout/i, name: "checkoutPage" },
    { regex: /form/i, name: "formContainer" },
    { regex: /page|screen|portal|homepage|home/i, name: "pageContainer" },
    { regex: /username|user name|email/i, name: "userNameField" },
    { regex: /\bemail\b/i, name: "emailField" },
    { regex: /password/i, name: "passwordField" },
    { regex: /phone|mobile number/i, name: "phoneField" },
    { regex: /otp/i, name: "otpField" },
    { regex: /address/i, name: "addressField" },
    { regex: /city/i, name: "cityField" },
    { regex: /state/i, name: "stateField" },
    { regex: /zip|postal code/i, name: "zipCodeField" },
    { regex: /country/i, name: "countryDropdown" },
    { regex: /search/i, name: "searchField" },
    { regex: /login/i, name: "loginButton" },
    { regex: /submit/i, name: "submitButton" },
    { regex: /\bsave\b/i, name: "saveButton" },
    { regex: /cancel/i, name: "cancelButton" },
    { regex: /continue|next/i, name: "continueButton" },
    { regex: /\bback\b/i, name: "backButton" },
    { regex: /\bedit\b/i, name: "editButton" },
    { regex: /delete|remove/i, name: "deleteButton" },
    { regex: /\badd\b/i, name: "addButton" },
    { regex: /upload/i, name: "uploadField" },
    { regex: /menu|hamburger/i, name: "menuToggle" },
    { regex: /dialog|modal|popup/i, name: "modalDialog" },
    { regex: /success/i, name: "successMessage" },
    { regex: /error/i, name: "errorMessage" },
    { regex: /warning/i, name: "warningMessage" },
    { regex: /toast|alert/i, name: "toastMessage" },
    { regex: /table|grid|results/i, name: "tableGrid" },
    { regex: /next page|pagination/i, name: "paginationNext" },
    { regex: /cart/i, name: "cartButton" },
    { regex: /checkout/i, name: "checkoutButton" },
    { regex: /payment method/i, name: "paymentMethodDropdown" },
    { regex: /card number/i, name: "cardNumberField" },
    { regex: /expiry date/i, name: "expiryDateField" },
    { regex: /\bcvv\b/i, name: "cvvField" },
    { regex: /patient name/i, name: "patientNameField" },
    { regex: /medical record|mrn/i, name: "medicalRecordField" },
    { regex: /appointment date/i, name: "appointmentDateField" },
    { regex: /\bdate\b/i, name: "dateField" },
    { regex: /\btime\b/i, name: "timeField" },
    { regex: /\bnumber\b/i, name: "numberField" },
    { regex: /checkbox|agree|terms/i, name: "checkboxField" },
    { regex: /radio/i, name: "radioOption" },
    { regex: /transfer date|scheduled date|future date|past date/i, name: "transferDateField" },
    { regex: /amount/i, name: "amountField" },
    { regex: /source account/i, name: "sourceAccountField" },
    { regex: /target account/i, name: "targetAccountField" },
    { regex: /confirmation/i, name: "confirmationMessage" },
    { regex: /validation message|error/i, name: "validationMessage" },
    { regex: /schedule.*transfer|transfer request/i, name: "scheduleTransferButton" },
    { regex: /title/i, name: "pageTitle" },
    { regex: /url/i, name: "currentUrl" }
  ];

  const matched = patterns.find((entry) => entry.regex.test(stepText));
  return matched ? matched.name : generateShortName(stepText);
}

export function inferActionAndSelectors(stepText = "", selectorAliases = {}, selectorFallbacks = {}, routeAliases = {}) {
  const normalized = stepText.toLowerCase();
  const selectorName = inferSelectorName(stepText);
  let action = "comment";
  let note = extractQuotedText(stepText);

  if (/\b(on|at)\b.+\b(page|screen|form|dashboard|portal|checkout|homepage|home)\b/.test(normalized)) {
    action = "navigate";
    note = derivePathFromStep(stepText, routeAliases);
  } else if (/enters?|types?|fills?|sets?|provides?|inputs?/.test(normalized)) {
    action = "setValue";
  } else if (/clicks?|presses?|submits?|taps?/.test(normalized)) {
    action = "click";
  } else if (/selects?|chooses?/.test(normalized)) {
    action = "selectOption";
  } else if (/checks?|ticks?/.test(normalized)) {
    action = "check";
  } else if (/unchecks?|unticks?/.test(normalized)) {
    action = "uncheck";
  } else if (/uploads?/.test(normalized)) {
    action = "uploadFile";
  } else if (/hovers?/.test(normalized)) {
    action = "hover";
  } else if (/scrolls?/.test(normalized)) {
    action = "scrollIntoView";
  } else if (/waits?/.test(normalized)) {
    action = "waitForVisible";
  } else if (/should see|sees|shows/.test(normalized)) {
    action = "assertVisible";
  } else if (/should contain|contains/.test(normalized)) {
    action = "assertText";
    note = note || stepText;
  } else if (/rejects?|validation/i.test(normalized)) {
    action = "assertVisible";
  } else if (/title should be/.test(normalized)) {
    action = "assertTitle";
  } else if (/url should contain/.test(normalized)) {
    action = "assertUrlContains";
  } else if (/open|navigate|go to/.test(normalized)) {
    action = "navigate";
    note = note || derivePathFromStep(stepText, routeAliases);
  }

  const primarySelector = selectorAliases[selectorName] || `[data-testid="${selectorName}"]`;
  const fallbackSelectors = selectorFallbacks[selectorName] || [];

  return {
    action,
    selectorName,
    selector: primarySelector,
    fallbackSelectors,
    note
  };
}

export function buildPlaywrightActionLine(target, action, note = "") {
  switch (action) {
    case "click":
      return `await ${target}.click();`;
    case "setValue":
      return `await ${target}.fill(${JSON.stringify(note || "TODO")});`;
    case "selectOption":
      return `await ${target}.selectOption({ label: ${JSON.stringify(note || "TODO")} });`;
    case "check":
      return `await ${target}.check();`;
    case "uncheck":
      return `await ${target}.uncheck();`;
    case "uploadFile":
      return `await ${target}.setInputFiles(${JSON.stringify(note || "TODO")});`;
    case "hover":
      return `await ${target}.hover();`;
    case "scrollIntoView":
      return `await ${target}.scrollIntoViewIfNeeded();`;
    case "waitForVisible":
      return `await ${target}.waitFor({ state: "visible" });`;
    case "assertVisible":
      return `await expect(${target}).toBeVisible();`;
    case "assertText":
      return `await expect(${target}).toContainText(${JSON.stringify(note || "TODO")});`;
    case "assertTitle":
      return `await expect(this.page).toHaveTitle(${JSON.stringify(note || "TODO")});`;
    case "assertUrlContains":
      return `await expect(this.page).toHaveURL(new RegExp(${JSON.stringify(note || "TODO")}));`;
    case "navigate":
      return `await this.page.goto(${JSON.stringify(note || "/")});`;
    default:
      return `// TODO: Review unsupported action for step: ${JSON.stringify(note || action)}`;
  }
}

export function buildWdioActionLine(target, action, note = "") {
  switch (action) {
    case "click":
      return `await ${target}.click();`;
    case "setValue":
      return `await ${target}.setValue(${JSON.stringify(note || "TODO")});`;
    case "selectOption":
      return `await ${target}.selectByVisibleText(${JSON.stringify(note || "TODO")});`;
    case "check":
      return `await ${target}.click();`;
    case "uncheck":
      return `await ${target}.click();`;
    case "uploadFile":
      return `await ${target}.setValue(${JSON.stringify(note || "TODO")});`;
    case "hover":
      return `await ${target}.moveTo();`;
    case "scrollIntoView":
      return `await ${target}.scrollIntoView();`;
    case "waitForVisible":
      return `await ${target}.waitForDisplayed();`;
    case "assertVisible":
      return `await expect(${target}).toBeDisplayed();`;
    case "assertText":
      return `await expect(${target}).toHaveText(expect.stringContaining(${JSON.stringify(note || "TODO")}));`;
    case "assertTitle":
      return `await expect(browser).toHaveTitle(${JSON.stringify(note || "TODO")});`;
    case "assertUrlContains":
      return `await expect(browser).toHaveUrl(expect.stringContaining(${JSON.stringify(note || "TODO")}));`;
    case "navigate":
      return `await browser.url(${JSON.stringify(note || "/")});`;
    default:
      return `// TODO: Review unsupported action for step: ${JSON.stringify(note || action)}`;
  }
}

function derivePathFromStep(stepText = "", routeAliases = {}) {
  const normalized = String(stepText).toLowerCase().trim();
  if (routeAliases[normalized]) {
    return routeAliases[normalized];
  }

  const stripped = String(stepText)
    .replace(/^(given|when|then|and|but)\s+/i, "")
    .replace(/\b(the user is on|the user is at|user is on|user is at|open|navigate to|go to)\b/gi, "")
    .replace(/\b(page|screen|portal|homepage|home)\b/gi, "")
    .trim()
    .toLowerCase();
  if (routeAliases[stripped]) {
    return routeAliases[stripped];
  }

  const doc = nlp(String(stepText)).not("the|a|an|user|is|on|at|to|page|screen|form");
  const nouns = doc.nouns().out("array");
  if (nouns.length) {
    const nounPath = slugPath(nouns.slice(0, 3).join(" "));
    if (routeAliases[nounPath]) {
      return routeAliases[nounPath];
    }
    return nounPath;
  }
  const fallbackPath = slugPath(stripped.replace(/\bform\b/gi, "").trim());
  return routeAliases[fallbackPath] || fallbackPath;
}

function loadJsonMap(rootDir, fileName) {
  const targetPath = path.join(rootDir, fileName);
  if (!fs.existsSync(targetPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(targetPath, "utf8"));
  } catch {
    return {};
  }
}
