// ===== DATA =====
let DATA = null;
let currentPerson = null;

// DiceBear avatar URLs — unique illustrated faces per person
const AVATARS = {
  sarah: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Sarah&backgroundColor=FFB6C1',
  arki: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Arki&backgroundColor=ADD8E6',
  maya: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Maya&backgroundColor=FFFFC8',
  robert: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Robert&backgroundColor=C8E6C8',
  margaret: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Margaret&backgroundColor=E6C8E6',
  buddy: 'https://api.dicebear.com/9.x/adventurer/svg?seed=BuddyDog&backgroundColor=FFD78C',
  dr_chen: 'https://api.dicebear.com/9.x/adventurer/svg?seed=DrChen&backgroundColor=DCDCF0',
  lisa: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Lisa&backgroundColor=FFDAB9',
  uncle_joe: 'https://api.dicebear.com/9.x/adventurer/svg?seed=UncleJoe&backgroundColor=B4C8B4',
};

function getAvatarUrl(key) {
  return AVATARS[key] || `https://api.dicebear.com/9.x/adventurer/svg?seed=${key}`;
}

async function loadData() {
  try {
    const res = await fetch('responses.json');
    DATA = await res.json();
    renderFamily();
    setTimeOfDay();
  } catch (e) {
    console.error('Failed to load data:', e);
  }
}

function setTimeOfDay() {
  const h = new Date().getHours();
  const el = document.getElementById('timeOfDay');
  if (h < 12) el.textContent = 'morning';
  else if (h < 17) el.textContent = 'afternoon';
  else el.textContent = 'evening';
}

// ===== NAVIGATION =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  document.querySelectorAll('.tab-bar .tab').forEach(t => {
    t.classList.remove('active');
    if (t.querySelector('span') && t.querySelector('span').textContent.toLowerCase() === id) {
      t.classList.add('active');
    }
  });
}

// ===== FAMILY RENDERING =====
function renderFamily() {
  if (!DATA) return;
  const people = DATA.photo_queries;

  // Home scroll
  const scroll = document.getElementById('familyScroll');
  scroll.innerHTML = '';
  for (const [key, p] of Object.entries(people)) {
    const el = document.createElement('button');
    el.className = 'family-thumb';
    el.onclick = () => showPerson(key);
    el.innerHTML = `
      <img class="avatar avatar-img" src="${getAvatarUrl(key)}" alt="${p.name}">
      <span>${p.name}</span>
    `;
    scroll.appendChild(el);
  }

  // Family grid
  const grid = document.getElementById('familyGrid');
  grid.innerHTML = '';
  for (const [key, p] of Object.entries(people)) {
    const el = document.createElement('button');
    el.className = 'family-card';
    el.onclick = () => showPerson(key);
    el.innerHTML = `
      <img class="avatar avatar-img" src="${getAvatarUrl(key)}" alt="${p.name}">
      <h4>${p.name}</h4>
      <span>${p.relationship}</span>
    `;
    grid.appendChild(el);
  }
}

function showPerson(key) {
  if (!DATA) return;
  const p = DATA.photo_queries[key];
  if (!p) return;
  currentPerson = key;

  document.getElementById('personHeaderName').textContent = p.name;
  document.getElementById('personName').textContent = p.name;
  document.getElementById('personRel').textContent = p.relationship;
  document.getElementById('personStory').textContent = p.story;
  document.getElementById('personAskName').textContent = p.name;

  const avatar = document.getElementById('personAvatar');
  avatar.innerHTML = `<img src="${getAvatarUrl(key)}" alt="${p.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
  avatar.style.background = 'none';

  const list = document.getElementById('personMemories');
  list.innerHTML = '';
  for (const cap of p.captions) {
    const li = document.createElement('li');
    li.textContent = cap;
    list.appendChild(li);
  }

  showScreen('person');
}

function goAskAbout() {
  if (!currentPerson || !DATA) return;
  const p = DATA.photo_queries[currentPerson];
  showScreen('ask');
  setTimeout(() => {
    const input = document.getElementById('qInput');
    input.value = `Tell me about ${p.name}`;
    sendMessage();
  }, 350);
}

// ===== IDENTIFY (photo) =====
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const uploadPrompt = document.getElementById('uploadPrompt');
const uploadZone = document.getElementById('uploadZone');
const btnIdentify = document.getElementById('btnIdentify');

fileInput.addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    preview.src = e.target.result;
    preview.hidden = false;
    uploadPrompt.hidden = true;
    uploadZone.classList.add('has-image');
    btnIdentify.disabled = false;
  };
  reader.readAsDataURL(file);
});

function doIdentify() {
  const loading = document.getElementById('loading');
  if (!DATA) { loading.classList.remove('visible'); return; }

  loading.classList.add('visible');

  setTimeout(() => {
    const keys = Object.keys(DATA.photo_queries);
    const key = keys[Math.floor(Math.random() * keys.length)];
    const p = DATA.photo_queries[key];

    document.getElementById('resultName').textContent = p.name;
    document.getElementById('resultRel').textContent = p.relationship;
    document.getElementById('resultText').textContent = p.response;

    const avatar = document.getElementById('resultAvatar');
    avatar.innerHTML = `<img src="${getAvatarUrl(key)}" alt="${p.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    avatar.style.background = 'none';

    document.getElementById('identifyResult').hidden = false;
    document.getElementById('identifyActions').hidden = true;
    loading.classList.remove('visible');
  }, 1800);
}

