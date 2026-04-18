/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchInput");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");
const clearSelectionsButton = document.getElementById("clearSelections");
const directionToggle = document.getElementById("directionToggle");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

const savedSelectionsKey = "loreal-selected-products";
const savedDirectionKey = "loreal-page-direction";
const apiKey = typeof API_KEY !== "undefined" ? API_KEY : "";
const advisorSystemPrompt =
  "You are a beginner-friendly beauty advisor. Only answer questions about the user's generated routine or beauty-related topics such as skincare, haircare, makeup, fragrance, suncare, and grooming. If a question is unrelated, politely say that you can only help with beauty and routine topics. Use the conversation history to give relevant follow-up answers.";

let allProducts = [];
let selectedProducts = [];
let visibleProducts = [];
let expandedDescriptions = [];
let conversationHistory = [];
let routineGenerated = false;

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Save or apply the page direction for RTL languages */
function applyDirection(direction) {
  document.documentElement.setAttribute("dir", direction);
  directionToggle.textContent =
    direction === "rtl" ? "Switch to LTR" : "Switch to RTL";
}

/* Save the selected product IDs in localStorage */
function saveSelectedProducts() {
  const selectedProductIds = selectedProducts.map((product) => product.id);

  if (selectedProductIds.length === 0) {
    localStorage.removeItem(savedSelectionsKey);
    return;
  }

  localStorage.setItem(savedSelectionsKey, JSON.stringify(selectedProductIds));
}

/* Restore saved selections after a page reload */
function loadSavedSelectedProducts() {
  const savedSelections = localStorage.getItem(savedSelectionsKey);

  if (!savedSelections) {
    return [];
  }

  try {
    const savedProductIds = JSON.parse(savedSelections);

    return allProducts.filter((product) =>
      savedProductIds.includes(product.id),
    );
  } catch (error) {
    console.error("Could not load saved selections.", error);
    return [];
  }
}

