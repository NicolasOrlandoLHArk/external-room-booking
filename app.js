const ROOM_LABELS = {
  modelokale_stor: "Mødelokale stor",
  modelokale_lille: "Mødelokale lille"
};

const ROOM_CALENDAR_URLS = {
  modelokale_stor: "https://nicolasorlandolhark.github.io/modelokale_stor_display/",
  modelokale_lille: "https://nicolasorlandolhark.github.io/modelokale_lille_display/"
};

const EVENTS_URL = "./events.json";
const FIELD_IDS = ["room", "date", "start", "end", "name", "company", "email", "comment"];

const state = {
  activeRoom: "modelokale_stor",
  allEvents: [],
  eventsLoaded: false
};

const form = document.getElementById("bookingForm");
const roomSelect = document.getElementById("room");
const roomSwitch = document.getElementById("roomSwitch");
const statusMessage = document.getElementById("statusMessage");
const submitButton = document.getElementById("submitButton");
const summaryBox = document.getElementById("summaryBox");
const summaryText = document.getElementById("summaryText");
const selectedRoomLabel = document.getElementById("selectedRoomLabel");
const calendarLoading = document.getElementById("calendarLoading");
const calendarError = document.getElementById("calendarError");
const calendarFrame = document.getElementById("calendarFrame");
const calendarLink = document.getElementById("calendarLink");
const dateInput = document.getElementById("date");
let frameLoadTimer = null;

function initializePage() {
  dateInput.min = getTodayLocalDateString();
  roomSelect.value = state.activeRoom;
  updateRoomUi(state.activeRoom);
  bindEvents();
  initializeEmbeddedCalendar();
  loadEvents();
}

function bindEvents() {
  roomSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("[data-room]");
    if (!button) {
      return;
    }

    setActiveRoom(button.dataset.room);
  });

  roomSelect.addEventListener("change", () => {
    setActiveRoom(roomSelect.value);
  });

  form.addEventListener("submit", handleSubmit);
}

function initializeEmbeddedCalendar() {
  if (!calendarFrame) {
    showCalendarError("Kalenderområdet kunne ikke initialiseres.");
    return;
  }

  calendarFrame.addEventListener("load", () => {
    clearTimeout(frameLoadTimer);
    calendarLoading.hidden = true;
    calendarError.hidden = true;
  });

  calendarFrame.addEventListener("error", () => {
    clearTimeout(frameLoadTimer);
    showCalendarError("Kalenderen kunne ikke indlæses i siden. Brug linket nedenfor for at åbne den i en ny fane.");
  });

  updateEmbeddedCalendar(state.activeRoom);
}

async function loadEvents() {
  try {
    const rawData = await fetchAvailabilityData(state.activeRoom);
    state.allEvents = normalizeEvents(rawData);
    state.eventsLoaded = true;
    calendarError.hidden = true;
  } catch (error) {
    state.allEvents = [];
    state.eventsLoaded = false;
    showCalendarError(error.message || "Kunne ikke indlæse bookings.");
  }
}

function buildAvailabilityUrl(room) {
  return EVENTS_URL;
}

async function fetchAvailabilityData(room) {
  const response = await fetch(buildAvailabilityUrl(room), {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("events.json kunne ikke indlæses. Tjek at filen findes i samme mappe som index.html.");
  }

  return response.json();
}

function normalizeEvents(source) {
  const events = Array.isArray(source)
    ? source
    : source && Array.isArray(source.events)
      ? source.events
      : null;

  if (!events) {
    throw new Error("events.json har ugyldigt format. Brug enten et array eller et objekt med en events-liste.");
  }

  return events
    .map((event, index) => normalizeEvent(event, index))
    .filter(Boolean);
}

function normalizeEvent(event, index) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const room = typeof event.room === "string" ? event.room.trim() : "";
  const start = typeof event.start === "string" ? event.start.trim() : "";
  const end = typeof event.end === "string" ? event.end.trim() : "";

  if (!ROOM_LABELS[room] || !start || !end) {
    return null;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return null;
  }

  return {
    id: String(event.id || `${room}-${index + 1}`),
    room,
    title: typeof event.title === "string" && event.title.trim() ? event.title.trim() : "Booked",
    start,
    end
  };
}

function getEventsForRoom(room) {
  return state.allEvents.filter((event) => event.room === room);
}

function setActiveRoom(room) {
  if (!ROOM_LABELS[room]) {
    return;
  }

  state.activeRoom = room;
  roomSelect.value = room;
  updateRoomUi(room);
  updateEmbeddedCalendar(room);
}