function resetIdentify() {
  preview.hidden = true;
  preview.src = '';
  uploadPrompt.hidden = false;
  uploadZone.classList.remove('has-image');
  btnIdentify.disabled = true;
  fileInput.value = '';
  document.getElementById('identifyResult').hidden = true;
  document.getElementById('identifyActions').hidden = false;
}

// ===== ASK / CHAT =====
const qInput = document.getElementById('qInput');
const messagesEl = document.getElementById('messages');

qInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMessage();
});

function goAsk(text) {
  showScreen('ask');
  setTimeout(() => {
    qInput.value = text;
    sendMessage();
  }, 350);
}

function sendFromChip(el) {
  const text = el.textContent;
  qInput.value = text;
  sendMessage();
}

function sendMessage() {
  const text = qInput.value.trim();
  if (!text || !DATA) return;
  qInput.value = '';

  const empty = document.querySelector('.chat-empty');
  if (empty) empty.style.display = 'none';
  const sug = document.getElementById('askChips');
  if (sug) sug.style.display = 'none';

  addMessage(text, 'user');

  const typing = document.createElement('div');
  typing.className = 'msg-typing';
  typing.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  messagesEl.appendChild(typing);
  scrollChat();

  setTimeout(() => {
    typing.remove();
    const response = findResponse(text);
    addMessage(response, 'bot');
  }, 1200 + Math.random() * 800);
}

function findResponse(query) {
  const q = query.toLowerCase().trim();

  for (const [key, val] of Object.entries(DATA.text_queries)) {
    if (q.includes(key) || key.includes(q)) {
      return val.response;
    }
  }

  for (const [key, person] of Object.entries(DATA.photo_queries)) {
    if (q.includes(person.name.toLowerCase())) {
      return person.response;
    }
  }

  const keywords = {
    'cookie': 'sarah', 'bak': 'sarah', 'daughter': 'sarah',
    'dog': 'buddy', 'pet': 'buddy', 'golden': 'buddy', 'retriever': 'buddy',
    'doctor': 'dr_chen', 'clinic': 'dr_chen', 'tuesday': 'dr_chen', 'checkup': 'dr_chen',
    'granddaughter': 'maya', 'nana': 'maya', 'draw': 'maya',
    'husband': 'robert', 'wedding': 'robert', 'fish': 'robert', 'rose': 'robert', 'moon river': 'robert',
    'friend': 'margaret', 'quilt': 'margaret', 'thursday': 'margaret',
    'son': 'arki', 'birdhouse': 'arki', 'carpenter': 'arki',
    'jazz': 'uncle_joe', 'fedora': 'uncle_joe', 'uncle': 'uncle_joe',
    'lisa': 'lisa', 'daughter-in-law': 'lisa', 'lemon cake': 'lisa',
  };

  for (const [kw, personKey] of Object.entries(keywords)) {
    if (q.includes(kw)) {
      return DATA.photo_queries[personKey].response;
    }
  }

  return "I'm not quite sure about that. Could you try asking in a different way? For example, you can ask me about your family members by name, or about your daily routines.";
}

function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = `msg msg-${type}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  scrollChat();
}

function scrollChat() {
  const chat = document.getElementById('chat');
  requestAnimationFrame(() => {
    chat.scrollTop = chat.scrollHeight;
  });
}

// ===== INIT =====
loadData();
