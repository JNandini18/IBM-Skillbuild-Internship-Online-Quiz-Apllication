// Simple, self-contained quiz app
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const reviewBtn = document.getElementById('reviewBtn');
const resetBtn = document.getElementById('resetBtn');
const startInfo = document.getElementById('startInfo');
const questionBox = document.getElementById('questionBox');
const questionText = document.getElementById('questionText');
const optionsEl = document.getElementById('options');
const qIndexEl = document.getElementById('qIndex');
const qTotalEl = document.getElementById('qTotal');
const progressBar = document.getElementById('progressBar');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const resultCard = document.getElementById('resultCard');
const finalScoreEl = document.getElementById('finalScore');
const correctCountEl = document.getElementById('correctCount');
const wrongCountEl = document.getElementById('wrongCount');
const saveScoreBtn = document.getElementById('saveScoreBtn');
const playerName = document.getElementById('playerName');
const scoreList = document.getElementById('scoreList');

const sourceEl = document.getElementById('source');
const categoryEl = document.getElementById('category');
const difficultyEl = document.getElementById('difficulty');
const countEl = document.getElementById('count');
const timePerEl = document.getElementById('timePer');

// App state
let questions = [];
let current = 0;
let score = 0;
let correctCount = 0;
let wrongCount = 0;
let selectedOption = null;
let intervalId = null;
let timeLeft = 0;
let reviewMode = false;

// Sample local questions (safe default)
const localQuestions = [
  {question: "What does HTML stand for?", correct: "HyperText Markup Language", incorrect: ["HighText Machine Language","Hyperlinking Text Markup","Home Tool Markup Language"]},
  {question: "Which HTML element is used to define important text?", correct: "<strong>", incorrect: ["<b>","<i>","<mark>"]},
  {question: "Which language adds interactivity to web pages?", correct: "JavaScript", incorrect: ["Python","CSS","HTML"]},
  {question: "What property is used to change text color in CSS?", correct: "color", incorrect: ["font-color","text-color","fg"]},
  {question: "Which tag is used to make a numbered list?", correct: "<ol>", incorrect: ["<ul>","<li>","<dl>"]},
  {question: "Which HTTP status code means Not Found?", correct: "404", incorrect: ["200","500","301"]},
  {question: "Which symbol starts a CSS class selector?", correct: ". (dot)", incorrect: ["# (hash)","* (asterisk)","$ (dollar)"]},
  {question: "Which HTML attribute specifies an alternate text for an image?", correct: "alt", incorrect: ["title","src","ref"]}
];

// Shuffle helper
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

