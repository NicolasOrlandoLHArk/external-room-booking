const form = document.getElementById("bookingForm");
const statusMessage = document.getElementById("statusMessage");
const summaryBox = document.getElementById("summaryBox");
const summaryText = document.getElementById("summaryText");
const submitButton = document.getElementById("submitButton");

const fieldIds = ["room", "date", "start", "end", "name", "company", "email", "note"];

function getValue(id) {
  return document.getElementById(id).value.trim();
}

function setError(id, message) {
  const errorElement = document.getElementById(`${id}Error`);
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearErrors() {
  for (const id of fieldIds) {
    setError(id, "");
  }
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status";
  if (type) {
    statusMessage.classList.add(type);
  }
}

function getTodayLocalDateString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function combineDateAndTime(dateString, timeString) {
  return new Date(`${dateString}T${timeString}`);
}

function durationInMinutes(startDate, endDate) {
  return Math.round((endDate - startDate) / 60000);
}

function validateForm(data) {
  let valid = true;

  clearErrors();

  if (!data.room) {
    setError("room", "Please select a room.");
    valid = false;
  }

  if (!data.date) {
    setError("date", "Please choose a date.");
    valid = false;
  } else if (data.date < getTodayLocalDateString()) {
    setError("date", "Date cannot be in the past.");
    valid = false;
  }

  if (!data.start) {
    setError("start", "Please choose a start time.");
    valid = false;
  }

  if (!data.end) {
    setError("end", "Please choose an end time.");
    valid = false;
  }

  if (data.date && data.start && data.end) {
    const startDate = combineDateAndTime(data.date, data.start);
    const endDate = combineDateAndTime(data.date, data.end);

    if (endDate <= startDate) {
      setError("end", "End time must be later than start time.");
      valid = false;
    } else {
      const minutes = durationInMinutes(startDate, endDate);

      if (minutes < 15) {
        setError("end", "Minimum duration is 15 minutes.");
        valid = false;
      }

      if (minutes > 8 * 60) {
        setError("end", "Maximum duration is 8 hours.");
        valid = false;
      }
    }
  }

  if (!data.name) {
    setError("name", "Please enter your name.");
    valid = false;
  }

  if (!data.email) {
    setError("email", "Please enter your email.");
    valid = false;
  } else if (!isValidEmail(data.email)) {
    setError("email", "Please enter a valid email address.");
    valid = false;
  }

  if (data.note.length > 500) {
    setError("note", "Comment is too long.");
    valid = false;
  }

  return valid;
}

function buildPayload() {
  return {
    room: getValue("room"),
    date: getValue("date"),
    start: getValue("start"),
    end: getValue("end"),
    name: getValue("name"),
    company: getValue("company"),
    email: getValue("email"),
    note: getValue("note")
  };
}

function renderSummary(payload) {
  summaryText.textContent = JSON.stringify(payload, null, 2);
  summaryBox.hidden = false;
}

async function fakeSubmit(payload) {
  // Phase 1 stub only.
  // Later, replace this with a real fetch() call to your Cloudflare Worker.
  console.log("Booking request payload:", payload);

  await new Promise((resolve) => setTimeout(resolve, 700));

  return {
    ok: true,
    message: "Request captured successfully. No real booking has been created yet."
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");
  summaryBox.hidden = true;

  const payload = buildPayload();
  const isValid = validateForm(payload);

  if (!isValid) {
    setStatus("Please correct the highlighted fields.", "error");
    return;
  }

  submitButton.disabled = true;
  setStatus("Submitting request...");

  try {
    renderSummary(payload);

    const response = await fakeSubmit(payload);

    if (!response.ok) {
      throw new Error(response.message || "Unknown error.");
    }

    setStatus(response.message, "success");
    form.reset();
  } catch (error) {
    setStatus(`Submission failed: ${error.message}`, "error");
  } finally {
    submitButton.disabled = false;
  }
});

document.getElementById("date").min = getTodayLocalDateString();