const STORAGE_KEY = "journal_entries";
const DEFAULT_JSON = "journal-data.json";

async function loadEntries() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    return JSON.parse(stored);
  } else {
    try {
      const response = await fetch(DEFAULT_JSON);
      if (!response.ok) throw new Error("Default JSON not found");
      const data = await response.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch (error) {
      console.log("No default data found, starting with empty journal");
      return [];
    }
  }
}

function saveToStorage(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function updateEntryCount(entries) {
  const countElement = document.getElementById("entryCount");
  const entryCount = entries.length;
  countElement.textContent = `${entryCount} ${
    entryCount === 1 ? "entry" : "entries"
  }`;
}

async function saveEntry() {
  const titleInput = document.getElementById("title");
  const contentInput = document.getElementById("content");

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title || !content) {
    showNotification("Please fill in both title and content", "error");
    return;
  }

  const newEntry = {
    id: Date.now(),
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    title,
    content,
  };

  const entries = await loadEntries();
  entries.unshift(newEntry);
  saveToStorage(entries);

  // Clear form
  clearForm();

  // Show success message
  showNotification("Entry saved successfully!", "success");

  // Render entries
  renderEntries(entries);
}

function clearForm() {
  document.getElementById("title").value = "";
  document.getElementById("content").value = "";
  document.getElementById("title").focus();
}

async function renderEntries(entries = null) {
  if (!entries) {
    entries = await loadEntries();
  }

  const container = document.getElementById("entries");
  updateEntryCount(entries);

  if (entries.length === 0) {
    container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-book"></i>
                        <h3>Your journal is empty</h3>
                        <p>Write your first entry above to get started!</p>
                    </div>
                `;
    return;
  }

  container.innerHTML = entries
    .map(
      (entry) => `
                <div class="entry" data-id="${entry.id}">
                    <div class="entry-header">
                        <h3 class="entry-title">${escapeHtml(entry.title)}</h3>
                        <div class="entry-date"><i class="far fa-calendar"></i> ${
                          entry.date
                        }</div>
                    </div>
                    <div class="entry-content">${escapeHtml(
                      entry.content
                    ).replace(/\n/g, "<br>")}</div>
                    <div class="entry-actions" style="margin-top: 15px; display: flex; justify-content: flex-end;">
                        <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.9rem;" onclick="deleteEntry(${
                          entry.id
                        })">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `
    )
    .join("");
}

function deleteEntry(id) {
  if (confirm("Are you sure you want to delete this entry?")) {
    loadEntries().then((entries) => {
      const filteredEntries = entries.filter((entry) => entry.id !== id);
      saveToStorage(filteredEntries);
      renderEntries(filteredEntries);
      showNotification("Entry deleted", "info");
    });
  }
}

function clearAllEntries() {
  if (
    confirm(
      "Are you sure you want to delete ALL entries? This cannot be undone."
    )
  ) {
    localStorage.removeItem(STORAGE_KEY);
    renderEntries([]);
    showNotification("All entries cleared", "info");
  }
}

function exportToJSON() {
  const entries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  if (entries.length === 0) {
    showNotification("No entries to export!", "error");
    return;
  }

  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: "application/json",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `my-journal-${new Date().toISOString().split("T")[0]}.json`;
  link.click();

  showNotification("Journal exported successfully!", "success");
}

function importFromJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Reset file input
  event.target.value = "";

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!Array.isArray(data)) {
        throw new Error("Invalid format: Expected an array of entries");
      }

      // Validate entries have required fields
      const isValid = data.every(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          entry.title &&
          entry.content &&
          entry.date
      );

      if (!isValid) {
        throw new Error("Invalid format: Entries missing required fields");
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      renderEntries(data);
      showNotification("Journal imported successfully!", "success");
    } catch (error) {
      showNotification("Invalid JSON file format", "error");
      console.error("Import error:", error);
    }
  };
  reader.readAsText(file);
}

function showNotification(message, type = "info") {
  // Remove existing notification
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();

  // Create notification
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
                <i class="fas fa-${
                  type === "success"
                    ? "check-circle"
                    : type === "error"
                    ? "exclamation-circle"
                    : "info-circle"
                }"></i>
                <span>${message}</span>
            `;

  // Style the notification
  notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${
                  type === "success"
                    ? "var(--success-color)"
                    : type === "error"
                    ? "var(--danger-color)"
                    : "var(--primary-color)"
                };
                color: white;
                padding: 15px 20px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                z-index: 1000;
                animation: fadeIn 0.3s ease-out;
                max-width: 400px;
            `;

  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100px)";
    notification.style.transition = "all 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  renderEntries();

  // Add keyboard shortcut: Ctrl+Enter to save
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      saveEntry();
    }
  });

  // Focus title input on load
  document.getElementById("title").focus();
});
