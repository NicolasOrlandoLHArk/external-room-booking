const ROOM_LABELS = {
  modelokale_stor: "Mødelokale stor",
  modelokale_lille: "Mødelokale lille"
};

const ROOM_ICS_URLS = {
  modelokale_stor: "https://modelokalestor.no-022.workers.dev",
  modelokale_lille: "https://modelokalelille.no-022.workers.dev"
};

const BOOKING_RECIPIENT = "booking@example.com";
const BOOKING_SUBJECT_PREFIX = "Booking request";
const EVENTS_URL = "./events.json";
const FIELD_IDS = ["room", "date", "start", "end", "name", "company", "email", "comment"];

const state = {
  activeRoom: "modelokale_stor",
  fallbackEvents: [],
  fallbackLoaded: false,
  liveEventsLoaded: false,
  usingFallbackCalendar: false,
  lastCalendarErrorMessage: "",
  calendar: null,
  lastSubmissionPayload: null
};

const form = document.getElementById("bookingForm");
const roomSelect = document.getElementById("room");
const roomSwitch = document.getElementById("roomSwitch");
const statusMessage = document.getElementById("statusMessage");
const submitButton = document.getElementById("submitButton");
const summaryBox = document.getElementById("summaryBox");
const summaryText = document.getElementById("summaryText");
const handoffNote = document.getElementById("handoffNote");
const emailDraftLink = document.getElementById("emailDraftLink");
const copyDetailsButton = document.getElementById("copyDetailsButton");
const copyPayloadButton = document.getElementById("copyPayloadButton");
const selectionHint = document.getElementById("selectionHint");
const selectionHintText = document.getElementById("selectionHintText");
const clearSelectionButton = document.getElementById("clearSelectionButton");
const selectedRoomLabel = document.getElementById("selectedRoomLabel");
const calendarLoading = document.getElementById("calendarLoading");
const calendarError = document.getElementById("calendarError");
const dateInput = document.getElementById("date");

function initializePage() {
  dateInput.min = getTodayLocalDateString();
  roomSelect.value = state.activeRoom;
  updateRoomUi(state.activeRoom);
  bindEvents();
  initializeCalendar();
  loadFallbackEvents();
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

  copyDetailsButton.addEventListener("click", handleCopyDetails);
  copyPayloadButton.addEventListener("click", handleCopyPayload);
  clearSelectionButton.addEventListener("click", clearSelectedTime);
  form.addEventListener("submit", handleSubmit);
}

function initializeCalendar() {
  if (!window.FullCalendar) {
    showCalendarError("Kalenderbiblioteket kunne ikke indlæses.");
    return;
  }

  const calendarElement = document.getElementById("calendar");

  state.calendar = new FullCalendar.Calendar(calendarElement, {
    locale: "da",
    initialView: window.innerWidth < 760 ? "listWeek" : "timeGridWeek",
    firstDay: 1,
    height: "auto",
    nowIndicator: true,
    allDaySlot: false,
    slotMinTime: "07:00:00",
    slotMaxTime: "19:00:00",
    slotDuration: "00:30:00",
    expandRows: true,
    displayEventEnd: true,
    eventTimeFormat: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    },
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "timeGridWeek,dayGridMonth,listWeek"
    },
    buttonText: {
      today: "I dag",
      week: "Uge",
      month: "Måned",
      list: "Liste"
    },
    noEventsContent: "Ingen bookinger i den viste periode.",
    selectable: true,
    selectMirror: true,
    selectOverlap: false,
    selectAllow(info) {
      return !isBeforeToday(info.start);
    },
    eventContent(arg) {
      const container = document.createElement("div");
      container.textContent = arg.timeText
        ? `${arg.timeText} • ${arg.event.title}`
        : arg.event.title;
      return { domNodes: [container] };
    },
    dateClick(info) {
      if (isBeforeToday(info.date)) {
        setStatus("Du kan kun vælge tidsrum fra i dag og frem.", "error");
        return;
      }

      if (info.allDay) {
        applyCalendarSelection({
          start: `${info.dateStr}T09:00:00`,
          end: `${info.dateStr}T10:00:00`,
          allDay: false
        });
        return;
      }

      const start = new Date(info.date);
      const end = new Date(start.getTime() + 60 * 60000);
      applyCalendarSelection({
        start,
        end,
        allDay: false
      });
    },
    select(info) {
      applyCalendarSelection(info);
    },
    loading(isLoading) {
      calendarLoading.hidden = !isLoading;

      if (!isLoading && !state.usingFallbackCalendar) {
        state.liveEventsLoaded = true;
        calendarError.hidden = true;
      }
    },
    eventSourceFailure() {
      state.liveEventsLoaded = false;
      activateFallbackCalendar(
        state.activeRoom,
        "Live kalenderfeed kunne ikke indlæses. Viser fallback-bookinger fra events.json."
      );
    }
  });

  state.calendar.render();
  updateCalendarSource(state.activeRoom);
}