function updateRoomUi(room) {
  selectedRoomLabel.textContent = ROOM_LABELS[room];

  Array.from(roomSwitch.querySelectorAll("[data-room]")).forEach((button) => {
    const isActive = button.dataset.room === room;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function updateEmbeddedCalendar(room) {
  const calendarUrl = ROOM_CALENDAR_URLS[room];

  if (!calendarUrl) {
    showCalendarError("Der findes ingen kalender-URL for det valgte lokale.");
    return;
  }

  clearTimeout(frameLoadTimer);
  calendarLoading.hidden = false;
  calendarError.hidden = true;
  calendarLink.href = calendarUrl;
  calendarFrame.src = calendarUrl;

  frameLoadTimer = window.setTimeout(() => {
    if (!calendarLoading.hidden) {
      showCalendarError("Kalenderen bruger for lang tid på at indlæse. Du kan stadig åbne den i en ny fane.");
    }
  }, 8000);
}

function handleSubmit(event) {
  event.preventDefault();
  clearErrors();
  setStatus("");
  summaryBox.hidden = true;

  if (!state.eventsLoaded) {
    setStatus("Ledighedsdata er ikke tilgængelige lige nu. Prøv igen, når kalenderdata er indlæst.", "error");
    return;
  }

  const payload = buildPayload();
  const validation = validatePayload(payload);

  if (!validation.valid) {
    setStatus("Ret venligst felterne med fejl, før du sender forespørgslen.", "error");
    return;
  }

  const overlapEvent = findOverlap(payload);

  if (overlapEvent) {
    setError("start", "Det valgte tidsrum overlapper med en eksisterende booking.");
    setError("end", "Vælg et andet tidsrum eller et andet lokale.");
    setStatus("Det valgte tidsrum er allerede booket.", "error");
    return;
  }

  const submissionPayload = buildSubmissionPayload(payload);

  submitButton.disabled = true;
  renderSummary(submissionPayload);
  setStatus("Forespørgslen ser god ud. Dette er en demo, så der er ikke oprettet en rigtig booking endnu.", "success");
  submitButton.disabled = false;
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
    comment: getValue("comment")
  };
}

function validatePayload(payload) {
  let valid = true;

  if (!ROOM_LABELS[payload.room]) {
    setError("room", "Vælg et lokale.");
    valid = false;
  }

  if (!payload.date) {
    setError("date", "Vælg en dato.");
    valid = false;
  } else if (payload.date < getTodayLocalDateString()) {
    setError("date", "Datoen må ikke ligge i fortiden.");
    valid = false;
  }

  if (!payload.start) {
    setError("start", "Vælg et starttidspunkt.");
    valid = false;
  }

  if (!payload.end) {
    setError("end", "Vælg et sluttidspunkt.");
    valid = false;
  }

  if (payload.date && payload.start && payload.end) {
    const startDate = combineDateAndTime(payload.date, payload.start);
    const endDate = combineDateAndTime(payload.date, payload.end);

    if (!startDate || !endDate) {
      setError("start", "Ugyldig dato eller tid.");
      valid = false;
    } else if (endDate <= startDate) {
      setError("end", "Sluttid skal være senere end starttid.");
      valid = false;
    }
  }

  if (!payload.name) {
    setError("name", "Indtast navn.");
    valid = false;
  }

  if (!payload.email) {
    setError("email", "Indtast email.");
    valid = false;
  } else if (!isValidEmail(payload.email)) {
    setError("email", "Indtast en gyldig emailadresse.");
    valid = false;
  }

  if (payload.company.length > 100) {
    setError("company", "Firmanavn må maks. være 100 tegn.");
    valid = false;
  }

  if (payload.comment.length > 500) {
    setError("comment", "Kommentaren må maks. være 500 tegn.");
    valid = false;
  }

  return { valid };
}

function findOverlap(payload) {
  const requestedStart = combineDateAndTime(payload.date, payload.start);
  const requestedEnd = combineDateAndTime(payload.date, payload.end);

  if (!requestedStart || !requestedEnd) {
    return null;
  }

  return getEventsForRoom(payload.room).find((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) {
      return false;
    }

    return requestedStart < eventEnd && requestedEnd > eventStart;
  }) || null;
}

function buildSubmissionPayload(payload) {
  const startIso = `${payload.date}T${payload.start}:00`;
  const endIso = `${payload.date}T${payload.end}:00`;

  return {
    room: payload.room,
    roomLabel: ROOM_LABELS[payload.room],
    date: payload.date,
    startTime: payload.start,
    endTime: payload.end,
    start: startIso,
    end: endIso,
    name: payload.name,
    company: payload.company,
    email: payload.email,
    comment: payload.comment,
    requestedAt: new Date().toISOString()
  };
}

function renderSummary(payload) {
  summaryText.textContent = JSON.stringify(payload, null, 2);
  summaryBox.hidden = false;
}

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
  FIELD_IDS.forEach((id) => {
    setError(id, "");
  });
}

function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = "status-message";

  if (type) {
    statusMessage.classList.add(`is-${type}`);
  }
}

function showCalendarError(message) {
  calendarError.textContent = message;
  calendarError.hidden = false;
  calendarLoading.hidden = true;
}

function getTodayLocalDateString() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function combineDateAndTime(dateString, timeString) {
  const value = new Date(`${dateString}T${timeString}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

document.addEventListener("DOMContentLoaded", initializePage);