// Leaderboard handling
function loadLeaderboard(){
  const raw = localStorage.getItem('quiz_leaderboard');
  let list = raw ? JSON.parse(raw) : [];
  list.sort((a,b)=>b.score-a.score);
  scoreList.innerHTML = '';
  if(list.length===0){
    scoreList.innerHTML='<div class="chip">No scores yet. Be the first!</div>';
    return;
  }
  for(const entry of list.slice(0,8)){
    const el = document.createElement('div');
    el.className='chip';
    el.innerHTML=`<strong>${escapeHtml(entry.name||'Anonymous')}</strong><br><span class="small">Score: ${entry.score} — Correct: ${entry.correct}/${entry.total}</span>`;
    scoreList.appendChild(el);
  }
}
function escapeHtml(s){return (s+'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]))}

// Question building
function buildLocalQuestions(n){
  const pick = shuffle([...localQuestions]).slice(0,n);
  return pick.map(q=>({text:q.question, choices:shuffle([q.correct,...q.incorrect]), answer:q.correct}))
}

async function loadOpenTDB(n,cat,diff){
  let url = `https://opentdb.com/api.php?amount=${n}`;
  if(cat && cat!=='any') url += `&category=${cat}`;
  if(diff && diff!=='any') url += `&difficulty=${diff}`;
  url += '&type=multiple&encode=url3986';
  const r = await fetch(url);
  const json = await r.json();
  if(json.response_code !== 0) throw new Error('API returned no questions');
  return json.results.map(it=>{
    const decode = s=>decodeURIComponent(s);
    const correct = decode(it.correct_answer);
    const incorrects = it.incorrect_answers.map(decode);
    return {text:decode(it.question), choices:shuffle([correct,...incorrects]), answer:correct};
  });
}

// Start quiz
startBtn.addEventListener('click', async ()=>{
  reviewMode = false; selectedOption=null; current=0; score=0; correctCount=0; wrongCount=0;
  scoreEl.textContent=0; finalScoreEl.textContent=0; correctCountEl.textContent=0; wrongCountEl.textContent=0;
  resultCard.style.display='none'; questionBox.style.display='none'; startInfo.style.display='block';
  const n = Math.max(1,Math.min(20,parseInt(countEl.value)||8));
  qTotalEl.textContent=n; qIndexEl.textContent=0; progressBar.style.width='0%';

  const source = sourceEl.value;
  try{
    if(source==='local'){ questions=buildLocalQuestions(n); }
    else{
      startBtn.disabled=true; startBtn.textContent='Loading...';
      questions=await loadOpenTDB(n,categoryEl.value,difficultyEl.value);
      startBtn.disabled=false; startBtn.textContent='Start Quiz';
    }
  }catch(e){
    alert('Failed to load online questions, using local set.');
    questions=buildLocalQuestions(n);
  }

  startInfo.style.display='none';
  questionBox.style.display='block';
  nextBtn.disabled=true; reviewBtn.disabled=true; submitBtn.disabled=false;
  nextBtn.classList.add('ghost');
  renderQuestion();
});

function renderQuestion(){
  clearInterval(intervalId);
  selectedOption=null; submitBtn.disabled=true; nextBtn.disabled=true; reviewBtn.disabled=true;
  submitBtn.classList.add('ghost');
  const q=questions[current];
  qIndexEl.textContent=current+1;
  qTotalEl.textContent=questions.length;
  progressBar.style.width=`${Math.round((current/questions.length)*100)}%`;
  questionText.innerHTML=escapeHtml(q.text);
  optionsEl.innerHTML='';
  q.choices.forEach((c,idx)=>{
    const b=document.createElement('div');
    b.className='option';
    b.innerHTML=`<div>${escapeHtml(c)}</div>`;
    b.addEventListener('click',()=>selectOption(idx));
    optionsEl.appendChild(b);
  });
  timeLeft=Math.max(5,parseInt(timePerEl.value)||20);
  updateTimerUI();
  intervalId=setInterval(()=>{
    timeLeft--;
    updateTimerUI();
    if(timeLeft<=0){clearInterval(intervalId);handleTimeUp();}
  },1000);
}
function updateTimerUI(){ timerEl.textContent=`${timeLeft}s`; }

function selectOption(idx){
  if(reviewMode)return;
  selectedOption=idx;
  Array.from(optionsEl.children).forEach((el,i)=>el.classList.toggle('selected',i===idx));
  submitBtn.disabled=false;
  submitBtn.classList.remove('ghost');
}

function handleTimeUp(){
  if(selectedOption===null){ revealAnswer(null,true); }
  nextBtn.disabled=false;
  nextBtn.classList.remove('ghost');
  submitBtn.disabled=true;
  submitBtn.classList.add('ghost');
}

submitBtn.addEventListener('click',()=>{
  if(selectedOption===null)return;
  clearInterval(intervalId);
  revealAnswer(selectedOption,false);
  submitBtn.disabled=true;
  submitBtn.classList.add('ghost');
  nextBtn.disabled=false;
  nextBtn.classList.remove('ghost');
});

function revealAnswer(selectedIdx,timedOut){
  const q=questions[current];
  const correct=q.answer;
  Array.from(optionsEl.children).forEach((el,i)=>{
    const text=el.textContent.trim();
    if(text===correct)el.classList.add('correct');
    if(selectedIdx===i && text!==correct)el.classList.add('wrong');
    el.style.pointerEvents='none';
  });
  if(!timedOut && selectedIdx!==null){
    const pickedText=optionsEl.children[selectedIdx].textContent.trim();
    if(pickedText===correct){score+=10;correctCount++;}
    else{score-=3;wrongCount++;}
  } else { wrongCount++; }
  score=Math.max(0,score);
  scoreEl.textContent=score;
  correctCountEl.textContent=correctCount;
  wrongCountEl.textContent=wrongCount;
}

nextBtn.addEventListener('click',()=>{
  current++;
  if(current>=questions.length){ finishQuiz(); return; }
  renderQuestion();
  nextBtn.disabled=true;
  nextBtn.classList.add('ghost');
});

function finishQuiz(){
  clearInterval(intervalId);
  questionBox.style.display='none';
  resultCard.style.display='block';
  finalScoreEl.textContent=score;
  correctCountEl.textContent=correctCount;
  wrongCountEl.textContent=wrongCount;
  progressBar.style.width='100%';
  reviewBtn.disabled=false;
  reviewBtn.classList.remove('ghost');
}

reviewBtn.addEventListener('click',()=>{
  reviewMode=true; current=0;
  resultCard.style.display='none';
  questionBox.style.display='block';
  renderReviewQuestion();
});
function renderReviewQuestion(){
  const q=questions[current];
  qIndexEl.textContent=current+1;
  qTotalEl.textContent=questions.length;
  questionText.innerHTML=escapeHtml(q.text);
  optionsEl.innerHTML='';
  q.choices.forEach(c=>{
    const el=document.createElement('div');
    el.className='option';
    el.innerHTML=escapeHtml(c);
    if(c===q.answer)el.classList.add('correct');
    optionsEl.appendChild(el);
  });
  nextBtn.disabled=(current>=questions.length-1);
  nextBtn.classList.toggle('ghost',nextBtn.disabled);
  submitBtn.disabled=true;
  submitBtn.classList.add('ghost');
  timerEl.textContent='--';
}

nextBtn.addEventListener('click',()=>{
  if(reviewMode){
    current++;
    if(current>=questions.length){
      reviewMode=false;
      questionBox.style.display='none';
      startInfo.style.display='block';
    }else renderReviewQuestion();
  }
});

saveScoreBtn.addEventListener('click',()=>{
  const name=(playerName.value||'Anonymous').trim().slice(0,30);
  const list=JSON.parse(localStorage.getItem('quiz_leaderboard')||'[]');
  list.push({name,score,correct:correctCount,total:questions.length,date:new Date().toISOString()});
  localStorage.setItem('quiz_leaderboard',JSON.stringify(list));
  loadLeaderboard();
  alert('Score saved to local leaderboard!');
});

resetBtn.addEventListener('click',()=>{
  if(confirm('Clear saved leaderboard?')){
    localStorage.removeItem('quiz_leaderboard');
    loadLeaderboard();
  }
});

loadLeaderboard();

// Keyboard shortcuts
document.addEventListener('keydown',(e)=>{
  if(!questionBox || questionBox.style.display==='none')return;
  if(e.key>='1' && e.key<='4'){
    const idx=parseInt(e.key)-1;
    if(optionsEl.children[idx])selectOption(idx);
  }
  if(e.key===' ' && !submitBtn.disabled){submitBtn.click();}
  if(e.key==='n' && !nextBtn.disabled){nextBtn.click();}
});
