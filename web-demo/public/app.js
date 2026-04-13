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

// ===== SMART RESPONSE MATCHING =====
function findResponse(query) {
  const q = query.toLowerCase().trim().replace(/[?!.,'"]/g, '');

  // 1. Exact text_queries match
  for (const [key, val] of Object.entries(DATA.text_queries)) {
    const k = key.toLowerCase().replace(/[?!.,'"]/g, '');
    if (q === k || q.includes(k) || k.includes(q)) {
      return val.response;
    }
  }

  // 2. Name-based match against photo_queries
  for (const [key, person] of Object.entries(DATA.photo_queries)) {
    if (q.includes(person.name.toLowerCase())) {
      return person.response;
    }
  }

  // 3. Keyword → person mapping (expanded)
  const personKeywords = {
    sarah: ['cookie', 'cookies', 'bak', 'bake', 'baking', 'daughter', 'youngest child', 'youngest kid', 'nurse', 'nursing', 'sunday call', 'sunday evening', 'chocolate chip'],
    arki: ['son', 'eldest', 'oldest child', 'oldest kid', 'first child', 'firstborn', 'birdhouse', 'carpenter', 'carpentry', 'woodwork'],
    maya: ['granddaughter', 'grandchild', 'grandkid', 'nana', 'draw', 'drawing', 'little girl', 'arki.s daughter', 'lisa.s daughter'],
    robert: ['husband', 'married', 'spouse', 'wedding', 'fish', 'fishing', 'rose garden', 'roses', 'moon river', 'anniversary'],
    margaret: ['best friend', 'friend', 'quilt', 'quilting', 'thursday', 'maple street', 'high school friend', 'community center'],
    buddy: ['dog', 'puppy', 'pet', 'golden', 'retriever', 'belly rub', 'walk the dog', 'leash', 'bark', 'woof'],
    dr_chen: ['doctor', 'dr', 'clinic', 'checkup', 'check up', 'check-up', 'appointment', 'medical', 'health check', 'riverside'],
    lisa: ['daughter-in-law', 'daughter in law', 'arki.s wife', 'schoolteacher', 'teacher', 'lemon cake'],
    uncle_joe: ['jazz', 'fedora', 'uncle', 'guitar', 'new orleans', 'french quarter', 'musician', 'robert.s brother'],
  };

  for (const [personKey, keywords] of Object.entries(personKeywords)) {
    for (const kw of keywords) {
      if (q.includes(kw)) {
        return DATA.photo_queries[personKey].response;
      }
    }
  }

  // 4. General response matching (categories from general_responses)
  const G = DATA.general_responses;

  // --- Identity ---
  if (matches(q, ['what is my name', 'my name', 'who am i', 'what do people call me', 'whats my name'])) {
    return G.identity.name.response;
  }
  if (matches(q, ['how old', 'my age', 'what age'])) {
    return G.identity.age.response;
  }
  if (matches(q, ['when is my birthday', 'my birthday', 'when was i born', 'birth date', 'date of birth'])) {
    return G.identity.birthday.response;
  }
  if (matches(q, ['where did i grow up', 'where am i from', 'where i grew up', 'hometown', 'childhood home', 'where was i born'])) {
    return G.identity.where_from.response;
  }
  if (matches(q, ['what was my job', 'what did i do for work', 'my career', 'my profession', 'did i work', 'where did i work', 'my job', 'was i a', 'what did i do for a living', 'librarian'])) {
    return G.identity.job.response;
  }

  // --- Family Overview ---
  if (matches(q, ['am i married', 'do i have a husband', 'do i have a wife', 'am i single', 'is there someone', 'my marriage', 'my spouse'])) {
    return G.family_overview.married.response;
  }
  if (matches(q, ['how many kids', 'how many children', 'do i have kids', 'do i have children', 'number of children', 'my children', 'my kids'])) {
    return G.family_overview.how_many_kids.response;
  }
  if (matches(q, ['oldest child', 'eldest child', 'first child', 'firstborn', 'my oldest', 'oldest kid', 'first born'])) {
    return G.family_overview.oldest_child.response;
  }
  if (matches(q, ['youngest child', 'youngest kid', 'baby of the family', 'my youngest', 'last born'])) {
    return G.family_overview.youngest_child.response;
  }
  if (matches(q, ['grandchildren', 'grandkids', 'do i have grand'])) {
    return G.family_overview.grandchildren.response;
  }
  if (matches(q, ['who is in my family', 'my family', 'family members', 'list my family', 'tell me about my family', 'who are my people', 'all my family'])) {
    return G.family_overview.family_members.response;
  }
  if (matches(q, ['brother', 'sister', 'sibling', 'thomas'])) {
    return G.family_overview.siblings.response;
  }

  // --- Daily Routine ---
  if (matches(q, ['morning routine', 'what do i do in the morning', 'when do i wake', 'wake up time', 'what happens in the morning'])) {
    return G.daily_routine.morning.response;
  }
  if (matches(q, ['breakfast', 'what do i eat for breakfast', 'morning meal', 'what do i have for breakfast'])) {
    return G.daily_routine.breakfast.response;
  }
  if (matches(q, ['lunch', 'what do i eat for lunch', 'midday meal', 'noon meal'])) {
    return G.daily_routine.lunch.response;
  }
  if (matches(q, ['dinner', 'supper', 'evening meal', 'what do i eat for dinner', 'when is dinner', 'when do we eat', 'when do i eat'])) {
    return G.daily_routine.dinner.response;
  }
  if (matches(q, ['evening routine', 'what do i do in the evening', 'what do i do at night', 'after dinner', 'nighttime'])) {
    return G.daily_routine.evening.response;
  }
  if (matches(q, ['bedtime', 'when do i go to bed', 'when do i sleep', 'go to sleep', 'when is bedtime', 'sleep time'])) {
    return G.daily_routine.bedtime.response;
  }
  if (matches(q, ['what do i do today', 'my schedule', 'my routine', 'what is my day like', 'daily routine', 'typical day', 'what should i do'])) {
    return G.daily_routine.today.response;
  }

  // --- Weekly Schedule ---
  if (matches(q, ['monday', 'mondays'])) return G.weekly_schedule.monday.response;
  if (matches(q, ['tuesday', 'tuesdays']) && !q.includes('doctor') && !q.includes('dr') && !q.includes('appointment')) return G.weekly_schedule.tuesday.response;
  if (matches(q, ['wednesday', 'wednesdays'])) return G.weekly_schedule.wednesday.response;
  if (matches(q, ['thursday', 'thursdays']) && !q.includes('quilt') && !q.includes('margaret')) return G.weekly_schedule.thursday.response;
  if (matches(q, ['friday', 'fridays'])) return G.weekly_schedule.friday.response;
  if (matches(q, ['saturday', 'saturdays'])) return G.weekly_schedule.saturday.response;
  if (matches(q, ['sunday', 'sundays']) && !q.includes('sarah') && !q.includes('call')) return G.weekly_schedule.sunday.response;

  // --- Home & Places ---
  if (matches(q, ['where do i live', 'my address', 'my house', 'where is my home', 'what street', 'where is home'])) {
    return G.home_and_places.where_live.response;
  }
  if (matches(q, ['address', 'street address', 'house number'])) {
    return G.home_and_places.address.response;
  }
  if (matches(q, ['where is the bathroom', 'bathroom', 'restroom', 'toilet', 'need to go', 'washroom'])) {
    return G.home_and_places.bathroom.response;
  }
  if (matches(q, ['where is my bedroom', 'bedroom', 'my room', 'where do i sleep', 'my bed'])) {
    return G.home_and_places.bedroom.response;
  }
  if (matches(q, ['where is the kitchen', 'kitchen', 'where do i cook'])) {
    return G.home_and_places.kitchen.response;
  }
  if (matches(q, ['garden', 'backyard', 'back yard', 'outside', 'yard'])) {
    return G.home_and_places.garden.response;
  }
  if (matches(q, ['where is the park', 'park', 'go for a walk', 'walk to', 'pond'])) {
    return G.home_and_places.park.response;
  }
  if (matches(q, ['church', 'mass', 'service', 'st mary', 'sunday service', 'pray'])) {
    return G.home_and_places.church.response;
  }
  if (matches(q, ['store', 'grocery', 'shop', 'shopping', 'buy food', 'supermarket'])) {
    return G.home_and_places.store.response;
  }
  if (matches(q, ['where is the clinic', 'riverside clinic', 'doctor office', 'doctors office'])) {
    return G.home_and_places.clinic.response;
  }
  if (matches(q, ['community center', 'community centre', 'where is quilting'])) {
    return G.home_and_places.community_center.response;
  }

  // --- Health & Medicine ---
  if (matches(q, ['medicine', 'medication', 'when do i take my medicine', 'my pills', 'pill', 'prescription', 'meds'])) {
    return G.health_and_medicine.medicine.response;
  }
  if (matches(q, ['pill box', 'pill container', 'where are my pills', 'blue box'])) {
    return G.health_and_medicine.pills.response;
  }
  if (matches(q, ['doctor appointment', 'next appointment', 'when is my appointment', 'see the doctor', 'medical appointment'])) {
    return G.health_and_medicine.doctor_appointment.response;
  }
  if (matches(q, ['not feeling well', 'feel sick', 'feeling sick', 'unwell', 'dont feel good', 'i feel bad', 'stomach', 'headache', 'pain', 'hurts'])) {
    return G.health_and_medicine.feeling_sick.response;
  }
  if (matches(q, ['allerg', 'penicillin', 'am i allergic'])) {
    return G.health_and_medicine.allergies.response;
  }
  if (matches(q, ['emergency', '911', 'ambulance', 'call for help', 'urgent'])) {
    return G.health_and_medicine.emergency.response;
  }

  // --- Orientation ---
  if (matches(q, ['what day is it', 'what day is today', 'what is today', 'which day'])) {
    return G.orientation.what_day.response;
  }
  if (matches(q, ['what time is it', 'what time', 'the time', 'what hour'])) {
    return G.orientation.what_time.response;
  }
  if (matches(q, ['what year', 'which year', 'what year is it'])) {
    return G.orientation.what_year.response;
  }
  if (matches(q, ['what month', 'which month', 'what season'])) {
    return G.orientation.what_month.response;
  }
  if (matches(q, ['where am i', 'where is this', 'what is this place', 'i dont know where', 'i dont recognize'])) {
    return G.orientation.where_am_i.response;
  }
  if (matches(q, ['how did i get here', 'how did i come here', 'who brought me'])) {
    return G.orientation.how_did_i_get_here.response;
  }

  // --- Emotions & Comfort ---
  if (matches(q, ['im scared', 'i am scared', 'frightened', 'afraid', 'fear'])) {
    return G.emotions_and_comfort.scared.response;
  }
  if (matches(q, ['im confused', 'i am confused', 'confuse', 'dont understand', 'i dont get it', 'things dont make sense'])) {
    return G.emotions_and_comfort.confused.response;
  }
  if (matches(q, ['im sad', 'i am sad', 'feeling sad', 'feel sad', 'unhappy', 'depressed', 'down', 'feeling down', 'crying', 'i want to cry'])) {
    return G.emotions_and_comfort.sad.response;
  }
  if (matches(q, ['im lonely', 'i am lonely', 'feel alone', 'feeling alone', 'no one is here', 'nobody is here', 'all alone', 'by myself'])) {
    return G.emotions_and_comfort.lonely.response;
  }
  if (matches(q, ['im angry', 'i am angry', 'frustrated', 'mad', 'annoyed', 'irritated', 'upset'])) {
    return G.emotions_and_comfort.angry.response;
  }
  if (matches(q, ['does anyone love me', 'does somebody love me', 'am i loved', 'anyone care about me', 'does anyone care'])) {
    return G.emotions_and_comfort.does_anyone_love_me.response;
  }
  if (matches(q, ['who loves me', 'people love me', 'am i loved'])) {
    return G.emotions_and_comfort.love.response;
  }
  if (matches(q, ['why cant i remember', 'why do i forget', 'losing my memory', 'my memory is bad', 'cant remember anything', 'keep forgetting', 'i forget everything'])) {
    return G.emotions_and_comfort.why_cant_i_remember.response;
  }
  if (matches(q, ['whats wrong with me', 'what is wrong with me', 'something wrong with me', 'am i sick', 'is something wrong'])) {
    return G.emotions_and_comfort.whats_wrong_with_me.response;
  }
  if (matches(q, ['am i okay', 'am i alright', 'am i fine', 'is everything okay', 'is everything alright', 'will i be okay'])) {
    return G.emotions_and_comfort.am_i_okay.response;
  }
  if (matches(q, ['i want to go home', 'take me home', 'go home', 'bring me home', 'want to leave', 'this isnt my home', 'this is not my home'])) {
    return G.emotions_and_comfort.i_want_to_go_home.response;
  }
  if (matches(q, ['help me', 'i need help', 'please help', 'can you help', 'someone help'])) {
    return G.emotions_and_comfort.help.response;
  }

  // --- Belongings ---
  if (matches(q, ['where are my keys', 'my keys', 'lost my keys', 'cant find my keys', 'find keys', 'keys'])) {
    return G.belongings.keys.response;
  }
  if (matches(q, ['where are my glasses', 'my glasses', 'lost my glasses', 'cant find my glasses', 'reading glasses', 'spectacles'])) {
    return G.belongings.glasses.response;
  }
  if (matches(q, ['where is my wallet', 'my wallet', 'lost my wallet', 'cant find wallet', 'money'])) {
    return G.belongings.wallet.response;
  }
  if (matches(q, ['where is my purse', 'my purse', 'lost my purse', 'cant find purse', 'handbag', 'bag'])) {
    return G.belongings.purse.response;
  }
  if (matches(q, ['where is the phone', 'telephone', 'my phone', 'mobile', 'cell phone', 'where is my phone'])) {
    return G.belongings.phone.response;
  }
  if (matches(q, ['where is the remote', 'tv remote', 'remote control', 'cant find remote', 'lost the remote'])) {
    return G.belongings.remote.response;
  }
  if (matches(q, ['where is my coat', 'my coat', 'jacket', 'sweater', 'cardigan', 'where is my jacket'])) {
    return G.belongings.coat.response;
  }

  // --- Food & Drink ---
  if (matches(q, ['tea', 'cup of tea', 'make tea', 'my tea'])) {
    return G.food_and_drink.tea.response;
  }
  if (matches(q, ['coffee', 'cup of coffee'])) {
    return G.food_and_drink.coffee.response;
  }
  if (matches(q, ['cookie recipe', 'how to make cookies', 'chocolate chip recipe'])) {
    return G.food_and_drink.cookies.response;
  }
  if (matches(q, ['favorite food', 'what food do i like', 'what do i like to eat', 'my favorite meal', 'best food'])) {
    return G.food_and_drink.favorite_food.response;
  }
  if (matches(q, ['water', 'thirsty', 'drink water', 'glass of water', 'need a drink'])) {
    return G.food_and_drink.water.response;
  }
  if (matches(q, ['hungry', 'im hungry', 'i am hungry', 'need food', 'want to eat', 'is there food', 'snack'])) {
    return G.food_and_drink.hungry.response;
  }

  // --- Hobbies ---
  if (matches(q, ['quilting', 'quilt circle', 'quilting group', 'sewing'])) {
    return G.hobbies_and_interests.quilting.response;
  }
  if (matches(q, ['reading', 'books', 'novel', 'what do i read', 'library'])) {
    return G.hobbies_and_interests.reading.response;
  }
  if (matches(q, ['gardening', 'flowers', 'plants', 'tomatoes', 'herbs'])) {
    return G.hobbies_and_interests.gardening.response;
  }
  if (matches(q, ['baking', 'do i bake', 'apple pie', 'pie recipe', 'recipe'])) {
    return G.hobbies_and_interests.baking.response;
  }
  if (matches(q, ['watch tv', 'television', 'what do i watch', 'favorite show', 'documentary'])) {
    return G.hobbies_and_interests.tv.response;
  }
  if (matches(q, ['music', 'song', 'sing', 'favorite song', 'frank sinatra', 'listen to'])) {
    return G.hobbies_and_interests.music.response;
  }
  if (matches(q, ['crossword', 'puzzle', 'word game'])) {
    return G.hobbies_and_interests.crossword.response;
  }
  if (matches(q, ['walk', 'exercise', 'go outside', 'stretch', 'stroll']) && !q.includes('dog') && !q.includes('buddy')) {
    return G.hobbies_and_interests.walking.response;
  }
  if (matches(q, ['hobby', 'hobbies', 'what do i like', 'what do i enjoy', 'for fun', 'free time', 'pastime', 'leisure'])) {
    return G.hobbies_and_interests.quilting.response;
  }

  // --- Pets ---
  if (matches(q, ['dog name', 'whats my dogs name', 'what is my dogs name', 'dogs name'])) {
    return G.pets.dog_name.response;
  }
  if (matches(q, ['dog food', 'feed the dog', 'feed buddy', 'when does the dog eat', 'dog bowl'])) {
    return G.pets.dog_food.response;
  }
  if (matches(q, ['walk the dog', 'walk buddy', 'dog walk', 'take buddy out', 'buddy walk'])) {
    return G.pets.dog_walk.response;
  }
  if (matches(q, ['cat', 'kitten', 'do i have a cat'])) {
    return G.pets.cat.response;
  }

  // --- Phone & Communication ---
  if (matches(q, ['call my son', 'call arki', 'phone arki', 'ring arki', 'reach arki', 'how do i call my son', 'talk to my son'])) {
    return G.phone_and_communication.call_son.response;
  }
  if (matches(q, ['call my daughter', 'call sarah', 'phone sarah', 'ring sarah', 'reach sarah', 'how do i call my daughter', 'talk to my daughter'])) {
    return G.phone_and_communication.call_daughter.response;
  }
  if (matches(q, ['call my friend', 'call margaret', 'phone margaret', 'ring margaret', 'talk to margaret', 'how do i call margaret'])) {
    return G.phone_and_communication.call_friend.response;
  }
  if (matches(q, ['phone numbers', 'important numbers', 'who can i call', 'emergency numbers', 'contact list'])) {
    return G.phone_and_communication.phone_numbers.response;
  }

  // --- Weather & Seasons ---
  if (matches(q, ['weather', 'is it raining', 'is it sunny', 'cold outside', 'hot outside', 'whats it like outside'])) {
    return G.weather_and_seasons.weather.response;
  }
  if (matches(q, ['what season', 'is it summer', 'is it winter', 'is it spring', 'is it autumn', 'is it fall'])) {
    return G.weather_and_seasons.season.response;
  }
  if (matches(q, ['christmas', 'xmas', 'holiday', 'december'])) {
    return G.weather_and_seasons.christmas.response;
  }
  if (matches(q, ['thanksgiving', 'turkey day', 'november'])) {
    return G.weather_and_seasons.thanksgiving.response;
  }
  if (matches(q, ['birthday', 'my birthday', 'when is my birthday'])) {
    return G.weather_and_seasons.birthday.response;
  }

  // --- Practical Tasks ---
  if (matches(q, ['how to use the phone', 'use the phone', 'make a call', 'dial a number', 'how do i call'])) {
    return G.practical_tasks.how_to_use_phone.response;
  }
  if (matches(q, ['lock the door', 'door locked', 'is the door locked', 'front door', 'lock up'])) {
    return G.practical_tasks.how_to_lock_door.response;
  }
  if (matches(q, ['turn on the tv', 'turn on tv', 'how to watch tv', 'start the tv'])) {
    return G.practical_tasks.how_to_turn_on_tv.response;
  }
  if (matches(q, ['mail', 'mailbox', 'letters', 'post', 'did i get mail'])) {
    return G.practical_tasks.mail.response;
  }

  // --- Past Memories ---
  if (matches(q, ['wedding', 'when did i get married', 'our wedding', 'wedding day', 'first dance'])) {
    return G.past_memories.wedding.response;
  }
  if (matches(q, ['childhood', 'when i was young', 'when i was little', 'growing up', 'as a child', 'as a kid'])) {
    return G.past_memories.childhood.response;
  }
  if (matches(q, ['career', 'my career', 'when i worked', 'retirement', 'did i retire', 'when did i retire'])) {
    return G.past_memories.career.response;
  }
  if (matches(q, ['my parents', 'my mother', 'my father', 'my mom', 'my dad', 'mom and dad'])) {
    return G.past_memories.parents.response;
  }
  if (matches(q, ['school', 'high school', 'did i go to school', 'education'])) {
    return G.past_memories.school.response;
  }
  if (matches(q, ['first home', 'first house', 'first apartment', 'where did we first live'])) {
    return G.past_memories.first_home.response;
  }
  if (matches(q, ['when was arki born', 'arki born', 'arki birthday', 'arki birth'])) {
    return G.past_memories.arki_birth.response;
  }
  if (matches(q, ['when was sarah born', 'sarah born', 'sarah birthday', 'sarah birth'])) {
    return G.past_memories.sarah_birth.response;
  }

  // --- Safety ---
  if (matches(q, ['fire', 'smoke', 'burning', 'something burning', 'smell smoke'])) {
    return G.safety.fire.response;
  }
  if (matches(q, ['fallen', 'fell', 'fell down', 'i fell', 'cant get up', 'tripped'])) {
    return G.safety.fall.response;
  }
  if (matches(q, ['im lost', 'i am lost', 'dont know where i am', 'cant find my way', 'lost my way'])) {
    return G.safety.lost.response;
  }
  if (matches(q, ['someone at the door', 'doorbell', 'whos at the door', 'knocking', 'stranger at door'])) {
    return G.safety.stranger_at_door.response;
  }
  if (matches(q, ['power out', 'lights out', 'no power', 'blackout', 'dark', 'no electricity'])) {
    return G.safety.power_out.response;
  }

  // --- Conversation ---
  if (matches(q, ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy'])) {
    return G.conversation.hello.response;
  }
  if (matches(q, ['thank you', 'thanks', 'thank u', 'appreciate'])) {
    return G.conversation.thank_you.response;
  }
  if (matches(q, ['goodbye', 'bye', 'good night', 'goodnight', 'see you', 'talk later'])) {
    return G.conversation.goodbye.response;
  }
  if (matches(q, ['who are you', 'what are you', 'are you a robot', 'are you real', 'are you a person', 'are you ai'])) {
    return G.conversation.who_are_you.response;
  }
  if (matches(q, ['how are you', 'how do you feel', 'hows it going', 'how you doing'])) {
    return G.conversation.how_are_you.response;
  }

  // --- Fallback ---
  return "I'm here to help you remember, Ellie. I may not know the answer to that specific question, but you can try asking me about:\n\n- Your family (Robert, Arki, Sarah, Maya, Lisa, or Margaret)\n- Your daily routine (meals, medicine, bedtime)\n- Your home (where things are, your address)\n- Your pets (Buddy, your golden retriever)\n- How you're feeling (I'm here to comfort you too)\n\nJust ask in a different way and I'll do my best!";
}

// Helper: check if query matches any of the phrases
function matches(query, phrases) {
  for (const phrase of phrases) {
    if (query.includes(phrase)) return true;
  }
  return false;
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