/* Show the products the user has selected */
function renderSelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="empty-selected-message">No products selected yet.</p>
    `;
    generateRoutineButton.disabled = true;
    clearSelectionsButton.disabled = true;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-item">
          <span>${product.name}</span>
          <button
            class="remove-selected-btn"
            data-id="${product.id}"
            aria-label="Remove ${product.name}"
          >
            ×
          </button>
        </div>
      `,
    )
    .join("");

  generateRoutineButton.disabled = false;
  clearSelectionsButton.disabled = false;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  visibleProducts = products;

  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found in this category
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some(
        (selectedProduct) => selectedProduct.id === product.id,
      );
      const isDescriptionOpen = expandedDescriptions.includes(product.id);

      return `
        <div class="product-card ${isSelected ? "selected" : ""}" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
            ${isSelected ? '<span class="selected-badge">Selected</span>' : ""}
            <button
              type="button"
              class="details-toggle-btn"
              data-id="${product.id}"
              aria-expanded="${isDescriptionOpen}"
              aria-controls="description-${product.id}"
            >
              ${isDescriptionOpen ? "Hide details" : "Show details"}
            </button>
            <div
              id="description-${product.id}"
              class="product-description ${isDescriptionOpen ? "visible" : ""}"
              ${isDescriptionOpen ? "" : "hidden"}
            >
              <p>${product.description}</p>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

/* Show or hide the product description */
function toggleProductDescription(productId) {
  const descriptionIsOpen = expandedDescriptions.includes(productId);

  if (descriptionIsOpen) {
    expandedDescriptions = expandedDescriptions.filter(
      (id) => id !== productId,
    );
  } else {
    expandedDescriptions.push(productId);
  }

  displayProducts(visibleProducts);
}

/* Add or remove a product when a user clicks it */
function toggleProductSelection(productId) {
  const alreadySelected = selectedProducts.some(
    (product) => product.id === productId,
  );

  if (alreadySelected) {
    selectedProducts = selectedProducts.filter(
      (product) => product.id !== productId,
    );
  } else {
    const productToAdd = allProducts.find(
      (product) => product.id === productId,
    );

    if (productToAdd) {
      selectedProducts.push(productToAdd);
    }
  }

  saveSelectedProducts();
  displayProducts(visibleProducts);
  renderSelectedProducts();
  conversationHistory = [];
  routineGenerated = false;
}

/* Load all products once when the page starts */
async function initializeApp() {
  const savedDirection = localStorage.getItem(savedDirectionKey) || "ltr";

  applyDirection(savedDirection);
  allProducts = await loadProducts();
  selectedProducts = loadSavedSelectedProducts();
  renderSelectedProducts();
}

initializeApp();

directionToggle.addEventListener("click", () => {
  const currentDirection = document.documentElement.getAttribute("dir");
  const newDirection = currentDirection === "rtl" ? "ltr" : "rtl";

  localStorage.setItem(savedDirectionKey, newDirection);
  applyDirection(newDirection);
});

/* Apply both the category filter and the search keyword */
function filterProducts() {
  const selectedCategory = categoryFilter.value;
  const searchTerm = searchInput.value.trim().toLowerCase();

  const filteredProducts = allProducts.filter((product) => {
    const matchesCategory =
      !selectedCategory || product.category === selectedCategory;
    const matchesSearch =
      !searchTerm ||
      product.name.toLowerCase().includes(searchTerm) ||
      product.brand.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm);

    return matchesCategory && matchesSearch;
  });

  displayProducts(filteredProducts);
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", () => {
  filterProducts();
});

/* Filter products live as the user types */
searchInput.addEventListener("input", () => {
  filterProducts();
});

/* Let users open details or select products from the grid */
productsContainer.addEventListener("click", (e) => {
  const detailsButton = e.target.closest(".details-toggle-btn");

  if (detailsButton) {
    const productId = Number(detailsButton.dataset.id);
    toggleProductDescription(productId);
    return;
  }

  const clickedCard = e.target.closest(".product-card");

  if (!clickedCard) {
    return;
  }

  const productId = Number(clickedCard.dataset.id);
  toggleProductSelection(productId);
});

/* Let users remove products directly from the selected list */
selectedProductsList.addEventListener("click", (e) => {
  if (!e.target.classList.contains("remove-selected-btn")) {
    return;
  }

  const productId = Number(e.target.dataset.id);
  toggleProductSelection(productId);
});

/* Let users clear all saved selections at once */
clearSelectionsButton.addEventListener("click", () => {
  selectedProducts = [];
  saveSelectedProducts();
  displayProducts(visibleProducts);
  renderSelectedProducts();
  conversationHistory = [];
  routineGenerated = false;
});

/* Add a message to the chat window */
function addMessage(sender, text) {
  const message = document.createElement("div");
  const label = document.createElement("strong");
  const content = document.createElement("span");

  message.className = `chat-message ${sender}`;
  label.textContent = sender === "user" ? "You: " : "Advisor: ";
  content.textContent = text;

  message.appendChild(label);
  message.appendChild(content);
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Keep only the product fields needed for the routine prompt */
function getSelectedProductsData() {
  return selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));
}

/* Check whether the message is about beauty or the current routine */
function isBeautyTopic(message) {
  const beautyKeywords = [
    "routine",
    "skin",
    "skincare",
    "cleanser",
    "serum",
    "moisturizer",
    "spf",
    "sunscreen",
    "hair",
    "haircare",
    "shampoo",
    "conditioner",
    "makeup",
    "foundation",
    "mascara",
    "lip",
    "fragrance",
    "perfume",
    "grooming",
    "beauty",
    "product",
  ];

  const lowercaseMessage = message.toLowerCase();
  return beautyKeywords.some((keyword) => lowercaseMessage.includes(keyword));
}

/* Ask the OpenAI API for routine advice */
async function getOpenAIResponse(userMessage, selectedProductData) {
  const messages = [
    {
      role: "system",
      content: advisorSystemPrompt,
    },
  ];

  if (selectedProductData.length > 0) {
    messages.push({
      role: "system",
      content: `Selected products JSON:\n${JSON.stringify(selectedProductData, null, 2)}`,
    });
  }

  messages.push(...conversationHistory);
  messages.push({
    role: "user",
    content: userMessage,
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/* Send a message to the API and display the reply */
async function handleUserMessage(userMessage, selectedProductData = []) {
  if (!apiKey) {
    addMessage(
      "assistant",
      "Add your API key in secrets.js first so the app can contact OpenAI.",
    );
    return;
  }

  if (!routineGenerated && !isBeautyTopic(userMessage)) {
    addMessage("user", userMessage);
    addMessage(
      "assistant",
      "I can help with your beauty routine and related topics like skincare, haircare, makeup, fragrance, and grooming.",
    );
    return;
  }

  addMessage("user", userMessage);
  addMessage("assistant", "Thinking...");

  try {
    const reply = await getOpenAIResponse(userMessage, selectedProductData);
    chatWindow.lastElementChild.remove();

    conversationHistory.push({
      role: "user",
      content: userMessage,
    });
    conversationHistory.push({
      role: "assistant",
      content: reply,
    });

    addMessage("assistant", reply);
  } catch (error) {
    chatWindow.lastElementChild.remove();
    addMessage(
      "assistant",
      "The API could not connect. Check that your key is valid and that you opened the project with Live Server or another local server.",
    );
    console.error(error);
  }
}

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();

  if (!message) {
    return;
  }

  userInput.value = "";
  await handleUserMessage(message, getSelectedProductsData());
});

/* Generate a routine from the selected products */
generateRoutineButton.addEventListener("click", async () => {
  const selectedProductData = getSelectedProductsData();

  if (selectedProductData.length === 0) {
    addMessage("assistant", "Please select at least one product first.");
    return;
  }

  conversationHistory = [];
  routineGenerated = true;

  await handleUserMessage(
    "Create a simple morning and evening routine using only these selected products. Explain what each product does and the best order to use them.",
    selectedProductData,
  );
});