async function loadFallbackEvents() {
  try {
    const rawData = await fetchAvailabilityData(state.activeRoom);
    state.fallbackEvents = normalizeEvents(rawData);
    state.fallbackLoaded = true;

    if (state.usingFallbackCalendar) {
      activateFallbackCalendar(state.activeRoom, state.lastCalendarErrorMessage || "Viser fallback-bookinger fra events.json.");
    }
  } catch (error) {
    state.fallbackEvents = [];
    state.fallbackLoaded = false;

    if (!state.liveEventsLoaded) {
      showCalendarError(error.message || "Kunne ikke indlæse bookings.");
    }
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

function buildIcsEventSource(room) {
  return {
    id: `ics-${room}`,
    url: ROOM_ICS_URLS[room],
    format: "ics"
  };
}

function updateCalendarSource(room) {
  if (!state.calendar) {
    return;
  }

  removeAllEventSources();

  const icsUrl = ROOM_ICS_URLS[room];

  if (!icsUrl) {
    activateFallbackCalendar(room, "Der findes ingen live kalenderfeed for det valgte lokale.");
    return;
  }

  state.liveEventsLoaded = false;
  state.usingFallbackCalendar = false;
  calendarLoading.hidden = false;
  calendarError.hidden = true;
  state.calendar.addEventSource(buildIcsEventSource(room));
}

function removeAllEventSources() {
  if (!state.calendar) {
    return;
  }

  state.calendar.getEventSources().forEach((source) => {
    source.remove();
  });
}

function getFallbackEventsForRoom(room) {
  return state.fallbackEvents.filter((event) => event.room === room);
}

function setActiveRoom(room) {
  if (!ROOM_LABELS[room]) {
    return;
  }

  state.activeRoom = room;
  roomSelect.value = room;
  updateRoomUi(room);
  clearSelectedTime();
  updateCalendarSource(room);
}

function updateRoomUi(room) {
  selectedRoomLabel.textContent = ROOM_LABELS[room];

  Array.from(roomSwitch.querySelectorAll("[data-room]")).forEach((button) => {
    const isActive = button.dataset.room === room;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function activateFallbackCalendar(room, message) {
  state.usingFallbackCalendar = true;
  state.lastCalendarErrorMessage = message;
  calendarLoading.hidden = true;

  if (!state.calendar) {
    showCalendarError(message);
    return;
  }

  removeAllEventSources();
  state.calendar.removeAllEvents();

  if (state.fallbackLoaded) {
    getFallbackEventsForRoom(room).forEach((event) => {
      state.calendar.addEvent({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end
      });
    });
  }

  showCalendarError(message);
}

function handleSubmit(event) {
  event.preventDefault();
  clearErrors();
  setStatus("");
  summaryBox.hidden = true;
  state.lastSubmissionPayload = null;

  const payload = buildPayload();
  const validation = validatePayload(payload);

  if (!validation.valid) {
    setStatus("Ret venligst felterne med fejl, før du sender forespørgslen.", "error");
    return;
  }

  if (!hasAvailabilityData(payload.room)) {
    setStatus("Der er ingen tilgængelige kalenderdata at validere imod lige nu. Prøv igen om et øjeblik.", "error");
    return;
  }

  const availabilityEvents = getAvailabilityEvents(payload.room);

  const overlapEvent = findOverlap(payload, availabilityEvents);

  if (overlapEvent) {
    setError("start", "Det valgte tidsrum overlapper med en eksisterende booking.");
    setError("end", "Vælg et andet tidsrum eller et andet lokale.");
    setStatus("Det valgte tidsrum er allerede booket.", "error");
    return;
  }

  const submissionPayload = buildSubmissionPayload(payload);

  submitButton.disabled = true;
  state.lastSubmissionPayload = submissionPayload;
  renderSummary(submissionPayload);
  configureHandoff(submissionPayload);
  setStatus("Forespørgslen er klar. Åbn emailudkastet eller kopiér detaljerne nedenfor for at sende bookingønsket videre.", "success");
  submitButton.disabled = false;
}

function hasAvailabilityData(room) {
  if (room === state.activeRoom && state.liveEventsLoaded && !state.usingFallbackCalendar) {
    return true;
  }

  return state.fallbackLoaded;
}

function getAvailabilityEvents(room) {
  if (room === state.activeRoom && state.calendar && state.liveEventsLoaded && !state.usingFallbackCalendar) {
    return state.calendar.getEvents().map((event) => ({
      start: event.start,
      end: event.end || event.start
    }));
  }

  if (state.fallbackLoaded) {
    return getFallbackEventsForRoom(room);
  }

  return [];
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

function findOverlap(payload, events) {
  const requestedStart = combineDateAndTime(payload.date, payload.start);
  const requestedEnd = combineDateAndTime(payload.date, payload.end);

  if (!requestedStart || !requestedEnd) {
    return null;
  }

  return events.find((event) => {
    const eventStart = event.start instanceof Date ? event.start : new Date(event.start);
    const eventEnd = event.end instanceof Date ? event.end : new Date(event.end);

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

function applyCalendarSelection(selectionInfo) {
  const normalizedSelection = normalizeSelection(selectionInfo);

  if (!normalizedSelection) {
    return;
  }

  document.getElementById("date").value = normalizedSelection.date;
  document.getElementById("start").value = normalizedSelection.startTime;
  document.getElementById("end").value = normalizedSelection.endTime;
  roomSelect.value = state.activeRoom;
  updateSelectionHint(normalizedSelection);
  setStatus("Tidsrummet er overført til formularen.", "success");
  document.getElementById("date").focus();
}

function normalizeSelection(selectionInfo) {
  const startDate = selectionInfo.start instanceof Date ? selectionInfo.start : new Date(selectionInfo.start);
  let endDate = selectionInfo.end instanceof Date ? selectionInfo.end : new Date(selectionInfo.end);

  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  if (selectionInfo.allDay) {
    endDate = new Date(startDate.getTime() + 60 * 60000);
  }

  if (Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    endDate = new Date(startDate.getTime() + 60 * 60000);
  }

  const maxEndDate = new Date(startDate);
  maxEndDate.setHours(18, 0, 0, 0);

  if (endDate > maxEndDate) {
    endDate = maxEndDate;
  }

  if (endDate <= startDate) {
    endDate = new Date(startDate.getTime() + 30 * 60000);
  }

  return {
    date: formatDateForInput(startDate),
    startTime: formatTimeForInput(startDate),
    endTime: formatTimeForInput(endDate),
    label: `${formatDateForDisplay(startDate)} kl. ${formatTimeForInput(startDate)}-${formatTimeForInput(endDate)}`
  };
}

function updateSelectionHint(selection) {
  selectionHint.hidden = false;
  clearSelectionButton.hidden = false;
  selectionHintText.textContent = `Valgt tidsrum: ${selection.label}`;
}

function clearSelectedTime() {
  if (state.calendar) {
    state.calendar.unselect();
  }

  selectionHint.hidden = true;
  clearSelectionButton.hidden = true;
  selectionHintText.textContent = "";
}

function configureHandoff(payload) {
  const emailSubject = `${BOOKING_SUBJECT_PREFIX}: ${payload.roomLabel} ${payload.date} ${payload.startTime}-${payload.endTime}`;
  const emailBody = buildEmailBody(payload);
  const hasRecipient = BOOKING_RECIPIENT && BOOKING_RECIPIENT !== "booking@example.com";

  emailDraftLink.hidden = !hasRecipient;
  copyDetailsButton.hidden = false;
  copyPayloadButton.hidden = false;

  if (hasRecipient) {
    emailDraftLink.href = buildMailtoLink(BOOKING_RECIPIENT, emailSubject, emailBody);
    handoffNote.textContent = `Emailudkastet sendes til ${BOOKING_RECIPIENT}. Hvis brugerens emailprogram ikke åbner, kan detaljerne kopieres i stedet.`;
  } else {
    emailDraftLink.removeAttribute("href");
    handoffNote.textContent = "Sæt BOOKING_RECIPIENT i app.js før go-live. Indtil da kan bookingdetaljerne eller JSON kopieres herfra.";
  }
}

function buildEmailBody(payload) {
  return [
    "Ny bookingforespørgsel",
    "",
    `Lokale: ${payload.roomLabel}`,
    `Dato: ${payload.date}`,
    `Tid: ${payload.startTime} - ${payload.endTime}`,
    `Navn: ${payload.name}`,
    `Firma: ${payload.company || "-"}`,
    `Email: ${payload.email}`,
    `Kommentar: ${payload.comment || "-"}`,
    `Anmodet: ${payload.requestedAt}`,
    "",
    "JSON payload:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function buildMailtoLink(recipient, subject, body) {
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function handleCopyDetails() {
  if (!state.lastSubmissionPayload) {
    setStatus("Der er ingen bookingdetaljer at kopiere endnu.", "error");
    return;
  }

  const copied = await copyTextToClipboard(buildEmailBody(state.lastSubmissionPayload));

  if (copied) {
    setStatus("Bookingdetaljerne er kopieret til udklipsholderen.", "success");
  } else {
    setStatus("Kunne ikke kopiere bookingdetaljerne automatisk.", "error");
  }
}

async function handleCopyPayload() {
  if (!state.lastSubmissionPayload) {
    setStatus("Der er ingen JSON-payload at kopiere endnu.", "error");
    return;
  }

  const copied = await copyTextToClipboard(JSON.stringify(state.lastSubmissionPayload, null, 2));

  if (copied) {
    setStatus("JSON-payload er kopieret til udklipsholderen.", "success");
  } else {
    setStatus("Kunne ikke kopiere JSON-payload automatisk.", "error");
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      return false;
    }
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "absolute";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();

  let copied = false;

  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }

  document.body.removeChild(helper);
  return copied;
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
  state.lastCalendarErrorMessage = message;
  calendarError.textContent = message;
  calendarError.hidden = false;
  calendarLoading.hidden = true;
}

function getTodayLocalDateString() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function isBeforeToday(date) {
  const candidate = new Date(date);
  candidate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return candidate < today;
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDateForDisplay(date) {
  return new Intl.DateTimeFormat("da-DK", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function combineDateAndTime(dateString, timeString) {
  const value = new Date(`${dateString}T${timeString}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

document.addEventListener("DOMContentLoaded", initializePage);
